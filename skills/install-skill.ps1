$ErrorActionPreference = 'Stop'
Write-Host '== ESG community-update skill installer (Windows) ==' -ForegroundColor Cyan
$dest = Join-Path $env:USERPROFILE '.workbuddy\skills\esg-observations-update'
New-Item -ItemType Directory -Force $dest | Out-Null
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$srcSkill = Join-Path $here 'skills\esg-observations-update'
if (Test-Path $srcSkill) {
  Copy-Item -Recurse -Force (Join-Path $srcSkill '*') $dest
  Write-Host "OK installed from local folder to $dest" -ForegroundColor Green
} else {
  $zip = Join-Path $env:TEMP 'wb-skill.zip'; $tmp = Join-Path $env:TEMP 'wb-skill-extract'
  Write-Host 'Downloading from GitHub...'
  try { Invoke-WebRequest -Uri 'https://github.com/707292385-byte/aiesg-workbench-downloads/archive/refs/heads/main.zip' -OutFile $zip -UseBasicParsing }
  catch { Write-Host 'Download failed (GitHub unreachable). Unzip the package manually into %USERPROFILE%\.workbuddy\skills\' -ForegroundColor Red; exit 1 }
  if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp }
  Expand-Archive -Path $zip -DestinationPath $tmp -Force
  $src = Get-ChildItem $tmp -Directory | Select-Object -First 1
  Copy-Item -Recurse -Force (Join-Path $src.FullName 'skills\esg-observations-update\*') $dest
  Remove-Item -Recurse -Force $zip, $tmp
  Write-Host "OK installed to $dest" -ForegroundColor Green
}
Get-ChildItem $dest | Select-Object Name, Length | Format-Table
Write-Host 'Next: restart WorkBuddy, then say: load skill esg-observations-update' -ForegroundColor Yellow
