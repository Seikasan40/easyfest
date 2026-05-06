# PROMPT AUDIT MOBILE-FIRST EXHAUSTIF + FIX — rien laissé au hasard

> **Contexte** : Easyfest est positionné « mobile-first » (slogan, T16 du prompt audit, Pamela utilisera tablette le jour J du festival, et 95% des bénévoles useront leur téléphone). Phase 4 V5 a déjà fixé le DnD mobile (Bug #16) mais **aucun audit systémique mobile** n'a été conduit. Ce prompt demande un **audit page-par-page, élément-par-élément, sur 7 axes** + fix inline de tout ce qui est trouvé.
>
> **À lancer dans Claude Code, terminal sur `E:\Easy_Fest\Easy_Fest\easyfest`, branche `main`. ZÉRO interaction user. Tout pré-autorisé. Push & deploy autorisés. Durée estimée : 3-4 heures.**

---

## 🎯 OBJECTIF

Garantir que **chaque** page de l'app est :
1. **Affichée correctement** sur mobile (320px → 768px) sans overflow horizontal, taille de touch targets WCAG AA, lisibilité sans zoom
2. **Fonctionnelle au touch** (DnD, swipes, taps, modales, formulaires sans IME bug)
3. **Performante** (LCP < 2.5s sur mid-range Android 4G, pas de CLS)
4. **Accessible** (VoiceOver / TalkBack, contraste, focus visible, reduced motion)
5. **Cohérente avec le slogan** « le festival pro, sans le prix pro » et l'usage tablette de la régie

Aucune des **45+ pages** de l'app ne doit échapper à cet audit.

---

## 📋 LES 7 AXES D'AUDIT

### Axe 1 — Viewport & meta tags
- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` présent dans `app/layout.tsx`
- Pas de `user-scalable=no` (interdit pour accessibilité)
- `theme-color` light + dark présents (déjà en place)
- `apple-mobile-web-app-capable` + `mobile-web-app-capable` pour PWA-like
- `apple-touch-icon` 180×180 ET 192×192
- Safe-area CSS : `env(safe-area-inset-*)` sur header / footer / bottom-nav pour notch iPhone

### Axe 2 — Touch targets & ergonomie

**Règles WCAG 2.1 AA** :
- Minimum **44×44 pt** (iOS) ou **48×48 dp** (Android) pour toute zone cliquable
- Espacement minimum **8 pt** entre 2 zones cliquables adjacentes
- Inputs : hauteur ≥ 44px, font-size ≥ **16px** (sinon iOS zoom auto)
- Boutons primary : padding minimum `py-3 px-4` (12px / 16px)

**Audit** :
```bash
# Trouver les boutons potentiellement trop petits
grep -rn "px-1\|px-2 py-1\|p-1\|p-2 \|h-6\|h-7\|h-8\|w-6\|w-7\|w-8" apps/vitrine/app/ apps/vitrine/components/ --include="*.tsx" | grep -i "button\|<a \|onClick\|onTap\|cursor-pointer" | tee /tmp/audit_touch_targets.txt
```

Pour chaque résultat, vérifier la zone parent. Si la zone totale est < 44×44px → fix.

**Fix générique** :
```typescript
// AVANT (bouton 32×32)
<button className="w-8 h-8 rounded">×</button>

// APRÈS (zone tactile 44×44 même si visuel reste 32×32)
<button className="w-11 h-11 flex items-center justify-center -m-1.5 rounded">
  <span className="w-8 h-8 flex items-center justify-center">×</span>
</button>
```

### Axe 3 — Layout responsive

**Breakpoints Tailwind à respecter** :
- `< 640px` : mobile (default, no prefix)
- `sm: ≥ 640px` : tablette portrait
- `md: ≥ 768px` : tablette paysage (Pamela)
- `lg: ≥ 1024px` : desktop régie
- `xl: ≥ 1280px` : grand écran régie

**Règles** :
- **Mobile-first écrit en premier** : `text-sm md:text-base` (pas l'inverse)
- **Pas de `grid-cols-X` sans breakpoint mobile** : `grid-cols-2 md:grid-cols-4` (pas `grid-cols-4` seul)
- **Pas de `flex-row` sans `flex-col` mobile** quand le contenu dépasse 320px
- **Pas de `width:Xpx` fixe** : utiliser `max-w-X` + `w-full`
- **Pas de `overflow-hidden` sur conteneur de scroll** : `overflow-y-auto overscroll-contain`
- **`min-w-0`** sur enfants de `flex` pour permettre truncate

**Audit** :
```bash
# Trouver les grid-cols sans mobile
grep -rEn "grid-cols-[3-9]\b|grid-cols-1[0-2]" apps/vitrine/app/ apps/vitrine/components/ --include="*.tsx" | grep -v "md:grid-cols\|sm:grid-cols\|grid-cols-1 " | tee /tmp/audit_grid_cols.txt

# Trouver les flex-row sans mobile col
grep -rEn "flex flex-row\|flex-row " apps/vitrine/app/ apps/vitrine/components/ --include="*.tsx" | grep -v "flex-col" | tee /tmp/audit_flex_row.txt

# Trouver les widths fixes
grep -rEn "w-\[[0-9]+px\]\|width: ['\"]?[0-9]+px" apps/vitrine/app/ apps/vitrine/components/ --include="*.tsx" --include="*.ts" | tee /tmp/audit_fixed_widths.txt

# Trouver les overflow-x potentiellement bloquants
grep -rEn "overflow-x-hidden\|overflow-hidden" apps/vitrine/app/ apps/vitrine/components/ --include="*.tsx" | tee /tmp/audit_overflow.txt
```

Pour chaque résultat → fix breakpoint mobile + tests visuels.

### Axe 4 — Typographie & lisibilité

**Règles** :
- Body text mobile : minimum **16px** (1rem) — sinon zoom auto iOS
- Titres mobile : pas plus de 30-32px (`text-3xl` max sur mobile)
- Line-height confortable : `leading-relaxed` sur paragraphes
- Hauteur des inputs : `h-11` minimum (44px)
- Font-size sur inputs : `text-base` (16px) minimum, JAMAIS `text-sm` ni `text-xs`

**Audit** :
```bash
# Trouver les inputs avec font-size potentiellement < 16px
grep -rEn "<input\|<textarea\|<select" apps/vitrine/app/ apps/vitrine/components/ --include="*.tsx" -A 3 | grep -E "text-xs|text-sm" | tee /tmp/audit_input_fontsize.txt

# Trouver les titres trop gros mobile
grep -rEn "text-4xl\|text-5xl\|text-6xl" apps/vitrine/app/ apps/vitrine/components/ --include="*.tsx" | grep -v "md:text-4xl\|sm:text-4xl\|md:text-5xl\|md:text-6xl" | tee /tmp/audit_huge_titles.txt
```

### Axe 5 — Inputs & clavier mobile

**Règles** :
- `inputMode` correct : `inputMode="email"` / `tel` / `numeric` / `decimal` / `search`
- `autoComplete` correct : `autoComplete="email"` / `tel` / `name` / `current-password` / `new-password`
- `<input type="tel">` pour téléphones (déclenche pavé numérique)
- `<input type="email">` pour emails
- `<input type="search">` pour recherche (clavier optimisé)
- `<input type="number">` ÉVITÉ (problèmes de validation) — préférer `type="text" inputMode="numeric"`
- `enterKeyHint` : `done`, `next`, `search`, `send` selon contexte

**Audit** :
```bash
grep -rEn "<input " apps/vitrine/app/ apps/vitrine/components/ --include="*.tsx" | grep -v "inputMode\|autoComplete" | tee /tmp/audit_inputs_keyboard.txt
```

Pour chaque input, ajouter les bons attributs.

### Axe 6 — Bottom navigation / Sticky elements

**Règles iOS/Android** :
- Bottom-nav doit avoir `padding-bottom: env(safe-area-inset-bottom)` pour le notch
- Sticky header doit avoir `padding-top: env(safe-area-inset-top)` si safe-area-inset utilisé
- `position: fixed` éviter sur mobile (bug iOS Safari quand keyboard ouvert) — préférer `sticky` ou `flex-col h-screen`
- Bottom-sheet : doit prendre max 80vh, scroll interne si dépassement

**Audit** :
```bash
grep -rEn "fixed bottom-0\|sticky bottom-0\|bottom-nav\|env\(safe-area" apps/vitrine/app/ apps/vitrine/components/ --include="*.tsx" --include="*.css" | tee /tmp/audit_bottom_nav.txt
```

### Axe 7 — Modales & gestures

**Règles** :
- Modale full-screen mobile : `<dialog>` ou pattern fullscreen pour < 640px, modal classique ≥ 640px
- Bottom-sheet préféré sur mobile (geste swipe-down pour fermer)
- Backdrop click ferme la modale
- Echap ferme la modale
- Focus trap actif quand modale ouverte
- `body` scroll bloqué quand modale ouverte (`document.body.style.overflow = 'hidden'`)
- Z-index cohérent (header < modal < toast)

**Audit** :
```bash
grep -rEn "Modal\|Dialog\|BottomSheet\|backdrop\|z-50\|z-40\|z-30" apps/vitrine/app/ apps/vitrine/components/ --include="*.tsx" | tee /tmp/audit_modals.txt
```

---

## 📋 PAGES À AUDITER (45+)

### Public (anonyme)
- `/` (homepage)
- `/festivals`
- `/pricing`
- `/legal/cgu`, `/legal/mentions`, `/legal/privacy`, `/legal/sub-processors`
- `/demande-festival` (wizard 5 étapes — INPUT INTENSIF MOBILE)
- `/[orgSlug]` (page asso publique)
- `/[orgSlug]/[eventSlug]` (page festival publique)
- `/[orgSlug]/[eventSlug]/inscription` (formulaire candidature volontaire)

### Auth
- `/auth/login` (Mot de passe + Lien magique)
- `/auth/callback`
- `/auth/logout`

### Hub & espace user
- `/hub` (multi-rôles cards)
- `/account/setup-password`
- `/account/privacy`

### Volunteer space `/v/[orgSlug]/[eventSlug]/`
**Mobile-first par définition — c'est l'usage principal des bénévoles**
- `/` (home — prochain créneau, équipe, KPIs)
- `/qr` (mon QR pour scan entrée)
- `/planning` (mes shifts)
- `/wellbeing` (3 niveaux + alerte grave)
- `/feed` (broadcasts)
- `/safer` (mediator only)
- `/convention` (signature engagement)
- `/preferences` (modifier souhaits)

### Régie space `/regie/[orgSlug]/[eventSlug]/`
**Tablette-first (Pamela), desktop secondaire**
- `/` ou `/dashboard` (KPIs + actions admin)
- `/candidatures`
- `/candidatures/[applicationId]`
- `/candidatures/manual-signup`
- `/planning` (DnD ⚠️ tablette + mobile)
- `/planning/timeline`
- `/planning/shifts`
- `/sponsors`
- `/sponsors/new`
- `/sponsors/[id]`
- `/plan` (plan du site)
- `/safer`
- `/messages`
- `/prefecture`
- `/settings/theme`
- `/settings/event`

### Poste space `/poste/[orgSlug]/[eventSlug]/`
- `/` (mon poste, mon équipe, shifts)
- `/[positionSlug]/chat` (tchat équipe)

### Mobile app (Expo) `apps/mobile/`
- (audit séparé si configuré)

---

## 🛠️ PLAN D'EXÉCUTION CLAUDE CODE

### Sprint 0 — Setup & backup (5 min)
```bash
cd E:\Easy_Fest\Easy_Fest\easyfest
git fetch origin main && git pull
git tag backup-pre-mobile-audit-$(date +%Y%m%d-%H%M)
git push origin --tags
```

### Sprint 1 — Audit automatisé (60 min)
- Exécuter les 7 grep commands ci-dessus
- Produire `AUDIT_MOBILE_FIRST.md` qui liste **chaque** anomalie avec :
  - Fichier + ligne
  - Catégorie (touch target / layout / typo / input / nav / modal / a11y)
  - Sévérité (🔴 bloquant / 🟡 UX / 🟢 nice-to-have)
  - Fix proposé
- Cible minimum : **80-150 anomalies** trouvées (un projet réel a toujours ce volume)

### Sprint 2 — Audit page-par-page (90 min)

Pour **chaque** des 45+ pages listées :

1. **Lire le code source** (page.tsx + components imbriqués + layout parent)
2. **Vérifier les 7 axes** (viewport, touch, layout, typo, inputs, nav, modals)
3. **Tester en simulant 4 viewports** (à automatiser via Playwright si possible) :
   - 360×640 (Galaxy S5, low-end)
   - 412×915 (Pixel 7 Pro, standard Android)
   - 390×844 (iPhone 14, iOS standard)
   - 768×1024 (iPad portrait, tablette Pamela)
   - 1024×1366 (iPad pro paysage, desktop régie)
4. **Identifier les bugs visuels** : overflow horizontal, texte coupé, boutons trop petits, modales mal positionnées
5. **Identifier les bugs fonctionnels** : DnD, swipes, formulaires (clavier IME), loading states bloquants

Documenter chaque problème trouvé dans `AUDIT_MOBILE_FIRST.md`.

### Sprint 3 — Fixes layout & typo (60 min)

Pour chaque anomalie 🔴 bloquant et 🟡 UX :

#### Pattern de fix breakpoints
```typescript
// AVANT
<div className="grid grid-cols-4 gap-4">  // overflow horizontal mobile

// APRÈS
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
```

#### Pattern de fix touch targets
```typescript
// AVANT
<button onClick={...} className="text-xs px-1 py-0.5">×</button>

// APRÈS
<button 
  onClick={...} 
  className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] -mr-2 px-3 py-2"
  aria-label="Fermer"
