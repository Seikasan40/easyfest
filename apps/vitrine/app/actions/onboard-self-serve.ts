"use server";

import { headers } from "next/headers";

import { createServerClient, createServiceClient } from "@/lib/supabase/server";

interface SubmitInput {
  firstName: string;
  lastName: string | null;
  email: string;
  phone: string | null;
  orgName: string;
  orgSlug: string;
  orgSiret: string | null;
  orgAddress: string | null;
  orgPresident: string | null;
  eventName: string;
  eventSlug: string;
  eventStartsAt: string;
  eventEndsAt: string;
  eventLocation: string;
  eventCapacity: number | null;
  eventType: string;
  templateSlug: string;
  consentCgu: boolean;
  consentRgpd: boolean;
  /** Honeypot anti-bot : champ caché qui doit RESTER VIDE (les bots le remplissent automatiquement). */
  hp_website?: string;
  /** Math challenge anti-bot — fallback si Turnstile n'est pas configuré */
  hp_math_answer?: string;
  hp_math_expected?: number;
  /** Timestamp ouverture form (anti-submission instantanée par bot). */
  hp_form_opened_at?: number;
  /** Cloudflare Turnstile token — verifié via siteverify endpoint */
  turnstileToken?: string;
}

/**
 * Vérifie un token Cloudflare Turnstile via le siteverify endpoint.
 * Retourne true si valide, false sinon. En cas d'erreur réseau, retourne true (fail-open) pour ne pas
 * bloquer un user légitime quand Cloudflare est down. Le honeypot maison reste actif comme fallback.
 */
async function verifyTurnstile(token: string | undefined): Promise<boolean> {
  const secret = process.env["TURNSTILE_SECRET_KEY"];
  if (!secret) {
    // Turnstile pas configuré — on ne bloque pas, le honeypot maison + math challenge protègent.
    return true;
  }
  if (!token) {
    return false;
  }
  try {
    const formData = new URLSearchParams();
    formData.append("secret", secret);
    formData.append("response", token);
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });
    const json = (await r.json()) as { success: boolean; "error-codes"?: string[] };
    return json.success === true;
  } catch {
    // Fail-open si réseau down (honeypot reste actif)
    return true;
  }
}

interface ActionResult {
  ok: boolean;
  error?: string;
}

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])?$/;
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const RATE_LIMIT_PER_HOUR = 5;

// Hard limits chars (anti-DOS payload géant + cohérence avec validation côté DB).
const LIMITS = {
  firstName: 80,
  lastName: 80,
  email: 200,
  phone: 30,
  orgName: 150,
  orgSlug: 64,
  orgSiret: 14,
  orgAddress: 250,
  orgPresident: 100,
  eventName: 150,
  eventSlug: 64,
  eventLocation: 200,
  eventType: 50,
  templateSlug: 64,
} as const;

// Pattern de détection XSS basique (rejet immédiat avant DB).
// Server actions Next.js sont normalement protégées par origin/host check, mais defense-in-depth.
const XSS_TAGS = /<\s*(script|iframe|object|embed|link|meta|style|svg)\b/i;

function looksLikeXss(s: string | null | undefined): boolean {
  if (!s) return false;
  if (XSS_TAGS.test(s)) return true;
  if (/javascript:/i.test(s)) return true;
  if (/\bon\w+\s*=/i.test(s)) return true; // onclick=, onerror=, etc.
  return false;
}

function getClientIp(): string {
  // Inspecte les headers Vercel/Cloudflare
  const h = headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    h.get("cf-connecting-ip") ||
    "0.0.0.0"
  );
}

