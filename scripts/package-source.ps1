$ErrorActionPreference = 'Stop'

$tempZip = Join-Path $env:TEMP 'careervoice-source.zip'
if (Test-Path $tempZip) {
    Remove-Item -Force $tempZip
}

$tempFolder = Join-Path $env:TEMP "careervoice-src-$(Get-Random)"
New-Item -ItemType Directory -Path $tempFolder | Out-Null

$itemsToCopy = Get-ChildItem -Path . -Exclude 'node_modules', '.git', '.worktrees', 'dist', '.gemini', '.temp'

foreach ($item in $itemsToCopy) {
    Copy-Item -Path $item.FullName -Destination (Join-Path $tempFolder $item.Name) -Recurse -Force
}

Compress-Archive -Path "$tempFolder\*" -DestinationPath $tempZip -Force
Remove-Item -Recurse -Force $tempFolder

$item = Get-Item $tempZip
Write-Host "Created source zip: $($item.FullName) ($([math]::Round($item.Length / 1MB, 2)) MB)"
