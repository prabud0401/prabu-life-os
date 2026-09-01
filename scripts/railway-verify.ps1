# Verify Railway deployment from PowerShell (no curl needed)
# Usage: .\scripts\railway-verify.ps1 [-Domain "prabu-life-os-production.up.railway.app"]

param(
  [string]$Domain
)

if (-not $Domain) {
  if (Get-Command railway -ErrorAction SilentlyContinue) {
    $Domain = railway domain 2>$null
  }
}

if (-not $Domain) {
  Write-Host "Usage: .\scripts\railway-verify.ps1 -Domain your-app.up.railway.app"
  exit 1
}

$Base = "https://$Domain"

Write-Host "Checking $Base/health ..."
try {
  $health = Invoke-RestMethod -Uri "$Base/health" -TimeoutSec 15
  $health | ConvertTo-Json
} catch {
  Write-Host "FAIL health: $_" -ForegroundColor Red
}

Write-Host "`nChecking $Base/auth/status ..."
try {
  $status = Invoke-RestMethod -Uri "$Base/auth/status" -TimeoutSec 15
  $status | ConvertTo-Json
} catch {
  Write-Host "FAIL auth/status: $_" -ForegroundColor Red
}

Write-Host "`nRailway variables (keys only):"
railway variable list --service prabu-life-os 2>$null
