"use client";

import { useDroppable } from "@dnd-kit/core";

import { PlanningVolunteerCard, type PlanningVolunteer } from "./PlanningVolunteerCard";

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
  };
}

export function PlanningTeamColumn({ team }: TeamProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `t-${team.id}` });
  const filled = team.members.length;
  const need = team.needs_count_default;
  const status = filled >= need ? "complete" : filled > 0 ? "partial" : "empty";

  return (
    <section
      ref={setNodeRef}
      id={`team-${team.slug}`}
      className={`flex min-h-[140px] flex-col rounded-2xl border-2 bg-white p-3 shadow-sm transition ${
        isOver ? "border-[var(--theme-primary,_#FF5E5B)] ring-2 ring-[var(--theme-primary,_#FF5E5B)]/20" : "border-brand-ink/10"
      }`}
      style={{ borderTopColor: team.color, borderTopWidth: 4 }}
    >
      <header className="mb-2 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold leading-tight">
          {team.icon ? <span className="mr-1">{team.icon}</span> : null}
          {team.name}
        </h3>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
            status === "complete"
              ? "bg-emerald-100 text-emerald-700"
              : status === "partial"
                ? "bg-amber-100 text-amber-700"
                : "bg-brand-ink/10 text-brand-ink/60"
          }`}
        >
          {filled} / {need}
        </span>
      </header>
      {team.description && (
        <p className="mb-2 text-[11px] text-brand-ink/55 line-clamp-2">{team.description}</p>
      )}
      <div className="space-y-2">
        {team.members.length === 0 ? (
          <p className="rounded-lg border border-dashed border-brand-ink/15 px-2 py-3 text-center text-[11px] text-brand-ink/40">
            Glisse un bénévole ici
          </p>
        ) : (
          team.members.map((v) => (
            <PlanningVolunteerCard
              key={v.user_id}
              v={v}
              currentTeamId={team.id}
              currentTeamSlug={team.slug}
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
      className={`rounded-2xl border-2 border-dashed p-4 transition ${
        isOver ? "border-[var(--theme-primary,_#FF5E5B)] bg-[var(--theme-primary,_#FF5E5B)]/5" : "border-brand-ink/15 bg-brand-cream/40"
      }`}
    >
      <header className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-ink/70">
          📋 Bénévoles à placer ({totalPool})
        </h3>
        <span className="text-xs text-brand-ink/50">
          Glisse-dépose ou appui long pour assigner
        </span>
      </header>
      {pool.length === 0 ? (
        <p className="py-3 text-center text-xs text-brand-ink/50">
          Tous les bénévoles ont une équipe 🎉
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
