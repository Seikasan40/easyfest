#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# Easyfest — Bootstrap script (Cellule Build Captain)
# Lance en 1 commande : install + Supabase local + migrations + seed + dev
# Usage : bash scripts/bootstrap.sh
# ─────────────────────────────────────────────────────────────────────

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}▸${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC}  $1"; }
err()  { echo -e "${RED}✗${NC} $1" >&2; exit 1; }

# ─── 1. Pré-requis ──────────────────────────────────────────────────
log "Vérification des pré-requis…"
command -v node >/dev/null      || err "Node.js manquant. Installer v20+ via https://nodejs.org"
command -v pnpm >/dev/null      || err "pnpm manquant. Installer : npm i -g pnpm@8"
command -v docker >/dev/null    || warn "Docker manquant — Supabase local impossible. Mode cloud only."
command -v supabase >/dev/null  || npm install -g supabase

NODE_MAJOR=$(node -v | sed 's/v\([0-9]*\).*/\1/')
[ "$NODE_MAJOR" -ge 20 ] || err "Node 20+ requis (actuel : $(node -v))"

# ─── 2. .env.local généré si absent ────────────────────────────────
if [ ! -f .env.local ]; then
  log "Génération .env.local depuis .env.example…"
  cp .env.example .env.local

  # Génération automatique des secrets
  QR_SECRET=$(openssl rand -hex 64)
  CRON_SECRET=$(openssl rand -hex 32)
  NEXTAUTH_SECRET=$(openssl rand -hex 32)
  sed -i.bak "s|QR_HMAC_SECRET=.*|QR_HMAC_SECRET=\"$QR_SECRET\"|" .env.local
  sed -i.bak "s|CRON_SECRET=.*|CRON_SECRET=\"$CRON_SECRET\"|" .env.local
  rm -f .env.local.bak

  log "Secrets générés (QR_HMAC_SECRET, CRON_SECRET) ✓"
fi

# ─── 3. Install dépendances ────────────────────────────────────────
log "Installation pnpm (~3 min)…"
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# ─── 4. Démarrer Supabase local ────────────────────────────────────
if command -v docker >/dev/null && docker info >/dev/null 2>&1; then
  log "Démarrage Supabase local (Docker)…"
  cd packages/db
  supabase start || warn "Supabase déjà lancé ?"

  # Récupérer les credentials locaux et les écrire dans .env.local du root
  SUPA_URL=$(supabase status -o env 2>/dev/null | grep API_URL= | cut -d'=' -f2 | tr -d '"')
  SUPA_ANON=$(supabase status -o env 2>/dev/null | grep ANON_KEY= | cut -d'=' -f2 | tr -d '"')
  SUPA_SVC=$(supabase status -o env 2>/dev/null | grep SERVICE_ROLE_KEY= | cut -d'=' -f2 | tr -d '"')

  cd ../..
  if [ -n "$SUPA_URL" ]; then
    log "Mise à jour .env.local avec credentials Supabase local…"
    sed -i.bak "s|NEXT_PUBLIC_SUPABASE_URL=.*|NEXT_PUBLIC_SUPABASE_URL=\"$SUPA_URL\"|" .env.local
    sed -i.bak "s|NEXT_PUBLIC_SUPABASE_ANON_KEY=.*|NEXT_PUBLIC_SUPABASE_ANON_KEY=\"$SUPA_ANON\"|" .env.local
    sed -i.bak "s|SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=\"$SUPA_SVC\"|" .env.local
    sed -i.bak "s|EXPO_PUBLIC_SUPABASE_URL=.*|EXPO_PUBLIC_SUPABASE_URL=\"$SUPA_URL\"|" .env.local
    sed -i.bak "s|EXPO_PUBLIC_SUPABASE_ANON_KEY=.*|EXPO_PUBLIC_SUPABASE_ANON_KEY=\"$SUPA_ANON\"|" .env.local
    rm -f .env.local.bak
  fi

  # ─── 5. Appliquer migrations + seed ──────────────────────────────
  log "Application des migrations SQL…"
  cd packages/db
  supabase db reset --local
  cd ../..

  # ─── 6. Générer les types TS ─────────────────────────────────────
  log "Génération des types TypeScript…"
  cd packages/db
  supabase gen types typescript --local --schema public > src/types/database.ts || warn "Types non générés (Supabase pas encore prêt ?)"
  cd ../..

  log "✅ Supabase local prêt sur $SUPA_URL"
  log "✅ Studio sur http://127.0.0.1:54323"
  log "✅ Inbucket (mails locaux) sur http://127.0.0.1:54324"
else
  warn "Docker indisponible — Supabase local skippé."
  warn "Rempli manuellement les variables NEXT_PUBLIC_SUPABASE_* dans .env.local"
fi

# ─── 7. Build initial ──────────────────────────────────────────────
log "Build initial typecheck (sanity check)…"
pnpm typecheck || warn "Typecheck a échoué — voir détails"

# ─── 8. Done ───────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════"
log "✅ Bootstrap Easyfest terminé"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "  ▸ Lancer le dev : ${GREEN}pnpm dev${NC}"
echo "  ▸ Vitrine       : ${GREEN}http://localhost:3000${NC}"
echo "  ▸ Mobile (PWA)  : ${GREEN}http://localhost:8081${NC}"
echo "  ▸ Supabase      : ${GREEN}http://127.0.0.1:54323${NC}"
echo "  ▸ Tests         : ${GREEN}pnpm test${NC} | ${GREEN}pnpm test:e2e${NC}"
echo ""
