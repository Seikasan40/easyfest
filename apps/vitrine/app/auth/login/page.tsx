"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";

import { createBrowserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const sp = useSearchParams();
  const redirect = sp.get("redirect") ?? "/";
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const supabase = createBrowserClient();
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
        },
      });
      if (err) setError(err.message);
      else setSent(true);
    });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6">
      <div className="w-full space-y-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-brand-coral">
            Connexion sans mot de passe
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold">Salut 👋</h1>
          <p className="mt-2 text-brand-ink/70">
            Entre l'email avec lequel tu t'es inscrit·e — on t'envoie un lien magique pour
            te connecter sans mot de passe.
          </p>
        </div>

        {sent ? (
          <div className="rounded-2xl bg-wellbeing-green/10 p-6">
            <p className="text-2xl">📬</p>
            <p className="mt-2 font-display text-lg font-semibold">Vérifie ta boîte mail</p>
            <p className="mt-1 text-sm text-brand-ink/70">
              On t'a envoyé un lien à <strong>{email}</strong>. Le lien est valable 24h.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Email</span>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-brand-ink/15 bg-white px-3 py-2.5 focus:border-brand-coral focus:outline-none focus:ring-2 focus:ring-brand-coral/20"
                placeholder="ton@email.fr"
              />
            </label>

            {error && (
              <div className="rounded-xl bg-wellbeing-red/10 px-4 py-3 text-sm text-wellbeing-red">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl bg-brand-coral py-3 font-medium text-white shadow-soft transition hover:opacity-90 disabled:opacity-50"
            >
              {pending ? "Envoi…" : "M'envoyer le lien magique"}
            </button>

            <p className="text-center text-xs text-brand-ink/50">
              Si tu n'as pas reçu d'email après 2 min, vérifie tes spams ou réessaye.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
