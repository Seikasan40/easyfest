"use client";

import { useState, useTransition } from "react";

import {
  acknowledgeSaferAlert,
  resolveSaferAlert,
  markFalseAlarmSaferAlert,
} from "@/app/actions/safer";

interface Props {
  alertId: string;
  orgSlug: string;
  eventSlug: string;
  status: string;
  isMine: boolean;
  isOpen: boolean;
}

/**
 * Boutons d'action sur une alerte Safer pour le médiateur.
 * - "Prendre en charge" : visible si alerte open et pas encore assignée
 * - "Marquer résolu" : visible si l'alerte est mienne et pas déjà résolue
 * - "Fausse alerte" : visible si l'alerte est mienne et pas déjà résolue
 */
export function SaferAlertActions({ alertId, orgSlug, eventSlug, status, isMine, isOpen }: Props) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showResolve, setShowResolve] = useState(false);
  const [resolveNotes, setResolveNotes] = useState("");

  if (status === "resolved" || status === "false_alarm") return null;

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    setFeedback(null);
    startTransition(async () => {
      const r = await fn();
      if (r.ok) {
        setFeedback(`✓ ${success}`);
      } else {
        setFeedback(`❌ ${r.error ?? "Erreur"}`);
      }
      setTimeout(() => setFeedback(null), 5000);
    });
  }

  return (
    <div className="mt-2.5 space-y-2 border-t border-brand-ink/10 pt-2.5">
      <div className="flex flex-wrap gap-2">
        {isOpen && !isMine && (
          <button
            type="button"
            onClick={() => run(
              () => acknowledgeSaferAlert({ alertId, orgSlug, eventSlug }),
              "Tu as pris en charge cette alerte",
            )}
            disabled={pending}
            className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-600 active:scale-95 disabled:opacity-50"
            style={{ minHeight: "44px" }}
          >
            {pending ? "..." : "🤝 Prendre en charge"}
          </button>
        )}

        {isMine && (
          <>
            <button
              type="button"
              onClick={() => setShowResolve((v) => !v)}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"
              style={{ minHeight: "44px" }}
            >
              ✓ Marquer résolue
            </button>
            <button
              type="button"
              onClick={() => run(
                () => markFalseAlarmSaferAlert({ alertId, orgSlug, eventSlug }),
                "Marquée comme fausse alerte",
              )}
              disabled={pending}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95 disabled:opacity-50"
              style={{ minHeight: "44px" }}
            >
              ⚠ Fausse alerte
            </button>
          </>
        )}
      </div>

      {showResolve && isMine && (
        <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5">
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-emerald-900">
            Notes de résolution (optionnel)
          </label>
          <textarea
            value={resolveNotes}
            onChange={(e) => setResolveNotes(e.target.value.slice(0, 500))}
            rows={3}
            maxLength={500}
            placeholder="Ce qui a été fait, qui a été contacté, suivi…"
            className="w-full rounded-md border border-emerald-300 bg-white px-2.5 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
            style={{ fontSize: "16px" }}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                run(
                  () => resolveSaferAlert({ alertId, orgSlug, eventSlug, notes: resolveNotes || undefined }),
                  "Alerte résolue ✨",
                );
                setShowResolve(false);
                setResolveNotes("");
              }}
              disabled={pending}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              style={{ minHeight: "36px" }}
            >
              Confirmer la résolution
            </button>
            <button
              type="button"
              onClick={() => setShowResolve(false)}
              className="rounded-md border border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
              style={{ minHeight: "36px" }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {feedback && (
        <p
          className={`text-[11px] font-medium ${
            feedback.startsWith("❌") ? "text-red-700" : "text-emerald-700"
          }`}
          role="status"
          aria-live="polite"
        >
          {feedback}
        </p>
      )}
    </div>
  );
}
