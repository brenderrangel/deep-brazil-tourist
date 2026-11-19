<?php
$im = imagecreatetruecolor(192, 192);
$green = imagecolorallocate($im, 5, 150, 105);
$yellow = imagecolorallocate($im, 245, 158, 11);
imagefill($im, 0, 0, $green);
imagefilledellipse($im, 96, 96, 120, 80, $yellow);

$dir = __DIR__ . '/public_html/assets/icons';
if (!is_dir($dir)) {
    mkdir($dir, 0777, true);
}
imagepng($im, $dir . '/icon-192.png');
$im512 = imagescale($im, 512, 512);
imagepng($im512, $dir . '/icon-512.png');
imagedestroy($im);
imagedestroy($im512);
echo "Ícones gerados com sucesso em $dir\n";

