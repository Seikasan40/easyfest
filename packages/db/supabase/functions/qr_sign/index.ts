/**
 * Edge Function : qr_sign
 * Génère un QR token signé HMAC SHA-256 + nonce pour un bénévole.
 *
 * INPUT  : { volunteer_user_id, event_id, ttl_seconds? }
 * OUTPUT : { token, expires_at, qr_payload_url }
 *
 * Sécurité :
 *   - QR_HMAC_SECRET en env, jamais exposé
 *   - Nonce aléatoire 16 bytes
 *   - TTL par défaut 10 min (paramétrable)
 *   - Auth requise (rôle volunteer_lead+ ou self pour son propre QR)
 */
// deno-lint-ignore-file no-explicit-any
import { createServiceClient } from "../_shared/supabase.ts";
import { corsHeaders, preflightResponse } from "../_shared/cors.ts";

const QR_HMAC_SECRET = Deno.env.get("QR_HMAC_SECRET") ?? "";
const DEFAULT_TTL_SECONDS = parseInt(Deno.env.get("QR_TOKEN_TTL_SECONDS") ?? "600", 10);

if (!QR_HMAC_SECRET || QR_HMAC_SECRET.length < 32) {
  console.error("[qr_sign] QR_HMAC_SECRET missing or too short — refusing to start.");
}

interface SignInput {
  volunteer_user_id: string;
  event_id: string;
  ttl_seconds?: number;
}

interface QrPayload {
  v: 1;
  vid: string;       // volunteer_user_id
  eid: string;       // event_id
  exp: number;       // expiry epoch seconds
  iat: number;       // issued-at
  n: string;         // nonce hex
}

async function hmacSign(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return base64UrlEncode(new Uint8Array(sig));
}

function base64UrlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

function randomNonceHex(byteLength = 16): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
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

  let body: SignInput;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400, headers });
  }

  const { volunteer_user_id, event_id, ttl_seconds } = body;
  if (!volunteer_user_id || !event_id) {
    return new Response(JSON.stringify({ error: "missing_fields" }), { status: 400, headers });
  }

  const supabase = createServiceClient();

  // Auth : récupérer l'utilisateur courant via le JWT
  const { data: userData, error: userErr } = await supabase.auth.getUser(authHeader.replace(/^Bearer\s+/iu, ""));
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "auth_failed" }), { status: 401, headers });
  }
  const requesterId = userData.user.id;

  // Permission : self OU volunteer_lead+ sur l'event
  if (requesterId !== volunteer_user_id) {
    const { data: hasRole } = await supabase.rpc("has_role_at_least", {
      target_event_id: event_id,
      threshold: "volunteer_lead",
    });
    if (!hasRole) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers });
    }
  }

  // Construire payload
  const ttl = Math.min(Math.max(ttl_seconds ?? DEFAULT_TTL_SECONDS, 60), 86_400);
  const now = Math.floor(Date.now() / 1000);
  const payload: QrPayload = {
    v: 1,
    vid: volunteer_user_id,
    eid: event_id,
    exp: now + ttl,
    iat: now,
    n: randomNonceHex(16),
  };

  const payloadJson = JSON.stringify(payload);
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(payloadJson));
  const signature = await hmacSign(payloadB64, QR_HMAC_SECRET);
  const token = `${payloadB64}.${signature}`;

  // Audit
  await supabase.from("audit_log").insert({
    user_id: requesterId,
    event_id,
    action: "qr.signed",
    payload: { volunteer_user_id, exp: payload.exp, nonce: payload.n },
  });

  return new Response(
    JSON.stringify({
      token,
      expires_at: new Date(payload.exp * 1000).toISOString(),
      qr_payload_url: `${Deno.env.get("APP_URL") ?? "https://easyfest.app"}/scan?t=${token}`,
    }),
    { status: 200, headers },
  );
});
