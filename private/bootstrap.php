<?php
declare(strict_types=1);

define('APP_ROOT', dirname(__DIR__));
define('PRIVATE_PATH', __DIR__);

$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo '{"error":{"code":"config_missing","message":"Server not configured"}}';
    exit;
}
$GLOBALS['__config'] = require $configFile;

date_default_timezone_set('UTC');

$logDir = __DIR__ . '/storage/logs';
if (!is_dir($logDir)) {
    @mkdir($logDir, 0775, true);
}
ini_set('log_errors', '1');
ini_set('display_errors', '0');
if (is_dir($logDir) && is_writable($logDir)) {
    ini_set('error_log', $logDir . '/app.log');
}

require __DIR__ . '/lib/helpers.php';

spl_autoload_register(static function (string $class): void {
    foreach (['lib', 'controllers'] as $dir) {
        $file = __DIR__ . "/$dir/$class.php";
        if (is_file($file)) {
            require $file;
            return;
        }
    }
});

if (is_production() && strlen((string) config('JWT_SECRET')) < 32) {
    error_log('JWT_SECRET ausente ou fraco em produção');
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo '{"error":{"code":"jwt_secret_weak","message":"JWT_SECRET must have at least 32 characters in private/config.php"}}';
    exit;
}