function validateInput(input: SubmitInput): string | null {
  // 0. Anti-bot defenses (silent failures pour ne pas révéler le mécanisme aux scrapers)
  // 0a. Honeypot : si rempli = bot, on rejette mais en ne donnant qu'un message générique
  if (input.hp_website && input.hp_website.trim().length > 0) {
    return "Demande non valide. Vérifie ton formulaire et réessaie.";
  }
  // 0b. Math challenge : si la réponse ne correspond pas à l'expected (signé côté UI)
  if (
    typeof input.hp_math_answer === "string" &&
    typeof input.hp_math_expected === "number"
  ) {
    const answered = Number.parseInt(input.hp_math_answer.trim(), 10);
    if (!Number.isFinite(answered) || answered !== input.hp_math_expected) {
      return "La réponse au calcul anti-spam n'est pas correcte.";
    }
  }
  // 0c. Form opened too fast (sub-2s = bot)
  if (typeof input.hp_form_opened_at === "number") {
    const elapsed = Date.now() - input.hp_form_opened_at;
    if (elapsed < 2000) {
      return "Demande envoyée trop rapidement. Prends ton temps et réessaie.";
    }
  }

  // 1. Required + length cap (anti-DOS payload géant)
  if (!input.firstName?.trim()) return "Prénom requis";
  if (input.firstName.length > LIMITS.firstName) return "Prénom trop long";
  if ((input.lastName ?? "").length > LIMITS.lastName) return "Nom trop long";
  if (!EMAIL_PATTERN.test(input.email)) return "Email invalide";
  if (input.email.length > LIMITS.email) return "Email trop long";
  if ((input.phone ?? "").length > LIMITS.phone) return "Téléphone trop long";

  if (!SLUG_PATTERN.test(input.orgSlug) || input.orgSlug.length > LIMITS.orgSlug) {
    return "Identifiant URL d'asso invalide (lettres minuscules, chiffres, tirets)";
  }
  if (!SLUG_PATTERN.test(input.eventSlug) || input.eventSlug.length > LIMITS.eventSlug) {
    return "Identifiant URL de festival invalide";
  }
  if (!input.orgName?.trim()) return "Nom d'asso requis";
  if (input.orgName.length > LIMITS.orgName) return "Nom d'asso trop long";
  if ((input.orgSiret ?? "").length > LIMITS.orgSiret) return "SIRET invalide";
  if ((input.orgAddress ?? "").length > LIMITS.orgAddress) return "Adresse trop longue";
  if ((input.orgPresident ?? "").length > LIMITS.orgPresident) return "Nom président trop long";
  if (!input.eventName?.trim()) return "Nom de festival requis";
  if (input.eventName.length > LIMITS.eventName) return "Nom de festival trop long";
  if (!input.eventLocation?.trim()) return "Lieu requis";
  if (input.eventLocation.length > LIMITS.eventLocation) return "Lieu trop long";

  // 2. XSS basique : rejet hard si tags exécutables ou handlers JS détectés.
  // Defense-in-depth, en plus de l'échappement React côté affichage.
  const fields = [
    input.firstName, input.lastName, input.email, input.phone,
    input.orgName, input.orgAddress, input.orgPresident,
    input.eventName, input.eventLocation,
  ];
  if (fields.some(looksLikeXss)) {
    return "Caractères non autorisés détectés dans un champ (HTML/JS)";
  }

  // 3. Dates cohérentes
  const startMs = Date.parse(input.eventStartsAt);
  const endMs = Date.parse(input.eventEndsAt);
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return "Dates invalides";
  if (endMs <= startMs) return "La date de fin doit être après la date de début";
  // Limite 5 ans dans le futur (anti-spam et anti-typo)
  const fiveYearsMs = 5 * 365 * 24 * 60 * 60 * 1000;
  if (startMs > Date.now() + fiveYearsMs) return "Date de début trop éloignée (> 5 ans)";

  // 4. Capacity sanity
  if (input.eventCapacity !== null && (input.eventCapacity < 0 || input.eventCapacity > 1_000_000)) {
    return "Capacité invalide (entre 0 et 1 000 000)";
  }

  // 5. Consents obligatoires
  if (!input.consentCgu || !input.consentRgpd) return "Consentements CGU + RGPD obligatoires";
  return null;
}

// Wrapper qui combine validation synchrone + Turnstile async
async function validateInputAsync(input: SubmitInput): Promise<string | null> {
  const syncErr = validateInput(input);
  if (syncErr) return syncErr;
  const turnstileOk = await verifyTurnstile(input.turnstileToken);
  if (!turnstileOk) {
    return "Échec de la vérification anti-bot. Recharge la page et réessaie.";
  }
  return null;
}

