import Link from "next/link";

import { createServerClient } from "@/lib/supabase/server";

interface PageProps {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}

export default async function PlanSitePage({ params }: PageProps) {
  const { orgSlug, eventSlug } = await params;
  const supabase = createServerClient();

  const { data: ev } = await supabase
    .from("events")
    .select("id, name, location, site_plan_url, site_plan_dark_url, site_plan_caption")
    .eq("slug", eventSlug)
    .maybeSingle();

  if (!ev) return null;

  return (
    <div className="space-y-4">
      <Link
        href={`/v/${orgSlug}/${eventSlug}`}
        className="inline-flex items-center gap-1 text-xs text-brand-ink/60 hover:text-[var(--theme-primary,_#FF5E5B)]"
      >
        ← Retour
      </Link>

      <header>
        <h1 className="font-display text-2xl font-bold">Plan du site</h1>
        <p className="text-sm text-brand-ink/60">
          {ev.name}
          {(ev as any).location && <> · {(ev as any).location}</>}
        </p>
      </header>

      {ev.site_plan_url ? (
        <figure className="overflow-hidden rounded-2xl border border-brand-ink/10 bg-white shadow-soft">
          <img
            src={ev.site_plan_url}
            alt={`Plan ${ev.name}`}
            className="h-auto w-full"
          />
          {ev.site_plan_caption && (
            <figcaption className="border-t border-brand-ink/10 bg-brand-cream/30 p-3 text-xs text-brand-ink/70">
              {ev.site_plan_caption}
            </figcaption>
          )}
        </figure>
      ) : (
        <div className="rounded-2xl border border-dashed border-brand-ink/15 bg-brand-cream/40 p-8 text-center">
          <p className="text-3xl">🗺️</p>
          <p className="mt-2 font-medium">Plan pas encore disponible</p>
          <p className="mt-1 text-sm text-brand-ink/60">
            La régie travaille dessus, il sera publié avant le festival.
          </p>
        </div>
      )}

      <section className="rounded-xl bg-brand-cream/30 p-4 text-sm">
        <h2 className="mb-2 font-display font-semibold">📍 Repères clés sur le site</h2>
        <ul className="space-y-1 text-brand-ink/80">
          <li>🎵 <strong>Scène + Backline</strong> — coin nord, à droite des loges</li>
          <li>🎤 <strong>Loges artistes</strong> — proche scène (accès staff)</li>
          <li>🍻 <strong>Bar</strong> — centre site, sous chapiteau</li>
          <li>🍔 <strong>Foodtrucks</strong> — entrée ouest</li>
          <li>🎨 <strong>Village exposants & ateliers</strong> — sud-ouest</li>
          <li>🎟️ <strong>Billetterie & scan</strong> — entrée sud</li>
          <li>⛺ <strong>Camping</strong> — est, derrière la zone publique</li>
          <li>🅿️ <strong>Parking & camping-cars</strong> — extrême est</li>
        </ul>
      </section>
    </div>
  );
}
