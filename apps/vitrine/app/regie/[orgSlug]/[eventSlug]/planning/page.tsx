import Link from "next/link";

import { createServerClient } from "@/lib/supabase/server";
import { PlanningTeamsBoard } from "./PlanningTeamsBoard";

interface PageProps {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
  searchParams: Promise<{ team?: string }>;
}

export default async function RegiePlanningPage({ params, searchParams }: PageProps) {
  const { orgSlug, eventSlug } = await params;
  const { team: highlightTeamSlug } = await searchParams;
  const supabase = createServerClient();

  const { data: ev } = await supabase
    .from("events")
    .select("id, name")
    .eq("slug", eventSlug)
    .maybeSingle();
  if (!ev) return null;

  // 1. Toutes les équipes (positions actives, ordre)
  const { data: positions } = await supabase
    .from("positions")
    .select("id, name, slug, color, icon, description, display_order, needs_count_default")
    .eq("event_id", ev.id)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  // 2. Tous les bénévoles validés (memberships role=volunteer is_active).
  //
  // ⚠️ Bug #6 fix (audit-extreme retest Phase 4 V2, 3 mai 2026) :
  // l'embed PostgREST `volunteer_profiles!memberships_user_id_fkey` ne
  // fonctionne PAS car aucune FK directe n'existe entre `memberships` et
  // `volunteer_profiles` (les deux tables référencent `auth.users.id`
  // séparément). PostgREST retournait `PGRST200 — Could not find a
  // relationship`, et `data` arrivait à `null` (erreur non destructurée
  // côté JS). Symptôme : `members.length === 0`, donc tous les apps
  // tombaient dans `preVolunteers` → compteur "84 (84 en attente compte)"
  // découplé de la BDD.
  //
  // Fix : on fait 2 queries séparées (memberships + volunteer_profiles
  // par user_id IN list) et on merge JS-side.
  const { data: rawMembers, error: membersErr } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("event_id", ev.id)
    .eq("role", "volunteer")
    .eq("is_active", true);
  if (membersErr) {
    console.error("[planning] members query failed:", membersErr.message);
  }

  const memberUserIds = (rawMembers ?? []).map((m: any) => m.user_id);

  const { data: memberProfilesData } = memberUserIds.length
    ? await supabase
        .from("volunteer_profiles")
        .select("user_id, full_name, first_name, avatar_url, phone, email, is_returning")
        .in("user_id", memberUserIds)
    : { data: [] as any[] };

  const profilesByUserId = new Map<string, any>();
  (memberProfilesData ?? []).forEach((p: any) => {
    profilesByUserId.set(p.user_id, p);
  });

  const members = (rawMembers ?? []).map((m: any) => ({
    user_id: m.user_id,
    profile: profilesByUserId.get(m.user_id) ?? null,
  }));

  const userIds = memberUserIds;

  // 2b. ⚠️ Toutes les memberships actives (tous rôles) pour exclure les non-volunteers
  // (direction, post_lead, volunteer_lead, staff_scan) du pool "à placer".
  // Sinon Pamela (direction) avec une candidature validée à elle-même apparaît comme
  // pending_account=true alors qu'elle a un compte → curseur rouge + faux bouton Inviter.
  //
  // Idem Bug #6 : 2 queries séparées au lieu d'embed PostgREST cassé.
  const { data: allMembershipsRaw } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("event_id", ev.id)
    .eq("is_active", true);

  const allMemberUserIds = Array.from(
    new Set((allMembershipsRaw ?? []).map((m: any) => m.user_id)),
  );

  const { data: allMemberProfiles } = allMemberUserIds.length
    ? await supabase
        .from("volunteer_profiles")
        .select("email")
        .in("user_id", allMemberUserIds)
    : { data: [] as any[] };

  const allMemberEmails = new Set(
    (allMemberProfiles ?? [])
      .map((p: any) => (p.email ?? "").toLowerCase())
      .filter(Boolean),
  );

  // 3. Récupérer les emails des users pour matcher avec volunteer_applications
  const { data: applications } = await supabase
    .from("volunteer_applications")
    .select("email, full_name, first_name, phone, avatar_url, preferred_position_slugs, bio, skills, limitations, arrival_at, departure_at, status")
    .eq("event_id", ev.id)
    .in("status", ["validated", "pending"]);

  // 4. Toutes les assignments actives pour mapper bénévole → position
  const { data: assignments } = await supabase
    .from("assignments")
    .select(`
      id, status, volunteer_user_id, shift_id,
      shift:shift_id (
        id, starts_at, ends_at,
        position:position_id (id, slug, name, event_id)
      )
    `)
    .in("status", ["pending", "validated"]);

  const eventAssignments = (assignments ?? []).filter(
    (a: any) => a.shift?.position?.event_id === ev.id,
  );

  // 5. Construire un index : userEmail → preferred_position_slugs
  const prefByEmail = new Map<string, { slugs: string[]; bio: string | null; arrival_at: string | null; departure_at: string | null }>();
  (applications ?? []).forEach((app: any) => {
    if (!app.email) return;
    const key = app.email.toLowerCase();
    prefByEmail.set(key, {
      slugs: app.preferred_position_slugs ?? [],
      bio: app.bio,
      arrival_at: app.arrival_at,
      departure_at: app.departure_at,
    });
  });

  // 6. Construire la liste de bénévoles avec leurs équipes actuelles + souhaits
  const volunteers = (members ?? []).map((m: any) => {
    const email = (m.profile?.email ?? "").toLowerCase();
    const pref = prefByEmail.get(email);
    const myAssignments = eventAssignments.filter((a: any) => a.volunteer_user_id === m.user_id);
    const positionIds = Array.from(new Set(myAssignments.map((a: any) => a.shift.position.id)));
    // Bug #15 fix : fallback en cascade pour ne jamais afficher "—" tant qu'on a un email.
    const computedName =
      m.profile?.full_name ??
      [m.profile?.first_name, m.profile?.last_name].filter(Boolean).join(" ") ??
      m.profile?.email ??
      "—";
    return {
      user_id: m.user_id,
      full_name: computedName,
      first_name: m.profile?.first_name ?? null,
      avatar_url: m.profile?.avatar_url ?? null,
      phone: m.profile?.phone ?? null,
      email: m.profile?.email ?? null,
      is_returning: m.profile?.is_returning ?? false,
      preferred_slugs: pref?.slugs ?? [],
      bio: pref?.bio ?? null,
      arrival_at: pref?.arrival_at ?? null,
      departure_at: pref?.departure_at ?? null,
      position_ids: positionIds as string[],
      pending_account: false,
      assignments: myAssignments.map((a: any) => ({
        id: a.id,
        shift_id: a.shift_id,
        position_id: a.shift.position.id,
        starts_at: a.shift.starts_at,
        ends_at: a.shift.ends_at,
      })),
    };
  });

  // 6b. Pré-bénévoles : applications validées qui n'ont AUCUNE membership active
  // (tous rôles confondus). Si quelqu'un est direction / post_lead / volunteer_lead,
  // on l'exclut du pool car son compte existe déjà — il n'a pas besoin d'être "invité".
  // Dédup par email : si le même email a plusieurs applications validées, on garde
  // seulement la 1ère (sinon doublons visuels dans le pool).
  const seenEmails = new Set<string>();
  const preVolunteers = (applications ?? [])
    .filter((app: any) => {
      if (app.status !== "validated") return false;
      const email = (app.email ?? "").toLowerCase();
      if (!email) return false;
      if (allMemberEmails.has(email)) return false;
      if (seenEmails.has(email)) return false;
      seenEmails.add(email);
      return true;
    })
    .map((app: any) => ({
      user_id: `pre-${app.email}`,
      full_name: app.full_name ?? app.email ?? "—",
      first_name: app.first_name ?? null,
      avatar_url: app.avatar_url ?? null,
      phone: app.phone ?? null,
      email: app.email ?? null,
      is_returning: false,
      preferred_slugs: app.preferred_position_slugs ?? [],
      bio: app.bio ?? null,
      arrival_at: app.arrival_at ?? null,
      departure_at: app.departure_at ?? null,
      position_ids: [] as string[],
      pending_account: true,
      assignments: [] as any[],
    }));

  const allVolunteers = [...volunteers, ...preVolunteers];

  // 7. Construire les équipes (positions) avec leurs bénévoles
  const teams = (positions ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    color: p.color ?? "#FF5E5B",
    icon: p.icon,
    description: p.description,
    needs_count_default: p.needs_count_default,
    members: allVolunteers.filter((v) => v.position_ids.includes(p.id)),
  }));

  const pool = allVolunteers.filter((v) => v.position_ids.length === 0);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">Planning par équipes</h2>
          <p className="text-sm text-brand-ink/60">
            Glisse un bénévole d'une équipe à l'autre. Ses souhaits exprimés à l'inscription apparaissent
            sur sa carte (pastille verte ✓ si l'équipe correspond, orange ◇ sinon).
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Link
            href={`/regie/${orgSlug}/${eventSlug}/planning/timeline`}
            className="rounded-lg border border-brand-ink/15 px-3 py-1.5 font-medium text-brand-ink/80 hover:bg-brand-ink/5"
          >
            📊 Timeline →
          </Link>
          <Link
            href={`/regie/${orgSlug}/${eventSlug}/planning/shifts`}
            className="rounded-lg border border-brand-ink/15 px-3 py-1.5 font-medium text-brand-ink/80 hover:bg-brand-ink/5"
          >
            Vue par créneaux →
          </Link>
        </div>
      </header>

      <div className="flex gap-3 text-xs text-brand-ink/60">
        <span><strong>{allVolunteers.length}</strong> bénévoles ({preVolunteers.length} en attente compte)</span>
        <span>·</span>
        <span><strong>{pool.length}</strong> en attente d'équipe</span>
        <span>·</span>
        <span><strong>{teams.length}</strong> équipes</span>
      </div>

      <PlanningTeamsBoard
        initialTeams={teams}
        initialPool={pool}
        eventId={ev.id}
        highlightTeamSlug={highlightTeamSlug ?? null}
      />
    </div>
  );
}
