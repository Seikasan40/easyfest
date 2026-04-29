/**
 * Edge Function : rgpd_purge
 * Cron mensuel — supprime les PII des bénévoles >12 mois post-event archivé.
 * Appelée par : pg_cron OU Vercel/Netlify scheduled invoke.
 * Auth : header X-Cron-Secret matchant CRON_SECRET.
 *
 * Logique :
 *   1. Pour tous les events avec status='archived' et ends_at < now() - 12 mois,
 *      anonymiser les volunteer_profiles liés (full_name, phone, email, address, diet_notes).
 *   2. Supprimer les volunteer_applications correspondantes >12 mois.
 *   3. Supprimer les notification_log >12 mois.
 *   4. Conserver les audit_log et scan_events (statistiques anonymes seulement).
 */
// deno-lint-ignore-file no-explicit-any
import { createServiceClient } from "../_shared/supabase.ts";

const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const PURGE_DELAY_MONTHS = parseInt(Deno.env.get("RGPD_PURGE_DELAY_MONTHS") ?? "12", 10);

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("method_not_allowed", { status: 405 });
  }

  const cronHeader = req.headers.get("x-cron-secret") ?? "";
  if (!CRON_SECRET || cronHeader !== CRON_SECRET) {
    return new Response("unauthorized", { status: 401 });
  }

  const supabase = createServiceClient();
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - PURGE_DELAY_MONTHS);
  const cutoffIso = cutoff.toISOString();

  const stats = {
    profiles_anonymized: 0,
    applications_deleted: 0,
    notifications_deleted: 0,
    cutoff_date: cutoffIso,
  };

  // 1. Lister les events archivés > cutoff
  const { data: oldEvents } = await supabase
    .from("events")
    .select("id")
    .eq("status", "archived")
    .lt("ends_at", cutoffIso);

  const oldEventIds = (oldEvents ?? []).map((e: any) => e.id);

  if (oldEventIds.length > 0) {
    // 2. Anonymiser volunteer_profiles dont les memberships sont uniquement liés à ces events
    const { data: candidateProfiles } = await supabase
      .from("memberships")
      .select("user_id")
      .in("event_id", oldEventIds);

    const userIds = Array.from(new Set((candidateProfiles ?? []).map((m: any) => m.user_id)));

    for (const userId of userIds) {
      // Vérifier que ce user n'a pas d'autre event actif/récent
      const { data: recentMemberships } = await supabase
        .from("memberships")
        .select("event_id, events:event_id (ends_at, status)")
        .eq("user_id", userId);

      const hasRecent = (recentMemberships ?? []).some((m: any) => {
        const ev = m.events;
        return ev && (ev.status !== "archived" || new Date(ev.ends_at) >= cutoff);
      });

      if (!hasRecent) {
        await supabase
          .from("volunteer_profiles")
          .update({
            full_name: "Bénévole anonymisé",
            first_name: null,
            last_name: null,
            phone: null,
            email: `anon-${userId.substring(0, 8)}@anonymized.local`,
            address_street: null,
            address_city: null,
            address_zip: null,
            diet_notes: null,
            parental_auth_url: null,
            avatar_url: null,
            bio: null,
            notes_admin: null,
          })
          .eq("user_id", userId);
        stats.profiles_anonymized++;
      }
    }

    // 3. Supprimer applications >12 mois
    const { count: appsDeleted } = await supabase
      .from("volunteer_applications")
      .delete({ count: "exact" })
      .in("event_id", oldEventIds);
    stats.applications_deleted = appsDeleted ?? 0;

    // 4. Supprimer notification_log >12 mois
    const { count: notifsDeleted } = await supabase
      .from("notification_log")
      .delete({ count: "exact" })
      .lt("created_at", cutoffIso);
    stats.notifications_deleted = notifsDeleted ?? 0;
  }

  // Audit
  await supabase.from("audit_log").insert({
    action: "rgpd.purge.completed",
    payload: stats as any,
  });

  return new Response(JSON.stringify({ ok: true, stats }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
