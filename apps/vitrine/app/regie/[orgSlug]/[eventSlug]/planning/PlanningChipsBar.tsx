"use client";

import { useDroppable } from "@dnd-kit/core";

import { useAssign } from "@/components/AssignContext";

import { POOL_ID } from "./PlanningTeamColumn";

/**
 * Sticky top bar mobile-first : ligne horizontale scrollable avec une chip par équipe.
 * Chaque chip est un drop target DnD (drag depuis pool vers chip = assigner) + un bouton
 * tactile (tap = filtrer le pool sur cette équipe, ou ouvrir le menu d'équipe focus).
 *
 * Visible uniquement sur mobile (md:hidden). Desktop garde la grid colonnes.
 */
interface ChipTeam {
  id: string;
  slug: string;
  name: string;
  color: string;
  icon: string | null;
  membersCount: number;
  needs: number;
}

interface Props {
  teams: ChipTeam[];
  /** Slug ou id sélectionné pour highlight (depuis ?team=...) */
  highlightId?: string | null;
}

const DARK = "#1A3828";
const BORDER = "#E5DDD0";
const MUTED = "#7A7060";

export function PlanningChipsBar({ teams, highlightId }: Props) {
  return (
    <div
      className="sticky top-0 z-20 -mx-4 px-4 py-2 backdrop-blur md:hidden"
      style={{
        background: "rgba(248,244,236,0.95)",
        borderBottom: `1px solid ${BORDER}`,
      }}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.13em]" style={{ color: MUTED }}>
          Équipes — touche un bénévole pour l&apos;assigner
        </p>
        <span className="text-[10px]" style={{ color: MUTED }}>{teams.length} équipes</span>
      </div>
      <div
        className="flex gap-2 overflow-x-auto pb-1"
        style={{ WebkitOverflowScrolling: "touch", scrollSnapType: "x proximity" }}
        role="group"
        aria-label="Liste des équipes — drop target ou cliquer pour focus"
      >
        <PoolChip />
        {teams.map((t) => (
          <TeamChip key={t.id} team={t} highlighted={highlightId === t.id || highlightId === t.slug} />
        ))}
      </div>
    </div>
  );
}

function PoolChip() {
  const { setNodeRef, isOver } = useDroppable({ id: `t-${POOL_ID}` });
  return (
    <a
      ref={setNodeRef}
      href="#planning-pool"
      className="flex h-10 min-w-[72px] flex-none items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition active:scale-95"
      style={{
        background: isOver ? "rgba(196,154,44,0.10)" : "#FFFFFF",
        border: isOver ? "1.5px solid #C49A2C" : `1px solid ${BORDER}`,
        color: isOver ? "#7A5800" : MUTED,
        scrollSnapAlign: "start",
      }}
    >
      <span aria-hidden>🪂</span>
      <span>Pool</span>
    </a>
  );
}

function TeamChip({ team, highlighted }: { team: ChipTeam; highlighted: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: `t-${team.id}` });

  const ratio = team.needs > 0 ? team.membersCount / team.needs : 0;
  const countStyle =
    ratio >= 1
      ? { background: "rgba(16,185,129,0.12)", color: "#10B981" }
      : ratio >= 0.5
      ? { background: "rgba(196,154,44,0.12)", color: "#C49A2C" }
      : { background: "rgba(239,68,68,0.10)", color: "#DC2626" };

  return (
    <a
      ref={setNodeRef}
      href={`#team-${team.slug}`}
      className="flex h-10 min-w-[110px] flex-none items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition active:scale-95"
      style={{
        background: isOver
          ? `${team.color}15`
          : highlighted
          ? `${team.color}0D`
          : "#FFFFFF",
        border: isOver
          ? `1.5px solid ${team.color}`
          : highlighted
          ? `1px solid ${team.color}50`
          : `1px solid ${BORDER}`,
        color: DARK,
        scrollSnapAlign: "start",
      }}
      title={`${team.name} : ${team.membersCount}/${team.needs} bénévoles`}
    >
      {team.icon && <span aria-hidden className="text-sm leading-none">{team.icon}</span>}
      <span className="truncate">{team.name}</span>
      <span
        className="flex-none rounded-full px-1.5 py-0.5 text-[9px] font-bold tabular-nums"
        style={countStyle}
        aria-label={`${team.membersCount} sur ${team.needs} bénévoles`}
      >
        {team.membersCount}/{team.needs}
      </span>
    </a>
  );
}
