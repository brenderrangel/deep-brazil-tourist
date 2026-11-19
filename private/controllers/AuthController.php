<?php
declare(strict_types=1);

final class AuthController
{
    private const VERIFY_TTL = 172800; // 48 h
    private const RESET_TTL = 3600;    // 1 h

    public static function register(Request $req): JsonResponse
    {
        RateLimiter::hit('register|' . $req->ip(), 10, 3600);

        $v = new Validator($req->input());
        $name = $v->string('name', 2, 100);
        $email = $v->email('email');
        $password = $v->password('password');
        $country = $v->string('country_of_origin', 2, 50, false) ?? 'US';
        $lang = $v->in('preferred_language', config('SUPPORTED_LANGS'), 'en');
        $v->accepted('accept_terms');
        $v->accepted('accept_privacy');
        $marketing = $v->bool('marketing_opt_in');
        $v->validate();

        if (AuthService::findActiveUserByEmail($email)) {
            throw new HttpException(409, 'email_taken', 'E-mail already registered', ['email' => 'email_taken']);
        }

        $now = now_utc();
        $pdo = db();
        $pdo->prepare(
            'INSERT INTO users (name, email, password_hash, country_of_origin, preferred_language,
                terms_accepted_at, privacy_accepted_at, terms_version, marketing_opt_in, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $name, $email, AuthService::hashPassword($password), $country, $lang,
            $now, $now, config('TERMS_VERSION'), $marketing ? 1 : 0, $now, $now,
        ]);

        $user = AuthService::findActiveUserById((int) $pdo->lastInsertId());
        self::sendVerification($user);

        return new JsonResponse(AuthService::issueTokens($user, $req), 201);
    }

    public static function login(Request $req): array
    {
        $v = new Validator($req->input());
        $email = $v->email('email');
        $password = $req->get('password');
        if (!is_string($password) || $password === '') {
            $v->addError('password', 'required');
        }
        $v->validate();

        $key = 'login|' . $req->ip() . '|' . $email;
        RateLimiter::hit('login-ip|' . $req->ip(), 30, 900);
        RateLimiter::hit($key, 5, 900);

        $user = AuthService::findActiveUserByEmail($email);
        // sem usuário, gera um hash equivalente para manter tempo de resposta semelhante (anti-enumeração)
        $hash = $user['password_hash'] ?? AuthService::hashPassword(random_token(8));
        if (!password_verify($password, $hash) || !$user) {
            throw new HttpException(401, 'invalid_credentials', 'Invalid e-mail or password');
        }

        RateLimiter::clear($key);

        $updates = ['last_login_at = ?', 'updated_at = ?'];
        $params = [now_utc(), now_utc()];
        if (AuthService::needsRehash($user['password_hash'])) {
            $updates[] = 'password_hash = ?';
            $params[] = AuthService::hashPassword($password);
        }
        $params[] = $user['id'];
        db()->prepare('UPDATE users SET ' . implode(', ', $updates) . ' WHERE id = ?')->execute($params);
        AuthService::purgeExpiredTokens((int) $user['id']);

        return AuthService::issueTokens($user, $req);
    }

    public static function refresh(Request $req): array
    {
        RateLimiter::hit('refresh|' . $req->ip(), 60, 300);
        $token = $req->get('refresh_token');
        if (!is_string($token) || $token === '') {
            throw new HttpException(401, 'invalid_refresh_token');
        }
        return AuthService::rotateRefreshToken($token, $req);
    }

    public static function logout(Request $req): JsonResponse
    {
        $token = $req->get('refresh_token');
        if (is_string($token) && $token !== '') {
            AuthService::revokeRefreshToken($token);
        }
        return JsonResponse::noContent();
    }

    public static function verifyEmail(Request $req): array
    {
        RateLimiter::hit('verify|' . $req->ip(), 20, 3600);
        $row = self::consumeToken('email_verifications', (string) $req->get('token', ''));
        db()->prepare('UPDATE users SET email_verified_at = ?, updated_at = ? WHERE id = ? AND email_verified_at IS NULL')
            ->execute([now_utc(), now_utc(), $row['user_id']]);
        return ['verified' => true];
    }

    public static function resendVerification(Request $req): array
    {
        $user = AuthService::user($req);
        RateLimiter::hit('resend-verify|' . $user['id'], 3, 3600);
        if ($user['email_verified_at'] === null) {
            self::sendVerification($user);
        }
        return ['sent' => true];
    }

    public static function forgotPassword(Request $req): array
    {
        $v = new Validator($req->input());
        $email = $v->email('email');
        $v->validate();

        RateLimiter::hit('forgot-ip|' . $req->ip(), 10, 3600);
        RateLimiter::hit('forgot|' . $email, 3, 3600);

        $user = AuthService::findActiveUserByEmail($email);
        if ($user) {
            $token = random_token(32);
            db()->prepare('INSERT INTO password_resets (user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?)')
                ->execute([$user['id'], token_hash($token), now_utc(self::RESET_TTL), now_utc()]);

            [$subject, $body] = Mailer::template('reset', (string) $user['preferred_language'], [
                'name' => $user['name'],
                'link' => rtrim((string) config('APP_URL'), '/') . '/#/reset-password?token=' . $token,
            ]);
            Mailer::send($user['email'], $subject, $body);
        }

        // resposta idêntica exista ou não o e-mail (evita enumeração)
        return ['sent' => true];
    }

    public static function resetPassword(Request $req): array
    {
        RateLimiter::hit('reset|' . $req->ip(), 10, 3600);
        $v = new Validator($req->input());
        $password = $v->password('password');
        $v->validate();

        $pdo = db();
        $pdo->beginTransaction();
        try {
            $row = self::consumeToken('password_resets', (string) $req->get('token', ''));
            $pdo->prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
                ->execute([AuthService::hashPassword($password), now_utc(), $row['user_id']]);
            AuthService::revokeAllForUser((int) $row['user_id']);
            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
        return ['reset' => true];
    }

    private static function sendVerification(array $user): void
    {
        $token = random_token(32);
        db()->prepare('INSERT INTO email_verifications (user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?)')
            ->execute([$user['id'], token_hash($token), now_utc(self::VERIFY_TTL), now_utc()]);

        [$subject, $body] = Mailer::template('verify', (string) $user['preferred_language'], [
            'name' => $user['name'],
            'link' => rtrim((string) config('APP_URL'), '/') . '/#/verify-email?token=' . $token,
        ]);
        Mailer::send($user['email'], $subject, $body);
    }

    /** Marca um token de uso único como usado e retorna a linha; 400 se inválido/expirado. */
    private static function consumeToken(string $table, string $token): array
    {
        if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
            throw new HttpException(400, 'invalid_token', 'Invalid or expired link');
        }
        $pdo = db();
        $st = $pdo->prepare("SELECT * FROM $table WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?");
        $st->execute([token_hash($token), now_utc()]);
        $row = $st->fetch();
        if (!$row) {
            throw new HttpException(400, 'invalid_token', 'Invalid or expired link');
        }
        $upd = $pdo->prepare("UPDATE $table SET used_at = ? WHERE id = ? AND used_at IS NULL");
        $upd->execute([now_utc(), $row['id']]);
        if ($upd->rowCount() !== 1) {
            throw new HttpException(400, 'invalid_token', 'Invalid or expired link');
        }
        return $row;
    }
}
