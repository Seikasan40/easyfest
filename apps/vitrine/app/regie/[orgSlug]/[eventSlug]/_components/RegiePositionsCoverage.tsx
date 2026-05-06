import Link from "next/link";

const DARK = "#1A3828";
const BORDER = "#E5DDD0";
const MUTED = "#7A7060";

interface Position {
  id: string;
  slug: string;
  name: string;
  color: string;
  icon: string | null;
  shifts: { id: string; needs_count: number | null }[] | null;
}

interface Props {
  orgSlug: string;
  eventSlug: string;
  positions: Position[];
}

export function RegiePositionsCoverage({ orgSlug, eventSlug, positions }: Props) {
  const planningHref = `/regie/${orgSlug}/${eventSlug}/planning`;

  return (
    <section>
      {/* Divider titre */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 h-px" style={{ background: BORDER }} />
        <span className="text-[10px] font-bold uppercase tracking-[0.13em]" style={{ color: MUTED }}>
          POSTES ({positions.length})
        </span>
        <div className="flex-1 h-px" style={{ background: BORDER }} />
      </div>

      {positions.length === 0 ? (
        <div
          className="rounded-2xl p-5 text-center"
          style={{ background: "#FFFFFF", border: `1px dashed ${BORDER}` }}
        >
          <p className="text-sm" style={{ color: MUTED }}>
            Aucun poste défini. Crée tes équipes depuis le planning.
          </p>
          <Link
            href={planningHref}
            className="mt-2 inline-block text-sm font-semibold"
            style={{ color: DARK }}
          >
            Créer des postes →
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            {positions.map((p) => {
              const totalNeeds = (p.shifts ?? []).reduce(
                (s, sh) => s + (sh.needs_count ?? 0),
                0,
              );
              const shiftCount = (p.shifts ?? []).length;
              const href = `/regie/${orgSlug}/${eventSlug}/planning?team=${p.slug}`;

              // Derive a soft background from the position color
              const colorHex = p.color ?? "#1A3828";

              return (
                <Link
                  key={p.id}
                  href={href}
                  className="group block rounded-2xl overflow-hidden transition hover:opacity-80 active:scale-[0.98]"
                  style={{
                    background: "#FFFFFF",
                    border: `1px solid ${BORDER}`,
                    boxShadow: "0 1px 4px rgba(26,56,40,0.06)",
                    borderLeft: `4px solid ${colorHex}`,
                  }}
                >
                  <div className="p-3">
                    {/* Row 1 : icon + name */}
                    <div className="flex items-center gap-1.5 mb-2">
                      {p.icon && (
                        <span className="text-base leading-none">{p.icon}</span>
                      )}
                      <p
                        className="font-semibold text-sm leading-tight truncate flex-1"
                        style={{ color: DARK }}
                      >
                        {p.name}
                      </p>
                    </div>

                    {/* Row 2 : badges */}
                    <div className="flex flex-wrap items-center gap-1">
                      {/* Besoins badge */}
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                        style={{
                          background: `${colorHex}1A`,
                          color: colorHex,
                        }}
                      >
                        {totalNeeds} place{totalNeeds !== 1 ? "s" : ""}
                      </span>
                      {/* Créneaux badge */}
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                        style={{
                          background: "rgba(26,56,40,0.06)",
                          color: MUTED,
                        }}
                      >
                        {shiftCount} créneau{shiftCount !== 1 ? "x" : ""}
                      </span>
                    </div>

                    {/* Row 3 : arrow link */}
                    <div className="mt-2 flex items-center justify-end">
                      <span
                        className="text-xs font-semibold"
                        style={{ color: "#C49A2C" }}
                      >
                        Voir →
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Lien planning complet */}
          <Link
            href={planningHref}
            className="mt-3 flex w-full items-center justify-center rounded-xl py-2.5 text-sm font-semibold transition hover:opacity-80"
            style={{ color: DARK, background: "#F8F4EC", border: `1px solid ${BORDER}` }}
          >
            Gérer tout le planning →
          </Link>
        </>
      )}
    </section>
  );
}
