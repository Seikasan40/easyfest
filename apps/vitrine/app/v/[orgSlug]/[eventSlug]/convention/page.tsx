import Link from "next/link";

import { createServerClient } from "@/lib/supabase/server";
import { ConventionSignForm } from "./ConventionSignForm";

interface PageProps {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}

const CONVENTION_VERSION = "2026.1";

export default async function ConventionPage({ params }: PageProps) {
  const { orgSlug, eventSlug } = await params;
  const supabase = createServerClient();

  const { data: ev } = await supabase
    .from("events")
    .select(`id, name, starts_at, ends_at, location_name,
      organization:organization_id (id, name, slug, legal_siret, legal_address)`)
    .eq("slug", eventSlug)
    .maybeSingle();
  if (!ev) return null;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  // Récupérer profil bénévole
  const { data: profile } = await supabase
    .from("volunteer_profiles")
    .select("full_name, first_name, last_name, birth_date, address_street, address_city, address_zip")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  // Vérifier si déjà signée
  const { data: signed } = await supabase
    .from("signed_engagements")
    .select("id, signed_at, version")
    .eq("user_id", userData.user.id)
    .eq("event_id", ev.id)
    .eq("engagement_kind", "convention_benevolat")
    .order("signed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const org: any = (ev as any).organization;
  const orgName = org?.name ?? "Association";
  const orgSiret = org?.legal_siret ?? "—";
  const orgAddress = org?.legal_address ?? "—";
  const presidentName = org?.president_name ?? "le/la Président·e";
  const presidentTitle = org?.president_title ?? "Président·e";

  const dateRange = (() => {
    if (!ev.starts_at || !ev.ends_at) return "—";
    const s = new Date(ev.starts_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    const e = new Date(ev.ends_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    return `du ${s} au ${e}`;
  })();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Link
        href={`/v/${orgSlug}/${eventSlug}`}
        className="mb-4 inline-flex items-center gap-1 text-xs text-brand-ink/60 hover:text-brand-coral"
      >
        ← Retour
      </Link>
      <article className="rounded-2xl border border-brand-ink/10 bg-white p-6 shadow-soft md:p-8">
        <header className="mb-6 border-b border-brand-ink/10 pb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-coral">
            {orgName}
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold leading-tight md:text-3xl">
            Convention de bénévolat
          </h1>
          <p className="mt-1 text-sm text-brand-ink/60">
            {ev.name} · {dateRange} · {ev.location_name ?? "—"}
          </p>
        </header>

        <div className="space-y-4 text-sm leading-relaxed text-brand-ink/85">
          <p>
            Entre l'association <strong>{orgName}</strong>
            {orgSiret !== "—" && <> (Siret&nbsp;: {orgSiret})</>}, dont le siège social est situé{" "}
            {orgAddress !== "—" ? <>au {orgAddress}</> : "en France"}, représentée par {presidentTitle.toLowerCase()} <strong>{presidentName}</strong>,
          </p>
          <p>
            Et <strong>{profile?.full_name ?? "—"}</strong>
            {profile?.birth_date && <>, né(e) le {new Date(profile.birth_date).toLocaleDateString("fr-FR")}</>}
            {(profile?.address_street || profile?.address_city) && (
              <>
                , demeurant{" "}
                {[profile?.address_street, profile?.address_zip, profile?.address_city]
                  .filter(Boolean)
                  .join(" ")}
              </>
            )},
          </p>
          <p>il a été convenu ce qui suit :</p>

          <h2 className="mt-6 font-display text-lg font-semibold">Article 1 — Objet</h2>
          <p>
            Le/la bénévole soussigné(e) s'engage à participer aux actions de l'association{" "}
            <strong>{orgName}</strong> dans le cadre de l'événement <strong>{ev.name}</strong>{" "}
            ({dateRange}), à titre strictement bénévole et désintéressé.
          </p>

          <h2 className="mt-4 font-display text-lg font-semibold">Article 2 — Absence de rémunération</h2>
          <p>
            Aucune rémunération ne sera versée en contrepartie de cette participation. Les éventuels
            avantages en nature (repas, accès aux concerts hors créneau, hébergement) ne constituent pas
            une rémunération mais une contrepartie aux services bénévoles rendus.
          </p>

          <h2 className="mt-4 font-display text-lg font-semibold">Article 3 — Assurance</h2>
          <p>
            L'association {orgName} a souscrit une assurance responsabilité civile couvrant les
            bénévoles en mission. Le/la bénévole certifie disposer également de sa propre assurance
            responsabilité civile à jour.
          </p>

          <h2 className="mt-4 font-display text-lg font-semibold">Article 4 — Engagements du bénévole</h2>
          <ul className="ml-6 list-disc space-y-1">
            <li>Respecter les horaires de prise de poste qui lui seront communiqués</li>
            <li>Respecter les consignes des responsables d'équipe et de la sécurité</li>
            <li>Respecter la charte de bonne conduite de l'événement (Safer Space)</li>
            <li>Prévenir au plus tôt en cas d'empêchement</li>
            <li>Adopter une attitude bienveillante et inclusive envers les autres bénévoles et le public</li>
            <li>Ne pas consommer d'alcool ou de stupéfiants pendant les créneaux de poste</li>
          </ul>

          <h2 className="mt-4 font-display text-lg font-semibold">Article 5 — Droit à l'image</h2>
          <p>
            Le/la bénévole autorise {orgName} à utiliser son image (photos / vidéos prises pendant
            l'événement) à des fins de communication non commerciale (site, réseaux sociaux, presse).
            Cette autorisation peut être révoquée à tout moment par simple demande écrite.
          </p>

          <h2 className="mt-4 font-display text-lg font-semibold">Article 6 — Données personnelles</h2>
          <p>
            Les données collectées par l'association sont traitées conformément au RGPD. Le/la bénévole
            dispose d'un droit d'accès, de modification et de suppression de ses données via la
            plateforme Easyfest ou par demande écrite à {orgName}.
          </p>

          <h2 className="mt-4 font-display text-lg font-semibold">Article 7 — Validité</h2>
          <p>
            La présente convention prend effet à sa signature électronique et expire à la fin de
            l'événement (ou à toute date convenue d'un commun accord).
          </p>
        </div>

        <div className="mt-8 border-t border-brand-ink/10 pt-6">
          {signed ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-800">
                ✓ Convention signée le{" "}
                {new Date(signed.signed_at).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <p className="mt-1 text-xs text-emerald-700">
                Version {signed.version} · Une trace électronique a été enregistrée (horodatage + IP)
              </p>
            </div>
          ) : (
            <ConventionSignForm
              eventId={ev.id}
              version={CONVENTION_VERSION}
              fullName={profile?.full_name ?? userData.user.email ?? ""}
            />
          )}
        </div>
      </article>
    </div>
  );
}
