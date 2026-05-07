import Link from "next/link";

const DARK = "#1A3828";
const BORDER = "#E5DDD0";
const MUTED = "#7A7060";

interface Props {
  orgSlug: string;
  eventSlug: string;
  eventId: string;
}

export function RegieAdminActions({ orgSlug, eventSlug }: Props) {
  const base = `/regie/${orgSlug}/${eventSlug}`;

  return (
    <section>
      {/* Bouton d'action rapide */}
      <div className="flex gap-2 flex-wrap">
        <Link
          href={`${base}/messages`}
          className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:opacity-80"
          style={{
            background: "#FFFFFF",
            border: `1px solid ${BORDER}`,
            color: DARK,
            boxShadow: "0 1px 4px rgba(26,56,40,0.06)",
          }}
        >
          <span>📣</span>
          <span>Diffuser</span>
        </Link>
      </div>

      {/* Liens rapides */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link
          href={`${base}/applications`}
          className="flex items-center gap-2 rounded-2xl p-3 transition hover:opacity-80"
          style={{
            background: "#FFFFFF",
            border: `1px solid ${BORDER}`,
            boxShadow: "0 1px 4px rgba(26,56,40,0.06)",
          }}
        >
          <span className="text-xl">📥</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: DARK }}>Candidatures</p>
            <p className="text-[10px]" style={{ color: MUTED }}>Valider les inscriptions</p>
          </div>
          <span className="ml-auto text-sm" style={{ color: "#C49A2C" }}>→</span>
        </Link>
        <Link
          href={`${base}/planning`}
          className="flex items-center gap-2 rounded-2xl p-3 transition hover:opacity-80"
          style={{
            background: "#FFFFFF",
            border: `1px solid ${BORDER}`,
            boxShadow: "0 1px 4px rgba(26,56,40,0.06)",
          }}
        >
          <span className="text-xl">📅</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: DARK }}>Planning</p>
            <p className="text-[10px]" style={{ color: MUTED }}>Glisser-déposer équipes</p>
          </div>
          <span className="ml-auto text-sm" style={{ color: "#C49A2C" }}>→</span>
        </Link>
        <Link
          href={`${base}/sponsors`}
          className="flex items-center gap-2 rounded-2xl p-3 transition hover:opacity-80"
          style={{
            background: "#FFFFFF",
            border: `1px solid ${BORDER}`,
            boxShadow: "0 1px 4px rgba(26,56,40,0.06)",
          }}
        >
          <span className="text-xl">🤝</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: DARK }}>Sponsors</p>
            <p className="text-[10px]" style={{ color: MUTED }}>Partenaires & contrats</p>
          </div>
          <span className="ml-auto text-sm" style={{ color: "#C49A2C" }}>→</span>
        </Link>
        <Link
          href={`${base}/safer`}
          className="flex items-center gap-2 rounded-2xl p-3 transition hover:opacity-80"
          style={{
            background: "#FFFFFF",
            border: `1px solid ${BORDER}`,
            boxShadow: "0 1px 4px rgba(26,56,40,0.06)",
          }}
        >
          <span className="text-xl">🛟</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: DARK }}>Safer Space</p>
            <p className="text-[10px]" style={{ color: MUTED }}>Alertes & médiateurs</p>
          </div>
          <span className="ml-auto text-sm" style={{ color: "#C49A2C" }}>→</span>
        </Link>
      </div>
    </section>
  );
}
