<?php
declare(strict_types=1);

final class Request
{
    private const MAX_BODY = 65536;

    public array $params = [];
    /** Cache por requisição (ex.: usuário autenticado). */
    public array $attributes = [];
    private ?array $json = null;

    public function __construct(
        public readonly string $method,
        public readonly string $path,
        public readonly array $query,
        private readonly string $rawBody,
        private readonly array $server
    ) {
    }

    public static function fromGlobals(): self
    {
        $path = (string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
        $path = '/' . trim($path, '/');
        $raw = (string) file_get_contents('php://input', false, null, 0, self::MAX_BODY + 1);

        return new self(
            strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET'),
            $path,
            $_GET,
            $raw,
            $_SERVER
        );
    }

    public function input(): array
    {
        if ($this->json !== null) {
            return $this->json;
        }
        if (strlen($this->rawBody) > self::MAX_BODY) {
            throw new HttpException(413, 'payload_too_large');
        }
        if (trim($this->rawBody) === '') {
            return $this->json = [];
        }
        $data = json_decode($this->rawBody, true);
        if (!is_array($data)) {
            throw new HttpException(400, 'invalid_json', 'Request body must be a JSON object');
        }
        return $this->json = $data;
    }

    public function rawBody(): string
    {
        return $this->rawBody;
    }

    public function get(string $key, mixed $default = null): mixed
    {
        return $this->input()[$key] ?? $default;
    }

    public function query(string $key, ?string $default = null): ?string
    {
        $v = $this->query[$key] ?? $default;
        return is_string($v) ? $v : $default;
    }

    public function header(string $name): ?string
    {
        $key = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
        return $this->server[$key] ?? null;
    }

    public function bearerToken(): ?string
    {
        $h = $this->server['HTTP_AUTHORIZATION'] ?? $this->server['REDIRECT_HTTP_AUTHORIZATION'] ?? null;
        if ($h === null && function_exists('getallheaders')) {
            foreach (getallheaders() as $k => $v) {
                if (strcasecmp((string) $k, 'Authorization') === 0) {
                    $h = $v;
                }
            }
        }
        if (is_string($h) && preg_match('/^Bearer\s+(\S+)$/i', $h, $m)) {
            return $m[1];
        }
        return null;
    }

    public function ip(): string
    {
        return (string) ($this->server['REMOTE_ADDR'] ?? '0.0.0.0');
    }

    public function userAgent(): string
    {
        return substr((string) ($this->server['HTTP_USER_AGENT'] ?? ''), 0, 255);
    }

    public function isHttps(): bool
    {
        return (!empty($this->server['HTTPS']) && $this->server['HTTPS'] !== 'off')
            || (($this->server['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    }
}

