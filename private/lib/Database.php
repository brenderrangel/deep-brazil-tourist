<?php
declare(strict_types=1);

final class Database
{
    private static ?PDO $pdo = null;

    public static function connection(): PDO
    {
        if (self::$pdo !== null) {
            return self::$pdo;
        }

        $cfg = config('DB');
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];

        if (self::driver() === 'sqlite') {
            $path = $cfg['sqlite_path'];
            if (!is_dir(dirname($path))) {
                mkdir(dirname($path), 0775, true);
            }
            $pdo = new PDO('sqlite:' . $path, null, null, $options);
            $pdo->exec('PRAGMA foreign_keys = ON');
            $pdo->exec('PRAGMA busy_timeout = 5000');
            self::$pdo = $pdo;
            self::ensureSqliteSchema($pdo);
        } else {
            $dsn = sprintf(
                'mysql:host=%s;port=%d;dbname=%s;charset=%s',
                $cfg['host'],
                (int) ($cfg['port'] ?? 3306),
                $cfg['name'],
                $cfg['charset'] ?? 'utf8mb4'
            );
            $pdo = new PDO($dsn, $cfg['user'], $cfg['pass'], $options);
            $pdo->exec("SET time_zone = '+00:00'");
            self::$pdo = $pdo;
        }

        return self::$pdo;
    }

    public static function driver(): string
    {
        return (string) config('DB.driver', 'mysql');
    }

    /** Cria schema e seed automaticamente no primeiro acesso (somente SQLite local). */
    private static function ensureSqliteSchema(PDO $pdo): void
    {
        $exists = $pdo->query("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")->fetchColumn();
        if ($exists) {
            // Garante migrações incrementais
            $hasConcierge = $pdo->query("SELECT name FROM sqlite_master WHERE type='table' AND name='concierge_requests'")->fetchColumn();
            if (!$hasConcierge) {
                $pdo->exec("
                    CREATE TABLE concierge_requests (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        destination TEXT NOT NULL,
                        travel_dates TEXT NULL,
                        travelers_count INTEGER NOT NULL DEFAULT 1,
                        budget_level TEXT NOT NULL DEFAULT 'moderate' CHECK (budget_level IN ('budget', 'moderate', 'luxury')),
                        interests TEXT NULL,
                        message TEXT NOT NULL,
                        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'answered')),
                        response_text TEXT NULL,
                        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        answered_at TEXT NULL
                    );
                    CREATE INDEX idx_concierge_user ON concierge_requests (user_id);
                    CREATE INDEX idx_concierge_status ON concierge_requests (status);
                ");
            }
            return;
        }
        $pdo->beginTransaction();
        try {
            foreach (['schema.sqlite.sql', 'seed.sql'] as $file) {
                $pdo->exec((string) file_get_contents(APP_ROOT . '/database/' . $file));
            }
            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }
}

