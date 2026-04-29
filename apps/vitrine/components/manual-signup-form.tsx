"use client";

import { useState, useTransition } from "react";

import { manualVolunteerSignup } from "@/app/actions/planning";

interface PositionLite {
  slug: string;
  name: string;
  icon: string | null;
}

export function ManualSignupForm({
  eventId,
  positions,
}: {
  eventId: string;
  positions: PositionLite[];
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  function submit(formData: FormData) {
    setFeedback(null);
    startTransition(async () => {
      const res = await manualVolunteerSignup({
        eventId,
        email: formData.get("email") as string,
        fullName: formData.get("fullName") as string,
        phone: formData.get("phone") as string | undefined,
        positionSlug: formData.get("positionSlug") as string | undefined,
      });
      setFeedback(res.ok ? "✅ Bénévole inscrit·e + mail envoyé" : `❌ ${res.error}`);
    });
  }

  return (
    <form action={submit} className="space-y-3 rounded-2xl border border-brand-ink/10 bg-white p-5">
      <label className="block">
        <span className="mb-1 block text-sm font-medium">
          Nom complet <span className="text-brand-coral">*</span>
        </span>
        <input
          type="text"
          name="fullName"
          required
          minLength={2}
          className="w-full rounded-xl border border-brand-ink/15 bg-white px-3 py-2 focus:border-brand-coral focus:outline-none focus:ring-2 focus:ring-brand-coral/20"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">
          Email <span className="text-brand-coral">*</span>
        </span>
        <input
          type="email"
          name="email"
          required
          className="w-full rounded-xl border border-brand-ink/15 bg-white px-3 py-2 focus:border-brand-coral focus:outline-none focus:ring-2 focus:ring-brand-coral/20"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Téléphone</span>
        <input
          type="tel"
          name="phone"
          className="w-full rounded-xl border border-brand-ink/15 bg-white px-3 py-2 focus:border-brand-coral focus:outline-none focus:ring-2 focus:ring-brand-coral/20"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Poste préféré</span>
        <select
          name="positionSlug"
          className="w-full rounded-xl border border-brand-ink/15 bg-white px-3 py-2 focus:border-brand-coral focus:outline-none focus:ring-2 focus:ring-brand-coral/20"
        >
          <option value="">— à déterminer plus tard</option>
          {positions.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.icon} {p.name}
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-brand-coral px-5 py-3 font-medium text-white shadow-soft transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Envoi…" : "Inscrire + envoyer le lien magique"}
      </button>

      {feedback && (
        <p className="rounded-xl bg-brand-sand/40 px-4 py-2 text-sm">{feedback}</p>
      )}
    </form>
  );
}
