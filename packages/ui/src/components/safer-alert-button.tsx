"use client";

import * as React from "react";

import { cn } from "../utils/cn";

interface Props {
  onTrigger?: (kind: string, description: string) => Promise<void> | void;
  className?: string;
}

const ALERT_KINDS = [
  { value: "harassment", label: "Harcèlement", emoji: "🛑" },
  { value: "physical_danger", label: "Danger physique", emoji: "⚠️" },
  { value: "medical", label: "Urgence médicale", emoji: "🩺" },
  { value: "other", label: "Autre", emoji: "❗" },
];

export function SaferAlertButton({ onTrigger, className }: Props) {
  const [open, setOpen] = React.useState(false);
  const [kind, setKind] = React.useState<string | null>(null);
  const [description, setDescription] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  async function submit() {
    if (!kind || pending) return;
    setPending(true);
    try {
      await onTrigger?.(kind, description);
      setSent(true);
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className={cn("rounded-2xl bg-wellbeing-red/10 p-6 text-center", className)}>
        <div className="mb-2 text-4xl">📡</div>
        <h3 className="font-display text-lg font-semibold text-wellbeing-red">Alerte envoyée</h3>
        <p className="mt-1 text-sm">
          La régie et les responsables ont été notifié·es. Quelqu'un va venir te voir.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded-2xl bg-wellbeing-red p-5 text-left text-white shadow-soft transition hover:opacity-95"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">🚨</span>
            <div>
              <p className="font-display text-lg font-bold leading-tight">ALERTE GRAVE</p>
              <p className="text-sm opacity-90">Bouton de signalement immédiat</p>
            </div>
          </div>
        </button>
      ) : (
        <div className="rounded-2xl border-2 border-wellbeing-red/40 bg-white p-5">
          <h3 className="font-display text-lg font-bold text-wellbeing-red">
            🚨 Signaler un problème grave
          </h3>
          <p className="mt-1 text-sm text-brand-ink/70">
            La régie et les responsables seront notifié·es immédiatement.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {ALERT_KINDS.map((k) => (
              <button
                key={k.value}
                type="button"
                onClick={() => setKind(k.value)}
                className={cn(
                  "rounded-xl border p-3 text-left text-sm transition",
                  kind === k.value
                    ? "border-wellbeing-red bg-wellbeing-red/10"
                    : "border-brand-ink/15 hover:bg-brand-ink/5",
                )}
              >
                <span className="mr-2">{k.emoji}</span>
                {k.label}
              </button>
            ))}
          </div>
          {kind && (
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Décris brièvement la situation (où, qui, quoi)…"
              className="mt-3 w-full rounded-xl border border-brand-ink/15 bg-white px-3 py-2 text-sm focus:border-wellbeing-red focus:outline-none focus:ring-2 focus:ring-wellbeing-red/20"
            />
          )}
          <div className="mt-4 flex justify-between">
            <button type="button" onClick={() => setOpen(false)} className="text-sm text-brand-ink/60">
              Annuler
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!kind || pending}
              className="rounded-xl bg-wellbeing-red px-4 py-2 text-sm font-medium text-white shadow-soft transition hover:opacity-90 disabled:opacity-50"
            >
              {pending ? "Envoi…" : "Envoyer l'alerte"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
