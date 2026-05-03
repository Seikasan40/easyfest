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

  // Récupérer profil + event
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
  const eventRow: any = ev;

  // Convention bénévolat signée ?
  const { data: convention } = await supabase
    .from("signed_engagements")
    .select("id, signed_at")
    .eq("user_id", userData.user.id)
    .eq("event_id", eventRow.id)
    .eq("engagement_kind", "convention_benevolat")
    .order("signed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Membership active du bénévole : on lit sa position_id pour identifier son équipe
  const { data: ownMembership } = await (supabase as any)
    .from("memberships")
    .select("position_id, role")
    .eq("user_id", userData.user.id)
    .eq("event_id", eventRow.id)
    .eq("is_active", true)
    .order("role", { ascending: true })
    .limit(1)
    .maybeSingle();

  // Position info + chef d'équipe (post_lead partageant la même position_id)
  // Bug #7 fix : embed `profiles:user_id (...)` cassé (pas de FK directe memberships→volunteer_profiles).
  // Split en 2 queries.
  let position: any = null;
  let teamLead: any = null;
  if (ownMembership?.position_id) {
    const [posRes, leadMembershipRes] = await Promise.all([
      (supabase as any)
        .from("positions")
        .select("id, slug, name, color, icon")
        .eq("id", ownMembership.position_id)
        .maybeSingle(),
      (supabase as any)
        .from("memberships")
        .select("user_id")
        .eq("event_id", eventRow.id)
        .eq("position_id", ownMembership.position_id)
        .eq("role", "post_lead")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle(),
    ]);
    position = posRes.data;
    const leadUserId = (leadMembershipRes.data as any)?.user_id ?? null;
    if (leadUserId) {
      const { data: leadProfile } = await (supabase as any)
        .from("volunteer_profiles")
        .select("user_id, first_name, last_name, full_name, email, phone, avatar_url")
        .eq("user_id", leadUserId)
        .maybeSingle();
      teamLead = leadProfile ?? null;
    }
  }

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
    .eq("event_id", eventRow.id)
    .eq("volunteer_user_id", userData.user.id)
    .is("served_at", null);

  const firstName = profile?.first_name ?? profile?.full_name?.split(" ")[0] ?? "bénévole";
  const leadInitials = teamLead
    ? (teamLead.first_name?.[0] ?? "?") + (teamLead.last_name?.[0] ?? "")
    : "";

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
          <p className="text-xs font-medium text-[var(--theme-primary,_#FF5E5B)]">
            {timeFromNow((nextAssignment as any).shift?.starts_at)}
          </p>
          <div className="mt-4 flex gap-2">
            <Link
              href={`/v/${orgSlug}/${eventSlug}/qr`}
              className="flex-1 rounded-xl bg-[var(--theme-primary,_#FF5E5B)] px-4 py-2 text-center text-sm font-medium text-white"
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

      <section className="grid grid-cols-4 gap-2">
        <Stat label="Repas" value={mealsRemaining ?? 0} emoji="🍽️" />
        <Link
          href={`/v/${orgSlug}/${eventSlug}/wellbeing`}
          className="flex min-h-[72px] flex-col items-center justify-center rounded-xl border border-brand-ink/10 bg-white p-3 text-center hover:bg-white"
        >
          <p className="text-2xl">💚</p>
          <p className="mt-1 text-[10px] font-medium uppercase tracking-widest text-brand-ink/50">
            Wellbeing
          </p>
        </Link>
        <Link
          href={`/v/${orgSlug}/${eventSlug}/plan`}
          className="flex min-h-[72px] flex-col items-center justify-center rounded-xl border border-brand-ink/10 bg-white p-3 text-center hover:bg-white"
        >
          <p className="text-2xl">🗺️</p>
          <p className="mt-1 text-[10px] font-medium uppercase tracking-widest text-brand-ink/50">
            Plan
          </p>
        </Link>
        <Link
          href={`/v/${orgSlug}/${eventSlug}/profile`}
          className="flex min-h-[72px] flex-col items-center justify-center rounded-xl border border-brand-ink/10 bg-white p-3 text-center hover:bg-white"
        >
          <p className="text-2xl">👤</p>
          <p className="mt-1 text-[10px] font-medium uppercase tracking-widest text-brand-ink/50">
            Profil
          </p>
        </Link>
      </section>

      {/* Mon équipe — chef·fe d'équipe + tchat (audit Pam P0 vague 3) */}
      {position && (
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-sm font-medium uppercase tracking-widest text-brand-ink/50">
              <span aria-hidden="true">{position.icon ?? "👥"}</span>
              <span>Mon équipe — {position.name}</span>
            </h3>
            <Link
              href={`/v/${orgSlug}/${eventSlug}/feed`}
              className="inline-flex min-h-[44px] items-center gap-1 rounded-xl bg-[var(--theme-primary,_#FF5E5B)] px-3 py-1.5 text-xs font-semibold text-white shadow-soft transition hover:opacity-90"
              style={{ touchAction: "manipulation" }}
            >
              💬 Tchat équipe →
            </Link>
          </div>

          {teamLead ? (
            <article className="flex items-center gap-3 rounded-2xl border border-brand-ink/10 bg-white p-3">
              {teamLead.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={teamLead.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--theme-primary,_#FF5E5B)]/15 text-sm font-semibold uppercase text-[var(--theme-primary,_#FF5E5B)]">
                  {leadInitials}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--theme-primary,_#FF5E5B)]">
                  Chef·fe d'équipe
                </p>
                <p className="truncate text-sm font-medium">
                  {teamLead.full_name ?? `${teamLead.first_name ?? ""} ${teamLead.last_name ?? ""}`.trim()}
                </p>
                <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-brand-ink/60">
                  {teamLead.phone && (
                    <a href={`tel:${teamLead.phone}`} className="hover:text-[var(--theme-primary,_#FF5E5B)]">
                      📞 {teamLead.phone}
                    </a>
                  )}
                  {teamLead.email && (
                    <a href={`mailto:${teamLead.email}`} className="truncate hover:text-[var(--theme-primary,_#FF5E5B)]">
                      ✉️ {teamLead.email}
                    </a>
                  )}
                </div>
              </div>
            </article>
          ) : (
            <p className="rounded-2xl border border-dashed border-brand-ink/15 bg-white/50 p-3 text-xs text-brand-ink/55">
              Pas encore de chef·fe d'équipe désigné·e. La régie va affecter quelqu'un sous peu — en attendant, contacte la direction du festival si besoin.
            </p>
          )}
        </section>
      )}

      <section>
        <h3 className="mb-2 text-sm font-medium uppercase tracking-widest text-brand-ink/50">
          Charte & engagements
        </h3>
        <div className="space-y-2">
          <Link
            href={`/v/${orgSlug}/${eventSlug}/convention`}
            className={`block rounded-xl border p-4 text-sm transition ${
              convention
                ? "border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
                : "border-amber-300 bg-amber-50 ring-2 ring-amber-200 hover:bg-amber-100"
            }`}
          >
            {convention ? (
              <span className="flex items-center justify-between gap-2">
                <span>📝 Convention de bénévolat signée</span>
                <span className="text-xs font-semibold text-emerald-700">
                  ✓ {new Date(convention.signed_at).toLocaleDateString("fr-FR")}
                </span>
              </span>
            ) : (
              <span className="flex items-center justify-between gap-2">
                <span>
                  <strong>📝 Convention de bénévolat à signer</strong>
                  <span className="ml-1 text-xs text-amber-800">(obligatoire)</span>
                </span>
                <span className="text-xs font-semibold text-amber-800">→</span>
              </span>
            )}
          </Link>
          <Link
            href={`/v/${orgSlug}/${eventSlug}/charter`}
            className="block rounded-xl border border-brand-ink/10 bg-white p-4 text-sm hover:bg-white"
          >
            📜 Relire la charte du festival et l'engagement anti-harcèlement
          </Link>
        </div>
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
