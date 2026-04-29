/**
 * Module Safer Space — alertes graves + workflow modération.
 * Verbatim Pam (entretien 45 min) :
 *   - "Il faut un bouton — un truc signal vraiment un truc grave."
 *   - "Tout le monde doit savoir qu'il y a un truc grave, à tel endroit, telle personne."
 *   - "Pour mettre cette croix rouge [bannissement], qu'il faut qu'il y ait par exemple
 *      trois personnes qui valident."
 */

export const SAFER_ALERT_KINDS = [
  "harassment",       // Harcèlement (sexuel, moral, racisme, LGBTphobie, etc.)
  "physical_danger",  // Danger physique imminent
  "medical",          // Urgence médicale (chute, malaise, blessure)
  "wellbeing_red",    // Auto-déclenchée si self-report niveau "red" persistant
  "other",
] as const;
export type SaferAlertKind = (typeof SAFER_ALERT_KINDS)[number];

export const SAFER_ALERT_LABELS: Record<SaferAlertKind, { label: string; description: string; emoji: string }> = {
  harassment: {
    label: "Harcèlement",
    description: "J'ai été témoin ou victime d'un comportement inadmissible (verbal, physique, discriminant).",
    emoji: "🛑",
  },
  physical_danger: {
    label: "Danger physique",
    description: "Une situation dangereuse vient d'arriver ou risque d'arriver (bagarre, accident).",
    emoji: "⚠️",
  },
  medical: {
    label: "Urgence médicale",
    description: "Quelqu'un est blessé ou malaise — il faut intervenir.",
    emoji: "🩺",
  },
  wellbeing_red: {
    label: "Détresse bénévole",
    description: "Auto-déclenchée si un·e bénévole reste en niveau rouge bien-être >5 min.",
    emoji: "🆘",
  },
  other: {
    label: "Autre",
    description: "Autre situation grave qui nécessite une intervention immédiate.",
    emoji: "❗",
  },
};

/** Numéros d'urgence affichés UNIQUEMENT côté responsables/régie (pas bénévole) — verbatim Pam. */
export const EMERGENCY_NUMBERS = [
  { label: "Police-secours", number: "17", emoji: "🚓" },
  { label: "SAMU", number: "15", emoji: "🚑" },
  { label: "Pompiers", number: "18", emoji: "🚒" },
  { label: "Numéro européen d'urgence", number: "112", emoji: "📞" },
];

/** Workflow ban 3-of-N : par défaut 3 valideurs requis. Paramétrable par organization. */
export const DEFAULT_BAN_REQUIRED_APPROVALS = 3;

export const MODERATION_ACTION_KINDS = ["mute", "ban_proposal", "ban_validate", "unban"] as const;
export type ModerationActionKind = (typeof MODERATION_ACTION_KINDS)[number];
