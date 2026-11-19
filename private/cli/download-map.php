<?php
$url = 'https://raw.githubusercontent.com/luisdalmolin/mapa-brasil-svg/master/mapa-brasil.svg';
$ctx = stream_context_create([
    'http' => [
        'timeout' => 10,
        'header' => "User-Agent: Mozilla/5.0\r\n",
    ],
    'ssl' => [
        'verify_peer' => false,
        'verify_peer_name' => false,
    ],
]);

$svg = @file_get_contents($url, false, $ctx);
if ($svg !== false && strlen($svg) > 1000) {
    $dir = __DIR__ . '/../../public_html/assets/img';
    if (!is_dir($dir)) {
        mkdir($dir, 0777, true);
    }
    file_put_contents($dir . '/brazil-map.svg', $svg);
    echo "SVG baixado com sucesso! Tamanho: " . strlen($svg) . " bytes\n";
} else {
    echo "Tentando via curl...\n";
}

