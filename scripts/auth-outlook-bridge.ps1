# Push local Outlook token to Railway Postgres (no Azure redirect URI needed)
# Run from repo root:  .\scripts\auth-outlook-bridge.ps1
# Options:  -Auth   sign in locally first   |   -Status   check cloud only

param(
  [switch]$Auth,
  [switch]$Status
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RepoRoot

$EnvFile = Join-Path $RepoRoot ".env"
if (-not (Test-Path $EnvFile)) {
  Write-Host "ERROR: .env not found" -ForegroundColor Red
  exit 1
}

Get-Content $EnvFile | ForEach-Object {
  if ($_ -match '^\s*([^#=]+)=(.*)$') {
    $name = $matches[1].Trim()
    $value = $matches[2].Trim().Trim('"')
    if ($value) { Set-Item -Path "env:$name" -Value $value }
  }
}

if (-not $env:PRABU_MCP_API_KEY) {
  Write-Host "ERROR: PRABU_MCP_API_KEY missing from .env" -ForegroundColor Red
  exit 1
}

npm run build | Out-Null

$nodeArgs = @("scripts/auth-outlook-bridge.js")
if ($Auth) { $nodeArgs += "--auth" }
if ($Status) { $nodeArgs += "--status" }

node @nodeArgs
