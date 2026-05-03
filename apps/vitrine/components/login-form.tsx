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
  const [showPassword, setShowPassword] = useState(false);
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
            <input
              type="email"
              required
              autoFocus
              autoComplete="email"
              inputMode="email"
              enterKeyHint={method === "password" ? "next" : "send"}
              spellCheck={false}
              autoCapitalize="none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-brand-ink/15 bg-white px-3.5 py-2.5 focus:border-brand-coral focus:outline-none focus:ring-2 focus:ring-brand-coral/20"
              placeholder="ton@email.fr"
            />
          </label>

          {method === "password" && (
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Mot de passe</span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  enterKeyHint="send"
                  spellCheck={false}
                  autoCapitalize="none"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-brand-ink/15 bg-white px-3.5 py-2.5 pr-12 text-base focus:border-brand-coral focus:outline-none focus:ring-2 focus:ring-brand-coral/20"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  aria-pressed={showPassword}
                  className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-lg text-brand-ink/55 transition hover:bg-brand-ink/5 hover:text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-coral/40"
                  tabIndex={0}
                >
                  {showPassword ? (
                    // Eye-off
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" y1="2" x2="22" y2="22" />
                    </svg>
                  ) : (
                    // Eye
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </label>
          )}

          {error && (
            <div className="rounded-xl bg-wellbeing-red/10 px-4 py-3 text-sm text-wellbeing-red">{error}</div>
          )}

          <button type="submit" disabled={pending}
            className="w-full rounded-xl bg-brand-coral py-3 font-medium text-white shadow-soft transition hover:opacity-90 disabled:opacity-50">
            {pending ? "Connexion…" : method === "magic" ? "M'envoyer le lien magique" : "Se connecter"}
          </button>

          {method === "password" && (
            <div className="space-y-2 rounded-xl border border-brand-coral/20 bg-brand-coral/5 p-3 text-center text-xs">
              <p className="font-medium text-brand-ink/80">Première connexion ou mot de passe oublié ?</p>
              <button
                type="button"
                onClick={() => { setMethod("magic"); setSent(false); setError(null); }}
                className="text-brand-coral underline-offset-2 hover:underline"
              >
                ✨ Reçois un lien magique par email pour te connecter
              </button>
              <p className="text-[11px] text-brand-ink/55">
                Une fois connecté·e, tu pourras définir un mot de passe depuis ton compte.
              </p>
            </div>
          )}
          {method === "magic" && (
            <p className="text-center text-xs text-brand-ink/55">
              Pas de mot de passe à retenir, juste un lien dans ton mail. Valable 1h, à usage unique.
            </p>
          )}
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
