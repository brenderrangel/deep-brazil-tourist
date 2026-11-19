<?php
// Front controller da API. Todas as rotas /api/* chegam aqui (via .htaccess ou router.php).
// Compatível com PHP 7+ no parse para conseguir devolver diagnóstico JSON claro
// (em vez de um 500 vazio) quando o backend não está completo no servidor.
declare(strict_types=1);

function btc_fail($status, $code, $message)
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode(array('error' => array('code' => $code, 'message' => $message)));
    exit;
}

if (PHP_VERSION_ID < 80100) {
    btc_fail(500, 'php_version_unsupported', 'PHP 8.1 or newer is required (running ' . PHP_MAJOR_VERSION . '.' . PHP_MINOR_VERSION . '). Change it in hPanel > PHP Configuration.');
}

// Procura a pasta private/ (backend). Padrão: ao lado de public_html/ (fora da raiz pública).
$candidates = array();
$envPath = getenv('BTC_PRIVATE_PATH');
if (is_string($envPath) && $envPath !== '') {
    $candidates[] = $envPath;
}
$candidates[] = __DIR__ . '/../../private';
$candidates[] = __DIR__ . '/../private';

$privatePath = null;
foreach ($candidates as $dir) {
    if (is_file($dir . '/bootstrap.php')) {
        $privatePath = $dir;
        break;
    }
}
if ($privatePath === null) {
    btc_fail(500, 'private_not_found', 'Backend folder "private/" was not found next to "public_html/". Upload it to the same level as public_html (see DEPLOY_HOSTINGER.md).');
}

try {
    require $privatePath . '/bootstrap.php';
} catch (Throwable $e) {
    error_log('[bootstrap] ' . get_class($e) . ': ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
    btc_fail(500, 'bootstrap_failed', 'Backend failed to start. Check private/storage/logs/app.log.');
}

App::run(require PRIVATE_PATH . '/routes.php');
