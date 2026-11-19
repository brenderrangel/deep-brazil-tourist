<?php
$html = file_get_contents(__DIR__ . '/../../public_html/assets/img/mapa.html');
if (preg_match('/<svg[^>]*>.*?<\/svg>/is', $html, $m)) {
    $svg = $m[0];
    file_put_contents(__DIR__ . '/../../public_html/assets/img/brazil-map.svg', $svg);
    echo "SVG extraído com sucesso! Tamanho: " . strlen($svg) . " bytes\n";
    
    // Lista os IDs presentes
    preg_match_all('/id="([^"]+)"/i', $svg, $ids);
    echo "IDs encontrados: " . implode(', ', array_unique($ids[1])) . "\n";
} else {
    echo "SVG não encontrado em mapa.html\n";
}

