<?php
declare(strict_types=1);

/** Erro HTTP com código estável (o frontend traduz pelo "code"). */
class HttpException extends RuntimeException
{
    public function __construct(
        public readonly int $status,
        public readonly string $errorCode,
        string $message = '',
        public readonly array $fields = [],
        public readonly array $headers = []
    ) {
        parent::__construct($message !== '' ? $message : $errorCode);
    }
}

