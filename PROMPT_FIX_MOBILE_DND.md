# PROMPT FIX MOBILE — DnD planning mobile + 3 bugs résiduels Phase 4 V4

> **Contexte** : Phase 4 V4 retest Cowork (3 mai 2026 ~16h30 UTC) a validé 8/11 pages desktop OK après commit `4623ec0`. Reste 3 bugs résiduels desktop + 1 bug critique mobile (user-reported, BLOQUANT pour la démo Pamela sur tablette le 28 mai).
>
> **À lancer dans Claude Code, terminal sur `E:\Easy_Fest\Easy_Fest\easyfest`, branche `main`. ZÉRO interaction user. Tout pré-autorisé. Push & deploy autorisés.**

---

## 🔴 BUG #16 (BLOQUANT) — DnD planning mobile inopérant

### Symptôme user-reported

> « je n'arrive pas à drag drop et faire mes equipes via le telephone surement un bug propre à la version ? en tout cas c'est à regler imperativement »
>
> Suite : « ça me dit soit que tout le monde a une equipe soit que je dois inviter »

### Diagnostic

Le composant `PlanningDnd` (probablement `apps/vitrine/app/regie/[orgSlug]/[eventSlug]/planning/PlanningDnd.tsx` ou similaire) utilise dnd-kit avec PointerSensor uniquement. Sur mobile :
1. Le touch déclenche le scroll vertical de la page au lieu du drag-drop
2. Aucun fallback "tap court → menu équipes" pour mobile
3. Le pool affiche faussement « Tous les bénévoles ont une équipe 🎉 » alors qu'il y en a 81 à placer

### Fix obligatoire

#### A. Ajouter `TouchSensor` avec `delay` à dnd-kit

```typescript
// apps/vitrine/app/regie/[orgSlug]/[eventSlug]/planning/PlanningDnd.tsx (ou équivalent)
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

export function PlanningDnd({ ...props }) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },  // 8px avant déclenchement (évite scroll accidentel desktop)
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },  // long-press 250ms mobile
    }),
    useSensor(KeyboardSensor),
  );

  return (
    <DndContext sensors={sensors} ...>
      {/* ... */}
    </DndContext>
  );
}
```

Cela permet sur mobile :
- **Tap rapide** = pas de drag, déclenche le `onClick` du card → ouvrir menu (cf. B)
- **Long-press 250ms** = drag activé → swipe vers équipe

#### B. Bottom-sheet mobile au tap court

Sur mobile (`window.innerWidth < 768` ou via media query CSS), le tap court doit ouvrir un panel listant les équipes cliquables. Plus fiable que drag pour des doigts moyens.

```typescript
// apps/vitrine/app/regie/[orgSlug]/[eventSlug]/planning/PlanningVolunteerCard.tsx (ou nouveau)
"use client";
import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";

export function PlanningVolunteerCard({ volunteer, teams, onAssign }) {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `vol-${volunteer.user_id}`,
    data: volunteer,
  });

  const handleClick = () => {
    if (!isMobile) return;  // desktop : pas de menu au click (drag-drop seulement)
    if (isDragging) return;  // pas de menu si drag en cours
    setShowMobileMenu(true);
  };

  return (
    <>
      <button
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        onClick={handleClick}
        className="..."
        style={{ transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined }}
        aria-label={`Bénévole ${volunteer.full_name}. Tap pour menu équipes ou long-press pour drag.`}
      >
        {volunteer.full_name ?? volunteer.email ?? "—"}
      </button>

      {showMobileMenu && (
        <BottomSheet onClose={() => setShowMobileMenu(false)}>
          <h3>Affecter {volunteer.full_name} à</h3>
          {teams.map((t) => (
            <button
              key={t.id}
              onClick={async () => {
                await onAssign(volunteer.user_id, t.id);
                setShowMobileMenu(false);
              }}
              className="block w-full p-3 text-left hover:bg-brand-ink/5"
            >
              {t.icon} {t.name}
            </button>
          ))}
        </BottomSheet>
      )}
    </>
  );
}
```

Composant `BottomSheet` réutilisable :

```typescript
// apps/vitrine/components/ui/bottom-sheet.tsx (nouveau)
"use client";
import { useEffect } from "react";

export function BottomSheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:hidden" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-h-[80vh] overflow-y-auto rounded-t-3xl bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-brand-ink/20" />
        {children}
        <button onClick={onClose} className="mt-4 w-full rounded-xl border py-2 text-sm">
          Annuler
        </button>
      </div>
    </div>
  );
}
```

