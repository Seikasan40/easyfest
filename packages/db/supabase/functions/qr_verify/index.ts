/**
 * Edge Function : qr_verify
 * Vérifie un QR token signé, détecte le rejouage, log un scan_event.
 *
 * INPUT  : { token, scan_kind, context? }
 * OUTPUT : {
 *   ok: boolean,
 *   replay: boolean,
 *   volunteer: { user_id, full_name, position_name, meals_remaining, ... },
 *   first_scanned_at?: string  // si replay
 * }
 *
 * Sécurité :
 *   - Vérif signature HMAC
 *   - Vérif expiration
 *   - Vérif nonce non-réutilisé pour la même action
 *   - Auth requise + rôle staff_scan ou flag is_entry_scanner
 */
// deno-lint-ignore-file no-explicit-any
import { createServiceClient } from "../_shared/supabase.ts";
import { corsHeaders, preflightResponse } from "../_shared/cors.ts";

const QR_HMAC_SECRET = Deno.env.get("QR_HMAC_SECRET") ?? "";

interface VerifyInput {
  token: string;
  scan_kind: "arrival" | "meal" | "post_take" | "exit";
  context?: Record<string, unknown>;
}

interface QrPayload {
  v: 1;
  vid: string;
  eid: string;
  exp: number;
  iat: number;
  n: string;
}

function base64UrlDecode(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
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

async function verifyToken(token: string): Promise<{ ok: boolean; payload?: QrPayload; reason?: string }> {
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, reason: "malformed" };
  const [payloadB64, signature] = parts;

  const expected = await hmacSign(payloadB64, QR_HMAC_SECRET);
  if (signature !== expected) return { ok: false, reason: "bad_signature" };

  let payload: QrPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)));
  } catch {
    return { ok: false, reason: "bad_payload" };
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) return { ok: false, reason: "expired" };
  if (payload.v !== 1) return { ok: false, reason: "version" };

  return { ok: true, payload };
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

  let body: VerifyInput;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400, headers });
  }

  const { token, scan_kind, context } = body;
  if (!token || !scan_kind) {
    return new Response(JSON.stringify({ error: "missing_fields" }), { status: 400, headers });
  }

  const supabase = createServiceClient();

  // Auth : qui scanne ?
  const { data: userData } = await supabase.auth.getUser(authHeader.replace(/^Bearer\s+/iu, ""));
  if (!userData?.user) {
    return new Response(JSON.stringify({ error: "auth_failed" }), { status: 401, headers });
  }
  const scannerId = userData.user.id;

  // Vérifier signature + expiration
  const { ok, payload, reason } = await verifyToken(token);
  if (!ok || !payload) {
    return new Response(JSON.stringify({ ok: false, error: reason ?? "invalid_token" }), {
      status: 400,
      headers,
    });
  }

  // Vérifier que le scanner a le droit de scanner sur cet event
  const { data: hasStaffRole } = await supabase
    .from("memberships")
    .select("role, is_entry_scanner")
    .eq("user_id", scannerId)
    .eq("event_id", payload.eid)
    .eq("is_active", true)
    .maybeSingle();

  if (!hasStaffRole) {
    return new Response(JSON.stringify({ error: "forbidden_no_membership" }), { status: 403, headers });
  }

  const canScan =
    ["direction", "volunteer_lead", "staff_scan"].includes(hasStaffRole.role) ||
    (scan_kind === "arrival" && hasStaffRole.is_entry_scanner) ||
    (scan_kind === "post_take" && hasStaffRole.role === "post_lead");

  if (!canScan) {
    return new Response(JSON.stringify({ error: "forbidden_role_kind" }), { status: 403, headers });
  }

  // Détection rejouage : nonce déjà utilisé pour la même action ?
  const { data: existingScan } = await supabase
    .from("scan_events")
    .select("id, scanned_at")
    .eq("event_id", payload.eid)
    .eq("volunteer_user_id", payload.vid)
    .eq("scan_kind", scan_kind)
    .eq("qr_nonce", payload.n)
    .maybeSingle();

  // Pour 'arrival' : un seul scan jamais — rejouage si déjà scanné dans la journée
  let isReplay = false;
  let firstScannedAt: string | null = null;
  if (scan_kind === "arrival") {
    const { data: anyArrival } = await supabase
      .from("scan_events")
      .select("scanned_at")
      .eq("event_id", payload.eid)
      .eq("volunteer_user_id", payload.vid)
      .eq("scan_kind", "arrival")
      .order("scanned_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (anyArrival) {
      isReplay = true;
      firstScannedAt = anyArrival.scanned_at;
    }
  } else if (existingScan) {
    isReplay = true;
    firstScannedAt = existingScan.scanned_at;
  }

  // Toujours logger le scan (même replay)
  await supabase.from("scan_events").insert({
    event_id: payload.eid,
    volunteer_user_id: payload.vid,
    scanned_by: scannerId,
    scan_kind,
    qr_token: token.substring(0, 32) + "...",
    qr_nonce: payload.n,
    is_replay: isReplay,
    context: context ?? {},
  });

  // Récup info bénévole pour affichage scanner
  const { data: volunteer } = await supabase
    .from("volunteer_profiles")
    .select("user_id, full_name, first_name, last_name, avatar_url, is_minor, size, skills")
    .eq("user_id", payload.vid)
    .maybeSingle();

  // Repas restants (si scan_kind = meal ou pour info)
  const { count: mealsRemaining } = await supabase
    .from("meal_allowances")
    .select("*", { count: "exact", head: true })
    .eq("event_id", payload.eid)
    .eq("volunteer_user_id", payload.vid)
    .is("served_at", null);

  // Position du bénévole (le poste de son prochain shift)
  const { data: nextShift } = await supabase
    .from("assignments")
    .select(`
      shift:shifts (
        starts_at, ends_at,
        position:positions (id, name, color, icon)
      )
    `)
    .eq("volunteer_user_id", payload.vid)
    .eq("status", "validated")
    .order("shift(starts_at)", { ascending: true } as any)
    .limit(1)
    .maybeSingle();

  return new Response(
    JSON.stringify({
      ok: !isReplay,
      replay: isReplay,
      scan_kind,
      first_scanned_at: firstScannedAt,
      volunteer,
      meals_remaining: mealsRemaining ?? 0,
      next_shift: nextShift?.shift ?? null,
    }),
    { status: 200, headers },
  );
});
