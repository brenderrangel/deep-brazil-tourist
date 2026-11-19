<?php
declare(strict_types=1);

final class JsonResponse
{
    public function __construct(
        public readonly mixed $data,
        public readonly int $status = 200,
        public readonly array $headers = []
    ) {
    }

    public static function noContent(): self
    {
        return new self(null, 204);
    }

    public function send(): void
    {
        http_response_code($this->status);
        foreach ($this->headers as $name => $value) {
            header("$name: $value");
        }
        if ($this->status === 204) {
            return;
        }
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(
            $this->data,
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR
        );
    }
}

