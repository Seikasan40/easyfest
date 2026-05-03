/**
 * /poste/[orgSlug]/[eventSlug] — Espace responsable de poste.
 *
 * SSR. Lookup :
 * 1. La membership post_lead du user → position_id assignée
 * 2. La position (info)
 * 3. UNION : bénévoles via membership.position_id OU via assignments→shift→position_id
 *
 * Bug #5-6 fix (audit-extreme 3 mai 2026) :
 * - Ligne 79 : embed `profiles:user_id (...)` cassé (pas de FK directe memberships→volunteer_profiles)
 * - Ligne 89 : `shifts.label` n'existe pas (vraie col : `notes`)
 * - Logique : on ignorait les volunteers assignés via `assignments` (Anaïs/Sandy invisibles
 *   alors qu'assignées sur Bar via DnD).
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
  return { title: `Mon poste · ${eventSlug}` };
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

  // (Bug #6 col `label` → `notes`) Shifts du poste — fetché en // pour computed assignment lookup
  const { data: shifts, error: shiftsErr } = await (supabase as any)
    .from("shifts")
    .select("id, starts_at, ends_at, needs_count, notes")
    .eq("position_id", ownMembership.position_id)
    .order("starts_at", { ascending: true });
  if (shiftsErr) console.error("[Poste] shifts failed:", shiftsErr.message);

  const shiftIds = (shifts ?? []).map((s: any) => s.id);

  // Bénévoles assignés via memberships.position_id (statique)
  const { data: membershipRows, error: mErr } = await (supabase as any)
    .from("memberships")
    .select("user_id, role")
    .eq("event_id", eventRow.id)
    .eq("position_id", ownMembership.position_id)
    .eq("is_active", true)
    .eq("role", "volunteer");
  if (mErr) console.error("[Poste] memberships failed:", mErr.message);

  // Bénévoles assignés via assignments → shifts du poste (DnD)
  const { data: assignmentRows, error: aErr } = shiftIds.length
    ? await (supabase as any)
        .from("assignments")
        .select("volunteer_user_id, status")
        .in("shift_id", shiftIds)
        .in("status", ["pending", "validated"])
    : { data: [] as any[], error: null };
  if (aErr) console.error("[Poste] assignments failed:", aErr.message);

  // UNION des user_ids (membership volunteer ∪ assignment)
  const teamUserIds = Array.from(
    new Set([
      ...(membershipRows ?? []).map((m: any) => m.user_id),
      ...(assignmentRows ?? []).map((a: any) => a.volunteer_user_id),
    ]),
  );

  // Fix Bug #5 : 2e query séparée pour les profils (pas d'embed PostgREST cassé)
  const { data: profileRows } = teamUserIds.length
    ? await (supabase as any)
        .from("volunteer_profiles")
        .select("user_id, first_name, last_name, full_name, email, phone, avatar_url")
        .in("user_id", teamUserIds)
    : { data: [] as any[] };

  const profilesByUserId = new Map<string, any>(
    (profileRows ?? []).map((p: any) => [p.user_id, p]),
  );

  const team = teamUserIds.map((uid: string) => {
    const p = profilesByUserId.get(uid) ?? {};
    return { user_id: uid, profile: p };
  });

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
              const p = m.profile ?? {};
              const initials = (p.first_name?.[0] ?? "?") + (p.last_name?.[0] ?? "");
              const displayName =
                p.full_name ??
                [p.first_name, p.last_name].filter(Boolean).join(" ") ??
                p.email ??
                "—";
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
                    <p className="truncate text-sm font-medium">{displayName}</p>
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
                  <p className="text-sm font-medium">{s.notes ?? "Shift"}</p>
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
