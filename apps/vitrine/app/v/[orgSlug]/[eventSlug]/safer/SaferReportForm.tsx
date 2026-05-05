"use client";

import { useState, useTransition } from "react";

import { submitSaferAlert } from "@/app/actions/safer";

const KINDS = [
  { value: "harassment", label: "Harcèlement / Discrimination", emoji: "🛡️" },
  { value: "physical_danger", label: "Danger physique", emoji: "🚨" },
  { value: "medical", label: "Problème médical", emoji: "🏥" },
  { value: "wellbeing_red", label: "Mal-être grave", emoji: "💔" },
  { value: "other", label: "Autre situation", emoji: "❓" },
] as const;

interface Props {
  orgSlug: string;
  eventSlug: string;
}

export function SaferReportForm({ orgSlug, eventSlug }: Props) {
  const [pending, startTransition] = useTransition();
  const [kind, setKind] = useState<string>("");
  const [description, setDescription] = useState("");
  const [locationHint, setLocationHint] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!kind) return;
    setError(null);
    startTransition(async () => {
      const res = await submitSaferAlert({
        orgSlug,
        eventSlug,
        kind,
        description: description || undefined,
        locationHint: locationHint || undefined,
      });
      if (res.ok) {
        setDone(true);
      } else {
        setError(res.error ?? "Erreur lors de l'envoi");
      }
    });
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="text-4xl">✅</p>
        <h2 className="mt-3 font-display text-xl font-bold text-emerald-900">Signalement envoyé</h2>
        <p className="mt-2 text-sm text-emerald-800">
          Un·e médiateur·ice va prendre en charge ta demande. Tu peux le contacter directement si
          la situation est urgente.
        </p>
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          ⚠️ En cas de danger immédiat, appelle le <strong>15 (SAMU)</strong> ou le{" "}
          <strong>17 (Police)</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--theme-primary,_#FF5E5B)]">
          Safer Space
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold leading-tight">Signaler une situation</h1>
        <p className="mt-1 text-sm text-brand-ink/70">
          Confidentiel. Transmis uniquement aux médiateur·ices désigné·es de l'événement.
        </p>
      </header>

      {/* Urgence vitale */}
      <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
        <p className="font-semibold">🚨 Urgence vitale ?</p>
        <p className="mt-0.5 text-xs">
          Si quelqu&apos;un est en danger immédiat → appelle le <strong>15</strong> ou{" "}
          <strong>17</strong> en priorité, puis utilise ce formulaire.
        </p>
      </div>

      {/* Type d'incident */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-brand-ink">Type de situation *</p>
        <ul className="space-y-2">
          {KINDS.map((k) => (
            <li key={k.value}>
              <button
                type="button"
                onClick={() => setKind(k.value)}
                className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
                  kind === k.value
                    ? "border-[var(--theme-primary,_#FF5E5B)] bg-[var(--theme-primary,_#FF5E5B)]/5 shadow-sm"
                    : "border-brand-ink/10 bg-white hover:border-brand-ink/25"
                }`}
              >
                <span className="mr-2">{k.emoji}</span>
                {k.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Description */}
      <label className="block space-y-1 text-sm">
        <span className="font-semibold text-brand-ink">Décris la situation</span>
        <span className="ml-1 text-brand-ink/50 text-xs">(optionnel)</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
          rows={4}
          maxLength={1000}
          placeholder="Ce que tu as vu ou vécu, depuis quand, qui est impliqué…"
          className="w-full rounded-lg border border-brand-ink/15 px-3 py-2 text-sm focus:border-[var(--theme-primary,_#FF5E5B)] focus:outline-none"
          style={{ fontSize: "16px" }}
        />
        <span className="text-[10px] text-brand-ink/40">{description.length}/1000</span>
      </label>

      {/* Lieu */}
      <label className="block space-y-1 text-sm">
        <span className="font-semibold text-brand-ink">Lieu ou zone</span>
        <span className="ml-1 text-brand-ink/50 text-xs">(optionnel)</span>
        <input
          type="text"
          value={locationHint}
          onChange={(e) => setLocationHint(e.target.value.slice(0, 200))}
          placeholder="Ex : près de la scène principale, entrée B…"
          className="w-full rounded-lg border border-brand-ink/15 px-3 py-2 text-sm focus:border-[var(--theme-primary,_#FF5E5B)] focus:outline-none"
          style={{ fontSize: "16px" }}
        />
      </label>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">❌ {error}</p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!kind || pending}
        className="w-full rounded-xl bg-[var(--theme-primary,_#FF5E5B)] px-5 py-3.5 text-base font-semibold text-white shadow-soft transition hover:opacity-90 disabled:opacity-50"
        style={{ minHeight: "52px" }}
      >
        {pending ? "Envoi en cours…" : "🛡️ Envoyer le signalement"}
      </button>

      <p className="text-center text-[11px] text-brand-ink/40">
        Ton identité est connue des médiateur·ices uniquement. Jamais rendue publique.
      </p>
    </div>
  );
}