export async function submitFestivalRequest(input: SubmitInput): Promise<ActionResult> {
  const validationError = await validateInputAsync(input);
  if (validationError) return { ok: false, error: validationError };

  const ip = getClientIp();
  const ua = headers().get("user-agent") ?? null;

  // Service client pour bypass RLS (rate limit + insert)
  let admin;
  try {
    admin = createServiceClient();
  } catch (e) {
    return { ok: false, error: "Configuration serveur indisponible" };
  }

  // Rate limit IP : 5 demandes / heure
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentCount } = await admin
    .from("pending_festival_requests")
    .select("id", { count: "exact", head: true })
    .eq("ip_address", ip)
    .gte("created_at", oneHourAgo);

  if ((recentCount ?? 0) >= RATE_LIMIT_PER_HOUR) {
    return { ok: false, error: "Trop de demandes depuis ton IP. Réessaie dans 1h." };
  }

  // INSERT pending request (le confirm_token est généré par défaut côté DB)
  const { data: inserted, error } = await admin
    .from("pending_festival_requests")
    .insert({
      email: input.email,
      first_name: input.firstName,
      last_name: input.lastName,
      phone: input.phone,
      org_name: input.orgName,
      org_slug: input.orgSlug,
      org_siret: input.orgSiret,
      org_address: input.orgAddress,
      org_president: input.orgPresident,
      event_name: input.eventName,
      event_slug: input.eventSlug,
      event_starts_at: new Date(input.eventStartsAt).toISOString(),
      event_ends_at: new Date(input.eventEndsAt).toISOString(),
      event_location: input.eventLocation,
      event_capacity: input.eventCapacity,
      event_type: input.eventType,
      template_slug: input.templateSlug,
      consent_cgu: input.consentCgu,
      consent_rgpd: input.consentRgpd,
      ip_address: ip,
      user_agent: ua,
    })
    .select("confirm_token")
    .single();

  if (error || !inserted) {
    return {
      ok: false,
      error: error?.message?.includes("unique")
        ? "Une demande similaire existe déjà — vérifie tes mails."
        : (error?.message ?? "Insertion impossible"),
    };
  }

  // Envoi du magic link via Edge Function send_validation_mail (déjà brandée v4)
  const baseUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? "https://easyfest.app";
  const finalizeUrl = `${baseUrl}/onboarding/finalize?token=${inserted.confirm_token}`;

  try {
    await admin.functions.invoke("send_validation_mail", {
      body: {
        to: input.email,
        type: "festival_request_finalize",
        firstName: input.firstName,
        eventName: input.eventName,
        orgName: input.orgName,
        finalizeUrl,
      },
    });
  } catch {
    // Pas bloquant — la demande est persistée, le user pourra relancer
  }

  return { ok: true };
}

interface FinalizeInput {
  token: string;
}

interface FinalizeResult {
  ok: boolean;
  redirectTo?: string;
  error?: string;
}

export async function finalizeFestivalRequest(input: FinalizeInput): Promise<FinalizeResult> {
  if (!input.token || typeof input.token !== "string") {
    return { ok: false, error: "Token manquant" };
  }

  let admin;
  try {
    admin = createServiceClient();
  } catch {
    return { ok: false, error: "Configuration serveur indisponible" };
  }

  // 1. Récup la pending request matchant le token (et non expirée, non finalisée)
  const { data: pending, error: pendingError } = await admin
    .from("pending_festival_requests")
    .select("*")
    .eq("confirm_token", input.token)
    .is("finalized_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (pendingError) return { ok: false, error: pendingError.message };
  if (!pending) {
    return { ok: false, error: "Lien invalide ou expiré (24h max)." };
  }

  // 2. Appel RPC atomique finalize_festival_request (créée par migration 20260502000004)
  // → crée auth.users si besoin, INSERT org + event + memberships + positions/shifts depuis template
  const { data: rpcResult, error: rpcError } = await (admin as any).rpc(
    "finalize_festival_request",
    { p_token: input.token },
  );

  if (rpcError) {
    return { ok: false, error: rpcError.message };
  }

  // RPC retourne { user_id, organization_id, event_id, redirect_to }
  const redirectTo: string =
    (rpcResult as any)?.redirect_to ?? `/regie/${pending.org_slug}/${pending.event_slug}`;

  // 3. Génère un magic-link Supabase Auth pour ouvrir une session sur la finalize page
  // (le user existe maintenant, on lui crée une session via OTP signInWithOtp)
  try {
    const userClient = createServerClient();
    await userClient.auth.signInWithOtp({
      email: pending.email,
      options: { emailRedirectTo: `${process.env["NEXT_PUBLIC_APP_URL"] ?? "https://easyfest.app"}${redirectTo}` },
    });
  } catch {
    // Silent — la session sera créée au prochain login
  }

  return { ok: true, redirectTo };
}
