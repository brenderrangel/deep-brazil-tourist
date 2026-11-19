<?php
declare(strict_types=1);

/**
 * Cliente HTTP leve para a API REST do Stripe (zero dependências externas / Composer).
 * Compatível com hospedagem compartilhada (Hostinger) usando cURL nativo do PHP.
 */
final class StripeClient
{
    private const API_BASE = 'https://api.stripe.com/v1';

    public static function isConfigured(): bool
    {
        $key = (string) config('STRIPE_SECRET_KEY', '');
        return str_starts_with($key, 'sk_');
    }

    public static function request(string $method, string $path, array $params = [], ?string $idempotencyKey = null): array
    {
        $secretKey = (string) config('STRIPE_SECRET_KEY', '');
        if ($secretKey === '') {
            throw new HttpException(503, 'stripe_not_configured', 'Stripe secret key is not configured.');
        }

        $url = self::API_BASE . $path;
        $ch = curl_init();

        $headers = [
            'Authorization: Bearer ' . $secretKey,
            'Stripe-Version: 2024-06-20',
        ];
        if ($idempotencyKey !== null && $idempotencyKey !== '') {
            $headers[] = 'Idempotency-Key: ' . $idempotencyKey;
        }

        $method = strtoupper($method);
        if ($method === 'GET' && $params) {
            $url .= '?' . http_build_query($params);
        } elseif ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));
            $headers[] = 'Content-Type: application/x-www-form-urlencoded';
        }

        $verifySsl = is_production() || (string) ini_get('curl.cainfo') !== '' || (string) ini_get('openssl.cafile') !== '';
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_SSL_VERIFYPEER => $verifySsl,
        ]);

        $raw = curl_exec($ch);
        $curlErr = curl_error($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);

        if ($raw === false) {
            error_log('Stripe cURL error: ' . $curlErr);
            throw new HttpException(502, 'stripe_network_error', 'Could not reach Stripe API.');
        }

        $data = json_decode($raw, true);
        if (!is_array($data)) {
            throw new HttpException(502, 'stripe_invalid_response', 'Invalid JSON from Stripe.');
        }

        if ($status >= 400) {
            $msg = $data['error']['message'] ?? 'Stripe API error';
            error_log("Stripe HTTP $status: $msg");
            throw new HttpException(502, 'stripe_api_error', $msg);
        }

        return $data;
    }

    public static function createCustomer(string $email, string $name, int $userId): array
    {
        return self::request('POST', '/customers', [
            'email' => $email,
            'name' => $name,
            'metadata' => ['user_id' => (string) $userId],
        ], 'cust_user_' . $userId);
    }

    public static function createCheckoutSession(array $params, ?string $idempotencyKey = null): array
    {
        return self::request('POST', '/checkout/sessions', $params, $idempotencyKey);
    }

    public static function retrieveCheckoutSession(string $sessionId): array
    {
        return self::request('GET', '/checkout/sessions/' . rawurlencode($sessionId), [
            'expand' => ['subscription', 'payment_intent'],
        ]);
    }

    public static function createBillingPortalSession(string $customerId, string $returnUrl): array
    {
        return self::request('POST', '/billing_portal/sessions', [
            'customer' => $customerId,
            'return_url' => $returnUrl,
        ]);
    }

    /**
     * Valida o cabeçalho `Stripe-Signature` conforme especificação oficial do Stripe.
     * Lança HttpException(400) se assinatura ausente, expirada ou inválida.
     */
    public static function verifyWebhookSignature(
        string $payload,
        ?string $sigHeader,
        string $secret,
        int $tolerance = 300
    ): array {
        if ($secret === '') {
            throw new HttpException(503, 'stripe_webhook_not_configured', 'Webhook secret not configured.');
        }
        if (!$sigHeader) {
            throw new HttpException(400, 'missing_signature', 'Missing Stripe-Signature header.');
        }

        $timestamp = null;
        $signatures = [];
        foreach (explode(',', $sigHeader) as $part) {
            $kv = explode('=', trim($part), 2);
            if (count($kv) !== 2) {
                continue;
            }
            if ($kv[0] === 't') {
                $timestamp = (int) $kv[1];
            } elseif ($kv[0] === 'v1') {
                $signatures[] = $kv[1];
            }
        }

        if (!$timestamp || !$signatures) {
            throw new HttpException(400, 'invalid_signature', 'Malformed Stripe-Signature header.');
        }

        if (abs(time() - $timestamp) > $tolerance) {
            throw new HttpException(400, 'signature_expired', 'Webhook timestamp outside tolerance window.');
        }

        $signedPayload = $timestamp . '.' . $payload;
        $expected = hash_hmac('sha256', $signedPayload, $secret);

        $valid = false;
        foreach ($signatures as $sig) {
            if (hash_equals($expected, $sig)) {
                $valid = true;
                break;
            }
        }

        if (!$valid) {
            throw new HttpException(400, 'invalid_signature', 'Webhook signature verification failed.');
        }

        $event = json_decode($payload, true);
        if (!is_array($event) || empty($event['id']) || empty($event['type'])) {
            throw new HttpException(400, 'invalid_webhook_payload', 'Invalid Stripe event payload.');
        }

        return $event;
    }
}
