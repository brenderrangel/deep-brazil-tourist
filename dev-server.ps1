# Sobe o servidor local de desenvolvimento (API PHP + PWA).
# Uso: .\dev-server.ps1 [-Port 8000]
param([int]$Port = 8000)

$php  = 'C:\php-8.5.12\php.exe'
$root = $PSScriptRoot

if (-not (Test-Path "$root\private\config.php")) {
    Copy-Item "$root\private\config.example.php" "$root\private\config.php"
    Write-Host 'private/config.php criado a partir do exemplo (ajuste o JWT_SECRET).'
}

while (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) { $Port++ }

Write-Host "Servidor em http://localhost:$Port  (Ctrl+C para parar)"
& $php -c "$root\php-local.ini" -S "localhost:$Port" -t "$root\public_html" "$root\router.php"

