<?php
// Promove um usuário a administrador.
// Uso: php private/cli/make-admin.php email@exemplo.com
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    exit(1);
}
require __DIR__ . '/../bootstrap.php';

$email = strtolower(trim($argv[1] ?? ''));
if ($email === '') {
    fwrite(STDERR, "Uso: php private/cli/make-admin.php email@exemplo.com\n");
    exit(1);
}
$st = db()->prepare("UPDATE users SET role = 'admin', updated_at = ? WHERE email = ? AND deleted_at IS NULL");
$st->execute([now_utc(), $email]);
echo $st->rowCount() ? "OK: $email agora é admin.\n" : "Usuário não encontrado: $email\n";

