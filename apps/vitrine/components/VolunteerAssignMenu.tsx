"use client";

import { useEffect, useRef } from "react";

import { useAssign, type AssignVolunteerSummary } from "./AssignContext";

interface Props {
  open: boolean;
  volunteer: AssignVolunteerSummary | null;
  currentTeamId: string | null;
  onClose: () => void;
  onAssign: (targetPositionId: string | null) => void;
}

/**
 * Bottom sheet mobile / modal centré PC.
 * Touch-targets 56px, ESC ferme, focus trap simple, overlay click ferme.
 */
export function VolunteerAssignMenu({
  open,
  volunteer,
  currentTeamId,
  onClose,
  onAssign,
}: Props) {
  const { teams } = useAssign();
  const dialogRef = useRef<HTMLDivElement>(null);

  // ESC + focus
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    // Focus le premier élément focusable du dialog
    const first = dialogRef.current?.querySelector<HTMLElement>(
      'button, [href], [tabindex]:not([tabindex="-1"])',
    );
    first?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock scroll body
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !volunteer) return null;

  const isPending = volunteer.pending_account;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Assigner ${volunteer.full_name} à une équipe`}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden />
      <div
        ref={dialogRef}
        className="relative z-10 w-full max-w-md rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl"
        style={{ maxHeight: "85vh" }}
      >
        <div className="flex items-start justify-between gap-3 border-b border-brand-ink/10 p-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-widest text-brand-coral">
              Assigner à une équipe
            </p>
            <h2 className="truncate font-display text-lg font-semibold leading-tight">
              {volunteer.first_name ?? volunteer.full_name}
            </h2>
            {volunteer.email && (
              <p className="truncate text-xs text-brand-ink/55">{volunteer.email}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-11 w-11 flex-none items-center justify-center rounded-full text-brand-ink/60 hover:bg-brand-ink/5"
          >
            ✕
          </button>
        </div>

        {/* Bug #16 fix : on affiche TOUJOURS la liste d'équipes, même pour
            pending_account. Le RPC assign_volunteer_atomic auto-upgrade le
            pre-volunteer en bénévole réel si auth.users + application validée
            existent. On conserve juste un banner d'info au-dessus de la liste. */}
        {isPending && (
          <div className="border-b border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
            <strong>⏳ Compte pas encore créé.</strong> Le bénévole sera invité automatiquement
            si tu l&apos;assignes — il devra activer son compte avant d&apos;accéder à son espace.
          </div>
        )}
        <div className="overflow-y-auto p-2" style={{ maxHeight: "60vh" }}>
            <ul className="space-y-1.5">
              {teams.map((t) => {
                const isCurrent = t.id === currentTeamId;
                const matchesWish = volunteer.preferred_slugs.includes(t.slug);
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => onAssign(t.id)}
                      disabled={isCurrent}
                      aria-current={isCurrent ? "true" : undefined}
                      className={`flex min-h-[56px] w-full items-center gap-3 rounded-xl border p-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral/60 ${
                        isCurrent
                          ? "cursor-default border-brand-coral/40 bg-brand-coral/5"
                          : "border-brand-ink/10 hover:border-brand-coral/40 hover:bg-brand-cream/40 active:scale-[0.99]"
                      }`}
                      style={{
                        borderLeft: `4px solid ${t.color}`,
                        touchAction: "manipulation",
                      }}
                    >
                      {t.icon && <span className="text-2xl">{t.icon}</span>}
                      <span className="flex-1 font-medium">{t.name}</span>
                      {isCurrent && (
                        <span className="text-xs font-semibold text-brand-coral">Actuelle</span>
                      )}
                      {!isCurrent && matchesWish && (
                        <span
                          className="text-xs font-semibold text-emerald-600"
                          title="Souhait du bénévole"
                        >
                          ★ Souhait
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              onClick={() => onAssign(null)}
              disabled={currentTeamId === null}
              className="mt-3 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl border border-dashed border-brand-ink/20 p-3 text-sm font-medium text-brand-ink/70 transition hover:border-brand-coral/40 hover:bg-brand-cream/40 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ touchAction: "manipulation" }}
            >
              📋 Renvoyer au pool
            </button>
          </div>
      </div>
    </div>
  );
}
