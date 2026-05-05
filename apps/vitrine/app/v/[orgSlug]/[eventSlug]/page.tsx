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

  // Profil + event (incl. dates pour la carte festival)
  const [{ data: profile }, { data: ev }] = await Promise.all([
    supabase
      .from("volunteer_profiles")
      .select("first_name, full_name, avatar_url")
      .eq("user_id", userData.user.id)
      .maybeSingle(),
    supabase
      .from("events")
      .select("id, name, location, starts_at, ends_at, organization:organization_id (name, slug)")
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

  // Membership active du bénévole
  const { data: ownMembership } = await (supabase as any)
    .from("memberships")
    .select("position_id, role")
    .eq("user_id", userData.user.id)
    .eq("event_id", eventRow.id)
    .eq("is_active", true)
    .order("role", { ascending: true })
    .limit(1)
    .maybeSingle();

  // Position + chef d'équipe + membres de l'équipe
  let position: any = null;
  let teamLead: any = null;
  let teamMembers: any[] = [];

  if (ownMembership?.position_id) {
    const [posRes, leadMembershipRes, teamMembersRes] = await Promise.all([
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
      // Membres de l'équipe (autres que soi-même, limité à 5 pour l'affichage)
      (supabase as any)
        .from("memberships")
        .select("user_id")
        .eq("event_id", eventRow.id)
        .eq("position_id", ownMembership.position_id)
        .eq("is_active", true)
        .neq("user_id", userData.user.id)
        .limit(5),
    ]);

    position = posRes.data;
    const leadUserId = (leadMembershipRes.data as any)?.user_id ?? null;
    const memberUserIds: string[] = ((teamMembersRes.data ?? []) as any[]).map((m) => m.user_id);

    const profileFetches = [];
    if (leadUserId) {
      profileFetches.push(
        (supabase as any)
          .from("volunteer_profiles")
          .select("user_id, first_name, last_name, full_name, email, phone, avatar_url")
          .eq("user_id", leadUserId)
          .maybeSingle()
          .then((r: any) => { teamLead = r.data ?? null; }),
      );
    }
    if (memberUserIds.length > 0) {
      profileFetches.push(
        (supabase as any)
          .from("volunteer_profiles")
          .select("user_id, first_name, last_name, full_name, avatar_url")
          .in("user_id", memberUserIds)
          .then((r: any) => { teamMembers = r.data ?? []; }),
      );
    }
    await Promise.all(profileFetches);
  }

  // Prochain créneau validé
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

  // Total créneaux validés (pour le compteur MES SHIFTS)
  const { count: totalShifts } = await supabase
    .from("assignments")
    .select("*", { count: "exact", head: true })
    .eq("volunteer_user_id", userData.user.id)
    .eq("status", "validated");

  // Repas restants
  const { count: mealsRemaining } = await supabase
    .from("meal_allowances")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventRow.id)
    .eq("volunteer_user_id", userData.user.id)
    .is("served_at", null);

  // Messages non lus dans le fil (derniers 48h)
  const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data: recentMessages } = await supabase
    .from("messages")
    .select("id, content, created_at, author_profile:author_user_id (first_name, full_name)")
    .gte("created_at", since48h)
    .order("created_at", { ascending: false })
    .limit(3) as any;

  const firstName = profile?.first_name ?? profile?.full_name?.split(" ")[0] ?? "bénévole";
  const leadInitials = teamLead
    ? (teamLead.first_name?.[0] ?? "?") + (teamLead.last_name?.[0] ?? "")
    : "";

  // Dates event formattées
  const eventStartDate = eventRow.starts_at
    ? new Date(eventRow.starts_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
    : null;
  const eventEndDate = eventRow.ends_at
    ? new Date(eventRow.ends_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
    : null;

  return (
    <div className="space-y-4 pb-4">

      {/* ── CARTE FESTIVAL (verte, comme le prototype) ─────────────────── */}
      <section
        className="rounded-2xl p-4 text-white"
        style={{ background: "linear-gradient(135deg, #1a7a4a 0%, #22a063 100%)" }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/70">
              {(eventRow.organization as any)?.name ?? ""}
            </p>
            <h1 className="font-display text-xl font-bold leading-tight">{eventRow.name}</h1>
            {eventRow.location && (
              <p className="mt-0.5 text-xs text-white/80">📍 {eventRow.location}</p>
            )}
          </div>
          {eventStartDate && (
            <div className="flex-shrink-0 rounded-xl bg-white/20 px-3 py-2 text-center backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/80">
                {eventEndDate && eventEndDate !== eventStartDate ? "Du" : "Le"}
              </p>
              <p className="text-sm font-bold leading-tight">{eventStartDate}</p>
              {eventEndDate && eventEndDate !== eventStartDate && (
                <p className="text-xs text-white/80">au {eventEndDate}</p>
              )}
            </div>
          )}
        </div>
        {/* Greeting dans la carte */}
        <div className="mt-3 border-t border-white/20 pt-3">
          <p className="text-sm font-medium">
            Salut <span className="font-bold">{firstName}</span> 👋
          </p>
          <p className="text-xs text-white/70">
            {convention ? "Convention signée ✓" : "⚠️ Convention à signer"}
            {position ? ` · Équipe ${position.name}` : ""}
            {(totalShifts ?? 0) > 0 ? ` · ${totalShifts} créneau${(totalShifts ?? 0) > 1 ? "x" : ""}` : ""}
          </p>
        </div>
      </section>

      {/* ── PROCHAIN CRÉNEAU ───────────────────────────────────────────── */}
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

          {/* 3 boutons : Mon QR · Plan · Mon resp. */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Link
              href={`/v/${orgSlug}/${eventSlug}/qr`}
              className="flex flex-col items-center gap-1 rounded-xl bg-[var(--theme-primary,_#FF5E5B)] px-2 py-3 text-center text-xs font-semibold text-white"
            >
              <span className="text-lg">🎟️</span>
              Mon QR
            </Link>
            <Link
              href={`/v/${orgSlug}/${eventSlug}/plan`}
              className="flex flex-col items-center gap-1 rounded-xl border border-brand-ink/15 bg-white px-2 py-3 text-center text-xs font-medium text-brand-ink"
            >
              <span className="text-lg">🗺️</span>
              Plan
            </Link>
            {teamLead ? (
              <a
                href={teamLead.phone ? `tel:${teamLead.phone}` : `mailto:${teamLead.email}`}
                className="flex flex-col items-center gap-1 rounded-xl border border-brand-ink/15 bg-white px-2 py-3 text-center text-xs font-medium text-brand-ink"
              >
                <span className="text-lg">👤</span>
                Mon resp.
              </a>
            ) : (
              <Link
                href={`/v/${orgSlug}/${eventSlug}/safer`}
                className="flex flex-col items-center gap-1 rounded-xl border border-brand-ink/15 bg-white px-2 py-3 text-center text-xs font-medium text-brand-ink"
              >
                <span className="text-lg">🛡️</span>
                Safer
              </Link>
            )}
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-brand-ink/15 bg-white/50 p-5 text-center">
          <p className="text-3xl">⏳</p>
          <p className="mt-2 font-medium">En attente d'affectation</p>
          <p className="mt-1 text-sm text-brand-ink/60">
            L'équipe régie regarde ton profil. Tu recevras une notif dès que ton planning est prêt.
          </p>
        </section>
      )}

      {/* ── CTA QR ENTRÉE (gros bouton, toujours visible) ─────────────── */}
      <Link
        href={`/v/${orgSlug}/${eventSlug}/qr`}
        className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[var(--theme-primary,_#FF5E5B)] px-5 py-4 text-base font-bold text-white shadow-soft transition hover:opacity-90"
        style={{ minHeight: "64px" }}
      >
        <span className="text-2xl">🎟️</span>
        Afficher mon QR pour entrer
      </Link>

      {/* ── STATS RAPIDES ─────────────────────────────────────────────── */}
      <section className="grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center justify-center rounded-xl border border-brand-ink/10 bg-white p-3 text-center">
          <p className="text-xl">🍽️</p>
          <p className="mt-1 font-display text-2xl font-bold">{mealsRemaining ?? 0}</p>
          <p className="text-[10px] font-medium uppercase tracking-widest text-brand-ink/50">Repas</p>
        </div>
        <Link
          href={`/v/${orgSlug}/${eventSlug}/planning`}
          className="flex flex-col items-center justify-center rounded-xl border border-brand-ink/10 bg-white p-3 text-center hover:bg-brand-ink/5"
        >
          <p className="text-xl">🗓️</p>
          <p className="mt-1 font-display text-2xl font-bold">{totalShifts ?? 0}</p>
          <p className="text-[10px] font-medium uppercase tracking-widest text-brand-ink/50">
            Mes shifts
          </p>
        </Link>
        <Link
          href={`/v/${orgSlug}/${eventSlug}/wellbeing`}
          className="flex flex-col items-center justify-center rounded-xl border border-brand-ink/10 bg-white p-3 text-center hover:bg-brand-ink/5"
        >
          <p className="text-xl">💚</p>
          <p className="mt-1 font-display text-2xl font-bold">OK</p>
          <p className="text-[10px] font-medium uppercase tracking-widest text-brand-ink/50">Bien-être</p>
        </Link>
      </section>

      {/* ── DU NOUVEAU (messages récents) ─────────────────────────────── */}
      {recentMessages && recentMessages.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-brand-ink/50">
              📣 Du nouveau
            </h3>
            <Link
              href={`/v/${orgSlug}/${eventSlug}/feed`}
              className="text-xs font-medium text-[var(--theme-primary,_#FF5E5B)] hover:underline"
            >
              Tout voir →
            </Link>
          </div>
          <ul className="space-y-2">
            {(recentMessages as any[]).map((msg: any) => {
              const authorName =
                (msg.author_profile as any)?.first_name ??
                (msg.author_profile as any)?.full_name ??
                "Régie";
              const preview = (msg.content as string)?.slice(0, 90) ?? "";
              return (
                <li
                  key={msg.id}
                  className="rounded-xl border border-brand-ink/10 bg-white px-3 py-2.5"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--theme-primary,_#FF5E5B)]">
                    {authorName}
                  </p>
                  <p className="mt-0.5 text-sm text-brand-ink/80 leading-snug">
                    {preview}{preview.length >= 90 ? "…" : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ── MON ÉQUIPE ────────────────────────────────────────────────── */}
      {position && (
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-brand-ink/50">
              <span aria-hidden="true">{position.icon ?? "👥"}</span>
              <span>Mon équipe — {position.name}</span>
            </h3>
            <Link
              href={`/v/${orgSlug}/${eventSlug}/feed`}
              className="inline-flex min-h-[40px] items-center gap-1 rounded-xl bg-[var(--theme-primary,_#FF5E5B)] px-3 py-1.5 text-xs font-semibold text-white shadow-soft transition hover:opacity-90"
              style={{ touchAction: "manipulation" }}
            >
              💬 Tchat équipe
            </Link>
          </div>

          {/* Chef d'équipe */}
          {teamLead ? (
            <article className="flex items-center gap-3 rounded-2xl border border-brand-ink/10 bg-white p-3">
              {teamLead.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={teamLead.avatar_url}
                  alt=""
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[var(--theme-primary,_#FF5E5B)]/15 text-sm font-semibold uppercase text-[var(--theme-primary,_#FF5E5B)]">
                  {leadInitials}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--theme-primary,_#FF5E5B)]">
                  Responsable d'équipe
                </p>
                <p className="truncate text-sm font-medium">
                  {teamLead.full_name ??
                    `${teamLead.first_name ?? ""} ${teamLead.last_name ?? ""}`.trim()}
                </p>
                <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-brand-ink/60">
                  {teamLead.phone && (
                    <a
                      href={`tel:${teamLead.phone}`}
                      className="hover:text-[var(--theme-primary,_#FF5E5B)]"
                    >
                      📞 {teamLead.phone}
                    </a>
                  )}
                  {teamLead.email && (
                    <a
                      href={`mailto:${teamLead.email}`}
                      className="truncate hover:text-[var(--theme-primary,_#FF5E5B)]"
                    >
                      ✉️ {teamLead.email}
                    </a>
                  )}
                </div>
              </div>
              {/* Bouton Contacter */}
              {(teamLead.phone || teamLead.email) && (
                <a
                  href={teamLead.phone ? `tel:${teamLead.phone}` : `mailto:${teamLead.email}`}
                  className="flex-shrink-0 rounded-xl border border-[var(--theme-primary,_#FF5E5B)] px-3 py-2 text-xs font-semibold text-[var(--theme-primary,_#FF5E5B)] hover:bg-[var(--theme-primary,_#FF5E5B)]/5"
                  style={{ minHeight: "40px" }}
                >
                  Contacter
                </a>
              )}
            </article>
          ) : (
            <p className="rounded-2xl border border-dashed border-brand-ink/15 bg-white/50 p-3 text-xs text-brand-ink/55">
              Pas encore de responsable désigné·e. La régie va affecter quelqu'un sous peu.
            </p>
          )}

          {/* Membres de l'équipe */}
          {teamMembers.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {teamMembers.map((m: any) => {
                const initials =
                  (m.first_name?.[0] ?? m.full_name?.[0] ?? "?").toUpperCase();
                return (
                  <div
                    key={m.user_id}
                    className="flex items-center gap-1.5 rounded-full border border-brand-ink/10 bg-white px-2.5 py-1 text-xs font-medium text-brand-ink/70"
                    title={m.full_name ?? m.first_name ?? ""}
                  >
                    {m.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.avatar_url}
                        alt=""
                        className="h-5 w-5 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-ink/10 text-[9px] font-bold text-brand-ink/60">
                        {initials}
                      </span>
                    )}
                    <span>{m.first_name ?? m.full_name?.split(" ")[0] ?? "?"}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ── CHARTE & ENGAGEMENTS ──────────────────────────────────────── */}
      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-widest text-brand-ink/50">
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
            className="block rounded-xl border border-brand-ink/10 bg-white p-4 text-sm hover:bg-brand-ink/5"
          >
            📜 Relire la charte de l'événement et l'engagement anti-harcèlement
          </Link>
        </div>
      </section>

      {/* ── LIENS UTILES ──────────────────────────────────────────────── */}
      <section className="flex flex-col gap-1">
        <Link
          href={`/v/${orgSlug}/${eventSlug}/profile`}
          className="flex items-center justify-between rounded-xl border border-brand-ink/10 bg-white px-4 py-3 text-sm font-medium text-brand-ink hover:bg-brand-ink/5"
        >
          <span>👤 Mon compte</span>
          <span className="text-brand-ink/40">→</span>
        </Link>
      </section>

    </div>
  );
}
