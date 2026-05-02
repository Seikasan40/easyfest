import Link from "next/link";

interface Alert {
  id: string;
  kind: string;
  status: string;
  location_hint: string | null;
  created_at: string;
}

interface Props {
  orgSlug: string;
  eventSlug: string;
  alerts: Alert[];
}

const ALERT_EMOJI: Record<string, string> = {
  harassment: "🛑",
  physical_danger: "⚠️",
  medical: "🩺",
  wellbeing_red: "🆘",
  other: "❗",
};

const STATUS_MAP: Record<string, { tone: string; label: string }> = {
  open: { tone: "bg-wellbeing-red/15 text-wellbeing-red", label: "Ouverte" },
  acknowledged: { tone: "bg-wellbeing-yellow/15 text-wellbeing-yellow", label: "Prise" },
  in_progress: { tone: "bg-[var(--theme-primary,_#FF5E5B)]/15 text-[var(--theme-primary,_#FF5E5B)]", label: "En cours" },
  resolved: { tone: "bg-wellbeing-green/15 text-wellbeing-green", label: "Résolue" },
  false_alarm: { tone: "bg-brand-ink/10 text-brand-ink/60", label: "Fausse alerte" },
};

export function RegieAlerts({ orgSlug, eventSlug, alerts }: Props) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold">Alertes safer space</h3>
        <Link
          href={`/regie/${orgSlug}/${eventSlug}/safer`}
          className="text-sm text-[var(--theme-primary,_#FF5E5B)] hover:underline"
        >
          Voir tout →
        </Link>
      </div>
      {alerts.length === 0 ? (
        <div className="rounded-xl bg-wellbeing-green/10 p-4 text-sm">
          ✅ Aucune alerte récente.
        </div>
      ) : (
        <ul className="space-y-2">
          {alerts.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between rounded-xl border border-brand-ink/10 bg-white p-3 text-sm"
            >
              <div>
                <p className="font-medium">
                  {ALERT_EMOJI[a.kind] ?? "❗"} {a.kind}
                  {a.location_hint && ` · ${a.location_hint}`}
                </p>
                <p className="text-xs text-brand-ink/60">
                  {new Date(a.created_at).toLocaleString("fr-FR")}
                </p>
              </div>
              <StatusPill status={a.status} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function StatusPill({ status }: { status: string }) {
  const { tone, label } = STATUS_MAP[status] ?? STATUS_MAP["open"]!;
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>
      {label}
    </span>
  );
}
