import Link from "next/link";

import { formatDateTimeFr, timeFromNow } from "@easyfest/shared";
import { createServerClient } from "@/lib/supabase/server";

interface PageProps {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}

export default async function VolunteerHome({ params }: PageProps) {
  const { orgSlug, eventSlug } = await params;
  const supabase = createServerClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  // Récupérer profil + prochain shift
  const [{ data: profile }, { data: ev }] = await Promise.all([
    supabase
      .from("volunteer_profiles")
      .select("first_name, full_name, avatar_url")
      .eq("user_id", userData.user.id)
      .maybeSingle(),
    supabase
      .from("events")
      .select("id, name, location")
      .eq("slug", eventSlug)
      .maybeSingle(),
  ]);

  if (!ev) return <p>Événement introuvable</p>;

  const { data: nextAssignment } = await supabase
    .from("assignments")
    .select(
      `
      id, status, validated_by_volunteer_at,
      shift:shift_id (
        starts_at, ends_at,
        position:position_id (name, color, icon, description)
      )
    `,
    )
    .eq("volunteer_user_id", userData.user.id)
    .eq("status", "validated")
    .order("shift(starts_at)" as any, { ascending: true })
    .limit(1)
    .maybeSingle();

  const { count: mealsRemaining } = await supabase
    .from("meal_allowances")
    .select("*", { count: "exact", head: true })
    .eq("event_id", ev.id)
    .eq("volunteer_user_id", userData.user.id)
    .is("served_at", null);

  const firstName = profile?.first_name ?? profile?.full_name?.split(" ")[0] ?? "bénévole";

  return (
    <div className="space-y-4">
      <section>
        <p className="text-sm text-brand-ink/60">Salut</p>
        <h1 className="font-display text-3xl font-bold">{firstName} 👋</h1>
      </section>

      {nextAssignment ? (
        <section className="rounded-2xl border border-brand-ink/10 bg-white p-5 shadow-soft">
          <p className="text-xs font-medium uppercase tracking-widest text-brand-ink/50">
            Prochain créneau
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold">
            {(nextAssignment as any).shift?.position?.icon}{" "}
            {(nextAssignment as any).shift?.position?.name}
          </h2>
          <p className="mt-1 text-sm text-brand-ink/70">
            {formatDateTimeFr((nextAssignment as any).shift?.starts_at)}
          </p>
          <p className="text-xs font-medium text-brand-coral">
            {timeFromNow((nextAssignment as any).shift?.starts_at)}
          </p>
          <div className="mt-4 flex gap-2">
            <Link
              href={`/v/${orgSlug}/${eventSlug}/qr`}
              className="flex-1 rounded-xl bg-brand-coral px-4 py-2 text-center text-sm font-medium text-white"
            >
              Afficher mon QR
            </Link>
            <Link
              href={`/v/${orgSlug}/${eventSlug}/planning`}
              className="rounded-xl border border-brand-ink/15 px-4 py-2 text-center text-sm font-medium"
            >
              Planning
            </Link>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-brand-ink/15 bg-white/50 p-5 text-center">
          <p className="text-3xl">⏳</p>
          <p className="mt-2 font-medium">En attente d'affectation</p>
          <p className="mt-1 text-sm text-brand-ink/60">
            Pam et l'équipe regardent ton profil. Tu recevras une notif dès que ton planning
            est prêt.
          </p>
        </section>
      )}

      <section className="grid grid-cols-2 gap-3">
        <Stat label="Repas restants" value={mealsRemaining ?? 0} emoji="🍽️" />
        <Link
          href={`/v/${orgSlug}/${eventSlug}/wellbeing`}
          className="rounded-xl border border-brand-ink/10 bg-white p-4 text-center hover:bg-white"
        >
          <p className="text-2xl">💚</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-widest text-brand-ink/50">
            Comment tu te sens ?
          </p>
        </Link>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-medium uppercase tracking-widest text-brand-ink/50">
          Charte & engagements
        </h3>
        <Link
          href={`/v/${orgSlug}/${eventSlug}/charter`}
          className="block rounded-xl border border-brand-ink/10 bg-white p-4 text-sm hover:bg-white"
        >
          📜 Relire la charte du festival et l'engagement anti-harcèlement
        </Link>
      </section>
    </div>
  );
}

function Stat({ label, value, emoji }: { label: string; value: number; emoji: string }) {
  return (
    <div className="rounded-xl border border-brand-ink/10 bg-white p-4 text-center">
      <p className="text-2xl">{emoji}</p>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
      <p className="text-[10px] font-medium uppercase tracking-widest text-brand-ink/50">
        {label}
      </p>
    </div>
  );
}
