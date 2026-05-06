"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";

import { loginWithPassword, sendMagicLink } from "@/app/actions/auth";

type Method = "magic" | "password";

const DARK = "#1A3828";
const GOLD = "#C49A2C";
const GOLD_BG = "#F5E9C4";
const MUTED = "#7A7060";
const BORDER = "#E5DDD0";

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
        if (res && !res.ok) setError(res.error ?? "Erreur");
      }
    });
  }

  return (
    <div className="w-full space-y-6">
      {/* Logo + titre */}
      <div>
        <p
          className="text-xs font-bold uppercase tracking-[0.2em]"
          style={{ color: GOLD }}
        >
          Connexion à ton espace
        </p>
        <h1
          className="mt-2 font-display text-3xl font-bold leading-tight"
          style={{ color: DARK }}
        >
          Salut 👋
        </h1>
        <p className="mt-2 text-sm" style={{ color: MUTED }}>
          Choisis ta méthode de connexion préférée.
        </p>
      </div>

      {/* Toggle méthode */}
      <div
        className="flex gap-1 rounded-xl p-1"
        style={{ background: "rgba(26,56,40,0.06)" }}
      >
        <button
          type="button"
          onClick={() => { setMethod("password"); setSent(false); setError(null); }}
          className="flex-1 rounded-lg px-3 py-2 text-sm font-medium transition"
          style={{
            background: method === "password" ? "#FFFFFF" : "transparent",
            color: method === "password" ? DARK : MUTED,
            boxShadow: method === "password" ? "0 1px 4px rgba(26,56,40,0.10)" : "none",
          }}
        >
          🔑 Mot de passe
        </button>
        <button
          type="button"
          onClick={() => { setMethod("magic"); setSent(false); setError(null); }}
          className="flex-1 rounded-lg px-3 py-2 text-sm font-medium transition"
          style={{
            background: method === "magic" ? "#FFFFFF" : "transparent",
            color: method === "magic" ? DARK : MUTED,
            boxShadow: method === "magic" ? "0 1px 4px rgba(26,56,40,0.10)" : "none",
          }}
        >
          ✨ Lien magique
        </button>
      </div>

      {sent ? (
        <div
          className="rounded-2xl p-6"
          style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.20)" }}
        >
          <p className="text-2xl">📬</p>
          <p className="mt-2 font-display text-lg font-semibold" style={{ color: DARK }}>
            Vérifie ta boîte mail
          </p>
          <p className="mt-1 text-sm" style={{ color: MUTED }}>
            On t&apos;a envoyé un lien à <strong>{email}</strong>. Le lien est valable 1h.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {/* Email */}
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold" style={{ color: DARK }}>
              Email
            </span>
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
              className="w-full rounded-xl px-3.5 py-3 text-base transition focus:outline-none"
              style={{
                border: `1.5px solid ${BORDER}`,
                background: "#FFFFFF",
                color: DARK,
              }}
              onFocus={(e) => { e.target.style.borderColor = DARK; e.target.style.boxShadow = `0 0 0 3px rgba(26,56,40,0.10)`; }}
              onBlur={(e) => { e.target.style.borderColor = BORDER; e.target.style.boxShadow = "none"; }}
              placeholder="ton@email.fr"
            />
          </label>

          {/* Mot de passe */}
          {method === "password" && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold" style={{ color: DARK }}>
                Mot de passe
              </span>
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
                  className="w-full rounded-xl px-3.5 py-3 pr-12 text-base transition focus:outline-none"
                  style={{
                    border: `1.5px solid ${BORDER}`,
                    background: "#FFFFFF",
                    color: DARK,
                  }}
                  onFocus={(e) => { e.target.style.borderColor = DARK; e.target.style.boxShadow = `0 0 0 3px rgba(26,56,40,0.10)`; }}
                  onBlur={(e) => { e.target.style.borderColor = BORDER; e.target.style.boxShadow = "none"; }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  aria-pressed={showPassword}
                  className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-lg transition"
                  style={{ color: MUTED }}
                  tabIndex={0}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" y1="2" x2="22" y2="22" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </label>
          )}

          {/* Erreur */}
          {error && (
            <div
              className="rounded-xl px-4 py-3 text-sm"
              style={{ background: "rgba(239,68,68,0.08)", color: "#DC2626" }}
            >
              {error}
            </div>
          )}

          {/* CTA principal */}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl py-3.5 text-base font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            style={{ background: DARK, minHeight: "52px" }}
          >
            {pending
              ? "Connexion…"
              : method === "magic"
              ? "M'envoyer le lien magique"
              : "Se connecter"}
          </button>

          {/* Lien magique hint */}
          {method === "password" && (
            <div
              className="space-y-2 rounded-xl p-4 text-center text-xs"
              style={{ background: GOLD_BG, border: `1px solid rgba(196,154,44,0.25)` }}
            >
              <p className="font-medium" style={{ color: "#7B5C1A" }}>
                Première connexion ou mot de passe oublié ?
              </p>
              <button
                type="button"
                onClick={() => { setMethod("magic"); setSent(false); setError(null); }}
                className="font-semibold underline underline-offset-2"
                style={{ color: GOLD }}
              >
                ✨ Reçois un lien magique par email pour te connecter
              </button>
              <p style={{ color: "#9A7830" }}>
                Une fois connecté·e, tu pourras définir un mot de passe depuis ton compte.
              </p>
            </div>
          )}
          {method === "magic" && (
            <p className="text-center text-xs" style={{ color: MUTED }}>
              Pas de mot de passe à retenir, juste un lien dans ton mail. Valable 1h, à usage unique.
            </p>
          )}
        </form>
      )}
    </div>
  );
}