#### C. Compteur pool désynchronisé mobile

Le bug user "Tous les bénévoles ont une équipe 🎉 (faux)" indique que sur mobile, le pool est faussement vide. Possible cause : un filtre `.is_active` ou un `device_type` qui change le SSR.

**À vérifier dans `apps/vitrine/app/regie/[orgSlug]/[eventSlug]/planning/page.tsx`** : que la query `members` ne soit pas conditionnée par un device_type / user-agent / cookie quelconque. Le SSR doit retourner exactement le même résultat sur desktop et mobile.

---

## 🟡 BUG RÉSIDUEL #7-bis — `/v/...` ne trouve pas le team lead

### Symptôme

Lucas (volunteer Bar) sur `/v/icmpaca/rdl-2026` voit « Pas encore de chef·fe d'équipe désigné·e » alors que **Mahaut a `memberships.role='post_lead', position_id=Bar, is_active=true`** ✅.

### Fix

Auditer `apps/vitrine/app/v/[orgSlug]/[eventSlug]/page.tsx`. La query du team lead par position doit être :

```typescript
// 1. Récupérer la membership volunteer du user courant pour récupérer position_id
const { data: myMembership } = await supabase
  .from("memberships")
  .select("position_id")
  .eq("user_id", user.id)
  .eq("event_id", ev.id)
  .eq("role", "volunteer")
  .eq("is_active", true)
  .maybeSingle();

if (myMembership?.position_id) {
  // 2. Récupérer le post_lead pour cette position
  const { data: leadMembership } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("event_id", ev.id)
    .eq("position_id", myMembership.position_id)
    .eq("role", "post_lead")
    .eq("is_active", true)
    .maybeSingle();
  
  // 3. Fetch le profile séparément (PAS d'embed PostgREST)
  let leadProfile = null;
  if (leadMembership?.user_id) {
    const { data: profile } = await supabase
      .from("volunteer_profiles")
      .select("user_id, full_name, first_name, last_name, phone, email, avatar_url")
      .eq("user_id", leadMembership.user_id)
      .maybeSingle();
    leadProfile = profile;
  }
}
```

Note RLS : la policy `vp_select_volunteer_lead` (ou équivalent) doit autoriser un volunteer à voir le profile de son post_lead. Si elle existe pas, créer :

```sql
create policy vp_select_my_team_lead on volunteer_profiles
for select using (
  deleted_at is null
  and exists (
    select 1
    from memberships m_self
    join memberships m_lead on m_lead.event_id = m_self.event_id
                            and m_lead.position_id = m_self.position_id
                            and m_lead.role = 'post_lead'
                            and m_lead.is_active = true
    where m_self.user_id = auth.uid()
      and m_self.role = 'volunteer'
      and m_self.is_active = true
      and m_lead.user_id = volunteer_profiles.user_id
  )
);
```

### Critère validation

Lucas connecté → `/v/icmpaca/rdl-2026` → block "MON ÉQUIPE — BAR" → "Chef·fe d'équipe : **Mahaut [Tilde]**" avec photo si avatar.

---

## 🟡 BUG RÉSIDUEL #13-bis — `/poste/...` Mahaut affiche `?` au lieu des noms

### Diagnostic

`/poste/icmpaca/rdl-2026` Mahaut affiche bien :
- ✅ "Mon équipe (3)" — compteur correct (Lucas + Anaïs + Sandy via UNION assignments)
- ✅ "Shifts du poste (9)" — 9 shifts visibles avec horaires

Mais les 3 cartes équipe affichent `?` au lieu des noms.

### Root cause

La RLS `vp_select_post_lead_team` exige `m_target.position_id = m_actor.position_id` (uniquement via `memberships.position_id`). Elle ignore les volunteers assignés via `assignments.shift_id` même si la position est la même.

État BDD pour Bar (position_id `cd44e22e-8a92-4ba9-9100-6c7428856b3b`) :
- Lucas : `memberships.position_id = Bar` ✅ → profile lisible par Mahaut
- Anaïs : `memberships.position_id = NULL`, mais assignment Bar → ❌ profile bloqué
- Sandy : `memberships.position_id = Ateliers/Animations`, mais assignment Bar → ❌ profile bloqué

### Fix migration RLS

