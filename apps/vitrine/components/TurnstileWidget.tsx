"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact" | "invisible";
          appearance?: "always" | "execute" | "interaction-only";
          language?: string;
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

interface Props {
  /** Site key publique (NEXT_PUBLIC_TURNSTILE_SITE_KEY) */
  siteKey: string;
  /** Callback appelé avec le token de validation (à transmettre au server action) */
  onVerify: (token: string) => void;
  /** Callback appelé si l'utilisateur ferme/expire la validation */
  onExpire?: () => void;
  /** Theme : light/dark/auto (par défaut auto = adapte au browser) */
  theme?: "light" | "dark" | "auto";
  /** Language code (par défaut "fr") */
  language?: string;
}

/**
 * Composant Cloudflare Turnstile — widget anti-bot privacy-friendly (alternative RGPD-clean à reCAPTCHA).
 *
 * Charge le script Cloudflare async, render le widget dans un div, et appelle onVerify(token)
 * une fois la validation utilisateur réussie (souvent invisible — Cloudflare décide selon le risque).
 *
 * Exemple :
 * <TurnstileWidget
 *   siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
 *   onVerify={(token) => setTurnstileToken(token)}
 * />
 */
export function TurnstileWidget({
  siteKey,
  onVerify,
  onExpire,
  theme = "auto",
  language = "fr",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !siteKey) return;
    let cancelled = false;

    const tryRender = () => {
      if (cancelled) return;
      if (!window.turnstile) {
        // Le script n'est pas encore chargé, on retry dans 200ms
        setTimeout(tryRender, 200);
        return;
      }
      if (widgetIdRef.current) {
        // Déjà rendu (StrictMode double-render protect)
        return;
      }
      widgetIdRef.current = window.turnstile.render(containerRef.current!, {
        sitekey: siteKey,
        callback: (token) => onVerify(token),
        "expired-callback": () => onExpire?.(),
        theme,
        language,
      });
    };

    tryRender();

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Ignore
        }
        widgetIdRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        async
        defer
      />
      <div ref={containerRef} aria-label="Vérification anti-bot Cloudflare Turnstile" />
    </>
  );
}
