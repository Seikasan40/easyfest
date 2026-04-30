import Link from "next/link";

import { createServerClient } from "@/lib/supabase/server";

interface PageProps {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}

export default async function VolunteerProfilePage({ params }: PageProps) {
  const { orgSlug, eventSlug } = await params;
  const supabase = createServerClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const [{ data: profile }, { data: ev }] = await Promise.all([
    supabase
      .from("volunteer_profiles")
      .select("*")
      .eq("user_id", userData.user.id)
      .maybeSingle(),
    supabase
      .from("events")
      .select("id, name")
      .eq("slug", eventSlug)
      .maybeSingle(),
  ]);

  if (!profile || !ev) return <p>Profil ou événement introuvable</p>;

  // Récupérer la candidature liée pour les souhaits
  const { data: app } = await supabase
    .from("volunteer_applications")
    .select("preferred_position_slugs, bio, skills, limitations, diet_type, carpool, available_setup, available_teardown")
    .eq("event_id", ev.id)
    .eq("email", profile.email ?? userData.user.email ?? "")
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const dietLabel: Record<string, string> = {
    none: "Aucun régime",
    vegetarian: "Végétarien",
    vegan: "Végan",
    gluten_free: "Sans gluten",
    no_pork: "Sans porc",
    other: "Autre",
  };
  const carpoolLabel: Record<string, string> = {
    none: "Pas concerné",
    offering: "Propose des places",
    seeking: "Cherche un trajet",
  };

  return (
    <div className="space-y-4">
      <Link
        href={`/v/${orgSlug}/${eventSlug}`}
        className="inline-flex items-center gap-1 text-xs text-brand-ink/60 hover:text-brand-coral"
      >
        ← Retour
      </Link>

      <header className="rounded-2xl border border-brand-ink/10 bg-white p-5 shadow-soft">
        <div className="flex items-start gap-4">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              className="h-20 w-20 flex-none rounded-full object-cover ring-4 ring-brand-coral/20"
            />
          ) : (
            <div className="flex h-20 w-20 flex-none items-center justify-center rounded-full bg-brand-coral/15 text-3xl font-bold text-brand-coral">
              {(profile.first_name?.[0] ?? profile.full_name?.[0] ?? "?").toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold leading-tight">
              {profile.full_name}
              {profile.is_returning && <span className="ml-2 text-amber-500" title="Bénévole fidèle">★</span>}
            </h1>
            <p className="text-sm text-brand-ink/60">{profile.email ?? "—"}</p>
            <p className="text-xs text-brand-ink/50">{profile.phone ?? "—"}</p>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-brand-ink/10 bg-white p-5 shadow-soft">
        <h2 className="mb-3 font-display text-lg font-semibold">Infos pratiques</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <Info label="Date de naissance">
            {profile.birth_date ? new Date(profile.birth_date).toLocaleDateString("fr-FR") : "—"}
          </Info>
          <Info label="T-shirt">{profile.size ?? "—"}</Info>
          <Info label="Régime alimentaire">{dietLabel[profile.diet_type ?? "none"] ?? "—"}</Info>
          <Info label="Précisions régime">{profile.diet_notes ?? "—"}</Info>
          <Info label="Covoiturage">{carpoolLabel[profile.carpool ?? "none"] ?? "—"}</Info>
          <Info label="Profession">{profile.profession ?? "—"}</Info>
          <Info label="Dispo montage">{profile.available_setup ? "✓ Oui" : "Non"}</Info>
          <Info label="Dispo démontage">{profile.available_teardown ? "✓ Oui" : "Non"}</Info>
        </dl>
      </section>

      {app && (
        <section className="rounded-2xl border border-brand-ink/10 bg-white p-5 shadow-soft">
          <h2 className="mb-3 font-display text-lg font-semibold">Tes souhaits de postes</h2>
          {app.preferred_position_slugs && app.preferred_position_slugs.length > 0 ? (
            <ol className="flex flex-wrap gap-2">
              {app.preferred_position_slugs.map((slug: string, i: number) => (
                <li
                  key={slug}
                  className="rounded-full bg-brand-coral/10 px-3 py-1 text-sm font-medium text-brand-coral"
                >
                  #{i + 1} {slug}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-brand-ink/50">Pas de souhaits exprimés</p>
          )}
          {app.bio && (
            <div className="mt-4 rounded-xl bg-brand-cream/40 p-3 text-sm italic text-brand-ink/80">
              "{app.bio}"
            </div>
          )}
        </section>
      )}

      <p className="text-center text-xs text-brand-ink/50">
        Pour modifier tes infos, contacte ton/ta responsable bénévole.
      </p>
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-brand-ink/50">{label}</dt>
      <dd className="mt-0.5 text-brand-ink/90">{children}</dd>
    </div>
  );
}
