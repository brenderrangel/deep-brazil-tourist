<?php
// Teste de fumaça da API sem rede: cada requisição roda em um processo php-cgi.
// Uso: php -c php-local.ini tests/smoke.php
declare(strict_types=1);

$root = dirname(__DIR__);
$cgi = dirname(PHP_BINARY) . DIRECTORY_SEPARATOR . 'php-cgi.exe';
if (!is_file($cgi)) {
    $cgi = dirname(PHP_BINARY) . DIRECTORY_SEPARATOR . 'php-cgi';
}
$ini = $root . '/php-local.ini';

// banco limpo
foreach (glob($root . '/private/storage/database.sqlite*') as $f) { unlink($f); }
@unlink($root . '/private/storage/logs/mail.log');

$pass = 0; $fail = 0;

function req(string $method, string $uri, ?array $body = null, ?string $token = null): array
{
    global $cgi, $ini, $root;
    $payload = $body === null ? '' : json_encode($body);
    $env = [
        'REDIRECT_STATUS' => '200',
        'GATEWAY_INTERFACE' => 'CGI/1.1',
        'SCRIPT_FILENAME' => $root . '/public_html/api/index.php',
        'REQUEST_METHOD' => $method,
        'REQUEST_URI' => $uri,
        'QUERY_STRING' => (string) parse_url($uri, PHP_URL_QUERY),
        'CONTENT_TYPE' => 'application/json',
        'CONTENT_LENGTH' => (string) strlen($payload),
        'REMOTE_ADDR' => '127.0.0.1',
        'HTTP_USER_AGENT' => 'smoke-test',
        'SystemRoot' => getenv('SystemRoot') ?: 'C:\\Windows',
    ];
    if ($token) { $env['HTTP_AUTHORIZATION'] = 'Bearer ' . $token; }

    $proc = proc_open([$cgi, '-c', $ini], [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes, $root, $env);
    fwrite($pipes[0], $payload);
    fclose($pipes[0]);
    $out = stream_get_contents($pipes[1]);
    $err = stream_get_contents($pipes[2]);
    proc_close($proc);

    [$head, $content] = array_pad(preg_split("/\r?\n\r?\n/", $out, 2), 2, '');
    $status = 200;
    if (preg_match('/^Status:\s*(\d+)/mi', $head, $m)) { $status = (int) $m[1]; }
    return ['status' => $status, 'json' => json_decode($content, true), 'raw' => $content, 'head' => $head, 'err' => $err];
}

function check(string $label, bool $ok, string $extra = ''): void
{
    global $pass, $fail;
    $ok ? $pass++ : $fail++;
    echo ($ok ? '  OK   ' : '  FAIL ') . $label . ($ok || $extra === '' ? '' : "  => $extra") . PHP_EOL;
}

$r = req('GET', '/api/health');
check('health 200', $r['status'] === 200 && ($r['json']['status'] ?? '') === 'ok', $r['raw'] . $r['err']);

$r = req('POST', '/api/auth/register', ['name' => 'Ana', 'email' => 'Ana@Test.com', 'password' => 'senha1234', 'preferred_language' => 'pt', 'accept_terms' => true, 'accept_privacy' => true]);
check('register 201', $r['status'] === 201 && isset($r['json']['access_token']), $r['raw']);
check('email normalizado', ($r['json']['user']['email'] ?? '') === 'ana@test.com');

$r = req('POST', '/api/auth/register', ['name' => 'Ana', 'email' => 'ana@test.com', 'password' => 'senha1234', 'accept_terms' => true, 'accept_privacy' => true]);
check('register duplicado 409', $r['status'] === 409, $r['raw']);

$r = req('POST', '/api/auth/register', ['name' => 'A', 'email' => 'x', 'password' => 'abc']);
check('register inválido 422', $r['status'] === 422 && isset($r['json']['error']['fields']['accept_terms']), $r['raw']);

$r = req('POST', '/api/auth/login', ['email' => 'ana@test.com', 'password' => 'errada123']);
check('login senha errada 401', $r['status'] === 401, $r['raw']);

$r = req('POST', '/api/auth/login', ['email' => 'ana@test.com', 'password' => 'senha1234']);
check('login 200', $r['status'] === 200 && isset($r['json']['refresh_token']), $r['raw']);
$access = $r['json']['access_token'] ?? '';
$refresh = $r['json']['refresh_token'] ?? '';

$r = req('GET', '/api/me', null, $access);
check('GET /me com JWT', $r['status'] === 200 && ($r['json']['user']['is_premium'] ?? null) === false, $r['raw']);

$r = req('GET', '/api/me');
check('GET /me sem JWT 401', $r['status'] === 401);

$r = req('GET', '/api/me', null, $access . 'x');
check('JWT adulterado 401', $r['status'] === 401);

$r = req('PUT', '/api/me', ['preferred_language' => 'es'], $access);
check('PUT /me', $r['status'] === 200 && ($r['json']['user']['preferred_language'] ?? '') === 'es', $r['raw']);

$r = req('POST', '/api/auth/refresh', ['refresh_token' => $refresh]);
check('refresh rotaciona', $r['status'] === 200 && ($r['json']['refresh_token'] ?? '') !== $refresh, $r['raw']);
$refresh2 = $r['json']['refresh_token'] ?? '';

$r = req('POST', '/api/auth/refresh', ['refresh_token' => $refresh]);
check('refresh antigo rejeitado', $r['status'] === 401);

$r = req('GET', '/api/phrasebook?lang=es&category=emergency');
$p = $r['json']['phrases'] ?? [];
check('phrasebook es/emergency', $r['status'] === 200 && count($p) >= 7 && $p[0]['pt'] === 'Socorro!' && $p[0]['text'] === '¡Socorro!', $r['raw']);

$r = req('GET', '/api/phrasebook?category=xyz');
check('phrasebook categoria inválida 422', $r['status'] === 422);

$r = req('GET', '/api/itineraries?lang=es');
$its = $r['json']['itineraries'] ?? [];
check('itineraries lista (fallback en)', count($its) >= 3 && $its[0]['lang'] === 'en', $r['raw']);
check('premium bloqueado na lista', ($its[2]['locked'] ?? null) === true);

$r = req('GET', '/api/itineraries/3?lang=pt', null, $access);
check('premium sem acesso: content null', $r['status'] === 200 && $r['json']['itinerary']['locked'] === true && $r['json']['itinerary']['content'] === null, $r['raw']);

// concede premium direto no banco para validar a regra premium_until
require $root . '/private/bootstrap.php';
db()->prepare('UPDATE users SET premium_until = ? WHERE email = ?')->execute([now_utc(86400), 'ana@test.com']);
$r = req('GET', '/api/itineraries/3?lang=pt', null, $access);
check('premium com acesso: content liberado', ($r['json']['itinerary']['content']['days'][0]['day'] ?? 0) === 1, $r['raw']);

$r = req('GET', '/api/itineraries/1?lang=pt');
check('roteiro grátis: 3 dias', count($r['json']['itinerary']['content']['days'] ?? []) === 3, $r['raw']);

$r = req('GET', '/api/itineraries/999');
check('roteiro inexistente 404', $r['status'] === 404);

$r = req('GET', '/api/nada');
check('rota inexistente 404', $r['status'] === 404);

$r = req('DELETE', '/api/auth/login');
check('método errado 405', $r['status'] === 405);

$r = req('POST', '/api/auth/forgot-password', ['email' => 'ana@test.com']);
check('forgot-password 200', $r['status'] === 200);
$r = req('POST', '/api/auth/forgot-password', ['email' => 'naoexiste@test.com']);
check('forgot-password e-mail inexistente também 200', $r['status'] === 200);

$mail = (string) @file_get_contents($root . '/private/storage/logs/mail.log');
preg_match('/verify-email\?token=([a-f0-9]{64})/', $mail, $mv);
preg_match('/reset-password\?token=([a-f0-9]{64})/', $mail, $mr);

$r = req('POST', '/api/auth/verify-email', ['token' => $mv[1] ?? '']);
check('verify-email 200', $r['status'] === 200, $r['raw']);
$r = req('POST', '/api/auth/verify-email', ['token' => $mv[1] ?? '']);
check('verify-email reuso 400', $r['status'] === 400);

$r = req('POST', '/api/auth/reset-password', ['token' => $mr[1] ?? '', 'password' => 'novaSenha99']);
check('reset-password 200', $r['status'] === 200, $r['raw']);
$r = req('POST', '/api/auth/refresh', ['refresh_token' => $refresh2]);
check('reset revoga sessões', $r['status'] === 401);

$r = req('POST', '/api/auth/login', ['email' => 'ana@test.com', 'password' => 'novaSenha99']);
check('login com nova senha', $r['status'] === 200, $r['raw']);
$access = $r['json']['access_token'] ?? '';

$r = req('GET', '/api/me/export', null, $access);
check('export sem password_hash', $r['status'] === 200 && !isset($r['json']['profile']['password_hash']), $r['raw']);

$codes = [];
for ($i = 0; $i < 6; $i++) {
    $codes[] = req('POST', '/api/auth/login', ['email' => 'ana@test.com', 'password' => "bad{$i}xxxxx1"])['status'];
}
check('rate limit login (429)', end($codes) === 429, implode(',', $codes));

$r = req('DELETE', '/api/me', ['password' => 'errada'], $access);
check('delete com senha errada 403', $r['status'] === 403);
$r = req('DELETE', '/api/me', ['password' => 'novaSenha99'], $access);
check('delete 204', $r['status'] === 204, $r['raw']);
$r = req('GET', '/api/me', null, $access);
check('conta anonimizada não autentica', $r['status'] === 401);
$row = db()->query("SELECT name, email, deleted_at FROM users WHERE id = 1")->fetch();
check('dados anonimizados', $row['name'] === 'Deleted user' && str_ends_with($row['email'], '@invalid.local') && $row['deleted_at'] !== null);

// Testes dos novos módulos (Módulos 3, 4 e 5)
$r = req('GET', '/api/rates?base=USD');
check('rates USD 200', $r['status'] === 200 && isset($r['json']['rate_to_brl']), $r['raw']);
check('rates spreads calculados', isset($r['json']['spreads']['cash_estimated']));

$r = req('GET', '/api/guides/arrival?lang=pt');
check('guides arrival 200', $r['status'] === 200 && count($r['json']['airports'] ?? []) === 4, $r['raw']);
check('arrival aeroportos contêm GRU e GIG', in_array('GRU', array_column($r['json']['airports'], 'code'), true));

$r = req('GET', '/api/guides/entry-health?lang=en');
check('guides entry-health 200', $r['status'] === 200 && isset($r['json']['health_and_vaccines']['yellow_fever']), $r['raw']);

$r = req('GET', '/api/food-guide?lang=pt');
check('food-guide 200', $r['status'] === 200 && count($r['json']['items'] ?? []) >= 10, $r['raw']);

// Testes do Módulo 7 (Painel Admin)
// 1. Cadastra um novo usuário para testar permissões administrativas
$r = req('POST', '/api/auth/register', [
    'name' => 'Carlos Admin',
    'email' => 'admin@test.com',
    'password' => 'senhaAdmin123',
    'accept_terms' => true,
    'accept_privacy' => true,
]);
$userToken = $r['json']['access_token'] ?? '';
$adminId = $r['json']['user']['id'] ?? 2;

// Usuário normal não pode acessar admin (esperado: 403 Forbidden)
$r = req('GET', '/api/admin/stats', null, $userToken);
check('admin stats bloqueado para usuario comum (403)', $r['status'] === 403, $r['raw']);

// 2. Promove usuário a admin
db()->prepare("UPDATE users SET role = 'admin' WHERE id = ?")->execute([$adminId]);
$r = req('POST', '/api/auth/login', ['email' => 'admin@test.com', 'password' => 'senhaAdmin123']);
$adminAccess = $r['json']['access_token'] ?? '';

// 3. Testa acesso admin liberado
$r = req('GET', '/api/admin/stats', null, $adminAccess);
check('admin stats 200', $r['status'] === 200 && isset($r['json']['metrics']['total_users']), $r['raw']);

$r = req('GET', '/api/admin/phrases', null, $adminAccess);
check('admin list phrases 200', $r['status'] === 200 && count($r['json']['phrases'] ?? []) > 0, $r['raw']);

$r = req('POST', '/api/admin/phrases', [
    'category' => 'dining',
    'pt' => 'Uma água sem gás, por favor.',
    'en' => 'Still water, please.',
    'phonetic_en' => 'OO-mah AH-gwah sayng GAHS, poor fah-VOR',
    'es' => 'Un agua sin gas, por favor.',
], $adminAccess);
check('admin create phrase 201', $r['status'] === 201 && isset($r['json']['id']), $r['raw']);
$newPhraseId = $r['json']['id'] ?? 0;

$r = req('DELETE', "/api/admin/phrases/{$newPhraseId}", null, $adminAccess);
check('admin delete phrase 204', $r['status'] === 204, $r['raw']);

$r = req('GET', '/api/admin/itineraries', null, $adminAccess);
check('admin list itineraries 200', $r['status'] === 200 && count($r['json']['itineraries'] ?? []) > 0, $r['raw']);

$r = req('PUT', '/api/admin/itineraries/1/publish', ['is_published' => false], $adminAccess);
check('admin unpublish itinerary 200', $r['status'] === 200 && $r['json']['is_published'] === false, $r['raw']);

// Testes do Módulo 6 (Roteiros & Concierge)
// 1. Usuário normal sem premium não pode enviar pedido de concierge (esperado: 403)
$r = req('POST', '/api/concierge/requests', [
    'destination' => 'Amazônia',
    'message' => 'Gostaria de saber qual melhor época para ver os igapós.',
], $userToken);
check('concierge bloqueado sem premium (403)', $r['status'] === 403, $r['raw']);

// 2. Concede premium ao usuário e envia solicitação
db()->prepare("UPDATE users SET premium_until = ? WHERE id = ?")->execute([now_utc(86400), $adminId]);
$r = req('POST', '/api/concierge/requests', [
    'destination' => 'Chapada dos Veadeiros',
    'travel_dates' => 'Julho 2027',
    'travelers_count' => 2,
    'budget_level' => 'moderate',
    'interests' => 'Cachoeiras e trilhas',
    'message' => 'Preciso de ajuda com indicação de guias credenciados para a Catarata dos Couros.',
], $adminAccess);
check('concierge create request 201', $r['status'] === 201 && isset($r['json']['id']), $r['raw']);
$conciergeId = $r['json']['id'] ?? 0;

$r = req('GET', '/api/concierge/requests', null, $adminAccess);
check('concierge my requests 200', $r['status'] === 200 && count($r['json']['requests'] ?? []) === 1, $r['raw']);

// 3. Admin lista e responde a solicitação
$r = req('GET', '/api/admin/concierge', null, $adminAccess);
check('admin list concierge 200', $r['status'] === 200 && count($r['json']['requests'] ?? []) > 0, $r['raw']);

$r = req('PUT', "/api/admin/concierge/{$conciergeId}/answer", [
    'response_text' => 'Olá! Para a Catarata dos Couros recomendamos contratar condutores da Associação de Guias de Alto Paraíso (ACV-Alto). Em julho a vazão está perfeita e as piscinas muito limpas.',
], $adminAccess);
check('admin answer concierge 200', $r['status'] === 200 && $r['json']['answered'] === true, $r['raw']);

// Testes do Módulo 8 (Stripe & Pagamentos)
$r = req('GET', '/api/payments/plans');
check('payments plans 200', $r['status'] === 200 && count($r['json']['plans'] ?? []) === 3, $r['raw']);

$r = req('POST', '/api/payments/checkout', ['price_id' => 'price_trip_pass_14d']);
check('payments checkout sem JWT 401', $r['status'] === 401, $r['raw']);

$r = req('POST', '/api/payments/checkout', ['price_id' => 'price_inexistente'], $adminAccess);
check('payments checkout plano inválido 422', $r['status'] === 422, $r['raw']);

// Validação criptográfica da assinatura HMAC-SHA256 do Webhook Stripe
$whPayload = json_encode(['id' => 'evt_test_1', 'type' => 'checkout.session.completed', 'data' => ['object' => []]]);
$whSecret = 'whsec_test_secret';
$whTs = time();
$whSig = hash_hmac('sha256', $whTs . '.' . $whPayload, $whSecret);
$whEvent = StripeClient::verifyWebhookSignature($whPayload, "t=$whTs,v1=$whSig", $whSecret);
check('stripe webhook assinatura válida', ($whEvent['id'] ?? '') === 'evt_test_1');

$badSigCaught = false;
try {
    StripeClient::verifyWebhookSignature($whPayload, "t=$whTs,v1=assinatura_invalida", $whSecret);
} catch (HttpException $e) {
    $badSigCaught = ($e->status === 400);
}
check('stripe webhook assinatura inválida rejeitada 400', $badSigCaught);

echo PHP_EOL . "Resultado: $pass OK, $fail falha(s)" . PHP_EOL;
exit($fail ? 1 : 0);

