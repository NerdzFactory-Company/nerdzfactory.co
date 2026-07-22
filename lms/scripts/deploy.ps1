# Deploys the LMS to learn.myhandwork.ng
#
# Usage:  .\scripts\deploy.ps1            (build + upload + verify)
#         .\scripts\deploy.ps1 -SkipBuild (upload existing dist only)
#
# How it works (and why):
#   1. Builds the app locally (aborts on build errors).
#   2. Uploads dist/ to a STAGING folder on the server (~/lms-staging).
#   3. rsync moves staging -> webroot with correct permissions in one step
#      (dirs 2775, files 664) and deletes stale old bundles (--delete).
#
# We never scp straight into the webroot: scp from Windows recreates
# folders with 700 permissions, which locks nginx out and causes a
# blank page / 404 on all assets. Staging + rsync means the live site
# never sees half-uploaded or unreadable files.
param(
  [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'

$lmsDir = Split-Path -Parent $PSScriptRoot
$sshKey = "$env:USERPROFILE\.ssh\nerdzfactory_lms"
$server = 'lmsuser@198.177.123.227'
$staging = 'lms-staging'
$remoteDir = '/var/www/html/learn.myhandwork.ng'

Set-Location $lmsDir

function Assert-ProductionEnv {
  $envPath = Join-Path $lmsDir '.env'
  if (-not (Test-Path $envPath)) {
    throw "Missing .env - copy .env.example and set VITE_SUPABASE_* / VITE_USE_* before deploy."
  }
  $envMap = @{}
  Get-Content $envPath | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith('#')) { return }
    $parts = $line.Split('=', 2)
    if ($parts.Count -eq 2) { $envMap[$parts[0].Trim()] = $parts[1].Trim() }
  }
  $required = @(
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_USE_SUPABASE_AUTH',
    'VITE_USE_SUPABASE_DATA',
    'VITE_USE_PHONE_OTP'
  )
  foreach ($envKey in $required) {
    if (-not $envMap.ContainsKey($envKey) -or [string]::IsNullOrWhiteSpace($envMap[$envKey])) {
      throw "Missing required env var $envKey in .env (see .env.example)."
    }
  }
  foreach ($flag in @('VITE_USE_SUPABASE_AUTH', 'VITE_USE_SUPABASE_DATA', 'VITE_USE_PHONE_OTP')) {
    if ($envMap[$flag] -ne 'true') {
      throw "Deploy blocked: $flag must be 'true' for production (got '$($envMap[$flag])'). Silent demo mode is not allowed."
    }
  }
  if ($envMap['VITE_SUPABASE_URL'] -notmatch '^https://') {
    throw "VITE_SUPABASE_URL must be an https:// Supabase project URL."
  }
}

if (-not $SkipBuild) {
  Write-Host "[0/4] Checking production env..." -ForegroundColor Cyan
  Assert-ProductionEnv
  Write-Host "[1/4] Building..." -ForegroundColor Cyan
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "Build failed - deploy aborted." }
} else {
  Write-Host "[1/4] Skipping build (using existing dist)" -ForegroundColor Yellow
}

if (-not (Test-Path "$lmsDir\dist\index.html")) {
  throw "dist\index.html not found - run without -SkipBuild first."
}

Write-Host "[2/4] Uploading to staging folder..." -ForegroundColor Cyan
ssh -i $sshKey $server "rm -rf ~/$staging && mkdir -p ~/$staging"
if ($LASTEXITCODE -ne 0) { throw "Could not prepare staging folder." }
scp -i $sshKey -r "$lmsDir\dist\*" "${server}:$staging/"
if ($LASTEXITCODE -ne 0) { throw "Upload failed." }

Write-Host "[3/4] Publishing to webroot (rsync with safe permissions)..." -ForegroundColor Cyan
ssh -i $sshKey $server "rsync -a --delete --chmod=D2775,F664 ~/$staging/ $remoteDir/"
if ($LASTEXITCODE -ne 0) { throw "Publish step failed - the previous version is still live." }

Write-Host "[4/4] Verifying live site..." -ForegroundColor Cyan
$html = (Invoke-WebRequest -Uri 'https://learn.myhandwork.ng/' -UseBasicParsing).Content
if ($html -match '/assets/(index-[\w-]+\.js)') {
  $bundle = $Matches[1]
  $status = (Invoke-WebRequest -Uri "https://learn.myhandwork.ng/assets/$bundle" -UseBasicParsing).StatusCode
  if ($status -eq 200) {
    Write-Host "OK - live bundle $bundle -> HTTP $status" -ForegroundColor Green
  } else {
    Write-Warning "Live bundle $bundle returned HTTP $status - check the site."
  }
} else {
  Write-Warning "Could not find a JS bundle reference in the live index.html - check the site manually."
}

Write-Host "Done. Hard-refresh (Ctrl+Shift+R) to see the new version." -ForegroundColor Green
