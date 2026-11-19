<?php
declare(strict_types=1);

final class AuthService
{
    /** Janela em que um refresh token recém-rotacionado não dispara detecção de reuso (multi-aba). */
    private const ROTATION_GRACE = 30;

    public static function hashPassword(string $password): string
    {
        return defined('PASSWORD_ARGON2ID')
            ? password_hash($password, PASSWORD_ARGON2ID)
            : password_hash($password, PASSWORD_BCRYPT);
    }

    public static function needsRehash(string $hash): bool
    {
        return password_needs_rehash($hash, defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_BCRYPT);
    }

    public static function findActiveUserById(int $id): ?array
    {
        $st = db()->prepare('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL');
        $st->execute([$id]);
        return $st->fetch() ?: null;
    }

    public static function findActiveUserByEmail(string $email): ?array
    {
        $st = db()->prepare('SELECT * FROM users WHERE email = ? AND deleted_at IS NULL');
        $st->execute([strtolower($email)]);
        return $st->fetch() ?: null;
    }

    public static function createAccessToken(array $user): string
    {
        $now = time();
        return Jwt::encode([
            'iss' => config('APP_URL'),
            'sub' => (int) $user['id'],
            'role' => $user['role'],
            'typ' => 'access',
            'iat' => $now,
            'exp' => $now + (int) config('JWT_TTL', 900),
        ], (string) config('JWT_SECRET'));
    }

    /** Emite access token + refresh token (guardado apenas como hash). */
    public static function issueTokens(array $user, Request $request): array
    {
        $refresh = random_token(32);
        db()->prepare(
            'INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, created_at) VALUES (?, ?, ?, ?, ?)'
        )->execute([
            (int) $user['id'],
            token_hash($refresh),
            now_utc((int) config('REFRESH_TTL', 2592000)),
            $request->userAgent(),
            now_utc(),
        ]);

        return [
            'access_token' => self::createAccessToken($user),
            'refresh_token' => $refresh,
            'token_type' => 'Bearer',
            'expires_in' => (int) config('JWT_TTL', 900),
            'user' => self::publicUser($user),
        ];
    }

    /** Rotação de refresh token com detecção de reuso. */
    public static function rotateRefreshToken(string $token, Request $request): array
    {
        $pdo = db();
        $st = $pdo->prepare('SELECT * FROM refresh_tokens WHERE token_hash = ?');
        $st->execute([token_hash($token)]);
        $row = $st->fetch();

        if (!$row) {
            throw new HttpException(401, 'invalid_refresh_token');
        }
        if ($row['revoked_at'] !== null) {
            if (time() - (int) db_time($row['revoked_at']) > self::ROTATION_GRACE) {
                // token antigo reutilizado: possível roubo -> encerra todas as sessões
                self::revokeAllForUser((int) $row['user_id']);
            }
            throw new HttpException(401, 'invalid_refresh_token');
        }
        if ((int) db_time($row['expires_at']) < time()) {
            throw new HttpException(401, 'refresh_token_expired');
        }

        $user = self::findActiveUserById((int) $row['user_id']);
        if (!$user) {
            throw new HttpException(401, 'invalid_refresh_token');
        }

        $upd = $pdo->prepare('UPDATE refresh_tokens SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL');
        $upd->execute([now_utc(), $row['id']]);
        if ($upd->rowCount() !== 1) {
            throw new HttpException(401, 'invalid_refresh_token');
        }

        return self::issueTokens($user, $request);
    }

    public static function revokeRefreshToken(string $token): void
    {
        db()->prepare('UPDATE refresh_tokens SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL')
            ->execute([now_utc(), token_hash($token)]);
    }

    public static function revokeAllForUser(int $userId): void
    {
        db()->prepare('UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL')
            ->execute([now_utc(), $userId]);
    }

    public static function purgeExpiredTokens(int $userId): void
    {
        db()->prepare('DELETE FROM refresh_tokens WHERE user_id = ? AND expires_at < ?')
            ->execute([$userId, now_utc(-86400)]);
    }

    /**
     * Usuário autenticado pelo JWT. Com $required=false, retorna null se não houver token,
     * mas um token inválido/expirado sempre gera 401 (o cliente deve renovar).
     */
    public static function user(Request $request, bool $required = true): ?array
    {
        if (array_key_exists('user', $request->attributes)) {
            return $request->attributes['user'];
        }
        $token = $request->bearerToken();
        if ($token === null) {
            if ($required) {
                throw new HttpException(401, 'unauthenticated', 'Authentication required');
            }
            return $request->attributes['user'] = null;
        }
        try {
            $payload = Jwt::decode($token, (string) config('JWT_SECRET'));
        } catch (JwtException $e) {
            throw new HttpException(401, $e->getMessage() === 'expired' ? 'token_expired' : 'invalid_token');
        }
        if (($payload['typ'] ?? '') !== 'access') {
            throw new HttpException(401, 'invalid_token');
        }
        $user = self::findActiveUserById((int) ($payload['sub'] ?? 0));
        if (!$user) {
            throw new HttpException(401, 'invalid_token');
        }
        return $request->attributes['user'] = $user;
    }

    public static function requireAdmin(Request $request): array
    {
        $user = self::user($request);
        if ($user['role'] !== 'admin') {
            throw new HttpException(403, 'forbidden');
        }
        return $user;
    }

    public static function isPremium(?array $user): bool
    {
        if (!$user || empty($user['premium_until'])) {
            return false;
        }
        return (int) db_time($user['premium_until']) > time();
    }

    public static function publicUser(array $user): array
    {
        return [
            'id' => (int) $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'role' => $user['role'],
            'country_of_origin' => $user['country_of_origin'],
            'preferred_language' => $user['preferred_language'],
            'email_verified' => $user['email_verified_at'] !== null,
            'is_premium' => self::isPremium($user),
            'premium_until' => iso_time($user['premium_until']),
            'marketing_opt_in' => (bool) $user['marketing_opt_in'],
            'created_at' => iso_time($user['created_at']),
        ];
    }
}

