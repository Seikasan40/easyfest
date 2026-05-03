"use client";

import { useState, useTransition } from "react";

import { setupPassword } from "@/app/actions/auth";

export default function SetupPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await setupPassword(formData);
      if (!res.ok) setError(res.error ?? "Erreur inconnue");
    });
  }

  return (
    <form action={onSubmit} className="mt-8 space-y-4" data-testid="setup-password-form">
      <label className="block text-sm">
        <span className="text-brand-ink/70">Nouveau mot de passe (12 caractères min.)</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="new-password"
          enterKeyHint="next"
          spellCheck={false}
          autoCapitalize="none"
          minLength={12}
          data-testid="password-input"
          className="mt-1 h-11 w-full rounded-lg border border-brand-ink/15 px-3 py-2 text-base focus:border-brand-coral focus:outline-none"
        />
      </label>

      <label className="block text-sm">
        <span className="text-brand-ink/70">Confirmation</span>
        <input
          type="password"
          name="confirm"
          required
          autoComplete="new-password"
          enterKeyHint="send"
          spellCheck={false}
          autoCapitalize="none"
          minLength={12}
          data-testid="confirm-input"
          className="mt-1 h-11 w-full rounded-lg border border-brand-ink/15 px-3 py-2 text-base focus:border-brand-coral focus:outline-none"
        />
      </label>

      {error && (
        <p role="alert" className="text-sm text-red-600" data-testid="setup-password-error">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        data-testid="submit-btn"
        className="min-h-[48px] w-full rounded-xl bg-brand-coral px-5 py-3 text-base font-semibold text-white shadow-soft transition hover:bg-brand-coral/90 disabled:opacity-50"
      >
        {pending ? "Enregistrement…" : "Enregistrer mon mot de passe"}
      </button>
    </form>
  );
}
