/**
 * Self-report bien-être bénévole — 3 niveaux (verbatim Pam : "vert / orange / rouge").
 * Stocké dans `wellbeing_reports.level`.
 */
export const WELLBEING_LEVELS = ["green", "yellow", "red"] as const;
export type WellbeingLevel = (typeof WELLBEING_LEVELS)[number];

export const WELLBEING_LABELS: Record<WellbeingLevel, { label: string; emoji: string; color: string; subtitle: string }> = {
  green: {
    label: "Ça va",
    emoji: "🙂",
    color: "#10B981",
    subtitle: "Tout roule, je suis dans le rythme.",
  },
  yellow: {
    label: "Ça commence à être chaud",
    emoji: "😐",
    color: "#F59E0B",
    subtitle: "Fatigue, stress, ou besoin de souffler bientôt.",
  },
  red: {
    label: "J'ai besoin d'aide",
    emoji: "🆘",
    color: "#EF4444",
    subtitle: "Je ne suis pas bien, je veux qu'un·e responsable me contacte.",
  },
};

/** Cooldown anti-spam : un bénévole ne peut envoyer qu'1 self-report par 5 minutes. */
export const WELLBEING_COOLDOWN_SECONDS = 300;
