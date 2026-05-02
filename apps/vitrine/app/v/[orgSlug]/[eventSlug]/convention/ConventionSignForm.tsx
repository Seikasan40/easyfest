"use client";

import { useState, useTransition } from "react";

import { signConventionBenevolat } from "@/app/actions/engagements";

interface Props {
  eventId: string;
  version: string;
  fullName: string;
}

export function ConventionSignForm({ eventId, version, fullName }: Props) {
  const [acceptCharter, setAcceptCharter] = useState(false);
  const [acceptImage, setAcceptImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await signConventionBenevolat({
        eventId,
        version,
        consent: { acceptCharter, acceptImage },
      });
      if (!result.ok) {
        setError(result.error ?? "Erreur inconnue");
      } else {
        // Refresh la page pour afficher l'état signé
        window.location.reload();
      }
    });
  }

  const canSign = acceptCharter;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-900">
          📝 Signature électronique — {fullName}
        </p>
        <p className="mt-1 text-xs text-amber-800">
          En cochant la case ci-dessous, tu signes électroniquement cette convention. Une trace est
          enregistrée (date, heure, version, adresse IP) pour valeur juridique probante.
        </p>
      </div>

      <label className="flex items-start gap-3 rounded-lg border border-brand-ink/10 bg-white p-3 cursor-pointer hover:border-[var(--theme-primary,_#FF5E5B)]/40">
        <input
          type="checkbox"
          checked={acceptCharter}
          onChange={(e) => setAcceptCharter(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[var(--theme-primary,_#FF5E5B)]"
          required
        />
        <span className="text-sm">
          <strong>J'ai lu et j'accepte les 7 articles de la convention</strong> et m'engage à les
          respecter pendant toute la durée de l'événement.
        </span>
      </label>

      <label className="flex items-start gap-3 rounded-lg border border-brand-ink/10 bg-white p-3 cursor-pointer hover:border-[var(--theme-primary,_#FF5E5B)]/40">
        <input
          type="checkbox"
          checked={acceptImage}
          onChange={(e) => setAcceptImage(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[var(--theme-primary,_#FF5E5B)]"
        />
        <span className="text-sm text-brand-ink/80">
          <strong>(Optionnel)</strong> J'autorise l'utilisation de mon image dans le cadre de la
          communication non-commerciale de l'événement (Article 5).
        </span>
      </label>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={!canSign || pending}
        className="w-full rounded-xl bg-[var(--theme-primary,_#FF5E5B)] px-4 py-3 font-display text-base font-semibold text-white shadow-glow transition hover:bg-[var(--theme-primary,_#FF5E5B)] hover:opacity-90 disabled:cursor-not-allowed disabled:bg-brand-ink/20 disabled:text-white/60 disabled:shadow-none"
      >
        {pending ? "Signature en cours…" : "Signer électroniquement la convention"}
      </button>
    </form>
  );
}
