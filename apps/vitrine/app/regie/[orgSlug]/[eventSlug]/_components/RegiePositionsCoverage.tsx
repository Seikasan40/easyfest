import Link from "next/link";

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
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold">Couverture des postes</h3>
        <Link
          href={`/regie/${orgSlug}/${eventSlug}/planning`}
          className="text-sm text-[var(--theme-primary,_#FF5E5B)] hover:underline"
        >
          Tout le planning →
        </Link>
      </div>
      {positions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-brand-ink/15 p-4 text-sm text-brand-ink/60">
          Aucun poste défini. Crée tes équipes depuis le planning.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {positions.map((p) => {
            const totalNeeds = (p.shifts ?? []).reduce(
              (s, sh) => s + (sh.needs_count ?? 0),
              0,
            );
            const href = `/regie/${orgSlug}/${eventSlug}/planning?team=${p.slug}`;
            return (
              <Link
                key={p.id}
                href={href}
                aria-label={`Voir l'équipe ${p.name} (${totalNeeds} besoins)`}
                className="group block min-h-[44px] rounded-xl border border-brand-ink/10 bg-white p-4 transition hover:border-[var(--theme-primary,_#FF5E5B)]/40 hover:shadow-soft active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary,_#FF5E5B)]/60"
                style={{
                  borderLeft: `4px solid ${p.color}`,
                  touchAction: "manipulation",
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {p.icon && <span className="text-lg">{p.icon}</span>}
                    <p className="truncate font-medium">{p.name}</p>
                  </div>
                  <span
                    aria-hidden
                    className="flex-none text-brand-ink/30 transition group-hover:text-[var(--theme-primary,_#FF5E5B)]"
                  >
                    →
                  </span>
                </div>
                <p className="mt-2 text-xs text-brand-ink/60">
                  Besoins cumulés : <strong>{totalNeeds}</strong>
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
