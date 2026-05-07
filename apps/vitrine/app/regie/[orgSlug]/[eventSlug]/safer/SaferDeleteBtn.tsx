"use client";

import { useState, useTransition } from "react";
import { deleteSaferAlert, clearSaferHistory } from "@/app/actions/safer";

interface DeleteAlertBtnProps {
  alertId: string;
  orgSlug: string;
  eventSlug: string;
}

export function DeleteAlertBtn({ alertId, orgSlug, eventSlug }: DeleteAlertBtnProps) {
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) return <span className="text-xs text-brand-ink/40">Supprimé</span>;

  return (
    <div className="flex items-center gap-1.5">
      {!confirm ? (
        <button
          type="button"
          onClick={() => setConfirm(true)}
          className="rounded-md border border-red-200 px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50 transition"
        >
          🗑
        </button>
      ) : (
        <>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const r = await deleteSaferAlert({ alertId, orgSlug, eventSlug });
                if (r.ok) setDone(true);
                else setError(r.error ?? "Erreur");
              });
              setConfirm(false);
            }}
            className="rounded-md bg-red-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {pending ? "..." : "Supprimer"}
          </button>
          <button
            type="button"
            onClick={() => setConfirm(false)}
            className="rounded-md border px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
          >
            Annuler
          </button>
        </>
      )}
      {error && <span className="text-[11px] text-red-700">{error}</span>}
    </div>
  );
}

interface ClearHistoryBtnProps {
  orgSlug: string;
  eventSlug: string;
}

export function ClearHistoryBtn({ orgSlug, eventSlug }: ClearHistoryBtnProps) {
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) return <span className="text-xs text-emerald-700">✓ Historique vidé</span>;

  return (
    <div className="flex items-center gap-2">
      {!confirm ? (
        <button
          type="button"
          onClick={() => setConfirm(true)}
          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition"
        >
          🗑 Vider l&apos;historique
        </button>
      ) : (
        <>
          <span className="text-xs font-medium text-red-700">Supprimer toutes les alertes résolues ?</span>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const r = await clearSaferHistory({ orgSlug, eventSlug });
                if (r.ok) setDone(true);
                else setError(r.error ?? "Erreur");
              });
              setConfirm(false);
            }}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {pending ? "..." : "Confirmer"}
          </button>
          <button
            type="button"
            onClick={() => setConfirm(false)}
            className="rounded-lg border px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
          >
            Annuler
          </button>
        </>
      )}
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
