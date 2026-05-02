"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { assignVolunteerToTeam } from "@/app/actions/planning";
import { AssignProvider, type AssignVolunteerSummary } from "@/components/AssignContext";
import { VolunteerAssignMenu } from "@/components/VolunteerAssignMenu";

import {
  POOL_ID,
  PlanningPool,
  PlanningTeamColumn,
} from "./PlanningTeamColumn";
import type { PlanningVolunteer } from "./PlanningVolunteerCard";

interface Team {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon: string | null;
  description: string | null;
  needs_count_default: number;
  members: PlanningVolunteer[];
}

interface Props {
  initialTeams: Team[];
  initialPool: PlanningVolunteer[];
  eventId: string;
  /** Slug d'équipe à mettre en évidence (depuis ?team=...). */
  highlightTeamSlug?: string | null;
}

interface MenuState {
  open: boolean;
  volunteer: AssignVolunteerSummary | null;
  currentTeamId: string | null;
}

export function PlanningTeamsBoard({
  initialTeams,
  initialPool,
  eventId,
  highlightTeamSlug,
}: Props) {
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [pool, setPool] = useState<PlanningVolunteer[]>(initialPool);
  const [, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [menu, setMenu] = useState<MenuState>({
    open: false,
    volunteer: null,
    currentTeamId: null,
  });

  // Scroll to highlighted team on mount
  useEffect(() => {
    if (!highlightTeamSlug) return;
    const el = document.getElementById(`team-${highlightTeamSlug}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-[var(--theme-primary,_#FF5E5B)]/40");
      const t = setTimeout(() => el.classList.remove("ring-2", "ring-[var(--theme-primary,_#FF5E5B)]/40"), 2500);
      return () => clearTimeout(t);
    }
  }, [highlightTeamSlug]);

  const handleInviteRequest = useCallback((email: string) => {
    setFeedback(
      `💡 Pour inviter ${email}, va sur l'onglet Candidatures → bouton 📧 à côté de son nom`,
    );
    setTimeout(() => setFeedback(null), 6000);
  }, []);

  // Sensors retunés : PointerSensor 8px (mobile-friendly), TouchSensor 250/12 cohérent useLongPress
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 12 } }),
    useSensor(KeyboardSensor),
  );

  /**
   * Optimistic update + server action. Réutilisable pour DnD ET menu long-press.
   */
  const assignOptimistic = useCallback(
    async (
      volunteerUserId: string,
      targetPositionId: string | null,
    ): Promise<{ ok: boolean; error?: string }> => {
      if (volunteerUserId.startsWith("pre-")) {
        setFeedback("⏳ Compte pas encore créé — invite ce bénévole d'abord");
        setTimeout(() => setFeedback(null), 3500);
        return { ok: false, error: "pending_account" };
      }

      // Snapshot pour rollback
      const snapTeams = teams;
      const snapPool = pool;

      const inPool = pool.find((v) => v.user_id === volunteerUserId);
      let vol: PlanningVolunteer | null = inPool ?? null;
      let from: string | null = inPool ? POOL_ID : null;
      if (!vol) {
        for (const t of teams) {
          const m = t.members.find((mm) => mm.user_id === volunteerUserId);
          if (m) {
            vol = m;
            from = t.id;
            break;
          }
        }
      }
      if (!vol) return { ok: false, error: "not_found" };
      if (from === (targetPositionId ?? POOL_ID)) return { ok: true };

      const updatedTeams = teams.map((t) => ({
        ...t,
        members: t.members.filter((m) => m.user_id !== volunteerUserId),
      }));
      let updatedPool = pool.filter((v) => v.user_id !== volunteerUserId);
      if (targetPositionId === null) {
        updatedPool = [...updatedPool, vol];
      } else {
        const idx = updatedTeams.findIndex((t) => t.id === targetPositionId);
        if (idx === -1) return { ok: false, error: "team_not_found" };
        updatedTeams[idx] = {
          ...updatedTeams[idx]!,
          members: [...updatedTeams[idx]!.members, vol],
        };
      }
      setTeams(updatedTeams);
      setPool(updatedPool);
      setFeedback("Mise à jour…");

      return new Promise((resolve) => {
        startTransition(async () => {
          const result = await assignVolunteerToTeam({
            volunteerUserId,
            targetPositionId,
            eventId,
          });
          if (!result.ok) {
            setTeams(snapTeams);
            setPool(snapPool);
            setFeedback(`❌ ${result.error}`);
            resolve({ ok: false, error: result.error });
          } else {
            setFeedback("✓ Sauvegardé");
            setTimeout(() => setFeedback(null), 2000);
            resolve({ ok: true });
          }
        });
      });
    },
    [eventId, pool, teams],
  );

  const openMenu = useCallback(
    (vol: AssignVolunteerSummary, currentTeamId: string | null) => {
      setMenu({ open: true, volunteer: vol, currentTeamId });
    },
    [],
  );

  const closeMenu = useCallback(() => {
    setMenu({ open: false, volunteer: null, currentTeamId: null });
  }, []);

  const handleMenuAssign = useCallback(
    (targetPositionId: string | null) => {
      if (!menu.volunteer) return;
      const userId = menu.volunteer.user_id;
      closeMenu();
      void assignOptimistic(userId, targetPositionId);
    },
    [assignOptimistic, closeMenu, menu.volunteer],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;
      const userId = String(active.id).replace(/^v-/, "");
      const targetTeamId = String(over.id).replace(/^t-/, "");
      const targetPositionId = targetTeamId === POOL_ID ? null : targetTeamId;
      void assignOptimistic(userId, targetPositionId);
    },
    [assignOptimistic],
  );

  // Filter
  const lowerFilter = filter.trim().toLowerCase();
  const matches = (v: PlanningVolunteer) =>
    !lowerFilter ||
    v.full_name.toLowerCase().includes(lowerFilter) ||
    (v.email ?? "").toLowerCase().includes(lowerFilter);

  const filteredPool = pool.filter(matches);
  const filteredTeams = teams.map((t) => ({ ...t, members: t.members.filter(matches) }));

  const assignContextValue = useMemo(
    () => ({
      teams: teams.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        color: t.color,
        icon: t.icon,
      })),
      assign: assignOptimistic,
      openMenu,
      onInviteRequest: handleInviteRequest,
    }),
    [assignOptimistic, handleInviteRequest, openMenu, teams],
  );

  return (
    <AssignProvider value={assignContextValue}>
      <div className="space-y-4">
        <div className="rounded-lg border border-[var(--theme-primary,_#FF5E5B)]/30 bg-[var(--theme-primary,_#FF5E5B)]/5 px-3 py-2 text-xs text-brand-ink/75">
          💡 <strong>2 façons d&apos;assigner</strong> : glisse-dépose une carte vers une équipe,
          OU appui long sur une carte (clic droit sur PC) pour ouvrir le menu équipes.
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            type="text"
            inputMode="search"
            placeholder="Filtrer par nom ou email…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full max-w-xs rounded-lg border border-brand-ink/15 bg-white px-3 py-2 text-base focus:border-[var(--theme-primary,_#FF5E5B)] focus:outline-none sm:text-sm"
            style={{ fontSize: "16px" }}
          />
          {feedback && (
            <span
              className={`rounded-md px-2 py-1 text-xs font-medium ${
                feedback.startsWith("❌")
                  ? "bg-red-100 text-red-700"
                  : feedback.startsWith("✓")
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
              }`}
              role="status"
              aria-live="polite"
            >
              {feedback}
            </span>
          )}
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <PlanningPool pool={filteredPool} totalPool={pool.length} />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredTeams.map((team) => (
              <PlanningTeamColumn key={team.id} team={team} />
            ))}
          </div>
        </DndContext>

        <VolunteerAssignMenu
          open={menu.open}
          volunteer={menu.volunteer}
          currentTeamId={menu.currentTeamId}
          onClose={closeMenu}
          onAssign={handleMenuAssign}
        />
      </div>
    </AssignProvider>
  );
}
