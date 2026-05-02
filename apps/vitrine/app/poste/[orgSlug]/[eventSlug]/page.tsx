/**
 * /poste/[orgSlug]/[eventSlug] — Espace responsable de poste.
 *
 * SSR. Lookup :
 * 1. La membership post_lead du user → position_id assignée
 * 2. La position (info)
 * 3. Les bénévoles affectés à cette position via leur membership.position_id
 *
 * Visualisation focused : équipe + shifts du poste, pas tout le festival.
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { eventSlug } = await params;
  return { title: `Mon poste · ${eventSlug} — Easyfest` };
}

export default async function PostePage({ params }: PageProps) {
  const { orgSlug, eventSlug } = await params;
  const supabase = createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: ev } = await supabase
    .from("events")
    .select("id, name, slug")
    .eq("slug", eventSlug)
    .maybeSingle();

  if (!ev) notFound();
  const eventRow: any = ev;

  // Membership post_lead du user (post_lead.position_id = poste qu'il/elle gère)
  const { data: ownMembership } = await (supabase as any)
    .from("memberships")
    .select("role, position_id")
    .eq("user_id", user.id)
    .eq("event_id", eventRow.id)
    .eq("is_active", true)
    .order("role", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!ownMembership || !ownMembership.position_id) {
    return (
      <main>
        <h2 className="font-display text-2xl font-bold">Aucun poste assigné</h2>
        <p className="mt-2 text-sm text-brand-ink/70">
          Tu es responsable de poste mais aucun poste ne t'a encore été affecté. Contacte la régie.
        </p>
        <Link href="/hub" className="mt-4 inline-block rounded-xl border border-brand-ink/15 px-4 py-2 text-sm hover:bg-brand-ink/5">
          ← Retour
        </Link>
      </main>
    );
  }

  // Info du poste
  const { data: position } = await (supabase as any)
    .from("positions")
    .select("id, slug, name, color, icon, description")
    .eq("id", ownMembership.position_id)
    .maybeSingle();

  // Bénévoles assignés à ce poste
  const { data: teamMemberships } = await (supabase as any)
    .from("memberships")
    .select("user_id, role, profiles:user_id (id, first_name, last_name, full_name, email, phone, avatar_url)")
    .eq("event_id", eventRow.id)
    .eq("position_id", ownMembership.position_id)
    .eq("is_active", true);

  const team = (teamMemberships ?? []).filter((m: any) => m.role === "volunteer");

  // Shifts du poste
  const { data: shifts } = await (supabase as any)
    .from("shifts")
    .select("id, starts_at, ends_at, needs_count, label")
    .eq("position_id", ownMembership.position_id)
    .order("starts_at", { ascending: true });

  const dateFmt = (d?: string | null) =>
    d ? new Date(d).toLocaleString("fr-FR", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

  const pos = position ?? { name: "Poste", color: "#FF5E5B", icon: "📍", description: null };

  return (
    <main className="space-y-6">
      <header className="rounded-2xl border border-brand-ink/10 bg-white p-5">
        <div className="flex items-center gap-3">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl text-3xl"
            style={{ background: `${pos.color}15`, color: pos.color }}
          >
            {pos.icon ?? "📍"}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-ink/55">Mon poste</p>
            <h2 className="font-display text-2xl font-bold tracking-tight" style={{ color: pos.color ?? "var(--theme-primary, #FF5E5B)" }}>
              {pos.name}
            </h2>
          </div>
        </div>
        {pos.description && (
          <p className="mt-3 text-sm text-brand-ink/70">{pos.description}</p>
        )}
      </header>

      {/* Équipe */}
      <section>
        <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
          <span aria-hidden="true">👥</span> Mon équipe
          <span className="ml-1 rounded-full bg-brand-ink/10 px-2 py-0.5 text-xs font-medium text-brand-ink/70">
            {team.length}
          </span>
        </h3>
        {team.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-brand-ink/15 bg-white p-5 text-sm text-brand-ink/55">
            Aucun bénévole assigné à ton poste pour le moment. La régie peut affecter des bénévoles depuis le planning.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {team.map((m: any) => {
              const p = m.profiles ?? {};
              const initials = (p.first_name?.[0] ?? "?") + (p.last_name?.[0] ?? "");
              return (
                <article key={m.user_id} className="flex items-center gap-3 rounded-2xl border border-brand-ink/10 bg-white p-3">
                  {p.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--theme-primary,_#FF5E5B)]/15 text-sm font-semibold uppercase text-[var(--theme-primary,_#FF5E5B)]">
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.full_name ?? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()}</p>
                    <div className="flex flex-wrap gap-x-3 text-xs text-brand-ink/60">
                      {p.phone && <a href={`tel:${p.phone}`} className="hover:text-[var(--theme-primary,_#FF5E5B)]">📞 {p.phone}</a>}
                      {p.email && <a href={`mailto:${p.email}`} className="truncate hover:text-[var(--theme-primary,_#FF5E5B)]">✉️ {p.email}</a>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Shifts */}
      <section>
        <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
          <span aria-hidden="true">⏰</span> Shifts du poste
          <span className="ml-1 rounded-full bg-brand-ink/10 px-2 py-0.5 text-xs font-medium text-brand-ink/70">
            {(shifts ?? []).length}
          </span>
        </h3>
        {(!shifts || shifts.length === 0) ? (
          <p className="rounded-2xl border border-dashed border-brand-ink/15 bg-white p-5 text-sm text-brand-ink/55">
            Aucun shift planifié pour ce poste.
          </p>
        ) : (
          <ul className="space-y-2">
            {shifts.map((s: any) => (
              <li key={s.id} className="flex items-center justify-between gap-3 rounded-2xl border border-brand-ink/10 bg-white p-3">
                <div>
                  <p className="text-sm font-medium">{s.label ?? "Shift"}</p>
                  <p className="text-xs text-brand-ink/60">
                    {dateFmt(s.starts_at)} → {dateFmt(s.ends_at)}
                  </p>
                </div>
                <span className="rounded-full bg-[var(--theme-primary,_#FF5E5B)]/10 px-2 py-0.5 text-xs font-medium text-[var(--theme-primary,_#FF5E5B)]">
                  {s.needs_count} besoin{s.needs_count > 1 ? "s" : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="pt-2">
        <Link
          href={`/v/${orgSlug}/${eventSlug}/feed`}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--theme-primary,_#FF5E5B)] px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:opacity-90"
          style={{ touchAction: "manipulation" }}
        >
          💬 Tchat équipe →
        </Link>
      </div>
    </main>
  );
}
