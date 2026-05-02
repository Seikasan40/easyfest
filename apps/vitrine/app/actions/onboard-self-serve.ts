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
}

interface ActionResult {
  ok: boolean;
  error?: string;
}

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])?$/;
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const RATE_LIMIT_PER_HOUR = 5;

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
  if (!input.firstName.trim()) return "Prénom requis";
  if (!EMAIL_PATTERN.test(input.email)) return "Email invalide";
  if (!SLUG_PATTERN.test(input.orgSlug)) {
    return "Identifiant URL d'asso invalide (lettres minuscules, chiffres, tirets)";
  }
  if (!SLUG_PATTERN.test(input.eventSlug)) {
    return "Identifiant URL de festival invalide";
  }
  if (!input.orgName.trim()) return "Nom d'asso requis";
  if (!input.eventName.trim()) return "Nom de festival requis";
  if (!input.eventLocation.trim()) return "Lieu requis";

  const startMs = Date.parse(input.eventStartsAt);
  const endMs = Date.parse(input.eventEndsAt);
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return "Dates invalides";
  if (endMs <= startMs) return "La date de fin doit être après la date de début";

  if (!input.consentCgu || !input.consentRgpd) return "Consentements CGU + RGPD obligatoires";
  return null;
}

export async function submitFestivalRequest(input: SubmitInput): Promise<ActionResult> {
  const validationError = validateInput(input);
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
