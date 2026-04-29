/**
 * Helpers datetime sans dépendance.
 * Locale par défaut FR, timezone Europe/Paris.
 */
const DEFAULT_LOCALE = "fr-FR";
const DEFAULT_TZ = "Europe/Paris";

export function formatDateFr(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString(DEFAULT_LOCALE, {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: DEFAULT_TZ,
  });
}

export function formatTimeFr(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleTimeString(DEFAULT_LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: DEFAULT_TZ,
  });
}

export function formatDateTimeFr(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString(DEFAULT_LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: DEFAULT_TZ,
  });
}

/** Returns "il y a 5 min", "dans 2h", etc. */
export function timeFromNow(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const now = Date.now();
  const diffMs = d.getTime() - now;
  const diffMin = Math.round(diffMs / 60_000);
  if (Math.abs(diffMin) < 1) return "à l'instant";
  if (diffMin < 0) {
    const abs = -diffMin;
    if (abs < 60) return `il y a ${abs} min`;
    if (abs < 1440) return `il y a ${Math.round(abs / 60)} h`;
    return `il y a ${Math.round(abs / 1440)} j`;
  }
  if (diffMin < 60) return `dans ${diffMin} min`;
  if (diffMin < 1440) return `dans ${Math.round(diffMin / 60)} h`;
  return `dans ${Math.round(diffMin / 1440)} j`;
}

export function isMinor(birthDateIso: string): boolean {
  const birth = new Date(birthDateIso);
  const eighteenYearsAgo = new Date();
  eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
  return birth > eighteenYearsAgo;
}
