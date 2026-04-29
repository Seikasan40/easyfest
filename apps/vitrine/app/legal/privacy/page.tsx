import { formatDateFr } from "@easyfest/shared";

export const metadata = {
  title: "Politique de confidentialité",
};

export default function PrivacyPage() {
  const dpaDate = process.env["DPA_SIGNED_DATE"] ?? "2026-04-29";
  const purgeMonths = process.env["RGPD_PURGE_DELAY_MONTHS"] ?? "12";
  const subProcessorsUrl = process.env["DPA_SUB_PROCESSORS_URL"] ?? "/legal/sub-processors";

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 prose prose-sm">
      <h1 className="font-display text-3xl font-bold">Politique de confidentialité</h1>
      <p className="text-sm text-brand-ink/60">Version 1.0.0 · DPA signé le {formatDateFr(dpaDate)}</p>

      <h2>Responsable de traitement</h2>
      <p>
        Easyfest (entité éditrice) — contact :{" "}
        <a href="mailto:contact@easyfest.app">contact@easyfest.app</a>.
      </p>

      <h2>Données collectées</h2>
      <ul>
        <li>Identité (nom, prénom, date de naissance, sexe optionnel)</li>
        <li>Coordonnées (email, téléphone, adresse)</li>
        <li>Préférences de poste, compétences, taille T-shirt</li>
        <li>Allergies / régimes alimentaires (donnée sensible — accès limité au catering)</li>
        <li>Photos de profil (optionnelles, droit à l'image séparé)</li>
        <li>Logs techniques (IP, user-agent — conservés 12 mois max)</li>
      </ul>

      <h2>Finalités</h2>
      <ul>
        <li>Gestion des candidatures et inscriptions bénévoles</li>
        <li>Planification des postes et créneaux</li>
        <li>Communication festival ↔ bénévoles</li>
        <li>Sécurité (Safer Space, alertes graves)</li>
        <li>Statistiques anonymes post-festival</li>
      </ul>

      <h2>Sous-traitants</h2>
      <p>
        Données hébergées en Union Européenne. DPA signé avec :
      </p>
      <ul>
        <li>Supabase (Postgres + Auth + Storage) — région eu-west-3 (Paris)</li>
        <li>Resend (mail transactionnel)</li>
        <li>Cloudflare (CDN, Turnstile anti-bot)</li>
        <li>Sentry (error tracking, scrubbing PII actif)</li>
        <li>Netlify (hébergement web)</li>
      </ul>
      <p>
        Liste détaillée des sous-traitants : <a href={subProcessorsUrl}>{subProcessorsUrl}</a>
      </p>

      <h2>Durée de conservation</h2>
      <p>
        Les données personnelles sont supprimées automatiquement <strong>{purgeMonths} mois</strong>{" "}
        après la fin du festival auquel tu t'es inscrit·e. Les statistiques
        anonymisées (heures bénévoles, taux d'occupation par poste) peuvent être conservées sans
        limite de temps.
      </p>

      <h2>Tes droits</h2>
      <p>
        Tu peux exercer à tout moment : droit d'accès, rectification, effacement, portabilité,
        opposition. Envoie un mail à{" "}
        <a href="mailto:dpo@easyfest.app">dpo@easyfest.app</a> avec une pièce d'identité.
      </p>

      <h2>Mineurs</h2>
      <p>
        Les bénévoles mineur·es doivent fournir une autorisation parentale signée à
        l'inscription. Les données des mineur·es ne sont jamais utilisées à des fins commerciales.
      </p>

      <h2>Sécurité</h2>
      <p>
        Stockage chiffré au repos, transit HTTPS obligatoire, RLS Postgres activée sur toutes
        les tables, MFA TOTP pour les comptes responsables/régie, audit log immuable.
      </p>

      <h2>Réclamation</h2>
      <p>
        Tu peux contacter la <a href="https://www.cnil.fr">CNIL</a> en cas de désaccord.
      </p>
    </main>
  );
}
