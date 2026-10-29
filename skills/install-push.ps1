$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$dest = Join-Path $env:USERPROFILE '.workbuddy\skills\esg-daily-push'
New-Item -ItemType Directory -Force $dest | Out-Null
Copy-Item -Recurse -Force (Join-Path $here 'skills\esg-daily-push\*') $dest
Write-Host "OK 推送技能已安装到 $dest" -ForegroundColor Green
Write-Host "数据快照在: $here\data\community-public.json （仅供查阅，技能运行时直接读线上最新数据）" -ForegroundColor Cyan
Write-Host '下一步：重启 WorkBuddy → 说「用 esg-daily-push 技能推送今日资讯」' -ForegroundColor Yellow