```sql
-- packages/db/supabase/migrations/2026050X_extend_vp_select_post_lead_team.sql

drop policy if exists vp_select_post_lead_team on volunteer_profiles;

create policy vp_select_post_lead_team on volunteer_profiles
for select using (
  deleted_at is null and (
    -- Cas 1 (existant) : volunteer assigné au poste via memberships.position_id
    exists (
      select 1 from memberships m_target
      join memberships m_actor on m_actor.event_id = m_target.event_id
      where m_target.user_id = volunteer_profiles.user_id
        and m_target.role = 'volunteer'
        and m_actor.user_id = auth.uid()
        and m_actor.role = 'post_lead'
        and m_actor.position_id is not null
        and m_actor.position_id = m_target.position_id
        and m_actor.is_active = true
    )
    or
    -- Cas 2 (nouveau) : volunteer assigné au poste via assignments
    exists (
      select 1 from assignments a
      join shifts s on s.id = a.shift_id
      join memberships m_actor on m_actor.user_id = auth.uid()
      where a.volunteer_user_id = volunteer_profiles.user_id
        and m_actor.role = 'post_lead'
        and m_actor.position_id = s.position_id
        and m_actor.is_active = true
    )
  )
);
```

### Alternative plus propre (recommandée à ajouter en plus)

Modifier la RPC `assign_volunteer_atomic` pour mettre aussi à jour `memberships.position_id` quand on assigne (afin de synchroniser les 2 sources et que les autres pages basées sur memberships.position_id soient aussi cohérentes) :

```sql
-- Dans assign_volunteer_atomic, après l'INSERT/UPDATE de l'assignment :
update memberships
set position_id = (select position_id from shifts where id = p_shift_id)
where user_id = v_real_user_id
  and event_id = p_event_id
  and role = 'volunteer'
  and is_active = true;
```

### Critère validation

Mahaut connectée → `/poste/icmpaca/rdl-2026` → block "Mon équipe (3)" → 3 cartes affichent **"Lucas Petit"**, **"Anais Bayart"**, **"Sandy Berger"** avec emails et avatars si dispo.

---

## 🟡 NOTE — Lucas /v/feed ne voit que 1 broadcast Bar

### À investiguer

Lucas (volunteer Bar) sur `/v/icmpaca/rdl-2026/feed` voit 1 broadcast TEAM Bar. Mais BDD a 3 broadcasts :
- TEAM Équipe Bar "Briefing" → Lucas devrait voir ✅
- TEAM Équipe Parking "Yo yo" → Lucas ne devrait PAS voir ✅
- ADMIN Annonces "Salut à tous" → Lucas devrait voir si "Annonces" = tout le monde ❌

### Fix

Auditer `apps/vitrine/app/v/[orgSlug]/[eventSlug]/feed/page.tsx`. La query messages doit inclure :
1. Tous les messages du channel `kind='admin'` de l'event (Annonces tout le monde)
2. Les messages du channel `kind='responsibles'` SI l'user a un rôle responsible+
3. Les messages du channel `kind='team'` SI l'user est assigné à `position_id = channel.position_id` via memberships OR assignments

```typescript
// 1. Récupérer les channels visibles pour ce user
const { data: myMembership } = await supabase
  .from("memberships")
  .select("role, position_id")
  .eq("user_id", user.id)
  .eq("event_id", ev.id)
  .eq("is_active", true);

const myPositionIds = (myMembership ?? []).map(m => m.position_id).filter(Boolean);
const isResponsible = (myMembership ?? []).some(m => 
  ['direction', 'volunteer_lead', 'post_lead'].includes(m.role)
);

// 2. Channels visibles : kind='admin' (tout le monde) + kind='team' (si dans la team)
const { data: visibleChannels } = await supabase
  .from("message_channels")
  .select("id, kind, position_id")
  .eq("event_id", ev.id)
  .or(`kind.eq.admin,and(kind.eq.team,position_id.in.(${myPositionIds.join(",") || "null"}))${isResponsible ? ",kind.eq.responsibles" : ""}`);

// 3. Messages des channels visibles
const visibleChannelIds = (visibleChannels ?? []).map(c => c.id);
const { data: messages } = await supabase
  .from("messages")
  .select("id, content, created_at, sender_user_id, channel_id, is_broadcast")
  .in("channel_id", visibleChannelIds)
  .order("created_at", { ascending: false });

// 4. Profiles enrichis (split query séparée)
// ...
```

### Critère validation

Lucas connecté → `/v/icmpaca/rdl-2026/feed` → 2 messages visibles minimum :
- ADMIN Annonces "Salut à tous"
- TEAM Équipe Bar "[Test E2E audit] Briefing Bar..."

