/**
 * RegieKpis — Grille 2×2 KPI style proto.
 * Fond blanc, valeurs en display serif, sous-texte muted.
 * Les KPIs critiques (alertes, bien-être) ont un accent couleur.
 */

const DARK = "#1A3828";
const BORDER = "#E5DDD0";
const MUTED = "#7A7060";

interface KpiData {
  validatedVolunteers: number;
  pendingApplications: number;
  activeAlerts: number;
  redWellbeing: number;
  arrivalScansToday: number;
  mealsServedToday: number;
}

export function RegieKpis(props: KpiData) {
  const {
    validatedVolunteers,
    pendingApplications,
    activeAlerts,
    redWellbeing,
    arrivalScansToday,
    mealsServedToday,
  } = props;

  return (
    <section className="grid grid-cols-2 gap-3">
      <Kpi
        label="PRÉSENTS"
        value={`${arrivalScansToday}/${validatedVolunteers}`}
        sub={arrivalScansToday > 0 ? `+${arrivalScansToday} ces 60 dernières min` : "En attente d'arrivées"}
        tone="default"
      />
      <Kpi
        label="BILLETS VENDUS"
        value={validatedVolunteers}
        sub={`+${pendingApplications} candidatures`}
        tone="default"
      />
      <Kpi
        label="REPAS DISTRIBUÉS"
        value={`${mealsServedToday}`}
        sub={`${Math.round((mealsServedToday / Math.max(validatedVolunteers, 1)) * 100)} % du quota`}
        tone="default"
      />
      <Kpi
        label="ALERTES OUVERTES"
        value={activeAlerts + redWellbeing}
        sub={activeAlerts + redWellbeing > 0 ? "à traiter" : "Espace serein ✓"}
        tone={activeAlerts + redWellbeing > 0 ? "danger" : "default"}
      />
    </section>
  );
}

function Kpi({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "default" | "warn" | "danger";
}) {
  const subColor =
    tone === "danger"
      ? "#EF4444"
      : tone === "warn"
        ? "#C49A2C"
        : MUTED;

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: "#FFFFFF",
        border: `1px solid ${BORDER}`,
        boxShadow: "0 1px 4px rgba(26,56,40,0.06)",
      }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1" style={{ color: MUTED }}>
        {label}
      </p>
      <p className="font-display text-3xl font-bold leading-tight" style={{ color: DARK }}>
        {value}
      </p>
      {sub && (
        <p className="text-xs mt-1" style={{ color: subColor }}>
          {sub}
        </p>
      )}
    </div>
  );
}