>
  <span className="text-base">×</span>
</button>
```

#### Pattern de fix inputs
```typescript
// AVANT
<input type="email" className="text-sm h-9 px-2" />

// APRÈS
<input 
  type="email" 
  inputMode="email"
  autoComplete="email"
  enterKeyHint="next"
  className="h-11 px-3 text-base"  // h-11 = 44px, text-base = 16px
/>
```

### Sprint 4 — Fixes navigation & modales (45 min)

#### Bottom navigation safe-area
```typescript
// apps/vitrine/app/v/[orgSlug]/[eventSlug]/layout.tsx
<nav 
  className="fixed bottom-0 inset-x-0 grid grid-cols-5 bg-white border-t"
  style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
>
```

#### Sticky header notch
```typescript
<header 
  className="sticky top-0 bg-white"
  style={{ paddingTop: 'env(safe-area-inset-top)' }}
>
```

#### Bottom-sheet réutilisable (déjà en place v5, vérifier swipe-down)
Ajouter geste swipe-down pour fermer :
```typescript
// useSwipe hook (nouveau)
function useSwipeDown(callback: () => void) {
  const startY = useRef<number | null>(null);
  return {
    onTouchStart: (e: React.TouchEvent) => { startY.current = e.touches[0].clientY; },
    onTouchEnd: (e: React.TouchEvent) => {
      if (startY.current === null) return;
      const dy = e.changedTouches[0].clientY - startY.current;
      if (dy > 80) callback();  // swipe down 80px → close
      startY.current = null;
    },
  };
}
```

### Sprint 5 — Fixes pages spécifiques (90 min)

Pour chaque page identifiée comme cassée mobile, fix concret. Probablement :

- **`/demande-festival` wizard 5 étapes** : labels au-dessus des inputs (pas à côté), boutons "Suivant" pleine largeur mobile, progress bar sticky top
- **`/auth/login`** : carte centrée full-width mobile, font-size 16px sur inputs, bouton 44px
- **`/v/...` bottom-nav** : grid-cols-5 avec icônes 24px + labels 11px + safe-area
- **`/regie/.../planning`** : sticky chips horizontales (déjà en place), bottom-sheet équipes (Phase 4 V5), peut-être virtual scrolling si > 100 cards mobile (perf)
- **`/regie/.../messages`** : input message multi-line auto-grow, send button visible avec keyboard ouvert (sticky bottom + safe-area)
- **`/regie/.../sponsors/new`** : formulaire long mobile → diviser en sections ou wizard
- **`/v/.../wellbeing`** : 3 cartes grand format tap, bouton ALERTE GRAVE rouge fixed bottom mobile (visible en permanence)
- **`/v/.../safer`** (mediator) : list cards avec bouton "Prendre en charge" full-width mobile
- **`/poste/...`** : équipe en cards 1-col mobile, shifts en list compact

### Sprint 6 — Tests visuels Playwright (30 min)

Créer `apps/vitrine/__tests__/mobile-visual.spec.ts` avec Playwright :

```typescript
import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { name: 'galaxy-s5', width: 360, height: 640 },
  { name: 'pixel-7', width: 412, height: 915 },
  { name: 'iphone-14', width: 390, height: 844 },
  { name: 'ipad-portrait', width: 768, height: 1024 },
];

