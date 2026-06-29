#!/usr/bin/env pwsh
# =============================================================
# deploy.ps1  —  Build locally, package, and deploy to server
# =============================================================
# Usage        : .\deploy.ps1
#              : .\deploy.ps1 -Migrate    (also runs DB migrations)
# Requirements : ssh + scp + tar  (built-in on Windows 10/11)
#
# First deploy? After this script completes, SSH in and run:
#   cd /home/deploy/maplocals
#   prisma migrate deploy
#   prisma db seed     # optional: seed default pricing & config
# =============================================================

param(
    [switch]$Migrate
)

$ErrorActionPreference = "Stop"

# ── Configuration ─────────────────────────────────────────────
$SERVER      = "deploy@167.179.108.200"
$DEPLOY_PATH = "/home/deploy/maplocals"
$APP_NAME    = "maplocals"
$ARCHIVE     = "maplocals-deploy.tar.gz"
$STANDALONE  = ".next\standalone"
# ─────────────────────────────────────────────────────────────

function Write-Step($n, $msg) {
    Write-Host "`n==> [$n] $msg" -ForegroundColor Cyan
}
function Write-Ok($msg) {
    Write-Host "    OK: $msg" -ForegroundColor Green
}
function Write-Fail($msg) {
    Write-Host "`n  ERROR: $msg`n" -ForegroundColor Red
    exit 1
}

# ── Precondition checks ───────────────────────────────────────
if (-not (Test-Path "next.config.ts")) {
    Write-Fail "Run deploy.ps1 from the project root directory."
}
if (-not (Test-Path ".env.production.local")) {
    Write-Fail ".env.production.local not found. Create it from .env.example first."
}

# ── Step 1: Build ─────────────────────────────────────────────
Write-Step "1/6" "Building production..."
npm run build
if ($LASTEXITCODE -ne 0) { Write-Fail "Build failed. Fix errors and retry." }

if (-not (Test-Path "$STANDALONE\server.js")) {
    Write-Fail "Standalone server.js not found. Ensure next.config.ts has: output: 'standalone'"
}
Write-Ok "Build complete."

# ── Step 2: Package standalone ────────────────────────────────
Write-Step "2/6" "Packaging standalone..."

# Static assets — NOT auto-included in standalone output
$dst = "$STANDALONE\.next\static"
if (Test-Path $dst) { Remove-Item -Recurse -Force $dst }
Copy-Item -Recurse ".next\static" $dst

# Public folder — favicon, images, robots.txt, etc.
$dst = "$STANDALONE\public"
if (Test-Path $dst) { Remove-Item -Recurse -Force $dst }
Copy-Item -Recurse "public" $dst

# Prisma schema — needed for migrations on server
$dst = "$STANDALONE\prisma"
if (Test-Path $dst) { Remove-Item -Recurse -Force $dst }
Copy-Item -Recurse "prisma" $dst

# Production .env file
Copy-Item -Force ".env.production.local" "$STANDALONE\.env"

# PM2 ecosystem config — written with actual values expanded
@"
module.exports = {
  apps: [{
    name: '$APP_NAME',
    script: '$DEPLOY_PATH/server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3003,
      HOSTNAME: '127.0.0.1',
    },
    max_memory_restart: '512M',
    error_file: '/home/deploy/logs/maplocals-error.log',
    out_file:   '/home/deploy/logs/maplocals-out.log',
    merge_logs:  true,
    restart_delay: 3000,
  }]
}
"@ | Set-Content -Path "$STANDALONE\ecosystem.config.js" -Encoding UTF8

Write-Ok "Package ready."

# ── Step 3: Archive ───────────────────────────────────────────
Write-Step "3/6" "Creating archive..."

if (Test-Path $ARCHIVE) { Remove-Item -Force $ARCHIVE }
tar -czf $ARCHIVE -C ".next/standalone" .
if ($LASTEXITCODE -ne 0) { Write-Fail "Failed to create archive. Ensure tar is available." }

$sizeMB = [math]::Round((Get-Item $ARCHIVE).Length / 1MB, 1)
Write-Ok "Archive: $ARCHIVE ($sizeMB MB)"

