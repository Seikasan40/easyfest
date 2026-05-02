interface KpiData {
  validatedVolunteers: number;
  pendingApplications: number;
  activeAlerts: number;
  redWellbeing: number;
  arrivalScansToday: number;
  mealsServedToday: number;
}

export function RegieKpis(props: KpiData) {
  return (
    <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      <Kpi label="Bénévoles actifs" value={props.validatedVolunteers} emoji="🎟️" />
      <Kpi
        label="Candidatures à valider"
        value={props.pendingApplications}
        emoji="📥"
        tone={props.pendingApplications ? "warn" : undefined}
      />
      <Kpi
        label="Alertes ouvertes"
        value={props.activeAlerts}
        emoji="🚨"
        tone={props.activeAlerts ? "danger" : undefined}
      />
      <Kpi
        label="Bien-être rouge"
        value={props.redWellbeing}
        emoji="❤️‍🩹"
        tone={props.redWellbeing ? "warn" : undefined}
      />
      <Kpi label="Arrivées aujourd'hui" value={props.arrivalScansToday} emoji="🚪" />
      <Kpi label="Repas servis" value={props.mealsServedToday} emoji="🍽️" />
    </section>
  );
}

function Kpi({
  label,
  value,
  emoji,
  tone,
}: {
  label: string;
  value: number;
  emoji: string;
  tone?: "warn" | "danger";
}) {
  const ring =
    tone === "danger"
      ? "ring-2 ring-wellbeing-red/40"
      : tone === "warn"
        ? "ring-2 ring-wellbeing-yellow/40"
        : "";
  return (
    <div className={`rounded-xl border border-brand-ink/10 bg-white p-4 ${ring}`}>
      <p className="text-2xl">{emoji}</p>
      <p className="mt-1 font-display text-3xl font-bold leading-tight">{value}</p>
      <p className="text-[10px] font-medium uppercase tracking-widest text-brand-ink/50">
        {label}
      </p>
    </div>
  );
}
