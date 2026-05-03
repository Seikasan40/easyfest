"use client";

import { useDraggable } from "@dnd-kit/core";
import { useCallback } from "react";

import { useAssign } from "@/components/AssignContext";

export interface PlanningVolunteer {
  user_id: string;
  full_name: string;
  first_name: string | null;
  avatar_url: string | null;
  email: string | null;
  is_returning: boolean;
  preferred_slugs: string[];
  bio: string | null;
  pending_account?: boolean;
}

interface Props {
  v: PlanningVolunteer;
  currentTeamId: string | null;
  currentTeamSlug?: string;
}

export function PlanningVolunteerCard({ v, currentTeamId, currentTeamSlug }: Props) {
  const { openMenu, onInviteRequest } = useAssign();
  // ⚠️ Drag activé pour TOUS, y compris pending_account (pre-volunteers).
  // Pam pré-assigne les équipes avant que les bénévoles aient activé leur compte ;
  // assignVolunteerToTeam détecte le préfixe "pre-" et affiche un message clair invitant
  // à utiliser le bouton 📧 Inviter dans /candidatures pour finaliser leur compte.
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `v-${v.user_id}`,
  });

  // Trigger commun pour tap mobile + long-press desktop.
  // Bug #16 fix mobile : on ouvre TOUJOURS le menu d'équipes — le menu lui-même
  // affiche le warning "Compte pas encore créé" pour pending_account et propose
  // d'inviter. Avant : tap court sur pre-volunteer ne faisait que rappeler
  // d'inviter via toast → pas de menu → bénévoles pré-comptes immobilisés en mobile.
  const triggerMenu = useCallback(() => {
    openMenu(
      {
        user_id: v.user_id,
        full_name: v.full_name,
        first_name: v.first_name,
        email: v.email,
        pending_account: v.pending_account,
        preferred_slugs: v.preferred_slugs,
      },
      currentTeamId,
    );
    // Hint additionnel pour les pre-volunteers : on signale aussi l'option Inviter,
    // mais le menu reste accessible (le serveur fera le upgrade auto si possible).
    if (v.pending_account && v.email) {
      onInviteRequest?.(v.email);
    }
  }, [
    currentTeamId,
    onInviteRequest,
    openMenu,
    v.email,
    v.first_name,
    v.full_name,
    v.pending_account,
    v.preferred_slugs,
    v.user_id,
  ]);

  // ⚠️ ARCHITECTURE DRAG vs MENU :
  // — Le DRAG est géré 100% par @dnd-kit via {...listeners} (PointerSensor distance:8 +
  //   TouchSensor delay:250 + MouseSensor distance:8). On NE TOUCHE PAS à listeners,
  //   sinon le pointer capture casse silencieusement (ce qui était le bug avant ce fix).
  // — Le MENU s'ouvre via 2 chemins NON-INTERFÉRANTS avec dnd-kit :
  //   1. Mobile (pointer:coarse) → onClick handleClick = tap rapide ouvre menu
  //      (le drag mobile démarre via long-press 250ms du TouchSensor → pas de conflit).
  //   2. Desktop (pointer:fine) → onContextMenu (clic droit) = ouvre menu
  //      (le drag desktop démarre via mouvement >8px → click sans drag ne fait rien).
  // Plus de useLongPress (qui posait un onPointerDown qui tuait le drag de dnd-kit).
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) return;
      if (typeof window === "undefined") return;
      // Tap mobile (coarse pointer) = ouvre menu
      if (window.matchMedia?.("(pointer: coarse)").matches) {
        e.preventDefault();
        e.stopPropagation();
        triggerMenu();
      }
    },
    [isDragging, triggerMenu],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      triggerMenu();
    },
    [triggerMenu],
  );

  // Bug #16 fix mobile DnD : `touch-action: none` empêche le browser d'interpréter
  // le touch comme un scroll vertical de la page, ce qui préemptait le long-press
  // 250ms de TouchSensor. Sans ça, sur mobile, dès que le doigt bouge un peu, la
  // page scroll au lieu d'activer le drag. Avec `none`, la page reste figée pendant
  // le touch sur la carte → TouchSensor peut détecter le long-press correctement.
  const baseStyle: React.CSSProperties = { touchAction: "none" };
  const style: React.CSSProperties = transform
    ? { ...baseStyle, transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
    : baseStyle;

  const matchesCurrent = !!currentTeamSlug && v.preferred_slugs.includes(currentTeamSlug);
  const wantedTeams = v.preferred_slugs.slice(0, 3);

  const initial = (v.first_name?.[0] ?? v.full_name[0] ?? "?").toUpperCase();

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      role="button"
      tabIndex={0}
      aria-label={`Bénévole ${v.full_name}. Glisse vers une équipe ou clic droit pour le menu.`}
      className={`group relative rounded-lg border bg-white p-2 text-xs shadow-sm transition select-none cursor-grab active:cursor-grabbing ${
        v.pending_account ? "border-blue-200 bg-blue-50/30 opacity-80" : ""
      } ${
        isDragging
          ? "border-[var(--theme-primary,_#FF5E5B)] shadow-glow ring-2 ring-[var(--theme-primary,_#FF5E5B)]/30"
          : "border-brand-ink/10 hover:border-[var(--theme-primary,_#FF5E5B)]/40 hover:shadow"
      }`}
    >
      <div className="flex items-start gap-2">
        {v.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={v.avatar_url}
            alt=""
            className="h-8 w-8 flex-none rounded-full object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[var(--theme-primary,_#FF5E5B)]/15 text-[11px] font-bold text-[var(--theme-primary,_#FF5E5B)]">
            {initial}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight">
            {v.first_name ?? v.full_name}
            {v.is_returning && (
              <span className="ml-1 text-amber-600" title="Bénévole fidèle">
                ★
              </span>
            )}
            {v.pending_account && (
              <span
                className="ml-1 inline-block rounded bg-blue-100 px-1 text-[8px] font-bold text-blue-700"
                title="Compte pas encore créé — appui long pour inviter"
              >
                ⏳
              </span>
            )}
          </p>
          {v.email && <p className="truncate text-[10px] text-brand-ink/50">{v.email}</p>}
        </div>
        {currentTeamSlug && (
          <span
            className={`flex-none text-[11px] font-bold ${
              matchesCurrent ? "text-emerald-600" : "text-amber-500"
            }`}
            title={matchesCurrent ? "Souhait respecté" : "Pas son souhait initial"}
          >
            {matchesCurrent ? "✓" : "◇"}
          </span>
        )}
      </div>
      {wantedTeams.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {wantedTeams.map((slug) => (
            <span
              key={slug}
              className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                slug === currentTeamSlug
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-brand-ink/8 text-brand-ink/70"
              }`}
            >
              {slug}
            </span>
          ))}
        </div>
      )}
      {v.bio && (
        <p className="mt-1 line-clamp-2 text-[10px] italic text-brand-ink/60">&ldquo;{v.bio}&rdquo;</p>
      )}
    </div>
  );
}