const PAGES = [
  '/auth/login',
  '/hub',
  '/v/icmpaca/rdl-2026',
  '/v/icmpaca/rdl-2026/planning',
  '/v/icmpaca/rdl-2026/wellbeing',
  '/v/icmpaca/rdl-2026/feed',
  '/regie/icmpaca/rdl-2026',
  '/regie/icmpaca/rdl-2026/planning',
  '/regie/icmpaca/rdl-2026/messages',
  '/regie/icmpaca/rdl-2026/safer',
  '/poste/icmpaca/rdl-2026',
];

for (const viewport of VIEWPORTS) {
  for (const path of PAGES) {
    test(`${viewport.name} no horizontal scroll on ${path}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(`https://easyfest.app${path}`);
      const docWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(docWidth).toBeLessThanOrEqual(viewport.width + 1);  // tolérance 1px
    });
    
    test(`${viewport.name} all clickables ≥ 44px on ${path}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(`https://easyfest.app${path}`);
      const tooSmall = await page.$$eval('button, a, [role="button"]', els =>
        els.filter(el => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && (rect.width < 44 || rect.height < 44);
        }).map(el => ({ tag: el.tagName, text: el.textContent?.slice(0, 30), w: el.getBoundingClientRect().width, h: el.getBoundingClientRect().height }))
      );
      expect(tooSmall).toHaveLength(0);
    });
  }
}
```

### Sprint 7 — Audit a11y (Lighthouse + axe-core) (20 min)

```bash
npm install -D @axe-core/playwright
```

Ajouter à chaque test :
```typescript
import { injectAxe, checkA11y } from '@axe-core/playwright';

