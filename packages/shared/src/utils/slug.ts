/**
 * Slugify — version simple sans dépendance.
 * Convertit "Roots du Lac 2026" → "roots-du-lac-2026".
 * Gère accents, espaces, caractères spéciaux.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/gu, "") // suppr accents
    .replace(/[^a-z0-9\s-]/gu, "") // suppr non-alphanumériques
    .trim()
    .replace(/\s+/gu, "-") // espaces → tirets
    .replace(/-+/gu, "-") // multiples tirets → 1
    .replace(/^-|-$/gu, ""); // trim tirets en bord
}

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/u;

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}
