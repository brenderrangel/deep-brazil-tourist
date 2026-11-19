<?php
// Roteador APENAS para o servidor embutido do PHP (desenvolvimento local).
// Em produção (Hostinger), o public_html/.htaccess faz o mesmo papel.
declare(strict_types=1);

$uri = urldecode((string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH));

if ($uri === '/api' || str_starts_with($uri, '/api/')) {
    require __DIR__ . '/public_html/api/index.php';
    return true;
}

$file = realpath(__DIR__ . '/public_html' . $uri);
$publicRoot = realpath(__DIR__ . '/public_html');

if ($uri !== '/' && $file !== false && str_starts_with($file, $publicRoot) && is_file($file)) {
    $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
    if ($ext === 'webmanifest') {
        header('Content-Type: application/manifest+json; charset=utf-8');
        readfile($file);
        return true;
    }
    if ($ext === 'json') {
        header('Content-Type: application/json; charset=utf-8');
        readfile($file);
        return true;
    }
    if (basename($file) === 'sw.js') {
        header('Content-Type: text/javascript; charset=utf-8');
        header('Cache-Control: no-cache');
        readfile($file);
        return true;
    }
    return false; // servidor embutido entrega o arquivo estático
}

header('Content-Type: text/html; charset=utf-8');
readfile(__DIR__ . '/public_html/index.html');
return true;

