/**
 * Edge Function : send_validation_mail
 * Envoie un magic-link de connexion au bénévole dont la candidature vient d'être validée.
 * Branding v4 fmono (validé Pamela 2 mai 2026).
 * INPUT  : { application_id }
 * OUTPUT : { ok, message_id }
 */
// deno-lint-ignore-file no-explicit-any
import { createServiceClient } from "../_shared/supabase.ts";
import { corsHeaders, preflightResponse } from "../_shared/cors.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const RESEND_FROM = Deno.env.get("RESEND_FROM_EMAIL") ?? "hello@easyfest.app";
const APP_URL = Deno.env.get("APP_URL") ?? "https://easyfest.app";

/** Squircle coral 64x64 + F crème serif + dot ambre — inline SVG data URI pour rendu garanti Gmail/Outlook/Apple Mail. */
function squircleDataUri(): string {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">' +
    '<rect width="64" height="64" rx="18" ry="18" fill="#FF5E5B"/>' +
    '<text x="50%" y="58%" text-anchor="middle" dominant-baseline="middle" ' +
    'font-family="Georgia, \'Source Serif Pro\', \'Times New Roman\', serif" ' +
    'font-weight="900" font-size="40" fill="#FFF8F0">F</text>' +
    '<circle cx="49" cy="50" r="4" fill="#F4B860"/>' +
    '</svg>';
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildEmailHtml(opts: {
  firstName: string;
  eventName: string;
  magicLink: string;
  appUrl: string;
}): string {
  const firstName = escapeHtml(opts.firstName);
  const eventName = escapeHtml(opts.eventName);
  const magicLink = escapeHtml(opts.magicLink);
  const appUrl = escapeHtml(opts.appUrl);
  const dataUri = squircleDataUri();

  const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
  const SERIF = "Georgia,'Source Serif Pro','Times New Roman',Times,serif";
  const CORAL = "#FF5E5B";
  const AMBER = "#F4B860";
  const INK = "#1A1A1A";
  const CREAM = "#FFF8F0";
  const PINE = "#2D5F4F";
  const BORDER = "#EFE6D9";
  const INK_SOFT = "#4A4A4A";
  const INK_MUTED = "#7A7A7A";

  const preheader = `Ta candidature bénévole pour ${eventName} vient d'être validée — accède à ton espace en un clic.`;

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>Ta candidature pour ${eventName} est validée</title>
</head>
<body style="margin:0;padding:0;background-color:${CREAM};color:${INK};-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:${CREAM};opacity:0;">${preheader}</div>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:${CREAM};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:16px;border:1px solid ${BORDER};overflow:hidden;">

<tr>
<td style="padding:28px 32px 20px 32px;background-color:#FFFFFF;border-bottom:1px solid ${BORDER};">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
<tr>
<td valign="middle" style="width:64px;padding-right:14px;">
<img src="${dataUri}" width="64" height="64" alt="Easyfest" style="display:block;width:64px;height:64px;border:0;outline:0;">
</td>
<td valign="middle" style="font-family:${SERIF};font-weight:900;font-size:28px;line-height:32px;color:${INK};letter-spacing:-0.5px;">
easyfest<span style="color:${AMBER};">.</span>
</td>
</tr>
</table>
</td>
</tr>

<tr>
<td style="background-color:${CORAL};padding:32px 32px 28px 32px;text-align:center;">
<div style="font-family:${FONT};font-size:13px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:${CREAM};opacity:0.92;margin-bottom:10px;">CANDIDATURE VALIDÉE</div>
<div style="font-family:${SERIF};font-size:32px;line-height:36px;font-weight:900;color:#FFFFFF;letter-spacing:-0.5px;">Bienvenue à bord, ${firstName}.</div>
</td>
</tr>

<tr>
<td style="padding:32px 32px 8px 32px;font-family:${FONT};color:${INK};">
<p style="margin:0 0 16px 0;font-size:16px;line-height:24px;color:${INK};">
Excellente nouvelle&nbsp;: l'équipe vient de valider ta candidature de bénévole pour <strong style="color:${INK};">${eventName}</strong>.
</p>
<p style="margin:0 0 24px 0;font-size:16px;line-height:24px;color:${INK_SOFT};">
Tu peux accéder dès maintenant à ton espace bénévole&nbsp;: planning, QR code de scan, infos pratiques, repas, équipe, et tout ce dont tu as besoin pour profiter à fond du festival.
</p>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin:8px auto 8px auto;">
<tr><td align="center" bgcolor="${CORAL}" style="border-radius:12px;background-color:${CORAL};">
<a href="${magicLink}" style="display:inline-block;padding:16px 32px;font-family:${FONT};font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:12px;background-color:${CORAL};letter-spacing:0.2px;">
Accéder à mon espace bénévole&nbsp;→
</a>
</td></tr>
</table>
<p style="margin:24px 0 0 0;font-size:13px;line-height:20px;color:${INK_MUTED};text-align:center;">
Le bouton ne s'ouvre pas&nbsp;? Copie-colle ce lien&nbsp;:<br>
<a href="${magicLink}" style="color:${CORAL};text-decoration:underline;word-break:break-all;">${magicLink}</a>
</p>
</td>
</tr>

<tr>
<td style="padding:24px 32px 8px 32px;">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:${CREAM};border-radius:12px;border:1px solid ${BORDER};">
<tr><td style="padding:20px 24px;font-family:${FONT};color:${INK};">
<div style="font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${PINE};margin-bottom:12px;">Dans ton espace</div>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
<tr><td style="padding:4px 0;font-size:15px;line-height:22px;color:${INK};">📅&nbsp; Ton planning et tes shifts</td></tr>
<tr><td style="padding:4px 0;font-size:15px;line-height:22px;color:${INK};">🎟️&nbsp; Ton QR code d'accès et de scan</td></tr>
<tr><td style="padding:4px 0;font-size:15px;line-height:22px;color:${INK};">🍽️&nbsp; Tes repas et collations bénévole</td></tr>
<tr><td style="padding:4px 0;font-size:15px;line-height:22px;color:${INK};">💬&nbsp; Le tchat de ton équipe et le contact de ton chef·fe</td></tr>
</table>
</td></tr>
</table>
</td>
</tr>

<tr>
<td style="padding:20px 32px 24px 32px;font-family:${FONT};">
<p style="margin:0;font-size:13px;line-height:20px;color:${INK_MUTED};">
🔒 Ce lien est personnel, valable une seule fois et expire sous 24&nbsp;h. Si tu n'es pas à l'origine de cette demande, ignore simplement ce mail.
</p>
</td>
</tr>

<tr>
<td style="background-color:${INK};padding:24px 32px;text-align:center;">
<div style="font-family:${FONT};font-size:11px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;color:${AMBER};margin-bottom:8px;">LE FESTIVAL PRO, SANS LE PRIX PRO</div>
<div style="font-family:${SERIF};font-size:18px;font-weight:900;color:${CREAM};letter-spacing:-0.3px;margin-bottom:14px;">easyfest<span style="color:${AMBER};">.</span></div>
<div style="font-family:${FONT};font-size:12px;line-height:18px;color:#9A9A9A;">
<a href="${appUrl}" style="color:${CREAM};text-decoration:none;">easyfest.app</a>
&nbsp;·&nbsp;
<a href="${appUrl}/legal/privacy" style="color:#9A9A9A;text-decoration:underline;">Confidentialité</a>
&nbsp;·&nbsp;
<a href="${appUrl}/legal/cgu" style="color:#9A9A9A;text-decoration:underline;">CGU</a>
</div>
<div style="font-family:${FONT};font-size:11px;line-height:16px;color:#6B6B6B;margin-top:10px;">
Easyfest — SaaS d'organisation festival · Données hébergées en Union Européenne
</div>
</td>
</tr>

</table>
<div style="height:24px;line-height:24px;font-size:1px;">&nbsp;</div>
</td></tr></table>
</body>
</html>`;
}

function buildEmailText(opts: { firstName: string; eventName: string; magicLink: string; appUrl: string }): string {
  return [
    `Bienvenue à bord, ${opts.firstName}.`,
    ``,
    `Ta candidature de bénévole pour ${opts.eventName} vient d'être validée par l'équipe.`,
    ``,
    `Accède à ton espace bénévole (planning, QR code, repas, équipe, tchat) :`,
    opts.magicLink,
    ``,
    `Ce lien est personnel, valable une seule fois et expire sous 24 h.`,
    `Si tu n'es pas à l'origine de cette demande, ignore ce mail.`,
    ``,
    `— easyfest.`,
    `Le festival pro, sans le prix pro.`,
    `${opts.appUrl}`,
  ].join("\n");
}

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

  const orgSlug = (app as any).events?.organization?.slug ?? "icmpaca";
  const eventSlug = (app as any).events?.slug ?? "rdl-2026";
  const redirectTo = `${APP_URL}/v/${orgSlug}/${eventSlug}`;

  const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: app.email,
    options: { redirectTo },
  });

  if (linkErr || !linkData?.properties?.action_link) {
    return new Response(JSON.stringify({ error: "magic_link_failed", details: linkErr?.message }), { status: 500, headers });
  }

  const eventName = (app as any).events?.name ?? "ton festival";
  const firstName = app.first_name ?? (app.full_name ? app.full_name.split(" ")[0] : "bénévole");
  const magicLink = linkData.properties.action_link;

  const subject = `Ta candidature pour ${eventName} est validée 🎉`;
  const html = buildEmailHtml({ firstName, eventName, magicLink, appUrl: APP_URL });
  const text = buildEmailText({ firstName, eventName, magicLink, appUrl: APP_URL });

  const emailResp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `Easyfest <${RESEND_FROM}>`,
      to: app.email,
      subject,
      html,
      text,
      headers: {
        "List-Unsubscribe": `<mailto:hello@easyfest.app?subject=unsubscribe>, <${APP_URL}/legal/privacy>`,
      },
      tags: [
        { name: "template", value: "validation_magic_link" },
        { name: "brand_version", value: "v4-fmono" },
      ],
    }),
  });

  if (!emailResp.ok) {
    const err = await emailResp.text();
    await supabase.from("notification_log").insert({
      event_id: app.event_id,
      channel: "email",
      template_id: "validation_magic_link",
      subject,
      status: "failed",
      error: err.substring(0, 500),
    });
    return new Response(JSON.stringify({ error: "email_send_failed", details: err }), { status: 502, headers });
  }

  const { id: messageId } = await emailResp.json();

  await supabase.from("notification_log").insert({
    event_id: app.event_id,
    channel: "email",
    template_id: "validation_magic_link",
    subject,
    provider_id: messageId,
    status: "sent",
    sent_at: new Date().toISOString(),
  });

  await supabase.from("audit_log").insert({
    event_id: app.event_id,
    action: "application.validated.mail_sent",
    payload: { application_id: app.id, email: app.email, message_id: messageId, brand_version: "v4-fmono" },
  });

  return new Response(JSON.stringify({ ok: true, message_id: messageId }), { status: 200, headers });
});
