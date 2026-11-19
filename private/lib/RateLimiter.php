<?php
declare(strict_types=1);

/** Rate limiting por janela fixa, persistido no banco (funciona em hospedagem compartilhada). */
final class RateLimiter
{
    public static function hit(string $key, int $max, int $windowSeconds): void
    {
        $pdo = db();
        $k = token_hash($key);
        $now = time();

        $st = $pdo->prepare('SELECT hits, window_start FROM rate_limits WHERE rl_key = ?');
        $st->execute([$k]);
        $row = $st->fetch();

        if (!$row) {
            try {
                $pdo->prepare('INSERT INTO rate_limits (rl_key, hits, window_start) VALUES (?, 1, ?)')
                    ->execute([$k, now_utc()]);
                return;
            } catch (PDOException) {
                // corrida: outra requisição inseriu antes; segue para o fluxo de update
                $st->execute([$k]);
                $row = $st->fetch() ?: ['hits' => 0, 'window_start' => now_utc()];
            }
        }

        $elapsed = $now - (int) db_time($row['window_start']);
        if ($elapsed >= $windowSeconds) {
            $pdo->prepare('UPDATE rate_limits SET hits = 1, window_start = ? WHERE rl_key = ?')
                ->execute([now_utc(), $k]);
            return;
        }
        if ((int) $row['hits'] >= $max) {
            throw new HttpException(
                429,
                'too_many_requests',
                'Too many attempts. Try again later.',
                [],
                ['Retry-After' => (string) max(1, $windowSeconds - $elapsed)]
            );
        }
        $pdo->prepare('UPDATE rate_limits SET hits = hits + 1 WHERE rl_key = ?')->execute([$k]);
    }

    public static function clear(string $key): void
    {
        db()->prepare('DELETE FROM rate_limits WHERE rl_key = ?')->execute([token_hash($key)]);
    }
}

