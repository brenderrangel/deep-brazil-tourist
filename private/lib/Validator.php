<?php
declare(strict_types=1);

/** Validação simples; mensagens são códigos estáveis traduzidos no frontend. */
final class Validator
{
    private array $errors = [];

    public function __construct(private readonly array $data)
    {
    }

    public function string(string $field, int $min, int $max, bool $required = true): ?string
    {
        $v = $this->data[$field] ?? null;
        if ($v === null || (is_string($v) && trim($v) === '')) {
            if ($required) {
                $this->errors[$field] = 'required';
            }
            return null;
        }
        if (!is_string($v)) {
            $this->errors[$field] = 'invalid_value';
            return null;
        }
        $v = trim($v);
        $len = mb_strlen($v);
        if ($len < $min) {
            $this->errors[$field] = 'too_short';
        } elseif ($len > $max) {
            $this->errors[$field] = 'too_long';
        }
        return $v;
    }

    public function email(string $field): ?string
    {
        $v = $this->string($field, 3, 150);
        if ($v !== null && !isset($this->errors[$field]) && !filter_var($v, FILTER_VALIDATE_EMAIL)) {
            $this->errors[$field] = 'invalid_email';
        }
        return $v === null ? null : strtolower($v);
    }

    /** Senha: 8–72 caracteres (limite do bcrypt), com letra e número. Não faz trim. */
    public function password(string $field): ?string
    {
        $v = $this->data[$field] ?? null;
        if (!is_string($v) || $v === '') {
            $this->errors[$field] = 'required';
            return null;
        }
        if (strlen($v) < 8) {
            $this->errors[$field] = 'too_short';
        } elseif (strlen($v) > 72) {
            $this->errors[$field] = 'too_long';
        } elseif (!preg_match('/\pL/u', $v) || !preg_match('/\d/', $v)) {
            $this->errors[$field] = 'weak_password';
        }
        return $v;
    }

    public function in(string $field, array $allowed, mixed $default = null): mixed
    {
        $v = $this->data[$field] ?? $default;
        if (!in_array($v, $allowed, true)) {
            $this->errors[$field] = 'invalid_value';
        }
        return $v;
    }

    public function bool(string $field): bool
    {
        return filter_var($this->data[$field] ?? false, FILTER_VALIDATE_BOOLEAN);
    }

    public function accepted(string $field): bool
    {
        $ok = ($this->data[$field] ?? false) === true;
        if (!$ok) {
            $this->errors[$field] = 'must_accept';
        }
        return $ok;
    }

    public function addError(string $field, string $code): void
    {
        $this->errors[$field] = $code;
    }

    public function validate(): void
    {
        if ($this->errors) {
            throw new HttpException(422, 'validation_error', 'Invalid input', $this->errors);
        }
    }
}