Le message Parking "Yo yo" ne doit PAS être visible (Lucas n'est pas dans Parking).

---

## 📋 Plan d'exécution Claude Code

### Sprint 0 — Setup (5 min)
```bash
cd E:\Easy_Fest\Easy_Fest\easyfest
git fetch origin main && git pull
git tag backup-pre-mobile-dnd-fixes-$(date +%Y%m%d-%H%M)
git push origin --tags
```

### Sprint 1 — Bug #16 mobile DnD (45 min)
1. Audit `PlanningDnd.tsx` ou équivalent → ajouter `TouchSensor` avec `delay: 250, tolerance: 5`
2. Créer composant `BottomSheet` réutilisable dans `apps/vitrine/components/ui/bottom-sheet.tsx`
3. Modifier `PlanningVolunteerCard` pour ouvrir bottom-sheet au tap court mobile
4. Vérifier que le pool n'est pas désynchronisé mobile (auditer `page.tsx` planning pour user-agent / device-type filters)
5. Tests Vitest pour la nouvelle logique TouchSensor

### Sprint 2 — Bug #7-bis team lead (15 min)
1. Auditer `apps/vitrine/app/v/[orgSlug]/[eventSlug]/page.tsx`
2. Implémenter le 3-step query (myMembership → leadMembership → leadProfile)
3. Créer migration RLS `vp_select_my_team_lead` si manquante
4. Test Vitest

### Sprint 3 — Bug #13-bis RLS volunteer_profiles (15 min)
1. Créer migration `extend_vp_select_post_lead_team.sql` avec OR EXISTS via assignments
2. Modifier `assign_volunteer_atomic` RPC pour aussi mettre à jour `memberships.position_id`
3. Backfill : pour chaque assignment validated existant, set memberships.position_id = shift.position_id si NULL
4. Tests Vitest

### Sprint 4 — Note feed ciblage (15 min)
1. Auditer `apps/vitrine/app/v/[orgSlug]/[eventSlug]/feed/page.tsx`
2. Implémenter ciblage 3-cas (admin / team / responsibles)
3. Tests Vitest

### Sprint 5 — Build verify + push (10 min)
```bash
pnpm build
pnpm test
git add -A
git commit -m "fix(critical): Bug #16 mobile DnD (TouchSensor + bottom-sheet) + Bug #7-bis team lead + Bug #13-bis RLS volunteer_profiles + Note feed ciblage"
git push origin main
# Vercel auto-deploy
```

### Sprint 6 — Rapport final (5 min)
Rapport au user avec :
- Ce qui a été fixé
- Critères de validation Cowork pour Phase 4 V5

---

## ⛔ NON-NÉGOCIABLES

- **Mobile DnD est BLOQUANT pour J-26**. Pamela doit pouvoir manipuler le planning sur tablette le jour du festival. Si TouchSensor + bottom-sheet ne fonctionne pas, fix obligatoire avant tout autre travail.
- **RLS extension** : ne mets PAS de fallback service-role bypass — c'est une vraie policy qui doit être étendue correctement
- **Synchronisation memberships.position_id** : modifier la RPC pour synchroniser les 2 sources (assignments + memberships.position_id) éviter d'avoir à recoder tous les frontend qui lisent memberships.position_id

---

## Critère de validation Cowork (Phase 4 V5)

Cowork va relancer ces scénarios en mobile 412×915 ET desktop :

1. **Mobile DnD planning** :
   - Pamela connectée, `/regie/.../planning`, mobile 412×915
   - Tap court sur carte d'un bénévole → bottom-sheet "Choisir une équipe" → choix → toast Sauvegardé
   - Long-press 250ms → drag possible → drop → toast Sauvegardé
   - F5 → assignment persiste

2. **Lucas voit son chef d'équipe** :
   - Lucas connecté, `/v/icmpaca/rdl-2026` → block "MON ÉQUIPE — BAR" → "Chef·fe : Mahaut" visible

3. **Mahaut voit son équipe complète** :
   - Mahaut connectée, `/poste/icmpaca/rdl-2026` → "Mon équipe (3)" → 3 cartes avec **noms** "Lucas Petit", "Anais Bayart", "Sandy Berger"

4. **Lucas voit Annonces + Bar dans son fil** :
   - Lucas connecté, `/v/icmpaca/rdl-2026/feed` → 2+ messages visibles (Annonces "Salut à tous" + Bar "Briefing")

Si tout vert → tag `audit-extreme-validated-mobile-{date}` + push + production J-26 RDL2026 GO sereinement.
