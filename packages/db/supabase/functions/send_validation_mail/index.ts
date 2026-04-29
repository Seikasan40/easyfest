/**
 * Edge Function : send_validation_mail
 * Envoie un magic-link de connexion au bénévole dont la candidature vient d'être validée.
 * INPUT  : { application_id }
 * OUTPUT : { ok, message_id }
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

  let body: { application_id: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400, headers });
  }

  if (!body.application_id) {
    return new Response(JSON.stringify({ error: "missing_application_id" }), { status: 400, headers });
  }

  const supabase = createServiceClient();

  const { data: app, error: appErr } = await supabase
    .from("volunteer_applications")
    .select("id, email, first_name, full_name, event_id, status, events:event_id (name, slug, organization:organization_id (slug, name))")
    .eq("id", body.application_id)
    .maybeSingle();

  if (appErr || !app) {
    return new Response(JSON.stringify({ error: "application_not_found" }), { status: 404, headers });
  }

  if (app.status !== "validated") {
    return new Response(JSON.stringify({ error: "application_not_validated" }), { status: 400, headers });
  }

  // Generate magic-link via Supabase Auth admin API
  const orgSlug = (app as any).events?.organization?.slug ?? "icmpaca";
  const eventSlug = (app as any).events?.slug ?? "rdl-2026";
  const redirectTo = `${APP_URL}/v/${orgSlug}/${eventSlug}`;

  const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: app.email,
    options: { redirectTo },
  });

  if (linkErr || !linkData?.properties?.action_link) {
    return new Response(JSON.stringify({ error: "magic_link_failed", details: linkErr?.message }), {
      status: 500,
      headers,
    });
  }

  const eventName = (app as any).events?.name ?? "ton festival";
  const firstName = app.first_name ?? app.full_name.split(" ")[0] ?? "bénévole";

  // Send email via Resend
  const emailResp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `Easyfest <${RESEND_FROM}>`,
      to: app.email,
      subject: `Ta candidature pour ${eventName} est validée 🎉`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1F2233">
          <h1 style="font-size:24px;margin:0 0 16px">Salut ${firstName} 👋</h1>
          <p style="font-size:16px;line-height:1.5">
            Excellente nouvelle : ta candidature de bénévole pour <strong>${eventName}</strong> vient d'être validée par l'équipe.
          </p>
          <p style="font-size:16px;line-height:1.5">
            Clique sur le bouton ci-dessous pour accéder à ton espace bénévole — tu y trouveras ton planning, ton QR code,
            et toutes les infos du festival.
          </p>
          <p style="margin:32px 0">
            <a href="${linkData.properties.action_link}"
               style="display:inline-block;background:#FF5E5B;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600">
              Accéder à mon espace bénévole
            </a>
          </p>
          <p style="font-size:14px;color:#64748b;line-height:1.5">
            Ce lien est valable une seule fois et expire dans 24 heures. Si tu n'as pas demandé cette inscription, ignore ce mail.
          </p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
          <p style="font-size:12px;color:#94a3b8">
            Easyfest — Le festival pro, sans le prix pro.<br>
            <a href="${APP_URL}/legal/privacy" style="color:#94a3b8">Politique de confidentialité</a>
          </p>
        </div>
      `,
    }),
  });

  if (!emailResp.ok) {
    const err = await emailResp.text();
    await supabase.from("notification_log").insert({
      event_id: app.event_id,
      channel: "email",
      template_id: "validation_magic_link",
      subject: `Ta candidature pour ${eventName} est validée`,
      status: "failed",
      error: err.substring(0, 500),
    });
    return new Response(JSON.stringify({ error: "email_send_failed", details: err }), {
      status: 502,
      headers,
    });
  }

  const { id: messageId } = await emailResp.json();

  await supabase.from("notification_log").insert({
    event_id: app.event_id,
    channel: "email",
    template_id: "validation_magic_link",
    subject: `Ta candidature pour ${eventName} est validée`,
    provider_id: messageId,
    status: "sent",
    sent_at: new Date().toISOString(),
  });

  await supabase.from("audit_log").insert({
    event_id: app.event_id,
    action: "application.validated.mail_sent",
    payload: { application_id: app.id, email: app.email, message_id: messageId },
  });

  return new Response(JSON.stringify({ ok: true, message_id: messageId }), { status: 200, headers });
});
