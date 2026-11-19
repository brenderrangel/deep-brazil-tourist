<?php
declare(strict_types=1);

/**
 * Controlador de Pagamentos e Assinaturas (Stripe Checkout, Customer Portal e Webhook).
 */
final class PaymentController
{
    /** Lista planos configurados em config.php (sem expor segredos). */
    public static function plans(Request $req): array
    {
        $rawPlans = config('PLANS', []);
        $plans = [];
        foreach ($rawPlans as $priceId => $p) {
            $plans[] = [
                'price_id' => (string) $priceId,
                'type' => (string) ($p['type'] ?? 'trip_pass'),
                'days' => (int) ($p['days'] ?? 14),
                'mode' => (string) ($p['mode'] ?? 'payment'),
                'currency' => strtoupper((string) ($p['currency'] ?? 'USD')),
                'amount' => (float) ($p['amount'] ?? 0),
                'label' => $p['label'] ?? [
                    'pt' => 'Passe Premium',
                    'en' => 'Premium Pass',
                    'es' => 'Pase Premium',
                ],
                'badge' => $p['badge'] ?? null,
            ];
        }

        return [
            'stripe_configured' => StripeClient::isConfigured(),
            'plans' => $plans,
        ];
    }

    /** Cria uma Stripe Checkout Session para o usuário autenticado. */
    public static function checkout(Request $req): array
    {
        $user = AuthService::user($req, true);
        $priceId = trim((string) $req->get('price_id', ''));
        $plans = config('PLANS', []);

        if ($priceId === '' || !isset($plans[$priceId])) {
            throw new HttpException(422, 'invalid_plan', 'Selected plan does not exist.');
        }

        $plan = $plans[$priceId];
        $mode = ($plan['mode'] ?? 'payment') === 'subscription' ? 'subscription' : 'payment';
        $userId = (int) $user['id'];

        $customerId = $user['stripe_customer_id'] ?? null;
        if (!$customerId) {
            $customer = StripeClient::createCustomer((string) $user['email'], (string) $user['name'], $userId);
            $customerId = (string) $customer['id'];
            db()->prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?')->execute([$customerId, $userId]);
        }

        $baseUrl = rtrim((string) config('APP_URL', 'http://localhost:8000'), '/');
        $sessionParams = [
            'mode' => $mode,
            'customer' => $customerId,
            'client_reference_id' => (string) $userId,
            'locale' => 'auto',
            'line_items' => [[
                'price' => $priceId,
                'quantity' => 1,
            ]],
            'allow_promotion_codes' => 'true',
            'success_url' => $baseUrl . '/#/account?checkout=success&session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => $baseUrl . '/#/account?checkout=cancel',
            'metadata' => [
                'user_id' => (string) $userId,
                'price_id' => $priceId,
                'plan_type' => (string) ($plan['type'] ?? 'trip_pass'),
                'days' => (string) ((int) ($plan['days'] ?? 14)),
            ],
        ];
        // Habilita geração automática de fatura (Stripe Invoicing) em pagamentos avulsos
        if ($mode === 'payment') {
            $sessionParams['invoice_creation'] = ['enabled' => 'true'];
        }
        $session = StripeClient::createCheckoutSession($sessionParams);

        return [
            'session_id' => $session['id'],
            'checkout_url' => $session['url'],
        ];
    }

    /** Confirma uma Checkout Session ao retornar do Stripe (complemento ao webhook). */
    public static function verifySession(Request $req): array
    {
        $user = AuthService::user($req, true);
        $sessionId = trim((string) $req->get('session_id', ''));
        if ($sessionId === '') {
            throw new HttpException(422, 'missing_session_id', 'session_id is required.');
        }

        $session = StripeClient::retrieveCheckoutSession($sessionId);
        $ownerId = (int) ($session['client_reference_id'] ?? $session['metadata']['user_id'] ?? 0);
        if ($ownerId !== (int) $user['id']) {
            throw new HttpException(403, 'forbidden', 'Session does not belong to current user.');
        }

        if (($session['payment_status'] ?? '') !== 'paid') {
            return ['activated' => false, 'payment_status' => $session['payment_status'] ?? 'unpaid'];
        }

        self::activateFromCheckoutSession($session);

        $freshUser = AuthService::findById((int) $user['id']);
        return [
            'activated' => true,
            'premium_until' => iso_time($freshUser['premium_until'] ?? null),
        ];
    }

