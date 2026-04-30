"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";

import { loginWithPassword, sendMagicLink } from "@/app/actions/auth";

type Method = "magic" | "password";

export function LoginForm() {
  const sp = useSearchParams();
  const redirect = sp.get("redirect") ?? "/hub";
  const errorParam = sp.get("error_description");

  const [method, setMethod] = useState<Method>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(errorParam ? errorParam.replace(/\+/g, " ") : null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.append("email", email);
    fd.append("password", password);
    fd.append("redirect", redirect);

    startTransition(async () => {
      if (method === "magic") {
        const res = await sendMagicLink(fd);
        if (!res.ok) setError(res.error ?? "Erreur");
        else setSent(true);
      } else {
        const res = await loginWithPassword(fd);
        // loginWithPassword fait un redirect() côté serveur en cas de succès
        // donc on n'arrive ici qu'en cas d'erreur
        if (res && !res.ok) setError(res.error ?? "Erreur");
      }
    });
  }

  return (
    <div className="w-full space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-brand-coral">
          Connexion à ton espace
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold">Salut 👋</h1>
        <p className="mt-2 text-brand-ink/70">Choisis ta méthode de connexion préférée.</p>
      </div>

      <div className="flex gap-1 rounded-xl bg-brand-ink/5 p-1">
        <button type="button" onClick={() => { setMethod("password"); setSent(false); setError(null); }}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${method === "password" ? "bg-white shadow-soft" : "text-brand-ink/60"}`}>
          🔑 Mot de passe
        </button>
        <button type="button" onClick={() => { setMethod("magic"); setSent(false); setError(null); }}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${method === "magic" ? "bg-white shadow-soft" : "text-brand-ink/60"}`}>
          ✨ Lien magique
        </button>
      </div>

      {sent ? (
        <div className="rounded-2xl bg-wellbeing-green/10 p-6">
          <p className="text-2xl">📬</p>
          <p className="mt-2 font-display text-lg font-semibold">Vérifie ta boîte mail</p>
          <p className="mt-1 text-sm text-brand-ink/70">
            On t'a envoyé un lien à <strong>{email}</strong>. Le lien est valable 1h.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Email</span>
            <input type="email" required autoFocus autoComplete="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-brand-ink/15 bg-white px-3.5 py-2.5 focus:border-brand-coral focus:outline-none focus:ring-2 focus:ring-brand-coral/20"
              placeholder="ton@email.fr" />
          </label>

          {method === "password" && (
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Mot de passe</span>
              <input type="password" required autoComplete="current-password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-brand-ink/15 bg-white px-3.5 py-2.5 focus:border-brand-coral focus:outline-none focus:ring-2 focus:ring-brand-coral/20"
                placeholder="••••••••" />
            </label>
          )}

          {error && (
            <div className="rounded-xl bg-wellbeing-red/10 px-4 py-3 text-sm text-wellbeing-red">{error}</div>
          )}

          <button type="submit" disabled={pending}
            className="w-full rounded-xl bg-brand-coral py-3 font-medium text-white shadow-soft transition hover:opacity-90 disabled:opacity-50">
            {pending ? "Connexion…" : method === "magic" ? "M'envoyer le lien magique" : "Se connecter"}
          </button>

          <p className="text-center text-xs text-brand-ink/50">
            {method === "magic"
              ? "Pas de mot de passe à retenir, juste un lien dans ton mail."
              : "Tu as oublié ton mot de passe ? Bascule sur 'Lien magique' au-dessus."}
          </p>
        </form>
      )}

      <details className="rounded-xl border border-brand-ink/10 bg-white/50 p-4 text-xs text-brand-ink/60">
        <summary className="cursor-pointer font-medium">🔍 Comptes de démo (test dimanche)</summary>
        <ul className="mt-3 space-y-1.5 font-mono">
          <li><strong>gaetancarlo1@gmail.com</strong> / easyfest-admin-2026 → Régie</li>
          <li><strong>pam@easyfest.test</strong> / easyfest-demo-2026 → Régie</li>
          <li><strong>dorothee@easyfest.test</strong> / easyfest-demo-2026 → Resp. bénévoles</li>
          <li><strong>mahaut@easyfest.test</strong> / easyfest-demo-2026 → Resp. Bar</li>
          <li><strong>antoine@easyfest.test</strong> / easyfest-demo-2026 → Staff terrain</li>
          <li><strong>lucas@easyfest.test</strong> / easyfest-demo-2026 → Bénévole</li>
          <li><strong>sandy@easyfest.test</strong> / easyfest-demo-2026 → Resp. bénévoles</li>
        </ul>
      </details>
    </div>
  );
}
