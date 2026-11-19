<?php
declare(strict_types=1);

/** JWT HS256 mínimo, sem dependências. */
final class Jwt
{
    public static function encode(array $payload, string $secret): string
    {
        $header = ['alg' => 'HS256', 'typ' => 'JWT'];
        $segments = [
            self::b64(json_encode($header, JSON_THROW_ON_ERROR)),
            self::b64(json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)),
        ];
        $segments[] = self::b64(hash_hmac('sha256', implode('.', $segments), $secret, true));
        return implode('.', $segments);
    }

    /**
     * @throws JwtException
     */
    public static function decode(string $jwt, string $secret, int $leeway = 30): array
    {
        $parts = explode('.', $jwt);
        if (count($parts) !== 3) {
            throw new JwtException('malformed');
        }
        [$h, $p, $s] = $parts;

        $header = json_decode(self::unb64($h), true);
        if (!is_array($header) || ($header['alg'] ?? '') !== 'HS256') {
            throw new JwtException('unsupported_alg');
        }
        $expected = hash_hmac('sha256', "$h.$p", $secret, true);
        if (!hash_equals($expected, self::unb64($s))) {
            throw new JwtException('bad_signature');
        }
        $payload = json_decode(self::unb64($p), true);
        if (!is_array($payload)) {
            throw new JwtException('malformed');
        }
        $now = time();
        if (isset($payload['nbf']) && $payload['nbf'] > $now + $leeway) {
            throw new JwtException('not_yet_valid');
        }
        if (!isset($payload['exp']) || $payload['exp'] < $now - $leeway) {
            throw new JwtException('expired');
        }
        return $payload;
    }

    private static function b64(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function unb64(string $data): string
    {
        $data .= str_repeat('=', (4 - strlen($data) % 4) % 4);
        return (string) base64_decode(strtr($data, '-_', '+/'), true);
    }
}

final class JwtException extends RuntimeException
{
}