test(`a11y on ${path}`, async ({ page }) => {
  await page.goto(`https://easyfest.app${path}`);
  await injectAxe(page);
  await checkA11y(page, null, { detailedReport: true });
});
```

Toute violation niveau **serious** ou **critical** → fix obligatoire.

### Sprint 8 — Tests perf Lighthouse mobile (15 min)

```bash
npm install -g lighthouse
lighthouse https://easyfest.app/v/icmpaca/rdl-2026 \
  --emulated-form-factor=mobile \
  --throttling-method=simulate \
  --throttling.cpuSlowdownMultiplier=4 \
  --output=json --output-path=/tmp/lighthouse-v-home.json
```

Cibles mobile :
- LCP < 2.5s ✅
- CLS < 0.1 ✅
- TBT < 300ms ✅
- Performance score > 80

Si fail → optimiser (lazy load images, code split, prefetch routes).

### Sprint 9 — Build verify + push (10 min)
```bash
pnpm build
pnpm test
pnpm exec playwright test mobile-visual --reporter=html
git add -A
git commit -m "feat(mobile-first): audit exhaustif + fix N anomalies (touch targets, layout, typo, inputs, nav, modals, a11y, perf)"
git push origin main
```

### Sprint 10 — Rapport final dans le chat
```
✅ Audit mobile-first exhaustif terminé.

