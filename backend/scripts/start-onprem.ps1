# Start the on-prem Mullen Analytics API (visitor-analytics ingest + admin
# dashboard queries + lead/outreach endpoints). Serves 127.0.0.1:8001 so a
# Cloudflare Tunnel can front it as https://onprem.mullenanalytics.com.
#
# Run:  powershell -ExecutionPolicy Bypass -File backend\scripts\start-onprem.ps1
# Keep this window open (or install it as a service / logon task) for 24/7 use.
$ErrorActionPreference = 'Stop'
$Backend = Split-Path -Parent $PSScriptRoot   # scripts/ -> backend/
Set-Location $Backend

$py = if (Get-Command python -ErrorAction SilentlyContinue) { 'python' } else { 'C:\Python314\python.exe' }

$busy = Get-NetTCPConnection -LocalPort 8001 -State Listen -ErrorAction SilentlyContinue
if ($busy) { Write-Host "Port 8001 already in use — the API may already be running." -ForegroundColor Yellow; exit 1 }

Write-Host "Starting on-prem API on http://127.0.0.1:8001  (cwd: $Backend)" -ForegroundColor Green
& $py -m uvicorn app.main:app --host 127.0.0.1 --port 8001