    /** Cria sessão do Stripe Customer Portal para gerenciar/cancelar assinatura. */
    public static function portal(Request $req): array
    {
        $user = AuthService::user($req, true);
        $customerId = $user['stripe_customer_id'] ?? null;
        if (!$customerId) {
            throw new HttpException(400, 'no_stripe_customer', 'No active billing profile found.');
        }

        $baseUrl = rtrim((string) config('APP_URL', 'http://localhost:8000'), '/');
        $portal = StripeClient::createBillingPortalSession((string) $customerId, $baseUrl . '/#/account');

        return ['portal_url' => $portal['url']];
    }

    /** Endpoint público para Webhooks do Stripe (POST /api/stripe-webhook). */
    public static function webhook(Request $req): array
    {
        $payload = $req->rawBody();
        $sigHeader = $req->header('Stripe-Signature');
        $secret = (string) config('STRIPE_WEBHOOK_SECRET', '');

        $event = StripeClient::verifyWebhookSignature($payload, $sigHeader, $secret);
        $eventId = (string) $event['id'];
        $eventType = (string) $event['type'];

        $pdo = db();
        // Idempotência: ignora eventos já processados anteriormente
        $exists = $pdo->prepare('SELECT id FROM payment_webhooks_log WHERE event_id = ?');
        $exists->execute([$eventId]);
        if ($exists->fetchColumn()) {
            return ['received' => true, 'duplicate' => true];
        }

        $obj = $event['data']['object'] ?? [];

        $pdo->beginTransaction();
        try {
            $insLog = $pdo->prepare(
                'INSERT INTO payment_webhooks_log (event_id, event_type, payload_json, processed_at)
                 VALUES (?, ?, ?, ?)'
            );
            $insLog->execute([$eventId, $eventType, $payload, now_utc()]);

            if ($eventType === 'checkout.session.completed') {
                self::activateFromCheckoutSession($obj);
            } elseif ($eventType === 'invoice.paid') {
                self::handleInvoicePaid($obj);
            } elseif ($eventType === 'invoice.payment_failed') {
                self::handleInvoicePaymentFailed($obj);
            } elseif ($eventType === 'customer.subscription.deleted') {
                self::handleSubscriptionDeleted($obj);
            } elseif ($eventType === 'charge.refunded') {
                self::handleChargeRefunded($obj);
            }

            $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log('Stripe webhook processing failed: ' . $e->getMessage());
            throw $e;
        }

        return ['received' => true, 'event_id' => $eventId, 'type' => $eventType];
    }

