/**
 * 18 postes types extraits du formulaire RDL 2026 (107 p.) et des 17 PDF planning.
 * Utilisés en seed data + UI form choix de poste (max 3 préférences).
 */

export interface PositionSeed {
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  display_order: number;
  /** Ordre indicatif. Tous éditables côté admin. */
  default_responsible_first_name?: string;
}

export const RDL_2026_POSITIONS: PositionSeed[] = [
  {
    slug: "bar",
    name: "Bar",
    description: "Service boissons (jetons papier). Gestion file d'attente, encaissement jetons.",
    icon: "🍺",
    color: "#F59E0B",
    display_order: 1,
    default_responsible_first_name: "Mahaut",
  },
  {
    slug: "catering",
    name: "Catering",
    description: "Préparation et service repas bénévoles, artistes et staff. Vigilance allergies.",
    icon: "🍽️",
    color: "#10B981",
    display_order: 2,
    default_responsible_first_name: "Stéphane",
  },
  {
    slug: "brigade-verte",
    name: "Brigade Verte",
    description: "Propreté du site, ramassage déchets, tri sélectif tout au long du festival.",
    icon: "♻️",
    color: "#22C55E",
    display_order: 3,
    default_responsible_first_name: "Antoine",
  },
  {
    slug: "camping",
    name: "Camping",
    description: "Accueil campeurs, gestion zones de camping, contrôle bracelets.",
    icon: "⛺",
    color: "#84CC16",
    display_order: 4,
  },
  {
    slug: "loges",
    name: "Loges",
    description: "Accueil artistes, hospitality, runners loges.",
    icon: "🎤",
    color: "#A855F7",
    display_order: 5,
  },
  {
    slug: "scan-bracelet",
    name: "Scan / Bracelet",
    description: "Première guérite : check-in bénévoles, distribution bracelets identifiés.",
    icon: "🎟️",
    color: "#EF4444",
    display_order: 6,
  },
  {
    slug: "caisse-billetterie",
    name: "Caisse Billetterie",
    description: "Vente sur place, retrait billets, gestion espèces et CB.",
    icon: "💳",
    color: "#3B82F6",
    display_order: 7,
  },
  {
    slug: "caisse-jetons",
    name: "Caisse Jetons",
    description: "Vente de jetons boisson en papier, encaissement CB/espèces.",
    icon: "🪙",
    color: "#FACC15",
    display_order: 8,
  },
  {
    slug: "backline",
    name: "Backline",
    description: "Logistique technique scène : matériel, transitions, soutien régie son/lumière.",
    icon: "🎛️",
    color: "#1E293B",
    display_order: 9,
  },
  {
    slug: "parking",
    name: "Parking",
    description: "Gestion parkings publics et bénévoles, fluidité circulation, sécurité.",
    icon: "🚗",
    color: "#64748B",
    display_order: 10,
    default_responsible_first_name: "Willy",
  },
  {
    slug: "run",
    name: "Run / Runners",
    description: "Petites courses logistiques, transferts entre zones (permis B requis souvent).",
    icon: "🚐",
    color: "#06B6D4",
    display_order: 11,
  },
  {
    slug: "signaletique",
    name: "Signalétique",
    description: "Pose et dépose des panneaux, banderoles, marquage au sol.",
    icon: "🪧",
    color: "#0EA5E9",
    display_order: 12,
  },
  {
    slug: "ateliers-animations",
    name: "Ateliers / Animations",
    description: "Animation famille, kids corner, ateliers participatifs.",
    icon: "🎨",
    color: "#EC4899",
    display_order: 13,
    default_responsible_first_name: "Sandy",
  },
  {
    slug: "merch",
    name: "Merch",
    description: "Vente merchandising festival (T-shirts, casquettes, posters).",
    icon: "👕",
    color: "#F97316",
    display_order: 14,
  },
  {
    slug: "jeudi-montage",
    name: "Jeudi Montage",
    description: "Équipe montage J-1 : structures, scènes, stands, signalétique. ~19 bénévoles.",
    icon: "🔧",
    color: "#78716C",
    display_order: 15,
    default_responsible_first_name: "Fred",
  },
  {
    slug: "vendredi-montage-demontage",
    name: "Vendredi Montage / Démontage",
    description: "Renforts montage matin + démontage post-festival dimanche/lundi.",
    icon: "🛠️",
    color: "#92400E",
    display_order: 16,
  },
  {
    slug: "point-info",
    name: "Point Info",
    description: "Accueil public, infos pratiques, gestion objets trouvés.",
    icon: "ℹ️",
    color: "#6366F1",
    display_order: 17,
    default_responsible_first_name: "Gael",
  },
  {
    slug: "jeremy-besset-equipe",
    name: "Équipe Jérémy Besset",
    description: "Équipe artiste dédiée — accompagnement scénique et logistique.",
    icon: "🎼",
    color: "#7C3AED",
    display_order: 18,
  },
];

export const POSITION_SLUGS = RDL_2026_POSITIONS.map((p) => p.slug);
export type PositionSlug = (typeof POSITION_SLUGS)[number];

/** Limite max de choix de poste pour le formulaire bénévole (paramétrable par event). */
export const DEFAULT_MAX_PREFERRED_POSITIONS = 3;
