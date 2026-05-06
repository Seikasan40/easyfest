"use client";

import { useDroppable } from "@dnd-kit/core";

import { PlanningVolunteerChip } from "./PlanningVolunteerChip";
import type { PlanningVolunteer } from "./PlanningVolunteerCard";

export const POOL_ID = "__pool__";

interface TeamProps {
  team: {
    id: string;
    name: string;
    slug: string;
    color: string;
    icon: string | null;
    description: string | null;
    needs_count_default: number;
    members: PlanningVolunteer[];
    /** Heure de début du 1er créneau (optionnel) */
    shift_time?: string | null;
  };
  /** Index pour l'alternance visuelle */
  index?: number;
}

function formatTime(iso?: string | null): string {
  if (!iso) return "–";
  const d = new Date(iso);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return m === "00" ? `${h}:00` : `${h}:${m}`;
}

export function PlanningTeamColumn({ team, index = 0 }: TeamProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `t-${team.id}` });
  const filled = team.members.length;
  const need = team.needs_count_default;
  const isComplete = filled >= need;
  const isEmpty = filled === 0;

  // Badge capacité
  const badgeBg = isComplete
    ? "rgba(255,255,255,0.10)"
    : isEmpty
    ? "rgba(239,68,68,0.20)"
    : "rgba(196,154,44,0.25)";
  const badgeColor = isComplete ? "rgba(255,255,255,0.55)" : isEmpty ? "#F87171" : "#F0BE4A";

  const rowBg = isOver
    ? "rgba(255,255,255,0.07)"
    : index % 2 === 0
    ? "transparent"
    : "rgba(255,255,255,0.025)";

  return (
    <section
      ref={setNodeRef}
      id={`team-${team.slug}`}
      className="transition-colors"
      style={{
        background: rowBg,
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        boxShadow: isOver ? "inset 0 0 0 1.5px rgba(196,154,44,0.40)" : "none",
        borderRadius: isOver ? "8px" : "0",
      }}
    >
      {/* ── Header de la rangée ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Heure */}
        <span
          className="w-11 flex-shrink-0 text-sm font-mono leading-none"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          {team.shift_time ? formatTime(team.shift_time) : ""}
        </span>

        {/* Nom du poste */}
        <span className="flex-1 text-sm font-semibold leading-snug" style={{ color: "#FFFFFF" }}>
          {team.icon ? <span className="mr-1.5">{team.icon}</span> : null}
          {team.name}
        </span>

        {/* Badge capacité */}
        <span
          className="flex-none rounded-full px-2.5 py-0.5 text-xs font-bold leading-none"
          style={{ background: badgeBg, color: badgeColor }}
        >
          {filled}/{need}
        </span>
      </div>

      {/* ── Chips bénévoles ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 px-4 pb-3">
        {team.members.length === 0 ? (
          <span
            className="rounded-full px-3 py-1 text-[11px]"
            style={{
              color: "rgba(255,255,255,0.25)",
              border: "1px dashed rgba(255,255,255,0.12)",
            }}
          >
            Dépose un bénévole ici
          </span>
        ) : (
          team.members.map((v) => (
            <PlanningVolunteerChip
              key={v.user_id}
              v={v}
              currentTeamId={team.id}
              currentTeamSlug={team.slug}
              dark={true}
            />
          ))
        )}
      </div>
    </section>
  );
}

// ─── Pool (bénévoles sans équipe) ──────────────────────────────────────────

interface PoolProps {
  pool: PlanningVolunteer[];
  totalPool: number;
}

export function PlanningPool({ pool, totalPool }: PoolProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `t-${POOL_ID}` });

  return (
    <section
      ref={setNodeRef}
      className="rounded-2xl transition-colors"
      style={{
        background: isOver
          ? "rgba(196,154,44,0.06)"
          : "rgba(255,255,255,0.04)",
        border: isOver
          ? "1.5px dashed rgba(196,154,44,0.50)"
          : "1px dashed rgba(255,255,255,0.15)",
        padding: "16px",
      }}
    >
      <header className="mb-3 flex items-center gap-2">
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-bold"
          style={{
            background: totalPool > 0 ? "rgba(239,68,68,0.20)" : "rgba(16,185,129,0.15)",
            color: totalPool > 0 ? "#F87171" : "#34D399",
          }}
        >
          {totalPool}
        </span>
        <h3
          className="text-[11px] font-bold uppercase tracking-[0.15em]"
          style={{ color: "rgba(255,255,255,0.45)" }}
        >
          Sans équipe
        </h3>
      </header>

      {pool.length === 0 ? (
        <p className="py-2 text-center text-xs" style={{ color: "#34D399" }}>
          ✅ Tous les bénévoles sont placés
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {pool.map((v) => (
            <PlanningVolunteerChip
              key={v.user_id}
              v={v}
              currentTeamId={null}
              dark={true}
            />
          ))}
        </div>
      )}
    </section>
  );
}
