import { notFound } from "next/navigation";
import Link from "next/link";

import { formatDateFr } from "@easyfest/shared";

import { SiteFooter, SiteHeader } from "@/components/site-header";
import { createServerClient } from "@/lib/supabase/server";

interface PageProps {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}

export default async function EventPage({ params }: PageProps) {
  const { orgSlug, eventSlug } = await params;
  const supabase = createServerClient();

  const { data: ev } = await supabase
    .from("events")
    .select(`
      id, name, slug, description, starts_at, ends_at, location,
      status, registration_open_at, registration_close_at,
      cover_image_url,
      organization:organization_id (id, name, slug, logo_url)
    `)
    .eq("slug", eventSlug)
    .maybeSingle();

  if (!ev || (ev as any).organization?.slug !== orgSlug) notFound();

  const { data: positions } = await supabase
    .from("positions")
    .select("id, name, slug, description, color, icon, display_order")
    .eq("event_id", ev.id)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  const isOpen = ev.status === "open";
  const closedReason =
    ev.registration_close_at && new Date(ev.registration_close_at) < new Date()
      ? "Les inscriptions sont closes."
      : "Les inscriptions ne sont pas encore ouvertes.";

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      {/* HERO FESTIVAL */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-cream via-brand-cream to-brand-sand/30"
          aria-hidden
        />
        <div
          className="absolute right-10 top-10 -z-10 h-72 w-72 rounded-full bg-brand-coral/15 blur-3xl"
          aria-hidden
        />

        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <Link
            href={`/${orgSlug}`}
            className="text-sm font-medium text-brand-ink/60 transition hover:text-brand-coral"
          >
            ← {(ev as any).organization?.name}
          </Link>

          <div className="mt-6 grid items-end gap-8 md:grid-cols-[2fr_1fr]">
            <div>
              <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">
                {ev.name}
              </h1>
              {ev.description && (
                <p className="mt-4 max-w-2xl text-lg text-brand-ink/70">{ev.description}</p>
              )}
            </div>

            <div className="rounded-2xl border border-brand-ink/10 bg-white/80 p-5 backdrop-blur-sm shadow-soft">
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-widest text-brand-ink/50">
                    Dates
                  </dt>
                  <dd className="mt-0.5 font-medium">
                    {formatDateFr(ev.starts_at)} → {formatDateFr(ev.ends_at)}
                  </dd>
                </div>
                {ev.location && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-widest text-brand-ink/50">
                      Lieu
                    </dt>
                    <dd className="mt-0.5 font-medium">{ev.location}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-widest text-brand-ink/50">
                    Statut
                  </dt>
                  <dd className="mt-1">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                        isOpen
                          ? "bg-wellbeing-green/15 text-wellbeing-green"
                          : "bg-brand-ink/10 text-brand-ink/60"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isOpen ? "animate-pulse bg-wellbeing-green" : "bg-brand-ink/30"
                        }`}
                      />
                      {isOpen ? "Inscriptions ouvertes" : "Inscriptions fermées"}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* POSTES */}
      <section className="bg-white/40 py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">