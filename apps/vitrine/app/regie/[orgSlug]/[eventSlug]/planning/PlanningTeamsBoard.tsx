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
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [pool, setPool] = useState<PlanningVolunteer[]>(initialPool);
  const [, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  // Bug #5 fix : si les props re-fetch côté serveur (router.refresh) avec un nouvel
  // état (membership créée → bénévole sort des preVolunteers), on resync l'état local.
  useEffect(() => {
    setTeams(initialTeams);
    setPool(initialPool);
  }, [initialTeams, initialPool]);
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
      // 🆕 Universal pre-volunteer fix : on n'arrête PLUS le drag côté client.
      // Le serveur (assignVolunteerToTeam) détecte le préfixe `pre-<email>` et
      // auto-crée la membership volunteer si auth.users + volunteer_application
      // validated existent. Si l'une des conditions manque, le serveur retourne
      // un message clair (Compte auth introuvable / Aucune candidature validée).

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
            // Bug #5 fix : router.refresh() force Next à re-fetch les Server
            // Components → page.tsx requery les memberships/applications/assignments
            // → le useEffect [initialTeams, initialPool] resync l'état local. Sans
            // ça, le pre-volunteer drag affichait l'optimistic update mais le user
            // avait toujours user_id préfixé "pre-" en local → état incohérent au
            // prochain drag/F5. Maintenant le serveur est la source de vérité.
            router.refresh();
            resolve({ ok: true });
          }
        });
      });
    },
    [eventId, pool, teams, router],
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
        {/* Hint UX adaptatif */}
        <div
          className="rounded-xl px-3 py-2 text-xs"
          style={{ background: "rgba(26,56,40,0.05)", border: "1px solid #E5DDD0", color: "#7A7060" }}
        >
          <span className="md:hidden">
            💡 <strong style={{ color: "#1A3828" }}>Sur mobile</strong> : touche court = menu d&apos;équipes (chips en haut).
            Maintien 250ms puis fais glisser = drag-and-drop.
          </span>
          <span className="hidden md:inline">
            💡 <strong style={{ color: "#1A3828" }}>Sur ordinateur</strong> : clique-glisse une carte vers une équipe.
            Clic droit sur une carte = menu rapide.
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            type="text"
            inputMode="search"
            placeholder="Filtrer par nom ou email…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full max-w-xs rounded-xl px-3 py-2 text-base focus:outline-none"
            style={{
              background: "#FFFFFF",
              border: "1px solid #E5DDD0",
              color: "#1A3828",
              fontSize: "16px",
            }}
          />
          {feedback && (
            <span
              className="rounded-xl px-3 py-1.5 text-xs font-semibold"
              style={
                feedback.startsWith("❌")
                  ? { background: "rgba(239,68,68,0.10)", color: "#DC2626" }
                  : feedback.startsWith("✓")
                  ? { background: "rgba(16,185,129,0.10)", color: "#10B981" }
                  : { background: "rgba(196,154,44,0.10)", color: "#7A5800" }
              }
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
          {/* Layout global : desktop → sidebar pool + liste postes | mobile → stack vertical */}
          <div className="flex flex-col gap-4 md:flex-row md:items-start">

            {/* ── POOL (bénévoles sans équipe) ────────────────────────────── */}
            <div className="md:w-64 md:flex-shrink-0">
              <PlanningPool pool={filteredPool} totalPool={pool.length} />
            </div>

            {/* ── LISTE DES POSTES (fond sombre, style prototype) ─────────── */}
            <div
              className="min-w-0 flex-1 overflow-hidden rounded-2xl"
              style={{ background: "#0D1F14" }}
            >
              {/* Header bloc créneau */}
              <div
                className="px-4 py-3"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
              >
                <p
                  className="text-xs font-bold uppercase tracking-[0.18em]"
                  style={{ color: "rgba(255,255,255,0.40)" }}
                >
                  Couverture des postes — glisse-dépose pour répartir
                </p>
              </div>

              {/* Rangées de postes */}
              <div>
                {filteredTeams.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm" style={{ color: "rgba(255,255,255,0.30)" }}>
                    Aucun poste actif
                  </p>
                ) : (
                  filteredTeams.map((team, idx) => (
                    <PlanningTeamColumn key={team.id} team={team} index={idx} />
                  ))
                )}
              </div>
            </div>
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
