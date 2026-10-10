# Starts a throwaway test server (console notifier, 10 s dead man's switch, cheap model),
# runs both smoke tests against it, then stops it. Usage (from server/):  npm run smoke:ci
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)
$env:NOTIFY_PROVIDER = "console"
$env:HEARTBEAT_TIMEOUT_SECONDS = "10"
$env:AGENT_MODEL = "anthropic/claude-haiku-5.5"
$env:PUBLIC_BASE_URL = "http://localhost:3000"
$log = Join-Path $env:TEMP "safewalk-smoke-server.log"
$server = Start-Process -FilePath "node" -ArgumentList "node_modules/tsx/dist/cli.mjs", "--env-file-if-exists=.env", "src/index.ts" -RedirectStandardOutput $log -RedirectStandardError "$log.err" -PassThru -WindowStyle Hidden
try {
  for ($i = 0; $i -lt 30; $i++) {
    try { if ((Invoke-RestMethod http://localhost:3000/health).ok) { break } } catch { Start-Sleep -Milliseconds 500 }
  }
  & node node_modules/tsx/dist/cli.mjs scripts/smoke-phase1.ts
  $p1 = $LASTEXITCODE
  & node node_modules/tsx/dist/cli.mjs scripts/smoke-phase234.ts
  $p2 = $LASTEXITCODE
  Write-Host "phase1 exit=$p1  phase2-4 exit=$p2  (server log: $log)"
  if ($p1 -ne 0 -or $p2 -ne 0) { exit 1 }
} finally {
  Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
}
