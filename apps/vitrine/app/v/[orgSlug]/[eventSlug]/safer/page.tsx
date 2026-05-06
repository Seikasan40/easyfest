import { notFound, redirect } from "next/navigation";

import { createServerClient } from "@/lib/supabase/server";

import { SaferAlertActions } from "./SaferAlertActions";
import { SaferReportForm } from "./SaferReportForm";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}

interface AlertRow {
  id: string;
  kind: string;
  status: string;
  description: string | null;
  location_hint: string | null;
  created_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  mediator_user_id: string | null;
}

const KIND_CONFIG: Record<string, { label: string; emoji: string; bg: string; color: string }> = {
  harassment:      { label: "Harcèlement",    emoji: "🛡️", bg: "rgba(239,68,68,0.10)", color: "#DC2626" },
  physical_danger: { label: "Danger physique", emoji: "🚨", bg: "rgba(239,68,68,0.10)", color: "#DC2626" },
  medical:         { label: "Médical",          emoji: "🏥", bg: "rgba(245,158,11,0.12)", color: "#D97706" },
  wellbeing_red:   { label: "Bien-être",        emoji: "💔", bg: "rgba(239,68,68,0.08)", color: "#E11D48" },
  other:           { label: "Autre",             emoji: "❓", bg: "rgba(90,80,70,0.08)",  color: "#7A7060" },
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  open:         { label: "Ouvert",           bg: "rgba(239,68,68,0.10)",   color: "#DC2626" },
  acknowledged: { label: "Pris en charge",   bg: "rgba(245,158,11,0.12)",  color: "#D97706" },
  in_progress:  { label: "En cours",         bg: "rgba(59,130,246,0.10)",  color: "#2563EB" },
  resolved:     { label: "Résolu ✓",         bg: "rgba(16,185,129,0.10)",  color: "#10B981" },
  false_alarm:  { label: "Fausse alerte",    bg: "rgba(90,80,70,0.08)",    color: "#7A7060" },
};

