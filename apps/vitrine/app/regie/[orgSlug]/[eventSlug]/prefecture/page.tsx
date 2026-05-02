/**
 * /regie/[orgSlug]/[eventSlug]/prefecture
 * Page UI Pack préfecture (audit Pam : remplacer le retour JSON brut de l'API).
 * Affiche récap KPI + checklist Cerfa + bouton téléchargement ZIP côté client.
 */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createServerClient } from "@/lib/supabase/server";

import { DownloadPrefectureButton } from "./DownloadPrefectureButton";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { eventSlug } = await params;
  return { title: `Pack préfecture · ${eventSlug} — Easyfest` };
}

export default async function PrefecturePage({ params }: PageProps) {
  const { orgSlug, eventSlug } = await params;
  const supabase = createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/auth/login?redirect=/regie/${orgSlug}/${eventSlug}/prefecture`);
  }

  const { data: ev } = await supabase
    .from("events")
    .select("id, name, slug, starts_at, ends_at, location_name, location, organization:organization_id (name, slug, legal_siret, contact_email)")
    .eq("slug", eventSlug)
    .maybeSingle();

  if (!ev) notFound();
  const eventRow: any = ev;
  const organization: any = eventRow.organization ?? {};

  const { data: memberships } = await (supabase as any)
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("event_id", eventRow.id)
    .eq("is_active", true);

  const isDirection = (memberships ?? []).some((m: any) => m.role === "direction");
  if (!isDirection) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-display text-2xl font-bold">Accès réservé</h1>
        <p className="mt-2 text-sm text-brand-ink/70">Le pack préfecture est réservé à la direction.</p>
        <Link href={`/regie/${orgSlug}/${eventSlug}`} className="mt-4 inline-block rounded-xl border border-brand-ink/15 px-4 py-2 text-sm hover:bg-brand-ink/5">
          ← Retour régie
        </Link>
      </main>
    );
  }

  const [appsRes, sponsorsRes, signedRes] = await Promise.all([
    (supabase as any).from("volunteer_applications").select("status, is_minor").eq("event_id", eventRow.id),
    (supabase as any).from("sponsors").select("amount_eur, status").eq("event_id", eventRow.id),
    (supabase as any).from("signed_engagements").select("engagement_kind").eq("event_id", eventRow.id),
  ]);

  const apps: any[] = appsRes.data ?? [];
  const sponsors: any[] = sponsorsRes.data ?? [];
  const signed: any[] = signedRes.data ?? [];

  const validatedCount = apps.filter((a) => a.status === "validated").length;
  const minorCount = apps.filter((a) => a.is_minor).length;
  const signedConventions = signed.filter((s) => s.engagement_kind === "convention_benevolat").length;
  const totalSponsorAmount = sponsors.reduce((sum, s) => sum + Number(s.amount_eur ?? 0), 0);
  const conventionsRate = validatedCount > 0 ? Math.round((signedConventions / validatedCount) * 100) : 0;

  const dateFmt = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : "—";

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <nav className="mb-4 text-xs text-brand-ink/50">
        <Link href={`/regie/${orgSlug}/${eventSlug}`} className="hover:text-[var(--theme-primary,_#FF5E5B)]">← Retour régie</Link>
      </nav>

      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--theme-primary,_#FF5E5B)]">📦 Pack préfecture</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">{eventRow.name}</h1>
        <p className="mt-1 text-sm text-brand-ink/70">
          Du {dateFmt(eventRow.starts_at)} au {dateFmt(eventRow.ends_at)} · {eventRow.location_name ?? eventRow.location ?? "—"}
        </p>
      </header>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Bénévoles validés" value={String(validatedCount)} accent="green" />
        <KpiCard label="Conventions signées" value={`${signedConventions} / ${validatedCount}`} sub={`${conventionsRate}%`} accent={conventionsRate >= 80 ? "green" : conventionsRate >= 40 ? "amber" : "red"} />
        <KpiCard label="Mineurs identifiés" value={String(minorCount)} accent="amber" />
        <KpiCard label="Partenaires" value={String(sponsors.length)} sub={totalSponsorAmount.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })} accent="coral" />
      </section>

      <section className="mb-6 rounded-2xl border border-[var(--theme-primary,_#FF5E5B)]/20 bg-[var(--theme-primary,_#FF5E5B)]/5 p-5">
        <h2 className="font-display text-lg font-semibold">Télécharger le pack ZIP</h2>
        <p className="mt-1 text-sm text-brand-ink/70">
          Génère le ZIP avec récap markdown, listes CSV (bénévoles, sponsors, conventions) et README. Données personnelles incluses : à stocker localement, ne pas diffuser par email non chiffré.
        </p>
        <div className="mt-4">
          <DownloadPrefectureButton eventId={eventRow.id} eventSlug={eventRow.slug} />
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-brand-ink/10 bg-white p-5">
        <h2 className="font-display text-lg font-semibold">Checklist administrative</h2>
        <p className="mt-1 text-xs text-brand-ink/60">
          Documents à joindre à ta déclaration. Le pack ZIP couvre les points ✅, les ⚠️ sont à fournir manuellement.
        </p>
        <ul className="mt-4 space-y-2 text-sm">
          <ChecklistItem ok label="Liste nominative bénévoles avec coordonnées (CSV)" />
          <ChecklistItem ok label="Engagements / conventions signés horodatés (CSV)" />
          <ChecklistItem ok label="Bénévoles mineurs identifiés (colonne dédiée)" />
          <ChecklistItem ok label="Liste des partenaires et sponsors officiels" />
          <ChecklistItem ok label="Récap synthétique de la manifestation (markdown)" />
          <ChecklistItem label="Cerfa N°15826*02 — Déclaration manifestation festive" href="https://www.service-public.fr/particuliers/vosdroits/R20585" />
          <ChecklistItem label="Cerfa N°11542 — Autorisation buvette temporaire" href="https://www.service-public.fr/particuliers/vosdroits/R37013" />
          <ChecklistItem label="Plan d'évacuation et plan ORSEC interne" />
          <ChecklistItem label="Attestation assurance RC organisateur" />
          <ChecklistItem label="Convention mise à dispo du site (signée mairie)" />
          <ChecklistItem label="Avis SDIS (si jauge prévue > 1 500 personnes)" />
          <ChecklistItem label="Programme prévisionnel détaillé" />
          <ChecklistItem label="Plan de circulation, parkings et accès secours" />
          <ChecklistItem label="Liste des prestataires sécurité (agréments APS / CNAPS)" />
        </ul>
      </section>

      <section className="mb-6 rounded-2xl border border-brand-ink/10 bg-white p-5">
        <h2 className="font-display text-lg font-semibold">Organisateur déclaré</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wider text-brand-ink/50">Association</dt>
            <dd className="font-medium">{organization.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-brand-ink/50">SIRET</dt>
            <dd className="font-mono">{organization.legal_siret ?? "—"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-wider text-brand-ink/50">Contact officiel</dt>
            <dd>{organization.contact_email ?? "—"}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent: "green" | "amber" | "red" | "coral" }) {
  const cls = { green: "text-wellbeing-green", amber: "text-brand-amber", red: "text-wellbeing-red", coral: "text-[var(--theme-primary,_#FF5E5B)]" }[accent];
  return (
    <div className="rounded-2xl border border-brand-ink/10 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-widest text-brand-ink/55">{label}</p>
      <p className={`mt-1 font-display text-3xl font-bold ${cls}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-brand-ink/55">{sub}</p>}
    </div>
  );
}

function ChecklistItem({ ok = false, label, href }: { ok?: boolean; label: string; href?: string }) {
  return (
    <li className="flex items-start gap-2">
      <span aria-hidden="true">{ok ? "✅" : "⚠️"}</span>
      <span className="flex-1">
        {label}
        {href && (
          <>
            {" "}
            <a href={href} target="_blank" rel="noreferrer noopener" className="text-[var(--theme-primary,_#FF5E5B)] underline">service-public.fr ↗</a>
          </>
        )}
      </span>
    </li>
  );
}
