/**
 * Edge Function : trigger_safer_alert
 * Crée une alerte safer + notifie en cascade tous les responsables/régie de l'event.
 * INPUT  : { event_id, kind, description?, location_hint?, geo_lat?, geo_lng? }
 * OUTPUT : { ok, alert_id, notified_count }
 */
// deno-lint-ignore-file no-explicit-any
import { createServiceClient } from "../_shared/supabase.ts";
import { corsHeaders, preflightResponse } from "../_shared/cors.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const RESEND_FROM = Deno.env.get("RESEND_FROM_EMAIL") ?? "hello@easyfest.app";
const APP_URL = Deno.env.get("APP_URL") ?? "https://easyfest.app";

Deno.serve(async (req) => {
  const preflight = preflightResponse(req);
  if (preflight) return preflight;
  const headers = { ...corsHeaders(req.headers.get("origin")), "Content-Type": "application/json" };

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers });
  }

  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers });
  }

  const supabase = createServiceClient();

  const { data: userData } = await supabase.auth.getUser(authHeader.replace(/^Bearer\s+/iu, ""));
  if (!userData?.user) {
    return new Response(JSON.stringify({ error: "auth_failed" }), { status: 401, headers });
  }
  const reporterId = userData.user.id;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400, headers });
  }

  const { event_id, kind, description, location_hint, geo_lat, geo_lng } = body;
  if (!event_id || !kind) {
    return new Response(JSON.stringify({ error: "missing_fields" }), { status: 400, headers });
  }

  // Vérifier que le reporter est membre de l'event
  const { data: membership } = await supabase
    .from("memberships")
    .select("id, role, is_active")
    .eq("user_id", reporterId)
    .eq("event_id", event_id)
    .eq("is_active", true)
    .maybeSingle();

  if (!membership) {
    return new Response(JSON.stringify({ error: "not_member" }), { status: 403, headers });
  }

  // Récupérer event
  const { data: ev } = await supabase
    .from("events")
    .select("id, name, location")
    .eq("id", event_id)
    .maybeSingle();

  if (!ev) {
    return new Response(JSON.stringify({ error: "event_not_found" }), { status: 404, headers });
  }

  // Récupérer reporter (pour mail)
  const { data: reporter } = await supabase
    .from("volunteer_profiles")
    .select("full_name, first_name, phone")
    .eq("user_id", reporterId)
    .maybeSingle();

  // Récupérer tous les responsables/régie de l'event (pour notification)
  const { data: responsibles } = await supabase
    .from("memberships")
    .select(`
      user_id, role,
      profile:volunteer_profiles!memberships_user_id_fkey(email, first_name, phone)
    `)
    .eq("event_id", event_id)
    .eq("is_active", true)
    .in("role", ["direction", "volunteer_lead", "post_lead"]);

  const notifiedIds = (responsibles ?? []).map((r: any) => r.user_id);

  // Créer l'alerte
  const { data: alert, error: alertErr } = await supabase
    .from("safer_alerts")
    .insert({
      event_id,
      reporter_user_id: reporterId,
      kind,
      description: description ?? null,
      location_hint: location_hint ?? null,
      geo_lat: geo_lat ?? null,
      geo_lng: geo_lng ?? null,
      notified_user_ids: notifiedIds,
      status: "open",
    })
    .select("id")
    .single();

  if (alertErr || !alert) {
    return new Response(JSON.stringify({ error: "insert_failed", details: alertErr?.message }), {
      status: 500,
      headers,
    });
  }

  // Audit log
  await supabase.from("audit_log").insert({
    user_id: reporterId,
    event_id,
    action: "safer_alert.triggered",
    payload: { alert_id: alert.id, kind, notified_count: notifiedIds.length },
  });

  // Envoyer un email à chaque responsable (best effort, parallèle)
  const reporterName = reporter?.first_name ?? "Bénévole";
  const reporterPhone = reporter?.phone ?? "non renseigné";
  const subject = `🚨 ALERTE GRAVE — ${ev.name}`;
  const htmlBody = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1F2233">
      <div style="background:#EF4444;color:#fff;padding:16px;border-radius:8px;margin-bottom:24px">
        <h1 style="margin:0;font-size:24px">🚨 ALERTE GRAVE</h1>
        <p style="margin:8px 0 0;opacity:.95">${ev.name} — ${ev.location ?? ""}</p>
      </div>
      <p style="font-size:16px;line-height:1.5">
        <strong>${reporterName}</strong> vient de déclencher une alerte de niveau grave.
      </p>
      <table style="font-size:14px;border-collapse:collapse;margin:16px 0;width:100%">
        <tr><td style="padding:6px 0;color:#64748b">Type</td><td style="padding:6px 0"><strong>${kind}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Lieu indiqué</td><td style="padding:6px 0">${location_hint ?? "non renseigné"}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Description</td><td style="padding:6px 0">${description ?? "—"}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Téléphone reporter</td><td style="padding:6px 0">${reporterPhone}</td></tr>
      </table>
      <p style="margin:24px 0">
        <a href="${APP_URL}/regie/safer/${alert.id}"
           style="display:inline-block;background:#1F2233;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600">
          Ouvrir l'alerte dans la régie →
        </a>
      </p>
      <p style="font-size:13px;color:#64748b;line-height:1.5">
        Numéros d'urgence : <strong>17</strong> (Police) · <strong>15</strong> (SAMU) · <strong>18</strong> (Pompiers) · <strong>112</strong> (général)
      </p>
    </div>
  `;

  const sendPromises = (responsibles ?? [])
    .map((r: any) => r.profile?.email)
    .filter((e: string | null | undefined): e is string => Boolean(e))
    .map((email: string) =>
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `Easyfest Alertes <${RESEND_FROM}>`,
          to: email,
          subject,
          html: htmlBody,
        }),
      })
        .then((r) => r.json())
        .catch((e) => ({ error: e.message })),
    );

  const results = await Promise.allSettled(sendPromises);
  const sentCount = results.filter((r) => r.status === "fulfilled").length;

  return new Response(
    JSON.stringify({
      ok: true,
      alert_id: alert.id,
      notified_count: sentCount,
      total_responsibles: notifiedIds.length,
    }),
    { status: 200, headers },
  );
});
