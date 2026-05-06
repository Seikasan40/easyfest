import Link from "next/link";

const DARK = "#1A3828";
const BORDER = "#E5DDD0";
const MUTED = "#7A7060";

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

const KIND_CONFIG: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  harassment:      { label: "Harcèlement",    emoji: "🛡️", color: "#DC2626", bg: "rgba(239,68,68,0.08)" },
  physical_danger: { label: "Danger physique", emoji: "🚨", color: "#DC2626", bg: "rgba(239,68,68,0.08)" },
  medical:         { label: "Médical",          emoji: "🏥", color: "#D97706", bg: "rgba(245,158,11,0.10)" },
  wellbeing_red:   { label: "Bien-être",        emoji: "💔", color: "#E11D48", bg: "rgba(239,68,68,0.06)" },
  other:           { label: "Autre",             emoji: "❓", color: MUTED,     bg: "rgba(90,80,70,0.08)" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  open:         { label: "Ouverte",        color: "#DC2626", bg: "rgba(239,68,68,0.10)" },
  acknowledged: { label: "Prise en charge", color: "#D97706", bg: "rgba(245,158,11,0.12)" },
  in_progress:  { label: "En cours",       color: "#2563EB", bg: "rgba(59,130,246,0.10)" },
  resolved:     { label: "Résolue ✓",     color: "#10B981", bg: "rgba(16,185,129,0.10)" },
  false_alarm:  { label: "Fausse alerte", color: MUTED,     bg: "rgba(90,80,70,0.08)" },
};

export function RegieAlerts({ orgSlug, eventSlug, alerts }: Props) {
  const openCount = alerts.filter((a) => a.status === "open").length;

  return (
    <section>
      {/* Divider titre */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 h-px" style={{ background: BORDER }} />
        <span className="text-[10px] font-bold uppercase tracking-[0.13em]" style={{ color: MUTED }}>
          ALERTES ({alerts.length})
        </span>
        <div className="flex-1 h-px" style={{ background: BORDER }} />
      </div>

      {alerts.length === 0 ? (
        <div
          className="rounded-2xl p-5 text-center"
          style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.20)" }}
        >
          <p className="text-sm font-semibold" style={{ color: "#10B981" }}>
            ✅ Espace serein — aucune alerte récente
          </p>
        </div>
      ) : (
        <>
          {openCount > 0 && (
            <div
              className="rounded-xl px-4 py-3 mb-3 flex items-center gap-2"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)" }}
            >
              <span className="text-sm">🚨</span>
              <p className="text-sm font-semibold" style={{ color: "#DC2626" }}>
                {openCount} alerte{openCount > 1 ? "s" : ""} ouverte{openCount > 1 ? "s" : ""} — intervention requise
              </p>
            </div>
          )}
          <ul className="space-y-2">
            {alerts.map((a) => {
              const kind = KIND_CONFIG[a.kind] ?? KIND_CONFIG["other"]!;
              const status = STATUS_CONFIG[a.status] ?? STATUS_CONFIG["open"]!;
              return (
                <li
                  key={a.id}
                  className="rounded-2xl bg-white overflow-hidden"
                  style={{
                    border: a.status === "open" ? "1.5px solid rgba(239,68,68,0.20)" : `1px solid ${BORDER}`,
                    boxShadow: a.status === "open"
                      ? "0 2px 10px rgba(239,68,68,0.08)"
                      : "0 1px 4px rgba(26,56,40,0.06)",
                  }}
                >
                  <div className="p-3 flex items-start gap-2">
                    <span className="text-xl mt-0.5">{kind.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
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
                          {new Date(a.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                        </time>
                      </div>
                      {a.location_hint && (
                        <p className="text-xs" style={{ color: MUTED }}>
                          📍 {a.location_hint}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <Link
            href={`/regie/${orgSlug}/${eventSlug}/safer`}
            className="mt-3 flex w-full items-center justify-center rounded-xl py-2.5 text-sm font-semibold transition hover:opacity-80"
            style={{ color: DARK, background: "#F8F4EC", border: `1px solid ${BORDER}` }}
          >
            Voir toutes les alertes →
          </Link>
        </>
      )}
    </section>
  );
}
