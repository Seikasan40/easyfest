import { formatDateTimeFr } from "@easyfest/shared";
import { createServerClient } from "@/lib/supabase/server";
import { DeleteAlertBtn, ClearHistoryBtn } from "./SaferDeleteBtn";

interface PageProps {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}

export default async function SaferPage({ params }: PageProps) {
  const { orgSlug, eventSlug } = await params;
  const supabase = createServerClient();

  const { data: ev } = await supabase
    .from("events")
    .select("id")
    .eq("slug", eventSlug)
    .maybeSingle();
  if (!ev) return null;

  // Bug #2-3 fix (audit-extreme 3 mai 2026) : embed `reporter:reporter_user_id (raw_user_meta_data)`
  // cassé car FK pointe auth.users (non exposé PostgREST). PGRST200 → data null → "Aucune alerte"
  // alors qu'il y en a (1 open + 2 resolved pour RDL2026 vérifié SQL). Fix : 2 queries séparées.
  const [{ data: alertsRaw, error: alertsErr }, { data: wellbeingRaw, error: wellbeingErr }] =
    await Promise.all([
      supabase
        .from("safer_alerts")
        .select(
          "id, kind, status, description, location_hint, created_at, acknowledged_at, resolved_at, reporter_user_id",
        )
        .eq("event_id", ev.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("wellbeing_reports")
        .select("id, level, comment, created_at, acknowledged_at, reporter_user_id")
        .eq("event_id", ev.id)
        .in("level", ["yellow", "red"])
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  if (alertsErr) console.error("[Safer regie] alerts failed:", alertsErr.message);
  if (wellbeingErr) console.error("[Safer regie] wellbeing failed:", wellbeingErr.message);

  const reporterIds = Array.from(
    new Set([
      ...(alertsRaw ?? []).map((a: any) => a.reporter_user_id).filter(Boolean),
      ...(wellbeingRaw ?? []).map((w: any) => w.reporter_user_id).filter(Boolean),
    ]),
  );

  const { data: profiles } = reporterIds.length
    ? await supabase
        .from("volunteer_profiles")
        .select("user_id, full_name, first_name, last_name, email")
        .in("user_id", reporterIds)
    : { data: [] as any[] };

  const profilesById = new Map<string, any>(
    (profiles ?? []).map((p: any) => [p.user_id, p]),
  );

  const alerts = (alertsRaw ?? []).map((a: any) => ({
    ...a,
    reporter: profilesById.get(a.reporter_user_id) ?? null,
  }));
  const wellbeing = (wellbeingRaw ?? []).map((w: any) => ({
    ...w,
    reporter: profilesById.get(w.reporter_user_id) ?? null,
  }));

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-2xl font-bold">Safer Space</h2>
        <p className="text-sm text-brand-ink/60">
          Suivi des alertes graves et des signaux de bien-être bénévoles.
        </p>
      </header>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-display text-lg font-semibold">🚨 Alertes graves</h3>
          {alerts.some((a: any) => ["resolved", "false_alarm"].includes(a.status)) && (
            <ClearHistoryBtn orgSlug={orgSlug} eventSlug={eventSlug} />
          )}
        </div>
        {alerts.length === 0 ? (
          <p className="rounded-xl bg-wellbeing-green/10 p-4 text-sm">✅ Aucune alerte enregistrée.</p>
        ) : (
          <ul className="space-y-2">
            {alerts.map((a: any) => {
              const reporterName =
                a.reporter?.full_name ??
                [a.reporter?.first_name, a.reporter?.last_name].filter(Boolean).join(" ") ??
                a.reporter?.email ??
                null;
              return (
                <li
                  key={a.id}
                  className={`rounded-2xl border p-4 ${
                    a.status === "open"
                      ? "border-wellbeing-red bg-wellbeing-red/5"
                      : "border-brand-ink/10 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {alertEmoji(a.kind)} {a.kind}
                        {a.location_hint && <span className="ml-2 text-brand-ink/60">· {a.location_hint}</span>}
                      </p>
                      {a.description && (
                        <p className="mt-1 text-sm text-brand-ink/80">{a.description}</p>
                      )}
                      <p className="mt-1 text-xs text-brand-ink/50">
                        {formatDateTimeFr(a.created_at)}
                        {reporterName && <span className="ml-2">· signalé par {reporterName}</span>}
                      </p>
                      <div className="mt-2">
                        <DeleteAlertBtn alertId={a.id} orgSlug={orgSlug} eventSlug={eventSlug} />
                      </div>
                    </div>
                    <span className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusTone(a.status)}`}>
                      {a.status}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-3 font-display text-lg font-semibold">💚 Bien-être (jaune + rouge)</h3>
        {wellbeing.length === 0 ? (
          <p className="rounded-xl bg-wellbeing-green/10 p-4 text-sm">
            ✅ Tout le monde se sent bien (aucun jaune/rouge).
          </p>
        ) : (
          <ul className="space-y-2">
            {wellbeing.map((w: any) => {
              const reporterName =
                w.reporter?.full_name ??
                [w.reporter?.first_name, w.reporter?.last_name].filter(Boolean).join(" ") ??
                w.reporter?.email ??
                null;
              return (
                <li
                  key={w.id}
                  className={`flex items-center justify-between rounded-xl border p-3 text-sm ${
                    w.level === "red"
                      ? "border-wellbeing-red/40 bg-wellbeing-red/5"
                      : "border-wellbeing-yellow/40 bg-wellbeing-yellow/5"
                  }`}
                >
                  <div>
                    <p className="font-medium">
                      {w.level === "red" ? "🆘" : "😐"} {w.level === "red" ? "Détresse" : "Tendu"}
                    </p>
                    {w.comment && <p className="text-xs text-brand-ink/70">{w.comment}</p>}
                    <p className="text-xs text-brand-ink/50">
                      {formatDateTimeFr(w.created_at)}
                      {reporterName && <span className="ml-2">· {reporterName}</span>}
                    </p>
                  </div>
                  {w.acknowledged_at ? (
                    <span className="rounded-full bg-wellbeing-green/15 px-2.5 py-0.5 text-xs font-medium text-wellbeing-green">
                      Pris en compte
                    </span>
                  ) : (
                    <span className="rounded-full bg-wellbeing-red/15 px-2.5 py-0.5 text-xs font-medium text-wellbeing-red">
                      À traiter
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function alertEmoji(kind: string): string {
  return (
    { harassment: "🛑", physical_danger: "⚠️", medical: "🩺", wellbeing_red: "🆘", other: "❗" }[kind] ?? "❗"
  );
}

function statusTone(status: string): string {
  return (
    {
      open: "bg-wellbeing-red/15 text-wellbeing-red",
      acknowledged: "bg-wellbeing-yellow/15 text-wellbeing-yellow",
      in_progress: "bg-[var(--theme-primary,_#FF5E5B)]/15 text-[var(--theme-primary,_#FF5E5B)]",
      resolved: "bg-wellbeing-green/15 text-wellbeing-green",
      false_alarm: "bg-brand-ink/10 text-brand-ink/60",
    }[status] ?? "bg-brand-ink/10 text-brand-ink/60"
  );
}
