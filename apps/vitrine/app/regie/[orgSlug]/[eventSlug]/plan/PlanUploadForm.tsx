"use client";

import { useState, useTransition } from "react";

import { uploadFestivalPlan } from "@/app/actions/festival-plan";

interface Props {
  eventId: string;
  currentPlanUrl: string | null;
  currentDarkUrl: string | null;
  currentCaption: string | null;
}

export function PlanUploadForm({ eventId, currentPlanUrl, currentDarkUrl, currentCaption }: Props) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    formData.append("eventId", eventId);
    setFeedback(null);
    startTransition(async () => {
      const res = await uploadFestivalPlan(formData);
      setFeedback(res.ok ? "✓ Plan uploadé et visible côté bénévoles" : `❌ ${res.error}`);
      if (res.ok) setTimeout(() => window.location.reload(), 1500);
    });
  }

  return (
    <form action={handleSubmit} className="space-y-3 rounded-2xl border border-brand-ink/10 bg-white p-4">
      <div>
        <label className="block text-sm font-semibold text-brand-ink/80">
          Plan jour (image principale)
        </label>
        <input
          type="file"
          name="planFile"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="mt-2 block w-full rounded-lg border border-brand-ink/15 bg-white px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-[var(--theme-primary,_#FF5E5B)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
        />
        <p className="mt-1 text-xs text-brand-ink/50">
          Format recommandé : PNG ou WebP, max 10 Mo, ratio 16:9 ou 4:3.
          {currentPlanUrl && " (laisse vide pour conserver le plan actuel)"}
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-brand-ink/80">
          Plan nuit (optionnel — mode dark)
        </label>
        <input
          type="file"
          name="planDarkFile"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="mt-2 block w-full rounded-lg border border-brand-ink/15 bg-white px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-[var(--theme-primary,_#FF5E5B)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-brand-ink/80">
          Légende (optionnel)
        </label>
        <input
          type="text"
          name="caption"
          defaultValue={currentCaption ?? ""}
          placeholder="ex: Plan officiel Roots du Lac 2026 — version validée mairie"
          enterKeyHint="done"
          className="mt-2 block h-11 w-full rounded-lg border border-brand-ink/15 bg-white px-3 py-2 text-base focus:border-[var(--theme-primary,_#FF5E5B)] focus:outline-none"
        />
      </div>

      {feedback && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            feedback.startsWith("❌") ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {feedback}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[var(--theme-primary,_#FF5E5B)] py-3 font-display text-base font-semibold text-white shadow-glow disabled:opacity-50"
      >
        {pending ? "Upload en cours…" : "Sauvegarder"}
      </button>
    </form>
  );
}
