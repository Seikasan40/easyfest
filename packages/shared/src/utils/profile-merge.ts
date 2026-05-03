/**
 * Helpers utilisés pour résoudre les bugs PostgREST embed cassés (audit-extreme 3 mai 2026).
 *
 * Les FK `*_user_id` du schéma `public` pointent vers `auth.users` (non exposé via PostgREST),
 * donc les embeds type `sender:sender_user_id (raw_user_meta_data)` ou
 * `profile:volunteer_profiles!memberships_user_id_fkey (...)` retournent toujours PGRST200.
 *
 * Solution : 2 queries séparées (parent + profiles via .in("user_id", [...])) puis merge JS-side.
 * Ces helpers fournissent la primitive de merge + le fallback de nom.
 */

export interface VolunteerProfileLite {
  user_id: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  [key: string]: unknown;
}

/**
 * Construit une Map `user_id → profile` à partir d'un array de profiles fetché
 * en bulk via `volunteer_profiles.in("user_id", [...])`.
 */
export function buildProfilesById<P extends { user_id: string }>(
  profiles: P[] | null | undefined,
): Map<string, P> {
  return new Map((profiles ?? []).map((p) => [p.user_id, p]));
}

/**
 * Renvoie un nom affichable en cascade : full_name → first+last → email → "—".
 * Utilisé partout où on affiche un bénévole/sender/reporter.
 */
export function fallbackName(profile: VolunteerProfileLite | null | undefined): string {
  if (!profile) return "—";
  if (profile.full_name && profile.full_name.trim().length > 0) return profile.full_name;
  const composed = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();
  if (composed) return composed;
  if (profile.email && profile.email.trim().length > 0) return profile.email;
  return "—";
}

/**
 * Enrichit chaque ligne avec son profile résolu via la Map.
 * Le profile cible est posé sous la clé `as` (ex: "sender", "reporter", "volunteer").
 */
export function attachProfile<R extends Record<string, unknown>>(
  rows: R[] | null | undefined,
  profilesById: Map<string, VolunteerProfileLite>,
  options: { fk: keyof R; as: string },
): Array<R & Record<string, VolunteerProfileLite | null>> {
  return (rows ?? []).map((r) => {
    const userId = r[options.fk] as unknown as string | null | undefined;
    const profile = userId ? profilesById.get(userId) ?? null : null;
    return { ...r, [options.as]: profile } as R & Record<string, VolunteerProfileLite | null>;
  });
}

/**
 * Extrait des user_ids uniques (non-null) d'une liste de lignes, à partir d'une ou plusieurs FK.
 * Permet par exemple de fusionner sender_user_id + reporter_user_id avant un seul fetch profiles.
 */
export function collectUserIds<R extends Record<string, unknown>>(
  rows: R[] | null | undefined,
  fkColumns: Array<keyof R>,
): string[] {
  const set = new Set<string>();
  (rows ?? []).forEach((r) => {
    fkColumns.forEach((fk) => {
      const v = r[fk];
      if (typeof v === "string" && v.length > 0) set.add(v);
    });
  });
  return Array.from(set);
}
