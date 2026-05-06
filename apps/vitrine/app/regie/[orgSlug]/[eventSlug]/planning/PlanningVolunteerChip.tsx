"use client";

import { useDraggable } from "@dnd-kit/core";
import { useCallback } from "react";

import { useAssign } from "@/components/AssignContext";
import type { PlanningVolunteer } from "./PlanningVolunteerCard";

// Couleur avatar déterministe (dark green palette)
const AVATAR_COLORS = [
  "#1A3828", "#2D5A3D", "#3B6B4A", "#1F4D38",
  "#2A5040", "#16312B", "#245C40", "#1C4A35",
];
function avatarBg(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!;
}

interface ChipProps {
  v: PlanningVolunteer;
  currentTeamId: string | null;
  currentTeamSlug?: string;
  /** Fond sombre (planning régie) vs clair (pool sidebar) */
  dark?: boolean;
}

export function PlanningVolunteerChip({ v, currentTeamId, currentTeamSlug, dark = true }: ChipProps) {
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
  }, [currentTeamId, onInviteRequest, openMenu, v]);

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

  const style: React.CSSProperties = transform
    ? {
        touchAction: "none",
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 60,
        opacity: isDragging ? 0.85 : 1,
      }
    : { touchAction: "none" };

  const initial = (v.first_name?.[0] ?? v.full_name[0] ?? "?").toUpperCase();
  const firstName = v.first_name ?? v.full_name.split(" ")[0] ?? v.full_name;
  const bg = avatarBg(v.full_name);
  const isPending = !!v.pending_account;

  // ─── Styles selon fond ───────────────────────────────────────────────────
  const chipBg = dark
    ? isPending
      ? "rgba(196,154,44,0.15)"
      : "rgba(255,255,255,0.07)"
    : isPending
    ? "rgba(196,154,44,0.10)"
    : "rgba(26,56,40,0.06)";

  const chipBorder = dark
    ? isDragging
      ? "1px solid rgba(196,154,44,0.60)"
      : isPending
      ? "1px solid rgba(196,154,44,0.30)"
      : "1px solid rgba(255,255,255,0.10)"
    : isDragging
    ? "1px solid #C49A2C"
    : isPending
    ? "1px solid rgba(196,154,44,0.30)"
    : "1px solid #E5DDD0";

  const nameColor = dark ? "rgba(255,255,255,0.90)" : "#1A3828";

  return (
    <div
      ref={setNodeRef}
      style={{ ...style }}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      role="button"
      tabIndex={0}
      aria-label={`${v.full_name}. Glisse vers une équipe ou clic droit pour le menu.`}
      className="inline-flex select-none items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-3 cursor-grab active:cursor-grabbing transition-all"
      style={{
        background: chipBg,
        border: chipBorder,
        boxShadow: isDragging ? "0 4px 16px rgba(0,0,0,0.25)" : "none",
      }}
    >
      {/* Cercle initial */}
      <div
        className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-[11px] font-bold text-white"
        style={{ background: bg }}
      >
        {initial}
      </div>

      {/* Prénom */}
      <span className="text-[13px] font-medium leading-none whitespace-nowrap" style={{ color: nameColor }}>
        {firstName}
        {isPending && (
          <span className="ml-1 text-[9px]" style={{ color: "#C49A2C" }}>⏳</span>
        )}
        {v.is_returning && (
          <span className="ml-0.5 text-[9px]" style={{ color: "#C49A2C" }}>★</span>
        )}
      </span>
    </div>
  );
}
