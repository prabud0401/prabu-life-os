# Prabu Life OS — Railway setup from PowerShell
# Run from repo root:  .\scripts\railway-setup.ps1
#
# Prerequisites:
#   - Node.js 20+
#   - .env with NOTION_TOKEN (and Outlook vars if you have them)
#   - Railway account linked to GitHub

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $RepoRoot

Write-Host "`n=== Prabu Life OS — Railway CLI setup ===`n" -ForegroundColor Cyan

# --- 1. Install Railway CLI if missing ---
if (-not (Get-Command railway -ErrorAction SilentlyContinue)) {
  Write-Host "Installing Railway CLI..." -ForegroundColor Yellow
  npm install -g @railway/cli
}

railway --version

# --- 2. Login (opens browser once) ---
Write-Host "`nStep 1: Login (browser will open if needed)" -ForegroundColor Cyan
railway whoami 2>$null
if ($LASTEXITCODE -ne 0) {
  railway login
}

# --- 3. Link project + service ---
Write-Host "`nStep 2: Link project — select 'fabulous-connection' and service 'prabu-life-os'" -ForegroundColor Cyan
if (-not (Test-Path ".railway")) {
  railway link
}

# --- 4. Ensure Postgres exists in project ---
Write-Host "`nStep 3: Add Postgres if missing (skip if already exists)" -ForegroundColor Cyan
Write-Host "If prompted, add postgres database to this project."
railway add --database postgres 2>$null
# Ignore error if postgres already exists

# --- 5. Load local .env (never commit this file) ---
$EnvFile = Join-Path $RepoRoot ".env"
if (-not (Test-Path $EnvFile)) {
  Write-Host "ERROR: .env not found. Copy .env.example to .env and fill NOTION_TOKEN etc." -ForegroundColor Red
  exit 1
}

Get-Content $EnvFile | ForEach-Object {
  if ($_ -match '^\s*([^#=]+)=(.*)$') {
    $name = $matches[1].Trim()
    $value = $matches[2].Trim().Trim('"')
    if ($value) { Set-Item -Path "env:$name" -Value $value }
  }
}

# --- 6. Generate API key if missing ---
if (-not $env:PRABU_MCP_API_KEY) {
  $env:PRABU_MCP_API_KEY = -join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Max 256) })
  Write-Host "Generated PRABU_MCP_API_KEY (saved to Railway only)" -ForegroundColor Yellow
}

# --- 7. Get public domain for OAUTH_REDIRECT_URI ---
Write-Host "`nStep 4: Checking Railway domain..." -ForegroundColor Cyan
$domain = railway domain 2>$null
if ($domain) {
  $env:OAUTH_REDIRECT_URI = "https://$domain/auth/microsoft/callback"
  Write-Host "OAUTH_REDIRECT_URI = $env:OAUTH_REDIRECT_URI"
} elseif (-not $env:OAUTH_REDIRECT_URI) {
  Write-Host "WARN: No domain yet. Generate in Railway UI: Settings > Networking > Generate Domain" -ForegroundColor Yellow
  Write-Host "Then set OAUTH_REDIRECT_URI manually or re-run this script."
}

# --- 8. Set variables on prabu-life-os service ---
Write-Host "`nStep 5: Setting Railway variables on prabu-life-os..." -ForegroundColor Cyan

# Database reference (private network — works inside Railway)
railway variable set "DATABASE_URL=`${{Postgres.DATABASE_URL}}" --service prabu-life-os

railway variable set "MCP_MODE=http" --service prabu-life-os

if ($env:PRABU_MCP_API_KEY) {
  railway variable set "PRABU_MCP_API_KEY=$($env:PRABU_MCP_API_KEY)" --service prabu-life-os
}
if ($env:NOTION_TOKEN) {
  railway variable set "NOTION_TOKEN=$($env:NOTION_TOKEN)" --service prabu-life-os
}
if ($env:OUTLOOK_CLIENT_ID) {
  railway variable set "OUTLOOK_CLIENT_ID=$($env:OUTLOOK_CLIENT_ID)" --service prabu-life-os
}
if ($env:OUTLOOK_TENANT_ID) {
  railway variable set "OUTLOOK_TENANT_ID=$($env:OUTLOOK_TENANT_ID)" --service prabu-life-os
}
if ($env:OUTLOOK_CLIENT_SECRET) {
  railway variable set "OUTLOOK_CLIENT_SECRET=$($env:OUTLOOK_CLIENT_SECRET)" --service prabu-life-os
}
if ($env:OAUTH_REDIRECT_URI) {
  railway variable set "OAUTH_REDIRECT_URI=$($env:OAUTH_REDIRECT_URI)" --service prabu-life-os
}

# --- 9. List variables (keys only) ---
Write-Host "`nStep 6: Variables on prabu-life-os:" -ForegroundColor Cyan
railway variable list --service prabu-life-os

# --- 10. Deploy ---
Write-Host "`nStep 7: Deploying..." -ForegroundColor Cyan
railway up --service prabu-life-os

Write-Host "`n=== Done ===" -ForegroundColor Green
Write-Host "Verify in browser:"
if ($domain) {
  Write-Host "  https://$domain/health"
  Write-Host "  https://$domain/auth/status"
  Write-Host "  https://$domain/auth/microsoft"
} else {
  Write-Host "  railway domain"
  Write-Host "  Then open https://YOUR-DOMAIN/health"
}
Write-Host "`nSave PRABU_MCP_API_KEY for Grok remote MCP config.`n"
