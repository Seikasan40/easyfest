import Link from "next/link";

import { SiteFooter, SiteHeader } from "@/components/site-header";

const FEATURES = [
  {
    icon: "🎟️",
    title: "Inscription en 5 min",
    description:
      "Formulaire bénévole en 5 étapes claires. Validation par l'équipe, magic-link envoyé. Zéro Excel.",
  },
  {
    icon: "📷",
    title: "QR + scan terrain",
    description:
      "QR code signé HMAC pour chaque bénévole. 3 modes scan : arrivée, repas, prise de poste. Anti-fraude.",
  },
  {
    icon: "🎛️",
    title: "Régie temps réel",
    description:
      "Dashboard live, planning drag&drop, broadcasts ciblés, modération chat. Le bus de pilotage.",
  },
  {
    icon: "💚",
    title: "Safer Space dédié",
    description:
      "Self-report bien-être, bouton alerte grave, médiateur·ices désigné·es. RGPD-clean.",
  },
  {
    icon: "🇪🇺",
    title: "Hébergé en France",
    description:
      "Données stockées en EU (Paris). DPA Supabase signé. RLS Postgres sur toutes les tables.",
  },
  {
    icon: "💰",
    title: "Pricing par édition",
    description:
      "Pas d'abonnement à l'année. Free pour ≤ 50 bénévoles. À partir de 49 €/édition.",
  },
];

const COMPARISON = [
  ["✅ 1 outil unique", "❌ 5+ outils dispersés"],
  ["✅ Bénévoles-first (mobile)", "❌ Conçu pour les gros festivals"],
  ["✅ < 200 € / édition", "❌ % billetterie + per user"],
  ["✅ App PWA + APK Android", "❌ Web only ou app payante"],
  ["✅ Module Safer Space natif", "❌ Pas géré"],
  ["✅ RGPD by design (EU)", "