"use client";

import { useEffect, useState } from "react";

/**
 * Bandeau cookies RGPD-compliant.
 * Strictement nécessaires (Supabase auth, Cloudflare Turnstile) = pas de consentement requis.
 * Analytics (PostHog) = opt-in explicite.
 */
const STORAGE_KEY = "easyfest_cookies_consent_v1";

interface ConsentState {
  analytics: boolean;
  acceptedAt: string;
}

export function CookieBanner() {
  const [state, setState] = useState<ConsentState | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState(JSON.parse(raw));
      else setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  function persist(consent: Partial<ConsentState>) {
    const newState: ConsentState = {
      analytics: consent.analytics ?? false,
      acceptedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    } catch {
      /* private mode */
    }
    setState(newState);
    setOpen(false);

    // Initialiser PostHog uniquement si analytics: true
    if (newState.analytics && typeof window !== "undefined") {
      const key = process.env["NEXT_PUBLIC_POSTHOG_KEY"];
      const host = process.env["NEXT_PUBLIC_POSTHOG_HOST"] ?? "https://eu.i.posthog.com";
      if (key) {
        import("posthog-js").then(({ default: posthog }) => {
          posthog.init(key, {
            api_host: host,
            person_profiles: "always",
            capture_pageview: true,
            disable_session_recording: true,
          });
        });
      }
    }
  }

  if (!open || state) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-banner-title"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-brand-ink/10 bg-white/95 px-4 py-4 shadow-soft backdrop-blur md:inset-x-auto md:bottom-4 md:right-4 md:max-w-md md:rounded-2xl md:border"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <h2 id="cookie-banner-title" className="font-display text-lg font-semibold">
        🍪 Cookies
      </h2>
      <p className="mt-1 text-sm text-brand-ink/70">
        Easyfest utilise des cookies <strong>strictement nécessaires</strong> (auth, anti-bot)
        et des cookies <strong>d&apos;analyse</strong> (mesure anonyme du parcours, PostHog EU).
        Tu peux refuser l&apos;analyse.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => persist({ analytics: true })}
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-brand-coral px-4 py-3 text-base font-medium text-white shadow-soft hover:opacity-90"
        >
          Tout accepter
        </button>
        <button
          type="button"
          onClick={() => persist({ analytics: false })}
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-brand-ink/15 bg-white px-4 py-3 text-base font-medium hover:bg-brand-ink/5"
        >
          Refuser l&apos;analyse
        </button>
      </div>
      <p className="mt-2 text-xs text-brand-ink/50">
        <a href="/legal/privacy" className="underline">
          En savoir plus dans la politique de confidentialité
        </a>
      </p>
    </div>
  );
}
