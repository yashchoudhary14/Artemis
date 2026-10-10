# Runs Metro behind a public Cloudflare tunnel so ANY phone can open the app on ANY network
# (campus Wi-Fi blocks phone -> laptop connections; Windows "Public" networks block them too).
#   iPhone:  Expo Go (App Store) -> scan the QR with the Camera, or enter the exps:// address
#   Android: SafeWalk dev build  -> enter the https:// address
# Usage (from mobile/):  npm run phone          (Android SafeWalk build, default)
#                        npm run phone -- -Go   (iPhone / Expo Go)      Stop with Ctrl+C.
param([switch]$Go)
$ErrorActionPreference = "Stop"
$mobile = Split-Path $PSScriptRoot -Parent
$root = Split-Path $mobile -Parent
Set-Location $mobile

$cf = Join-Path $root "server\node_modules\cloudflared\bin\cloudflared.exe"
if (-not (Test-Path $cf)) { throw "cloudflared not found. Run in server/: node node_modules\cloudflared\lib\cloudflared.js bin install" }
$log = Join-Path $env:TEMP "safewalk-metro-tunnel.log"
Remove-Item $log, "$log.out" -ErrorAction SilentlyContinue

Write-Host "Starting public tunnel for the app bundler..." -ForegroundColor Cyan
$tunnel = Start-Process -FilePath $cf -ArgumentList "tunnel", "--url", "http://localhost:8081" -RedirectStandardError $log -RedirectStandardOutput "$log.out" -PassThru -WindowStyle Hidden
$url = $null
for ($i = 0; $i -lt 60 -and -not $url; $i++) {
  Start-Sleep -Milliseconds 500
  if (Test-Path $log) {
    $m = Select-String -Path $log -Pattern "https://[a-z0-9-]+\.trycloudflare\.com" | Select-Object -First 1
    if ($m) { $url = $m.Matches[0].Value }
  }
}
if (-not $url) { Stop-Process -Id $tunnel.Id -Force; throw "Tunnel did not start. See $log" }
$hostName = ([Uri]$url).Host

# Expo CLI builds every manifest/bundle URL from this, so phones load everything through the tunnel.
$env:EXPO_PACKAGER_PROXY_URL = $url

$deepLink = "exp+mobile://expo-development-client/?url=" + [Uri]::EscapeDataString($url)
Write-Host ""
Write-Host "  ANDROID - open it INSIDE the Artemis/SafeWalk app (not Chrome):" -ForegroundColor Green
Write-Host "    1) Scan the QR below with the phone camera  -> it opens the app" -ForegroundColor Green
Write-Host "    2) or in the app: 'Enter URL manually' ->  $url" -ForegroundColor Green
Write-Host "    3) or tap this link on the phone (send it to yourself):" -ForegroundColor Green
Write-Host "       $deepLink" -ForegroundColor Green
Write-Host "  Typing the https address into a web browser will NOT work (the app is not a website)." -ForegroundColor Yellow
Write-Host "  (iPhone via Expo Go: run  npm run phone -- -Go  instead)" -ForegroundColor DarkGray
Write-Host ""
try {
  if ($Go) { npx expo start --go --port 8081 } else { npx expo start --dev-client --port 8081 }
} finally {
  Stop-Process -Id $tunnel.Id -Force -ErrorAction SilentlyContinue
}
