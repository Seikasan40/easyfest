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
  teamColor?: string;
}

// Couleur avatar déterministe
const AVATAR_COLORS = [
  "#1A3828", "#2D5A3D", "#7A5800", "#8B2635",
  "#1A4A6B", "#4A3D7A", "#6B4A1A", "#2D6B5A",
];
function avatarBg(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!;
}

export function PlanningVolunteerCard({ v, currentTeamId, currentTeamSlug, teamColor }: Props) {
  const { openMenu, onInviteRequest } = useAssign();

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `v-${v.user_id}`,
  });

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

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      triggerMenu();
    },
    [triggerMenu],
  );

  const baseStyle: React.CSSProperties = { touchAction: "none" };
  const style: React.CSSProperties = transform
    ? { ...baseStyle, transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
    : baseStyle;

  const matchesCurrent = !!currentTeamSlug && v.preferred_slugs.includes(currentTeamSlug);
  const initial = (v.first_name?.[0] ?? v.full_name[0] ?? "?").toUpperCase();
  const bg = teamColor ?? avatarBg(v.full_name);

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        background: v.pending_account ? "rgba(196,154,44,0.04)" : "#FFFFFF",
        border: isDragging
          ? "1.5px solid #C49A2C"
          : v.pending_account
          ? "1px solid rgba(196,154,44,0.30)"
          : "1px solid #E5DDD0",
        borderRadius: "12px",
        boxShadow: isDragging
          ? "0 4px 16px rgba(196,154,44,0.20)"
          : "0 1px 3px rgba(26,56,40,0.06)",
        padding: "8px 10px",
        cursor: "grab",
      }}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      role="button"
      tabIndex={0}
      aria-label={`Bénévole ${v.full_name}. Glisse vers une équipe ou clic droit pour le menu.`}
      className="select-none active:cursor-grabbing transition"
    >
      <div className="flex items-center gap-2">
        {/* Avatar */}
        {v.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={v.avatar_url}
            alt=""
            className="h-7 w-7 flex-none rounded-full object-cover"
          />
        ) : (
          <div
            className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ background: bg }}
          >
            {initial}
          </div>
        )}

        {/* Nom */}
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-xs font-semibold leading-tight"
            style={{ color: "#1A3828" }}
          >
            {v.first_name ?? v.full_name}
            {v.is_returning && (
              <span className="ml-1 text-[10px]" style={{ color: "#C49A2C" }} title="Bénévole fidèle">★</span>
            )}
            {v.pending_account && (
              <span
                className="ml-1 inline-block rounded px-1 text-[8px] font-bold"
                style={{ background: "rgba(196,154,44,0.12)", color: "#7A5800" }}
                title="Compte pas encore créé"
              >
                ⏳
              </span>
            )}
          </p>
          {v.email && (
            <p className="truncate text-[10px]" style={{ color: "#9A9080" }}>{v.email}</p>
          )}
        </div>

        {/* Match indicateur */}
        {currentTeamSlug && (
          <span
            className="flex-none text-[11px] font-bold"
            style={{ color: matchesCurrent ? "#10B981" : "#C49A2C" }}
            title={matchesCurrent ? "Souhait respecté" : "Pas son souhait initial"}
          >
            {matchesCurrent ? "✓" : "◇"}
          </span>
        )}
      </div>

      {/* Souhaits */}
      {v.preferred_slugs.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {v.preferred_slugs.slice(0, 3).map((slug) => (
            <span
              key={slug}
              className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase"
              style={
                slug === currentTeamSlug
                  ? { background: "rgba(16,185,129,0.10)", color: "#10B981" }
                  : { background: "rgba(26,56,40,0.06)", color: "#7A7060" }
              }
            >
              {slug}
            </span>
          ))}
        </div>
      )}

      {/* Bio courte */}
      {v.bio && (
        <p
          className="mt-1 line-clamp-1 text-[10px] italic"
          style={{ color: "#9A9080" }}
        >
          &ldquo;{v.bio}&rdquo;
        </p>
      )}
    </div>
  );
}
