import Link from "next/link";

import { createServerClient } from "@/lib/supabase/server";

interface PageProps {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}

// Couleurs proto (utilisées en inline pour éviter purge Tailwind)
const PROTO_DARK = "#1A3828";
const PROTO_GOLD = "#C49A2C";
const PROTO_GOLD_BG = "#F5E9C4";

/** Formate une durée en "Dans X h Y" ou "Dans X min" */
function timeUntilLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return null;
  const totalMin = Math.floor(diff / 60000);
  if (totalMin < 60) return `Dans ${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `Dans ${h} h ${m}` : `Dans ${h} h`;
}

/** "vendredi 18 h – minuit" */
function shiftTimeLabel(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const fmtH = (d: Date) => {
    const h = d.getHours();
    const m = d.getMinutes();
    if (h === 0 && m === 0) return "minuit";
    if (h === 12 && m === 0) return "midi";
    return m > 0 ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
  };
  const day = start.toLocaleDateString("fr-FR", { weekday: "long" });
  return `${day} ${fmtH(start)} – ${fmtH(end)}`;
}

/** "28 · 29 · 30 mai" depuis starts_at/ends_at */
function eventDateLabel(startsAt: string | null, endsAt: string | null): string {
  if (!startsAt) return "";
  const start = new Date(startsAt);
  const end = endsAt ? new Date(endsAt) : null;
  const month = start.toLocaleDateString("fr-FR", { month: "long" });
  if (!end || end.getDate() === start.getDate()) {
    return `${start.getDate()} ${month}`;
  }
  // Multi-jours : liste les jours du même mois
  const days: number[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    days.push(cur.getDate());
    cur.setDate(cur.getDate() + 1);
  }
  return days.join(" · ") + " " + month;
}

/** Countdown J-X */
function countdownLabel(startsAt: string | null): string {
  if (!startsAt) return "";
  const diff = Math.ceil((new Date(startsAt).getTime() - Date.now()) / 86400000);
  if (diff < 0) return "En cours";
  if (diff === 0) return "J-0";
  if (diff === 1) return "J-1";
  return `J-${diff}`;
}

/** Jour de la semaine en français */
function dayLabel(): string {
  return new Date().toLocaleDateString("fr-FR", { weekday: "long" });
}

export const dynamic = "force-dynamic";

export default async function VolunteerHome({ params }: PageProps) {
  const { orgSlug, eventSlug } = await params;
  const supabase = createServerClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  // Profil + event
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

  if (!ev) return <p className="p-6 text-center">Événement introuvable</p>;
  const eventRow: any = ev;

  // Membership active
  const { data: ownMembership } = await (supabase as any)
    .from("memberships")
    .select("position_id, role")
    .eq("user_id", userData.user.id)
    .eq("event_id", eventRow.id)
    .eq("is_active", true)
    .order("role", { ascending: true })
    .limit(1)
    .maybeSingle();

  // Position + chef d'équipe + membres
  let position: any = null;
  let teamLead: any = null;
  let teamMemberNames: string[] = [];

  if (ownMembership?.position_id) {
    const [posRes, leadMbRes] = await Promise.all([
      (supabase as any)
        .from("positions")
        .select("id, name, color, icon")
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
    const leadUserId = leadMbRes.data?.user_id ?? null;
    if (leadUserId) {
      const { data: leadProfile } = await (supabase as any)
        .from("volunteer_profiles")
        .select("user_id, first_name, last_name, full_name, email, phone, avatar_url")
        .eq("user_id", leadUserId)
        .maybeSingle();
      teamLead = leadProfile;
    }
    // Autres membres de l'équipe (pour "Avec X, Y, Z")
    const { data: otherMembers } = await (supabase as any)
      .from("memberships")
      .select("user_id")
      .eq("event_id", eventRow.id)
      .eq("position_id", ownMembership.position_id)
      .eq("is_active", true)
      .neq("user_id", userData.user.id)
      .limit(4);
    if (otherMembers && otherMembers.length > 0) {
      const ids = otherMembers.map((m: any) => m.user_id);
      const { data: memberProfiles } = await (supabase as any)
        .from("volunteer_profiles")
        .select("user_id, first_name, full_name")
        .in("user_id", ids);
      teamMemberNames = (memberProfiles ?? []).map(
        (p: any) => p.first_name ?? p.full_name?.split(" ")[0] ?? "?"
      );
    }
  }

  // Prochain créneau validé
  const { data: nextAssignment } = await supabase
    .from("assignments")
    .select(`id, shift:shift_id (starts_at, ends_at, position:position_id (name, color, icon))`)
    .eq("volunteer_user_id", userData.user.id)
    .eq("status", "validated")
    .order("shift(starts_at)" as any, { ascending: true })
    .limit(1)
    .maybeSingle();

  // Total créneaux
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

  const { count: totalMeals } = await supabase
    .from("meal_allowances")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventRow.id)
    .eq("volunteer_user_id", userData.user.id);

  // Messages récents (fil d'actu) — 48h, max 2 pour l'aperçu home
  const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data: recentMessages } = await supabase
    .from("messages")
    .select(`id, content, created_at, sender_user_id,
      channel:channel_id (name, kind)`)
    .gte("created_at", since48h)
    .eq("is_broadcast", true)
    .order("created_at", { ascending: false })
    .limit(2) as any;

  // Enrichir les messages avec le profil sender
  let enrichedMessages: any[] = [];
  if (recentMessages && recentMessages.length > 0) {
    const senderIds = [...new Set((recentMessages as any[]).map((m: any) => m.sender_user_id).filter(Boolean))];
    const { data: senderProfiles } = await supabase
      .from("volunteer_profiles")
      .select("user_id, first_name, full_name")
      .in("user_id", senderIds);
    const profileMap = new Map((senderProfiles ?? []).map((p: any) => [p.user_id, p]));
    enrichedMessages = (recentMessages as any[]).map((m: any) => ({
      ...m,
      senderProfile: profileMap.get(m.sender_user_id) ?? null,
    }));
  }

  // Labels calculés
  const firstName = profile?.first_name ?? profile?.full_name?.split(" ")[0] ?? "toi";
  const leadName = teamLead?.first_name ?? teamLead?.full_name?.split(" ")[0] ?? null;
  const leadInitials = teamLead
    ? ((teamLead.first_name?.[0] ?? "") + (teamLead.last_name?.[0] ?? teamLead.full_name?.[1] ?? "")).toUpperCase()
    : "";

  const shift = nextAssignment ? (nextAssignment as any).shift : null;
  const shiftPos = shift?.position ?? position;
  const withNames = [
    ...(leadName ? [`${leadName} (resp.)`] : []),
    ...teamMemberNames.slice(0, 3),
  ];
  const withLabel = withNames.length > 0 ? `Avec ${withNames.join(", ")}` : null;
  const timer = shift ? timeUntilLabel(shift.starts_at) : null;
  const shiftLabel = shift ? shiftTimeLabel(shift.starts_at, shift.ends_at) : null;
  const dateLabel = eventDateLabel(eventRow.starts_at, eventRow.ends_at);
  const cdLabel = countdownLabel(eventRow.starts_at);
  const today = dayLabel();

  // "il y a X min/h"
  const timeAgoLabel = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diff < 60) return `il y a ${diff} min`;
    const h = Math.floor(diff / 60);
    return `il y a ${h} h`;
  };

  return (
    <div className="pb-6">

      {/* ─── HEADER PAGE ───────────────────────────────────────────────── */}
      <div className="flex items-start justify-between px-5 pt-8 pb-5">
        <div>
          <h1
            className="font-display text-2xl font-bold leading-tight"
            style={{ color: PROTO_DARK, letterSpacing: "-0.01em" }}
          >
            Salut {firstName}
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "#9A9080" }}>
            {today[0].toUpperCase() + today.slice(1)} · {cdLabel}
          </p>
        </div>
        <form action="/auth/logout" method="post" className="mt-1">
          <button
            type="submit"
            className="rounded-xl border px-3 py-1.5 text-xs font-medium"
            style={{ borderColor: "#E5DDD0", color: "#9A9080", background: "white" }}
          >
            Quitter
          </button>
        </form>
      </div>

      {/* ─── CARTE ÉVÉNEMENT (vert forêt) ──────────────────────────────── */}
      <div className="relative mx-5 overflow-hidden rounded-2xl p-5 text-white"
        style={{ background: PROTO_DARK }}>
        {/* Pastille dorée */}
        <div
          className="absolute right-5 top-5 h-4 w-4 rounded-full"
          style={{ background: PROTO_GOLD }}
        />
        <p
          className="text-[10px] font-bold uppercase tracking-[0.2em]"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          {(eventRow.organization as any)?.name ?? "Édition"}
        </p>
        <h2
          className="mt-1 font-display text-3xl font-bold leading-tight"
          style={{ letterSpacing: "-0.02em" }}
        >
          {eventRow.name}
        </h2>
        {dateLabel && (
          <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
            {dateLabel}
          </p>
        )}
      </div>

      {/* ─── CARTE PROCHAIN SHIFT (vert forêt) ─────────────────────────── */}
      {shift ? (
        <div
          className="relative mx-5 mt-3 overflow-hidden rounded-2xl p-5 text-white"
          style={{ background: PROTO_DARK }}
        >
          <p
            className="text-[10px] font-bold uppercase tracking-[0.2em]"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            Ton prochain shift
          </p>
          <h2
            className="mt-1 font-display text-xl font-bold leading-snug"
            style={{ letterSpacing: "-0.01em" }}
          >
            {shiftPos?.icon ? `${shiftPos.icon} ` : ""}
            {shiftPos?.name ?? position?.name ?? "Bénévolat"} · {shiftLabel}
          </h2>
          {withLabel && (
            <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
              {withLabel}
            </p>
          )}
          {timer && (
            <div
              className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{ background: PROTO_GOLD_BG, color: "#7A5800" }}
            >
              ⏰ {timer} — pense à arriver 15 min avant
            </div>
          )}

          {/* Boutons action */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Link
              href={`/v/${orgSlug}/${eventSlug}/plan`}
              className="flex flex-col items-center gap-1 rounded-xl py-3 text-xs font-semibold text-white"
              style={{ background: "rgba(255,255,255,0.15)" }}
            >
              📍 Plan
            </Link>
            {teamLead ? (
              <a
                href={teamLead.phone ? `tel:${teamLead.phone}` : `mailto:${teamLead.email}`}
                className="flex flex-col items-center gap-1 rounded-xl py-3 text-xs font-semibold text-white"
                style={{ background: "rgba(255,255,255,0.15)" }}
              >
                💬 Mon resp.
              </a>
            ) : (
              <Link
                href={`/v/${orgSlug}/${eventSlug}/chat`}
                className="flex flex-col items-center gap-1 rounded-xl py-3 text-xs font-semibold text-white"
                style={{ background: "rgba(255,255,255,0.15)" }}
              >
                💬 Mon resp.
              </Link>
            )}
            <Link
              href={`/v/${orgSlug}/${eventSlug}/safer`}
              className="flex flex-col items-center gap-1 rounded-xl py-3 text-xs font-semibold"
              style={{ background: PROTO_GOLD_BG, color: "#7A5800" }}
            >
              ⚠️ J&apos;ai un imprévu
            </Link>
          </div>
        </div>
      ) : (
        <div
          className="mx-5 mt-3 rounded-2xl p-5"
          style={{ background: "white", border: "1px solid #E5DDD0" }}
        >
          <p className="text-center text-sm" style={{ color: "#9A9080" }}>
            ⏳ En attente d&apos;affectation — la régie prépare ton planning.
          </p>
        </div>
      )}

      {/* ─── STATS (2 cards) ───────────────────────────────────────────── */}
      <div className="mx-5 mt-4 grid grid-cols-2 gap-3">
        <Link
          href={`/v/${orgSlug}/${eventSlug}/planning`}
          className="rounded-2xl p-4"
          style={{ background: "white", border: "1px solid #E5DDD0" }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "#9A9080" }}>
            Mes shifts
          </p>
          <p
            className="mt-1 font-display text-4xl font-bold leading-none"
            style={{ color: PROTO_DARK, letterSpacing: "-0.03em" }}
          >
            {totalShifts ?? 0}
          </p>
          <p className="mt-1 text-xs" style={{ color: "#9A9080" }}>
            sur tout l&apos;événement
          </p>
        </Link>
        <div
          className="rounded-2xl p-4"
          style={{ background: "white", border: "1px solid #E5DDD0" }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "#9A9080" }}>
            Repas restants
          </p>
          <p
            className="mt-1 font-display text-4xl font-bold leading-none"
            style={{ color: PROTO_DARK, letterSpacing: "-0.03em" }}
          >
            {mealsRemaining ?? 0}
            {totalMeals ? (
              <span className="text-xl font-normal" style={{ color: "#9A9080" }}>
                /{totalMeals}
              </span>
            ) : null}
          </p>
          <p className="mt-1 text-xs" style={{ color: "#9A9080" }}>
            récupère ton p&apos;tit déj !
          </p>
        </div>
      </div>

      {/* ─── DU NOUVEAU ────────────────────────────────────────────────── */}
      {enrichedMessages.length > 0 && (
        <div className="mx-5 mt-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-px flex-1" style={{ background: "#E5DDD0" }} />
            <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "#9A9080" }}>
              Du nouveau
            </span>
            <div className="h-px flex-1" style={{ background: "#E5DDD0" }} />
          </div>
          <div className="space-y-3">
            {enrichedMessages.map((msg: any) => {
              const senderName =
                msg.senderProfile?.first_name ??
                msg.senderProfile?.full_name?.split(" ")[0] ??
                "Régie";
              const channelLabel = msg.channel?.kind === "admin"
                ? "Régie"
                : msg.channel?.kind === "responsibles"
                ? "Resp."
                : msg.channel?.name ?? "Équipe";
              return (
                <div
                  key={msg.id}
                  className="rounded-2xl p-4"
                  style={{
                    background: "white",
                    borderLeft: `3px solid ${PROTO_DARK}`,
                    border: `1px solid #E5DDD0`,
                    borderLeftWidth: "3px",
                    borderLeftColor: PROTO_DARK,
                  }}
                >
                  <p
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: "#9A9080" }}
                  >
                    {senderName.toUpperCase()} · {channelLabel.toUpperCase()}
                  </p>
                  <p className="mt-1 text-sm leading-snug" style={{ color: "#2A2520" }}>
                    {msg.content}
                  </p>
                  <p className="mt-1 text-[10px]" style={{ color: "#B0A898" }}>
                    {timeAgoLabel(msg.created_at)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── CTA QR ENTRÉE ─────────────────────────────────────────────── */}
      <div className="mx-5 mt-5 space-y-3">
        <Link
          href={`/v/${orgSlug}/${eventSlug}/qr`}
          className="flex w-full items-center justify-center rounded-2xl py-4 text-base font-bold text-white transition hover:opacity-90"
          style={{ background: PROTO_DARK, minHeight: "56px" }}
        >
          Afficher mon QR pour entrer
        </Link>
        {teamLead && (leadName) && (
          <a
            href={teamLead.phone ? `tel:${teamLead.phone}` : `mailto:${teamLead.email}`}
            className="flex w-full items-center justify-center rounded-2xl py-4 text-base font-semibold transition hover:bg-proto-border/30"
            style={{
              background: "white",
              border: "1px solid #E5DDD0",
              color: PROTO_DARK,
              minHeight: "56px",
            }}
          >
            Contacter {leadName}
          </a>
        )}
      </div>

      {/* ─── LIENS UTILES ──────────────────────────────────────────────── */}
      <div className="mx-5 mt-5 flex flex-col items-center gap-1">
        <Link
          href={`/v/${orgSlug}/${eventSlug}/profile`}
          className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition hover:opacity-80"
          style={{ color: "#9A9080" }}
        >
          <span>⚙ Mon compte</span>
          <span>→</span>
        </Link>
      </div>

    </div>
  );
}
