# Copies audio from server/content to docs/assets/audio with ASCII names.
# Usage: powershell -ExecutionPolicy Bypass -File docs/tools/copy-audio.ps1
# Extra: -TranscodeMp3 (needs ffmpeg in PATH) re-encodes FLAC to MP3 192k.
param([switch]$TranscodeMp3)

$ErrorActionPreference = "Stop"
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$mapPath = Join-Path $PSScriptRoot "audio-map.json"
$docs = Join-Path $root "docs"
$map = Get-Content -LiteralPath $mapPath -Raw -Encoding UTF8 | ConvertFrom-Json

$copied = 0
$missing = 0
foreach ($t in $map) {
  $fromRel = $t.srcOriginal -replace '/', '\'
  $toRel = $t.src -replace '/', '\'
  $from = Join-Path $root $fromRel
  $to = Join-Path $docs $toRel
  $dir = Split-Path $to -Parent
  if (-not (Test-Path -LiteralPath $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }
  if (-not (Test-Path -LiteralPath $from)) {
    Write-Warning ("Missing file: " + $t.srcOriginal)
    $missing++
    continue
  }
  if ($TranscodeMp3 -and $from -like '*.flac') {
    $toMp3 = [IO.Path]::ChangeExtension($to, '.mp3')
    & ffmpeg -y -loglevel error -i $from -codec:a libmp3lame -b:a 192k $toMp3
    if ($?) { $copied++ } else { Write-Warning ("ffmpeg failed: " + $from) }
  } else {
    Copy-Item -LiteralPath $from -Destination $to -Force
    $copied++
  }
}
Write-Output ("Done: copied $copied, missing $missing.")
if ($TranscodeMp3) {
  Write-Output 'NOTE: change .flac to .mp3 in docs/data/tracks.json and rebuild docs/assets/js/data.js (src field).'
}