export default async function VolunteerSaferPage({ params }: PageProps) {
  const { orgSlug, eventSlug } = await params;
  const supabase = createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/auth/login?redirect=/v/${orgSlug}/${eventSlug}/safer`);

  const { data: memberships } = await supabase
    .from("memberships")
    .select("role, is_mediator, event:event_id (id, name, slug, organization:organization_id (slug, name))")
    .eq("user_id", userData.user.id)
    .eq("is_active", true)
    .filter("event.slug", "eq", eventSlug)
    .filter("event.organization.slug", "eq", orgSlug);

  const all = (memberships ?? []) as any[];
  if (all.length === 0) notFound();
  const membership = all[0];
  const m = membership as any;
  const isMediator = all.some((mb) => mb.is_mediator === true || mb.role === "direction");

  // Bénévole non-médiateur → formulaire de signalement stylisé
  if (!isMediator) {
    return (
      <div className="flex flex-col" style={{ minHeight: "100%" }}>
        {/* Header */}
        <div
          className="px-5 pt-12 pb-6"
          style={{ background: "#1A3828" }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-1"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            Safer Space
          </p>
          <h1
            className="font-display text-2xl font-bold leading-tight"
            style={{ color: "#FFFFFF" }}
          >
            Signaler une situation
          </h1>
          <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.70)" }}>
            Tu es en sécurité. Ce formulaire est confidentiel.
          </p>
        </div>

        {/* Principes */}
        <div className="px-4 pt-5 pb-2 space-y-3">
          <div
            className="rounded-xl p-4 flex items-start gap-3"
            style={{ background: "#FFFFFF", border: "1px solid #E5DDD0" }}
          >
            <span className="text-xl mt-0.5">🔒</span>
            <div>
              <p className="text-sm font-semibold" style={{ color: "#1A3828" }}>Confidentialité garantie</p>
              <p className="text-xs mt-0.5" style={{ color: "#7A7060" }}>
                Ton signalement est transmis uniquement aux médiateur·ices Safer formé·es.
              </p>
            </div>
          </div>
          <div
            className="rounded-xl p-4 flex items-start gap-3"
            style={{ background: "#FFFFFF", border: "1px solid #E5DDD0" }}
          >
            <span className="text-xl mt-0.5">⚡</span>
            <div>
              <p className="text-sm font-semibold" style={{ color: "#1A3828" }}>Intervention rapide</p>
              <p className="text-xs mt-0.5" style={{ color: "#7A7060" }}>
                Un·e médiateur·ice se rapproche de toi dès que possible.
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 pb-8">
          <SaferReportForm orgSlug={orgSlug} eventSlug={eventSlug} />
        </div>

        {/* Urgence vitale */}
        <div className="mx-4 mb-6 rounded-xl px-4 py-3" style={{ background: "#FEF3C7", border: "1px solid #FCD34D" }}>
          <p className="text-xs font-bold" style={{ color: "#92400E" }}>⚠️ Urgence vitale</p>
          <p className="text-xs mt-1" style={{ color: "#78350F" }}>
            Si quelqu&apos;un est en danger immédiat, appelle le <strong>15</strong> (SAMU) ou <strong>17</strong> (Police).
          </p>
        </div>
      </div>
    );
  }

  // Médiateur / direction → tableau de bord
  const eventId = m.event?.id as string;
  const eventName = m.event?.name as string;
  const orgName = m.event?.organization?.name as string;

  const { data: alerts } = await supabase
    .from("safer_alerts")
    .select("id, kind, status, description, location_hint, created_at, acknowledged_at, resolved_at, mediator_user_id")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = ((alerts as AlertRow[] | null) ?? []);
  const myAlerts = rows.filter((a) => a.mediator_user_id === userData.user!.id);
  const openAlerts = rows.filter((a) => a.status === "open" && a.mediator_user_id === null);
  const otherAlerts = rows.filter((a) => !myAlerts.includes(a) && !openAlerts.includes(a));

  const totalOpen = rows.filter(a => ["open", "acknowledged", "in_progress"].includes(a.status)).length;

  return (
    <div className="flex flex-col" style={{ minHeight: "100%" }}>
      {/* Header médiateur */}
      <div
        className="px-5 pt-12 pb-5"
        style={{ background: "#1A3828" }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-1"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          {orgName} · Médiateur·ice
        </p>
        <h1
          className="font-display text-2xl font-bold leading-tight"
          style={{ color: "#FFFFFF" }}
        >
          Safer Space
        </h1>
        <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
          {eventName}
        </p>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { label: "Mes alertes",   value: myAlerts.length,    bg: "rgba(255,255,255,0.12)" },
            { label: "Ouvertes",      value: openAlerts.length,  bg: openAlerts.length > 0 ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.12)" },
            { label: "En cours",      value: totalOpen,           bg: "rgba(255,255,255,0.12)" },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl px-3 py-2 text-center" style={{ background: stat.bg }}>
              <p className="font-display text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.65)" }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Alertes */}
      <div className="flex-1 px-4 py-5 space-y-5">

        <AlertSection
          title="🔔 Mes alertes assignées"
          alerts={myAlerts}
          emptyText="Aucune alerte ne t'est assignée."
          currentUserId={userData.user!.id}
          orgSlug={orgSlug}
          eventSlug={eventSlug}
        />

        <AlertSection
          title="🚨 Alertes ouvertes"
          alerts={openAlerts}
          emptyText="Aucune alerte ouverte. Espace serein 💚"
          currentUserId={userData.user!.id}
          orgSlug={orgSlug}
          eventSlug={eventSlug}
          highlight
        />

        <AlertSection
          title="📋 Historique récent"
          alerts={otherAlerts}
          emptyText="Pas d'historique sur cet événement."
          compact
          currentUserId={userData.user!.id}
          orgSlug={orgSlug}
          eventSlug={eventSlug}
        />

        {/* Urgence */}
        <div
          className="rounded-xl px-4 py-3"
          style={{ background: "#FEF3C7", border: "1px solid #FCD34D" }}
        >
          <p className="text-xs font-bold" style={{ color: "#92400E" }}>⚠️ Urgence vitale</p>
          <p className="text-xs mt-1" style={{ color: "#78350F" }}>
            Si une situation menace immédiatement quelqu&apos;un, appelle le <strong>15</strong> (SAMU) ou le <strong>17</strong> (Police) avant tout.
          </p>
        </div>
      </div>
    </div>
  );
}

function AlertSection({
  title,
  alerts,
  emptyText,
  compact,
  highlight,
  currentUserId,
  orgSlug,
  eventSlug,
}: {
  title: string;
  alerts: AlertRow[];
  emptyText: string;
  compact?: boolean;
  highlight?: boolean;
  currentUserId: string;
  orgSlug: string;
  eventSlug: string;
}) {
  return (
    <section>
      {/* Divider titre */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex-1 h-px" style={{ background: "#E5DDD0" }} />
        <span className="text-[10px] font-bold uppercase tracking-[0.13em]" style={{ color: "#7A7060" }}>
          {title} ({alerts.length})
        </span>
        <div className="flex-1 h-px" style={{ background: "#E5DDD0" }} />
      </div>

      {alerts.length === 0 ? (
        <p
          className="rounded-xl px-4 py-5 text-center text-xs"
          style={{ background: "#FFFFFF", border: "1px solid #E5DDD0", color: "#7A7060" }}
        >
          {emptyText}
        </p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((a) => (
            <AlertCard
              key={a.id}
              a={a}
              compact={compact}
              highlight={highlight}
              currentUserId={currentUserId}
              orgSlug={orgSlug}
              eventSlug={eventSlug}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function AlertCard({
  a,
  compact,
  highlight,
  currentUserId,
  orgSlug,
  eventSlug,
}: {
  a: AlertRow;
  compact?: boolean;
  highlight?: boolean;
  currentUserId: string;
  orgSlug: string;
  eventSlug: string;
}) {
  const kind = KIND_CONFIG[a.kind] ?? KIND_CONFIG["other"]!;
  const status = STATUS_CONFIG[a.status] ?? STATUS_CONFIG["open"]!;
  const created = new Date(a.created_at);
  const isMine = a.mediator_user_id === currentUserId;
  const isOpen = a.status === "open" && a.mediator_user_id === null;

  return (
    <li
      className="rounded-2xl bg-white overflow-hidden"
      style={{
        boxShadow: highlight && isOpen
          ? "0 2px 12px rgba(239,68,68,0.12)"
          : "0 1px 4px rgba(26,56,40,0.07)",
        border: highlight && isOpen ? "1.5px solid rgba(239,68,68,0.20)" : "1px solid #E5DDD0",
      }}
    >
      <div className="p-4">
        <div className="flex items-start gap-2">
          <span className="text-xl mt-0.5">{kind.emoji}</span>
          <div className="min-w-0 flex-1">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{ background: kind.bg, color: kind.color }}
              >
                {kind.label}
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{ background: status.bg, color: status.color }}
              >
                {status.label}
              </span>
              <time className="text-[10px] ml-auto" style={{ color: "#9A9080" }}>
                {created.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
              </time>
            </div>

            {/* Description */}
            {!compact && a.description && (
              <p className="text-sm leading-relaxed" style={{ color: "#1A1A1A" }}>
                {a.description}
              </p>
            )}

            {/* Lieu */}
            {!compact && a.location_hint && (
              <p className="mt-1 text-xs" style={{ color: "#7A7060" }}>
                📍 {a.location_hint}
              </p>
            )}

            {/* Actions */}
            {!compact && (isMine || isOpen) && (
              <div className="mt-3">
                <SaferAlertActions
                  alertId={a.id}
                  orgSlug={orgSlug}
                  eventSlug={eventSlug}
                  status={a.status}
                  isMine={isMine}
                  isOpen={isOpen}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
