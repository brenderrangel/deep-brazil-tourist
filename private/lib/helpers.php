<?php
declare(strict_types=1);

function config(string $key, mixed $default = null): mixed
{
    $value = $GLOBALS['__config'] ?? [];
    foreach (explode('.', $key) as $part) {
        if (!is_array($value) || !array_key_exists($part, $value)) {
            return $default;
        }
        $value = $value[$part];
    }
    return $value;
}

function is_production(): bool
{
    return config('APP_ENV') === 'production';
}

function db(): PDO
{
    return Database::connection();
}

/** Data/hora UTC no formato do banco, com deslocamento opcional em segundos. */
function now_utc(int $offsetSeconds = 0): string
{
    return gmdate('Y-m-d H:i:s', time() + $offsetSeconds);
}

/** Converte DATETIME UTC do banco para timestamp. */
function db_time(?string $value): ?int
{
    if ($value === null || $value === '') {
        return null;
    }
    $ts = strtotime($value . ' UTC');
    return $ts === false ? null : $ts;
}

/** DATETIME UTC do banco -> ISO 8601 para a API. */
function iso_time(?string $value): ?string
{
    $ts = db_time($value);
    return $ts === null ? null : gmdate('c', $ts);
}

function random_token(int $bytes = 32): string
{
    return bin2hex(random_bytes($bytes));
}

function token_hash(string $token): string
{
    return hash('sha256', $token);
}

function supported_lang(?string $lang): string
{
    $lang = strtolower(substr((string) $lang, 0, 2));
    return in_array($lang, config('SUPPORTED_LANGS', ['en']), true) ? $lang : 'en';
}

