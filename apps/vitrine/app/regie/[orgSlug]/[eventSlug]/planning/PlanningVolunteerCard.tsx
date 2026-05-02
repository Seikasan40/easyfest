"use client";

import { useDraggable } from "@dnd-kit/core";
import { useCallback } from "react";

import { useAssign } from "@/components/AssignContext";
import { useLongPress } from "@/hooks/useLongPress";

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
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `v-${v.user_id}`,
    disabled: v.pending_account,
  });

  // Trigger commun pour tap mobile + long-press desktop
  const triggerMenu = useCallback(() => {
    if (v.pending_account) {
      if (v.email) onInviteRequest?.(v.email);
      return;
    }
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

  const longPress = useLongPress(triggerMenu, { delay: 250, tolerance: 12 });

  // ⚠️ CRITICAL : @dnd-kit listeners include onPointerDown for drag activation.
  // useLongPress.handlers ALSO defines onPointerDown. JSX spread merges by overwriting,
  // so spreading {...longPress.handlers} AFTER {...listeners} silently kills the drag.
  // Fix : merge handlers manually so BOTH fire on pointer-down. Drag activates at 8px
  // movement (PointerSensor distance), longPress fires at 250ms hold without movement.
  // If user moves before 250ms → longPress.onPointerMove cancels timer, drag takes over.
  const mergedPointerHandlers = {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      // dnd-kit listener first (it captures pointer for drag tracking)
      (listeners as any)?.onPointerDown?.(e);
      longPress.handlers.onPointerDown(e);
    },
    onPointerMove: longPress.handlers.onPointerMove,
    onPointerUp: longPress.handlers.onPointerUp,
    onPointerCancel: longPress.handlers.onPointerCancel,
    onPointerLeave: longPress.handlers.onPointerLeave,
    onContextMenu: longPress.handlers.onContextMenu,
  };

  // Tap mobile : sur touch device (coarse pointer), un clic court ouvre directement le menu
  // (plus rapide que long-press 250ms, et ergonomique sur smartphone). Sur desktop (fine pointer),
  // le clic court ne déclenche rien — c'est le drag ou le long-press/clic droit qui agit.
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) return;
      if (typeof window === "undefined") return;
      if (window.matchMedia?.("(pointer: coarse)").matches) {
        e.preventDefault();
        e.stopPropagation();
        triggerMenu();
      }
    },
    [isDragging, triggerMenu],
  );

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
    : undefined;

  const matchesCurrent = !!currentTeamSlug && v.preferred_slugs.includes(currentTeamSlug);
  const wantedTeams = v.preferred_slugs.slice(0, 3);

  const initial = (v.first_name?.[0] ?? v.full_name[0] ?? "?").toUpperCase();

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(listeners as any)}
      {...mergedPointerHandlers}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`Bénévole ${v.full_name}. Touche pour assigner.`}
      className={`group relative rounded-lg border bg-white p-2 text-xs shadow-sm transition select-none ${
        v.pending_account
          ? "cursor-not-allowed border-blue-200 bg-blue-50/30 opacity-80"
          : "cursor-grab active:cursor-grabbing"
      } ${
        isDragging
          ? "border-[var(--theme-primary,_#FF5E5B)] shadow-glow ring-2 ring-[var(--theme-primary,_#FF5E5B)]/30"
          : v.pending_account
            ? ""
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
