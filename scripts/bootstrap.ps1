# Easyfest — Bootstrap script Windows (Cellule Build Captain)
# Usage : pwsh scripts/bootstrap.ps1

$ErrorActionPreference = "Stop"

function Log($msg) { Write-Host "▸ $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "⚠  $msg" -ForegroundColor Yellow }
function Fail($msg) { Write-Host "✗ $msg" -ForegroundColor Red; exit 1 }

Log "Vérification des pré-requis…"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Fail "Node.js manquant. Installer v20+ via https://nodejs.org" }
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) { Fail "pnpm manquant. npm i -g pnpm@8" }
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { Warn "Docker manquant — Supabase local impossible." }
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) { npm install -g supabase }

if (-not (Test-Path .env.local)) {
    Log "Génération .env.local depuis .env.example…"
    Copy-Item .env.example .env.local

    $qrSecret = -join ((1..128) | ForEach-Object { '{0:x}' -f (Get-Random -Min 0 -Max 16) })
    $cronSecret = -join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Min 0 -Max 16) })

    (Get-Content .env.local) `
        -replace '^QR_HMAC_SECRET=.*', "QR_HMAC_SECRET=`"$qrSecret`"" `
        -replace '^CRON_SECRET=.*', "CRON_SECRET=`"$cronSecret`"" |
        Set-Content .env.local

    Log "Secrets générés ✓"
}

Log "Installation pnpm (~3 min)…"
pnpm install

if (Get-Command docker -ErrorAction SilentlyContinue) {
    Log "Démarrage Supabase local…"
    Push-Location packages/db
    supabase start
    $env:SUPA_URL = (supabase status -o env | Select-String 'API_URL=').Line.Split('=')[1].Trim('"')
    $env:SUPA_ANON = (supabase status -o env | Select-String 'ANON_KEY=').Line.Split('=')[1].Trim('"')
    Pop-Location

    Log "✅ Supabase local prêt sur $($env:SUPA_URL)"
    Log "✅ Studio sur http://127.0.0.1:54323"
}

Write-Host ""
Log "✅ Bootstrap Easyfest terminé"
Write-Host ""
Write-Host "  ▸ Lancer le dev : pnpm dev"
Write-Host "  ▸ Vitrine       : http://localhost:3000"
Write-Host "  ▸ Supabase      : http://127.0.0.1:54323"
