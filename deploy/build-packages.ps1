# Gera pacotes prontos para upload na Hostinger (entradas ZIP com "/" para Linux).
#   deploy\public_html.zip -> extrair DENTRO de public_html/ do domínio
#   deploy\private.zip     -> extrair AO LADO de public_html/ (mesmo nível, fora da raiz pública)
# NÃO inclui private/config.php nem o banco SQLite local (crie o config.php de produção no servidor).
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root 'deploy'
New-Item -ItemType Directory -Force -Path $out | Out-Null

function New-Zip([string]$zipPath, [string]$baseDir, [string]$prefix, [scriptblock]$filter) {
    if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
    $zip = [IO.Compression.ZipFile]::Open($zipPath, 'Create')
    try {
        $baseFull = (Resolve-Path $baseDir).Path.TrimEnd('\')
        Get-ChildItem -Path $baseFull -Recurse -File | ForEach-Object {
            $rel = $_.FullName.Substring($baseFull.Length + 1).Replace('\', '/')
            if (& $filter $rel) {
                $entry = if ($prefix) { "$prefix/$rel" } else { $rel }
                [void][IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $entry, 'Optimal')
            }
        }
        if ($prefix -eq 'private') {
            foreach ($d in 'private/storage/logs/', 'private/storage/cache/') { [void]$zip.CreateEntry($d) }
        }
    } finally { $zip.Dispose() }
}

# public_html: conteúdo direto (sem a pasta-pai), para extrair dentro de public_html/
New-Zip (Join-Path $out 'public_html.zip') (Join-Path $root 'public_html') '' { param($r) $true }

# private: com prefixo private/, sem segredos nem estado local
New-Zip (Join-Path $out 'private.zip') (Join-Path $root 'private') 'private' {
    param($r)
    -not ($r -eq 'config.php' -or $r -like 'storage/*')
}

Get-ChildItem $out -Filter *.zip | Select-Object Name, @{n='KB';e={[math]::Round($_.Length/1KB)}}
