<?php
$svg = file_get_contents(__DIR__ . '/../../public_html/assets/img/brazil-map.svg');
// Remove tags indesejadas ou comentários para ficar limpo
$cleanSvg = preg_replace('/<\?xml.*?\?>/i', '', $svg);
$cleanSvg = trim($cleanSvg);

$js = "// Mapa vetorial interativo do Brasil com todas as 27 UFs\n";
$js .= "export const BRAZIL_SVG = " . json_encode($cleanSvg, JSON_UNESCAPED_SLASHES) . ";\n";

file_put_contents(__DIR__ . '/../../public_html/assets/js/views/brazil-map-svg.js', $js);
echo "brazil-map-svg.js gerado com sucesso! Tamanho: " . strlen($js) . " bytes\n";

