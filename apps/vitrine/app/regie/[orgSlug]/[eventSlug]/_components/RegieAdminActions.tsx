import Link from "next/link";

interface Props {
  orgSlug: string;
  eventSlug: string;
  eventId: string;
}

export function RegieAdminActions({ orgSlug, eventSlug }: Props) {
  return (
    <section>
      <h3 className="mb-3 font-display text-lg font-semibold">Actions administratives</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href={`/regie/${orgSlug}/${eventSlug}/prefecture`}
          className="flex min-h-[44px] items-start gap-3 rounded-2xl border border-brand-ink/10 bg-white p-4 transition hover:border-[var(--theme-primary,_#FF5E5B)]/40 hover:shadow-soft active:scale-[0.99]"
          style={{ touchAction: "manipulation" }}
        >
          <span className="text-3xl">📦</span>
          <div className="flex-1">
            <p className="font-display font-semibold">Pack préfecture</p>
            <p className="mt-0.5 text-xs text-brand-ink/60">
              Récap, checklist Cerfa, ZIP des conventions et liste bénévoles.
            </p>
          </div>
          <span className="text-[var(--theme-primary,_#FF5E5B)]">→</span>
        </Link>
        <Link
          href={`/regie/${orgSlug}/${eventSlug}/sponsors`}
          className="flex min-h-[44px] items-start gap-3 rounded-2xl border border-brand-ink/10 bg-white p-4 transition hover:border-[var(--theme-primary,_#FF5E5B)]/40 hover:shadow-soft active:scale-[0.99]"
          style={{ touchAction: "manipulation" }}
        >
          <span className="text-3xl">🤝</span>
          <div className="flex-1">
            <p className="font-display font-semibold">Sponsors & partenaires</p>
            <p className="mt-0.5 text-xs text-brand-ink/60">
              CRM des partenaires, suivi contrats et contreparties.
            </p>
          </div>
          <span className="text-[var(--theme-primary,_#FF5E5B)]">→</span>
        </Link>
        <Link
          href={`/regie/${orgSlug}/${eventSlug}/applications`}
          className="flex min-h-[44px] items-start gap-3 rounded-2xl border border-brand-ink/10 bg-white p-4 transition hover:border-[var(--theme-primary,_#FF5E5B)]/40 hover:shadow-soft active:scale-[0.99]"
          style={{ touchAction: "manipulation" }}
        >
          <span className="text-3xl">📧</span>
          <div className="flex-1">
            <p className="font-display font-semibold">Inviter bénévoles</p>
            <p className="mt-0.5 text-xs text-brand-ink/60">
              Envoie un magic-link aux pré-bénévoles validés pour activer leur compte.
            </p>
          </div>
          <span className="text-[var(--theme-primary,_#FF5E5B)]">→</span>
        </Link>
      </div>
    </section>
  );
}
