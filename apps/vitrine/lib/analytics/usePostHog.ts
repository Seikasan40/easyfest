"use client";

/**
 * Hook léger pour capturer des events PostHog côté client component.
 * No-op si pas de consent (vérifié via `easyfest_cookies_consent_v1` localStorage)
 * ou si le SDK n'est pas chargé. Ne lève jamais d'erreur.
 */
import { useCallback } from "react";

import type { PostHogEvent } from "./posthog-events";

const CONSENT_STORAGE_KEY = "easyfest_cookies_consent_v1";

function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { analytics?: boolean };
    return Boolean(parsed.analytics);
  } catch {
    return false;
  }
}

export function usePostHog() {
  const capture = useCallback(
    (event: PostHogEvent | string, properties?: Record<string, unknown>) => {
      if (!hasAnalyticsConsent()) return;
      if (typeof window === "undefined") return;
      // posthog-js est lazy-loadé par le cookie banner après consent.
      // On accède au global s'il existe — sinon on ignore silencieusement.
      const ph = (window as unknown as { posthog?: { capture: (e: string, p?: object) => void } })
        .posthog;
      if (!ph) return;
      try {
        ph.capture(event, properties ?? {});
      } catch {
        /* swallow */
      }
    },
    [],
  );

  const identify = useCallback(
    (userId: string, traits?: Record<string, unknown>) => {
      if (!hasAnalyticsConsent()) return;
      if (typeof window === "undefined") return;
      const ph = (window as unknown as { posthog?: { identify: (u: string, t?: object) => void } })
        .posthog;
      if (!ph) return;
      try {
        ph.identify(userId, traits ?? {});
      } catch {
        /* swallow */
      }
    },
    [],
  );

  return { capture, identify };
}
