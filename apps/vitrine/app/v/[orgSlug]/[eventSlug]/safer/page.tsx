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

const KIND_LABEL: Record<string, { label: string; emoji: string; tone: string }> = {
  harassment: { label: "Harcèlement", emoji: "🛡️", tone: "bg-red-100 text-red-800" },
  physical_danger: { label: "Danger physique", emoji: "🚨", tone: "bg-red-100 text-red-800" },
  medical: { label: "Médical", emoji: "🏥", tone: "bg-amber-100 text-amber-800" },
  wellbeing_red: { label: "Bien-être rouge", emoji: "💔", tone: "bg-rose-100 text-rose-800" },
  other: { label: "Autre", emoji: "❓", tone: "bg-slate-100 text-slate-700" },
};

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  open: { label: "Ouvert", tone: "bg-red-100 text-red-700" },
  acknowledged: { label: "Pris en charge", tone: "bg-amber-100 text-amber-700" },
  in_progress: { label: "En cours", tone: "bg-blue-100 text-blue-700" },
  resolved: { label: "Résolu", tone: "bg-emerald-100 text-emerald-700" },
  false_alarm: { label: "Fausse alerte", tone: "bg-slate-100 text-slate-600" },
};

export default async function VolunteerSaferPage({ params }: PageProps) {
  const { orgSlug, eventSlug } = await params;
  const supabase = createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/auth/login?redirect=/v/${orgSlug}/${eventSlug}/safer`);

  // ⚠️ Multi-memberships safe : un user peut avoir 2+ rôles actifs sur même event (cas Sandy : volunteer + volunteer_lead).
  // On agrège is_mediator/direction OR sur toutes les memberships actives.
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
  // Plus de redirect : les bénévoles non-médiateurs voient le formulaire de signalement.

  const eventId = m.event?.id as string;
  const eventName = m.event?.name as string;

  // Bénévole non-médiateur → formulaire de signalement uniquement
  if (!isMediator) {
    return <SaferReportForm orgSlug={orgSlug} eventSlug={eventSlug} />;
  }

  // Médiateur / direction → tableau de bord des alertes
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

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--theme-primary,_#FF5E5B)]">
          Médiateur·ice Safer Space
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold leading-tight">{eventName}</h1>
        <p className="mt-2 text-sm text-brand-ink/70">
          Tu es désigné·e comme médiateur·ice Safer pour cet événement. Cette page liste les alertes en cours et celles qui te sont assignées.
        </p>
      </header>

      <SectionGroup
        title="🔔 Mes alertes assignées"
        alerts={myAlerts}
        emptyText="Aucune alerte ne t'est assignée pour le moment."
        currentUserId={userData.user.id}
        orgSlug={orgSlug}
        eventSlug={eventSlug}
      />
      <SectionGroup
        title="🚨 Alertes ouvertes (à prendre en charge)"
        alerts={openAlerts}
        emptyText="Aucune alerte ouverte. Espace serein 💚"
        currentUserId={userData.user.id}
        orgSlug={orgSlug}
        eventSlug={eventSlug}
      />
      <SectionGroup
        title="📋 Historique récent"
        alerts={otherAlerts}
        emptyText="Pas d'historique sur cet événement."
        compact
        currentUserId={userData.user.id}
        orgSlug={orgSlug}
        eventSlug={eventSlug}
      />

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">⚠️ Urgence vitale</p>
        <p className="mt-1 text-xs">
          Si une situation menace immédiatement quelqu&apos;un, appelle le 15 (SAMU) ou le 17 (Police) avant tout. Cette page n&apos;est pas une ligne directe d&apos;urgence.
        </p>
      </div>
    </div>
  );
}

function SectionGroup({
  title,
  alerts,
  emptyText,
  compact,
  currentUserId,
  orgSlug,
  eventSlug,
}: {
  title: string;
  alerts: AlertRow[];
  emptyText: string;
  compact?: boolean;
  currentUserId: string;
  orgSlug: string;
  eventSlug: string;
}) {
  return (
    <section>
      <h2 className="mb-2 font-display text-base font-bold text-brand-ink">
        {title} <span className="text-sm font-normal text-brand-ink/50">({alerts.length})</span>
      </h2>
      {alerts.length === 0 ? (
        <p className="rounded-lg border border-brand-ink/10 bg-white px-4 py-6 text-center text-xs text-brand-ink/55">
          {emptyText}
        </p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((a) => (
            <AlertCard
              key={a.id}
              a={a}
              compact={compact}
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
  currentUserId,
  orgSlug,
  eventSlug,
}: {
  a: AlertRow;
  compact?: boolean;
  currentUserId: string;
  orgSlug: string;
  eventSlug: string;
}) {
  const kind = KIND_LABEL[a.kind] ?? KIND_LABEL["other"]!;
  const status = STATUS_LABEL[a.status] ?? STATUS_LABEL["open"]!;
  const created = new Date(a.created_at);
  const isMine = a.mediator_user_id === currentUserId;
  const isOpen = a.status === "open" && a.mediator_user_id === null;
  return (
    <li className="rounded-xl border border-brand-ink/10 bg-white p-3 shadow-sm">
      <div className="flex items-start gap-2">
        <span aria-hidden className="text-xl">{kind.emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${kind.tone}`}>{kind.label}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${status.tone}`}>{status.label}</span>
            <span className="text-[10px] text-brand-ink/50">
              {created.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
            </span>
          </div>
          {!compact && a.description && (
            <p className="mt-1.5 text-xs leading-relaxed text-brand-ink/80">{a.description}</p>
          )}
          {!compact && a.location_hint && (
            <p className="mt-0.5 text-[10px] text-brand-ink/60">📍 {a.location_hint}</p>
          )}
          {!compact && (isMine || isOpen) && (
            <SaferAlertActions
              alertId={a.id}
              orgSlug={orgSlug}
              eventSlug={eventSlug}
              status={a.status}
              isMine={isMine}
              isOpen={isOpen}
            />
          )}
        </div>
      </div>
    </li>
  );
}
