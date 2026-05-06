"use client";

import { useDroppable } from "@dnd-kit/core";

import { PlanningVolunteerCard, type PlanningVolunteer } from "./PlanningVolunteerCard";

export const POOL_ID = "__pool__";

const DARK = "#1A3828";
const BORDER = "#E5DDD0";
const MUTED = "#7A7060";

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
  };
}

export function PlanningTeamColumn({ team }: TeamProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `t-${team.id}` });
  const filled = team.members.length;
  const need = team.needs_count_default;
  const status = filled >= need ? "complete" : filled > 0 ? "partial" : "empty";

  const badgeStyle =
    status === "complete"
      ? { background: "rgba(16,185,129,0.12)", color: "#10B981" }
      : status === "partial"
      ? { background: "rgba(196,154,44,0.12)", color: "#C49A2C" }
      : { background: "rgba(26,56,40,0.06)", color: MUTED };

  return (
    <section
      ref={setNodeRef}
      id={`team-${team.slug}`}
      className="flex min-h-[140px] flex-col rounded-2xl p-3 transition"
      style={{
        background: "#FFFFFF",
        border: isOver ? `1.5px solid ${team.color}` : `1px solid ${BORDER}`,
        borderLeft: `4px solid ${team.color}`,
        boxShadow: isOver
          ? `0 0 0 3px ${team.color}18, 0 2px 8px rgba(26,56,40,0.10)`
          : "0 1px 4px rgba(26,56,40,0.06)",
      }}
    >
      <header className="mb-2 flex items-center justify-between gap-2">
        <h3
          className="font-display text-sm font-semibold leading-tight truncate"
          style={{ color: DARK }}
        >
          {team.icon ? <span className="mr-1">{team.icon}</span> : null}
          {team.name}
        </h3>
        <span
          className="flex-none rounded-full px-2 py-0.5 text-[10px] font-bold"
          style={badgeStyle}
        >
          {filled} / {need}
        </span>
      </header>
      {team.description && (
        <p className="mb-2 text-[11px] line-clamp-2" style={{ color: MUTED }}>
          {team.description}
        </p>
      )}
      <div className="space-y-1.5 flex-1">
        {team.members.length === 0 ? (
          <div
            className="rounded-xl px-2 py-4 text-center"
            style={{ border: `1px dashed ${BORDER}` }}
          >
            <p className="text-[11px]" style={{ color: MUTED }}>
              Glisse un bénévole ici
            </p>
          </div>
        ) : (
          team.members.map((v) => (
            <PlanningVolunteerCard
              key={v.user_id}
              v={v}
              currentTeamId={team.id}
              currentTeamSlug={team.slug}
              teamColor={team.color}
            />
          ))
        )}
      </div>
    </section>
  );
}

interface PoolProps {
  pool: PlanningVolunteer[];
  totalPool: number;
}

export function PlanningPool({ pool, totalPool }: PoolProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `t-${POOL_ID}` });
  return (
    <section
      ref={setNodeRef}
      className="rounded-2xl p-4 transition"
      style={{
        background: isOver ? "rgba(196,154,44,0.06)" : "#F8F4EC",
        border: isOver ? `1.5px dashed #C49A2C` : `1.5px dashed ${BORDER}`,
      }}
    >
      <header className="mb-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={{ background: "rgba(26,56,40,0.08)", color: DARK }}
          >
            {totalPool}
          </span>
          <h3 className="text-xs font-bold uppercase tracking-[0.13em]" style={{ color: MUTED }}>
            POOL — Bénévoles à placer
          </h3>
        </div>
        <span className="text-[10px]" style={{ color: MUTED }}>
          Appui long → drag · ou tap pour menu
        </span>
      </header>
      {pool.length === 0 ? (
        <p className="py-3 text-center text-xs" style={{ color: "#10B981" }}>
          ✅ Tous les bénévoles ont une équipe
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {pool.map((v) => (
            <PlanningVolunteerCard key={v.user_id} v={v} currentTeamId={null} />
          ))}
        </div>
      )}
    </section>
  );
}