📊 Statistiques :
- Pages auditées : 47/47
- Viewports testés : 360×640, 390×844, 412×915, 768×1024
- Anomalies trouvées : N
  - 🔴 Bloquant : X (toutes fixées)
  - 🟡 UX : Y (toutes fixées)
  - 🟢 Nice-to-have : Z (priorisées en backlog)
- Lighthouse mobile :
  - Performance : 85+
  - Accessibility : 95+
  - Best Practices : 100
  - SEO : 100

🛠️ Fixes appliqués :
- Touch targets : N boutons agrandis à min 44×44px
- Layout : N grids/flex passés en mobile-first
- Typography : N inputs passés à text-base + h-11
- Inputs : N inputMode/autoComplete/enterKeyHint ajoutés
- Bottom-nav : safe-area-inset appliqué
- Modales : N converties en bottom-sheet mobile
- A11y : N violations axe-core fixées

📁 Nouveaux fichiers :
- AUDIT_MOBILE_FIRST.md (liste complète des findings)
- apps/vitrine/__tests__/mobile-visual.spec.ts
- apps/vitrine/components/ui/bottom-sheet.tsx (Phase 4 V5 + swipe-down)
- packages/shared/src/hooks/use-swipe.ts

🏷️ Commit XXXXX poussé sur main, deploy Vercel ✅
🏷️ Tag : audit-mobile-first-validated-{date}