# ── Step 4: Upload ────────────────────────────────────────────
Write-Step "4/6" "Uploading to $SERVER..."
scp -o StrictHostKeyChecking=no $ARCHIVE "${SERVER}:~/$ARCHIVE"
if ($LASTEXITCODE -ne 0) { Write-Fail "Upload failed. Check SSH key and server access." }
Write-Ok "Upload complete."

# ── Step 5: Remote deploy ─────────────────────────────────────
Write-Step "5/6" "Deploying on server..."

# Write bash script using single-quote here-string (no PS variable expansion)
# All constants are hardcoded directly in bash
$tmpScript = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "maplocals_deploy.sh")

$bashScript = @'
#!/bin/bash
set -e

DEPLOY_PATH="/home/deploy/maplocals"
APP_NAME="maplocals"
ARCHIVE="maplocals-deploy.tar.gz"

echo "--> Preserving uploads..."
if [ -d "${DEPLOY_PATH}/public/uploads" ]; then
    cp -r "${DEPLOY_PATH}/public/uploads" /tmp/maplocals-uploads-bak
fi

echo "--> Extracting new build..."
rm -rf "${DEPLOY_PATH}"
mkdir -p "${DEPLOY_PATH}"
tar -xzf ~/"${ARCHIVE}" -C "${DEPLOY_PATH}"
rm ~/"${ARCHIVE}"

echo "--> Restoring uploads..."
mkdir -p "${DEPLOY_PATH}/public/uploads"
if [ -d /tmp/maplocals-uploads-bak ]; then
    cp -r /tmp/maplocals-uploads-bak/. "${DEPLOY_PATH}/public/uploads/"
    rm -rf /tmp/maplocals-uploads-bak
fi

mkdir -p /home/deploy/logs

echo "--> Reloading PM2..."
if pm2 describe "${APP_NAME}" > /dev/null 2>&1; then
    pm2 reload "${APP_NAME}" --update-env
    echo "    Reloaded: ${APP_NAME}"
else
    pm2 start "${DEPLOY_PATH}/ecosystem.config.js"
    pm2 save
    echo "    Started: ${APP_NAME}"
fi

pm2 status
'@

# Write with LF line endings — required for bash on Linux
[System.IO.File]::WriteAllText($tmpScript, $bashScript.Replace("`r`n", "`n"))

scp -o StrictHostKeyChecking=no $tmpScript "${SERVER}:/tmp/maplocals_deploy.sh"
ssh -o StrictHostKeyChecking=no $SERVER "bash /tmp/maplocals_deploy.sh; rm -f /tmp/maplocals_deploy.sh"
if ($LASTEXITCODE -ne 0) { Write-Fail "Remote deployment failed. Check server logs." }

Remove-Item -Force $tmpScript
Write-Ok "Remote deploy complete."

# ── Step 5b: Optional DB migration ───────────────────────────
if ($Migrate) {
    Write-Step "5b" "Running database migrations..."
    ssh -o StrictHostKeyChecking=no $SERVER "cd /home/deploy/maplocals && prisma migrate deploy"
    if ($LASTEXITCODE -ne 0) { Write-Fail "Migration failed. Check DATABASE_URL and schema." }
    Write-Ok "Migrations applied."
}

# ── Step 6: Cleanup ───────────────────────────────────────────
Write-Step "6/6" "Cleaning up local archive..."
Remove-Item -Force $ARCHIVE
Write-Ok "Done."

# ── Summary ───────────────────────────────────────────────────
Write-Host ""
Write-Host "  =============================================" -ForegroundColor Green
Write-Host "   Deploy successful!" -ForegroundColor Green
Write-Host "   https://maplocals.net" -ForegroundColor Green
Write-Host "  =============================================" -ForegroundColor Green
Write-Host ""

if (-not $Migrate) {
    Write-Host "  FIRST DEPLOY? Run on server:" -ForegroundColor Yellow
    Write-Host "    ssh deploy@167.179.108.200" -ForegroundColor Yellow
    Write-Host "    cd /home/deploy/maplocals" -ForegroundColor Yellow
    Write-Host "    prisma migrate deploy" -ForegroundColor Yellow
    Write-Host "    prisma db seed" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Next deploys with auto-migration:" -ForegroundColor DarkGray
    Write-Host "    .\deploy.ps1 -Migrate" -ForegroundColor DarkGray
    Write-Host ""
}
