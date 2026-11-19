<?php
declare(strict_types=1);

final class MeController
{
    public static function show(Request $req): array
    {
        return ['user' => AuthService::publicUser(AuthService::user($req))];
    }

    public static function update(Request $req): array
    {
        $user = AuthService::user($req);
        $data = $req->input();
        $v = new Validator($data);
        $fields = [];

        if (array_key_exists('name', $data)) {
            $fields['name'] = $v->string('name', 2, 100);
        }
        if (array_key_exists('country_of_origin', $data)) {
            $fields['country_of_origin'] = $v->string('country_of_origin', 2, 50);
        }
        if (array_key_exists('preferred_language', $data)) {
            $fields['preferred_language'] = $v->in('preferred_language', config('SUPPORTED_LANGS'));
        }
        if (array_key_exists('marketing_opt_in', $data)) {
            $fields['marketing_opt_in'] = $v->bool('marketing_opt_in') ? 1 : 0;
        }
        $v->validate();

        if ($fields) {
            $sets = implode(', ', array_map(static fn ($k) => "$k = ?", array_keys($fields)));
            $params = [...array_values($fields), now_utc(), $user['id']];
            db()->prepare("UPDATE users SET $sets, updated_at = ? WHERE id = ?")->execute($params);
        }
        return ['user' => AuthService::publicUser(AuthService::findActiveUserById((int) $user['id']))];
    }

    /** Exclusão por anonimização (LGPD/GDPR), preservando registros financeiros. */
    public static function destroy(Request $req): JsonResponse
    {
        $user = AuthService::user($req);
        $password = $req->get('password');
        if (!is_string($password) || !password_verify($password, $user['password_hash'])) {
            throw new HttpException(403, 'invalid_credentials', 'Password confirmation failed');
        }

        $pdo = db();
        $pdo->beginTransaction();
        try {
            $pdo->prepare(
                'UPDATE users SET name = ?, email = ?, password_hash = ?, country_of_origin = NULL,
                    marketing_opt_in = 0, email_verified_at = NULL, deleted_at = ?, updated_at = ?
                  WHERE id = ?'
            )->execute([
                'Deleted user',
                'deleted+' . $user['id'] . '.' . random_token(4) . '@invalid.local',
                AuthService::hashPassword(random_token(16)),
                now_utc(),
                now_utc(),
                $user['id'],
            ]);
            AuthService::revokeAllForUser((int) $user['id']);
            $pdo->prepare('DELETE FROM password_resets WHERE user_id = ?')->execute([$user['id']]);
            $pdo->prepare('DELETE FROM email_verifications WHERE user_id = ?')->execute([$user['id']]);
            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
        return JsonResponse::noContent();
    }

    public static function export(Request $req): JsonResponse
    {
        $user = AuthService::user($req);
        $st = db()->prepare(
            'SELECT plan_type, status, currency, amount, current_period_start, current_period_end, created_at
               FROM purchases WHERE user_id = ? ORDER BY id'
        );
        $st->execute([$user['id']]);

        $profile = $user;
        unset($profile['password_hash']);

        return new JsonResponse(
            ['exported_at' => gmdate('c'), 'profile' => $profile, 'purchases' => $st->fetchAll()],
            200,
            ['Content-Disposition' => 'attachment; filename="my-data.json"']
        );
    }
}

