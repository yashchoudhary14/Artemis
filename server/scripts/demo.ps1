# One command for the demo: public tunnel + server, and the tunnel URL is written into
# server/.env (PUBLIC_BASE_URL) and mobile/src/demoServer.ts (the app's built-in server address).
# Usage (from server/):  npm run demo        Stop with Ctrl+C.
$ErrorActionPreference = "Stop"
$server = Split-Path $PSScriptRoot -Parent
$root = Split-Path $server -Parent
Set-Location $server
$logDir = Join-Path $server "data"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$tunnelLog = Join-Path $logDir "tunnel.log"
$serverLog = Join-Path $logDir "server.log"
Remove-Item $tunnelLog, "$tunnelLog.out", $serverLog, "$serverLog.err" -ErrorAction SilentlyContinue

Write-Host "Starting public tunnel..." -ForegroundColor Cyan
$cf = Join-Path $server "node_modules\cloudflared\bin\cloudflared.exe"
$tunnel = Start-Process -FilePath $cf -ArgumentList "tunnel", "--url", "http://localhost:3000" -RedirectStandardError $tunnelLog -RedirectStandardOutput "$tunnelLog.out" -PassThru -WindowStyle Hidden
$url = $null
for ($i = 0; $i -lt 60 -and -not $url; $i++) {
  Start-Sleep -Milliseconds 500
  if (Test-Path $tunnelLog) {
    $m = Select-String -Path $tunnelLog -Pattern "https://[a-z0-9-]+\.trycloudflare\.com" | Select-Object -First 1
    if ($m) { $url = $m.Matches[0].Value }
  }
}
if (-not $url) { Stop-Process -Id $tunnel.Id -Force; throw "Tunnel did not start. See $tunnelLog" }
Write-Host "Tunnel: $url" -ForegroundColor Green

# server/.env: PUBLIC_BASE_URL (UTF-8 without BOM so Node reads it).
$envFile = Join-Path $server ".env"
$lines = if (Test-Path $envFile) { [IO.File]::ReadAllLines($envFile) } else { @() }
$lines = @($lines | Where-Object { $_ -notmatch '^PUBLIC_BASE_URL=' }) + "PUBLIC_BASE_URL=$url"
[IO.File]::WriteAllLines($envFile, $lines, (New-Object Text.UTF8Encoding $false))

# The app's built-in server address (Metro reloads it automatically).
$appFile = Join-Path $root "mobile\src\demoServer.ts"
$ts = "// Written by server/scripts/demo.ps1 each time the demo tunnel starts. Do not edit by hand.`nexport const DEMO_SERVER_URL = `"$url`";`n"
[IO.File]::WriteAllText($appFile, $ts, (New-Object Text.UTF8Encoding $false))

Write-Host "Starting server..." -ForegroundColor Cyan
$node = Start-Process -FilePath "node" -ArgumentList "node_modules/tsx/dist/cli.mjs", "--env-file-if-exists=.env", "src/index.ts" -RedirectStandardOutput $serverLog -RedirectStandardError "$serverLog.err" -PassThru -WindowStyle Hidden
try {
  for ($i = 0; $i -lt 40; $i++) {
    try { if ((Invoke-RestMethod "http://localhost:3000/health").ok) { break } } catch { Start-Sleep -Milliseconds 500 }
  }
  Write-Host ""
  Write-Host "SafeWalk is live at $url" -ForegroundColor Green
  Write-Host "Guardian links: $url/g/<token>    Server log: $serverLog"
  Write-Host "Buddy email codes and alerts appear below. Ctrl+C stops the server and tunnel."
  Write-Host ""
  Get-Content $serverLog -Wait | ForEach-Object {
    if ($_ -match '"msg":"((?:[^"\\]|\\.)*)"') { $matches[1] -replace '\\n', ' ' -replace '\\"', '"' } else { $_ }
  }
} finally {
  Stop-Process -Id $node.Id -Force -ErrorAction SilentlyContinue
  Stop-Process -Id $tunnel.Id -Force -ErrorAction SilentlyContinue
}
