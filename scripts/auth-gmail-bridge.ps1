# Push local Gmail OAuth token (~/.gmail-mcp/credentials.json) to Railway Postgres
param(
  [switch]$Status
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

if ($Status) {
  node "$Root\scripts\auth-gmail-bridge.js" --status
} else {
  node "$Root\scripts\auth-gmail-bridge.js"
}