Cowork peut relancer Phase 4 V6 retest mobile-first sur tous les viewports.
```

---

## ⛔ NON-NÉGOCIABLES

- **Audit COMPLET obligatoire** : pas de raccourci, les 47 pages doivent être passées au peigne fin
- **Au moins 80 anomalies trouvées** (sinon l'audit n'est pas assez profond)
- **Fix inline** : pas juste documenter, fixer dans le même commit (ou max 3 commits logiques)
- **Tests Playwright obligatoires** : un test "no horizontal scroll" + "tous boutons ≥ 44px" pour chaque page sur chaque viewport
- **Lighthouse mobile** : score Performance > 80 sur les pages volunteer (espace bénévole = mobile principal)
- **Pré-autorisé** : push, deploy, migrations, DELETE BDD si nécessaire pour les seeds
- **Axe-core** : toute violation critical/serious = fix obligatoire avant push

---

## Critère de validation Cowork (Phase 4 V6)

Cowork va relancer ces scénarios sur **3 viewports** (360, 412, 768) :

### Viewport 360×640 (low-end Android)
1. Homepage `/` : pas de scroll horizontal, hero lisible, CTA principal visible
2. `/auth/login` : email + password en pile, bouton "Se connecter" full-width 44px
3. `/v/icmpaca/rdl-2026/wellbeing` : 3 cartes en pile, bouton ALERTE GRAVE visible
4. `/v/icmpaca/rdl-2026/feed` : messages en cards lisibles
5. `/regie/icmpaca/rdl-2026/planning` : DnD touch fonctionne, bottom-sheet équipes au tap

### Viewport 412×915 (Pixel 7 Pro)
6. `/regie/icmpaca/rdl-2026/dashboard` : KPI cards en grid 2 cols, actions admin lisibles
7. `/regie/icmpaca/rdl-2026/messages` : composer + chips ciblage scrollables, historique lisible
8. `/regie/icmpaca/rdl-2026/sponsors` : list cards 1 col, bouton +Add sticky bottom

### Viewport 768×1024 (iPad portrait — Pamela tablette)
9. `/regie/icmpaca/rdl-2026/planning` : équipes en grid 3 cols, DnD au stylus/doigt OK
10. `/regie/icmpaca/rdl-2026/prefecture` : KPI 4 cols, bouton ZIP visible
11. Tous les onglets régie en nav horizontale lisible (pas masqués)

### A11y / Perf
- VoiceOver iOS sur `/v/.../wellbeing` : tous les boutons annoncés correctement
- Lighthouse mobile sur `/v/icmpaca/rdl-2026` : Performance ≥ 85
- Reduced motion respecté (animations disabled si user le demande)

Si tout vert → tag `audit-mobile-first-validated-final-{date}` + production J-26 RDL2026 GO **vraiment** sereinement.