    private static function activateFromCheckoutSession(array $session): void
    {
        $pdo = db();
        $sessionId = (string) ($session['id'] ?? '');
        if ($sessionId === '') {
            return;
        }

        // Evita duplicar compra para a mesma Checkout Session
        $dup = $pdo->prepare('SELECT id FROM purchases WHERE stripe_session_id = ?');
        $dup->execute([$sessionId]);
        if ($dup->fetchColumn()) {
            return;
        }

        $userId = (int) ($session['client_reference_id'] ?? $session['metadata']['user_id'] ?? 0);
        $customerId = isset($session['customer']) && is_string($session['customer']) ? $session['customer'] : null;

        if ($userId <= 0 && $customerId) {
            $st = $pdo->prepare('SELECT id FROM users WHERE stripe_customer_id = ? AND deleted_at IS NULL');
            $st->execute([$customerId]);
            $userId = (int) $st->fetchColumn();
        }
        if ($userId <= 0) {
            return;
        }

        $plans = config('PLANS', []);
        $priceId = (string) ($session['metadata']['price_id'] ?? '');
        $planMeta = $plans[$priceId] ?? [];

        $planType = (string) ($session['metadata']['plan_type'] ?? $planMeta['type'] ?? 'trip_pass');
        if (!in_array($planType, ['day_pass', 'trip_pass', 'monthly', 'annual'], true)) {
            $planType = 'trip_pass';
        }
        $days = max(1, (int) ($session['metadata']['days'] ?? $planMeta['days'] ?? 14));

        $amountTotal = ((int) ($session['amount_total'] ?? 0)) / 100.0;
        $currency = strtoupper((string) ($session['currency'] ?? $planMeta['currency'] ?? 'USD'));
        $subId = isset($session['subscription'])
            ? (is_array($session['subscription']) ? ($session['subscription']['id'] ?? null) : (string) $session['subscription'])
            : null;
        $piId = isset($session['payment_intent'])
            ? (is_array($session['payment_intent']) ? ($session['payment_intent']['id'] ?? null) : (string) $session['payment_intent'])
            : null;

        $start = now_utc();
        $end = self::extendPremiumUntil($userId, $days, $customerId);

        $pdo->prepare(
            'INSERT INTO purchases
             (user_id, stripe_session_id, stripe_subscription_id, stripe_payment_intent_id, stripe_price_id,
              plan_type, status, currency, amount, current_period_start, current_period_end)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $userId,
            $sessionId,
            $subId,
            $piId,
            $priceId !== '' ? $priceId : $planType,
            $planType,
            'active',
            $currency,
            $amountTotal,
            $start,
            $end,
        ]);
    }

    private static function handleInvoicePaid(array $invoice): void
    {
        $subId = isset($invoice['subscription']) && is_string($invoice['subscription']) ? $invoice['subscription'] : '';
        $customerId = isset($invoice['customer']) && is_string($invoice['customer']) ? $invoice['customer'] : '';
        if ($subId === '' || $customerId === '') {
            return;
        }
        // Evita duplicar a primeira fatura caso checkout.session.completed já tenha ativado
        if (($invoice['billing_reason'] ?? '') === 'subscription_create') {
            return;
        }

        $pdo = db();
        $st = $pdo->prepare('SELECT id FROM users WHERE stripe_customer_id = ? AND deleted_at IS NULL');
        $st->execute([$customerId]);
        $userId = (int) $st->fetchColumn();
        if ($userId <= 0) {
            return;
        }

        $pSt = $pdo->prepare('SELECT plan_type, stripe_price_id FROM purchases WHERE stripe_subscription_id = ? ORDER BY id DESC LIMIT 1');
        $pSt->execute([$subId]);
        $prev = $pSt->fetch();
        $planType = $prev['plan_type'] ?? 'monthly';
        $days = $planType === 'annual' ? 365 : 30;

        $end = self::extendPremiumUntil($userId, $days, $customerId);
        $pdo->prepare(
            'UPDATE purchases SET status = ?, current_period_end = ? WHERE stripe_subscription_id = ?'
        )->execute(['active', $end, $subId]);
    }

    private static function handleInvoicePaymentFailed(array $invoice): void
    {
        $subId = isset($invoice['subscription']) && is_string($invoice['subscription']) ? $invoice['subscription'] : '';
        if ($subId === '') {
            return;
        }
        db()->prepare('UPDATE purchases SET status = ? WHERE stripe_subscription_id = ?')->execute(['past_due', $subId]);
    }

    private static function handleSubscriptionDeleted(array $sub): void
    {
        $subId = (string) ($sub['id'] ?? '');
        if ($subId === '') {
            return;
        }
        db()->prepare('UPDATE purchases SET status = ? WHERE stripe_subscription_id = ?')->execute(['canceled', $subId]);
    }

    private static function handleChargeRefunded(array $charge): void
    {
        $piId = isset($charge['payment_intent']) && is_string($charge['payment_intent']) ? $charge['payment_intent'] : '';
        if ($piId === '') {
            return;
        }
        $pdo = db();
        $st = $pdo->prepare('SELECT user_id FROM purchases WHERE stripe_payment_intent_id = ? LIMIT 1');
        $st->execute([$piId]);
        $userId = (int) $st->fetchColumn();

        $pdo->prepare('UPDATE purchases SET status = ? WHERE stripe_payment_intent_id = ?')->execute(['refunded', $piId]);
        if ($userId > 0) {
            $pdo->prepare('UPDATE users SET premium_until = NULL WHERE id = ?')->execute([$userId]);
        }
    }

    private static function extendPremiumUntil(int $userId, int $days, ?string $customerId = null): string
    {
        $pdo = db();
        $st = $pdo->prepare('SELECT premium_until FROM users WHERE id = ?');
        $st->execute([$userId]);
        $current = $st->fetchColumn();

        $baseTs = time();
        if (is_string($current) && $current !== '') {
            $curTs = strtotime($current . ' UTC');
            if ($curTs !== false && $curTs > $baseTs) {
                $baseTs = $curTs;
            }
        }
        $newUntil = gmdate('Y-m-d H:i:s', $baseTs + ($days * 86400));

        if ($customerId) {
            $pdo->prepare('UPDATE users SET premium_until = ?, stripe_customer_id = ? WHERE id = ?')
                ->execute([$newUntil, $customerId, $userId]);
        } else {
            $pdo->prepare('UPDATE users SET premium_until = ? WHERE id = ?')
                ->execute([$newUntil, $userId]);
        }

        return $newUntil;
    }
}
