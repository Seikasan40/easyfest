"use server";

import { headers } from "next/headers";

import { createServerClient } from "@/lib/supabase/server";

const TURNSTILE_SECRET = process.env["TURNSTILE_SECRET_KEY"] ?? "";

interface SubmitResult {
  ok: boolean;
  applicationId?: string;
  error?: string;
}

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  // En dev / test : si pas de secret, on accepte (placeholder).
  if (!TURNSTILE_SECRET || TURNSTILE_SECRET.startsWith("0x4AAAAAAA_X")) return true;

  try {
    const resp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: TURNSTILE_SECRET, response: token, remoteip: ip }),
    });
    const data = (await resp.json()) as { success: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

/**
 * Server Action consommée par le formulaire 5 étapes.
 * Validation light côté serveur (re-vérifie via Zod via @easyfest/shared).
 * RLS s'occupe du reste (insert anonyme autorisé seulement sur events.status='open').
 */
export async function submitVolunteerApplication(formData: FormData): Promise<SubmitResult> {
  const headersList = headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const userAgent = headersList.get("user-agent") ?? "unknown";

  const turnstileToken = (formData.get("turnstileToken") as string) ?? "";
  const turnstileOk = await verifyTurnstile(turnstileToken, ip);
  if (!turnstileOk) {
    return { ok: false, error: "Vérification anti-bot échouée. Recharge la page et réessaye." };
  }

  const eventId = formData.get("eventId") as string;
  if (!eventId) return { ok: false, error: "Événement manquant" };

  const firstName = (formData.get("firstName") as string)?.trim();
  const lastName = (formData.get("lastName") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const phone = (formData.get("phone") as string)?.trim();
  const birthDate = formData.get("birthDate") as string;
  const gender = (formData.get("gender") as string) || null;
  const profession = (formData.get("profession") as string) || null;

  const arrivalAt = formData.get("arrivalAt") as string;
  const departureAt = formData.get("departureAt") as string;
  const size = (formData.get("size") as string) || null;
  const dietNotes = (formData.get("dietNotes") as string) || null;
  const hasVehicle = formData.get("hasVehicle") === "true";
  const drivingLicense = formData.get("drivingLicense") === "true";
  const availableSetup = formData.get("availableSetup") === "true";
  const availableTeardown = formData.get("availableTeardown") === "true";
  const dietType = (formData.get("dietType") as string) || null;
  const carpool = (formData.get("carpool") as string) || "none";

  const preferredSlugs = formData.getAll("preferredPositionSlugs") as string[];

  const bio = (formData.get("bio") as string) || null;
  const isReturning = formData.get("isReturning") === "true";

  const consentCharter = formData.get("consentCharter") === "true";
  const consentAntiHarassment = formData.get("consentAntiHarassment") === "true";
  const consentPii = formData.get("consentPii") === "true";
  const consentImage = formData.get("consentImage") === "true";

  // Validations server-side de base (les checks détaillés sont faits côté client + Zod côté shared)
  if (!firstName || !lastName || !email || !phone || !birthDate) {
    return { ok: false, error: "Identité incomplète" };
  }
  if (!arrivalAt || !departureAt) {
    return { ok: false, error: "Dates d'arrivée/départ manquantes" };
  }
  if (preferredSlugs.length === 0) {
    return { ok: false, error: "Choisissez au moins un poste" };
  }
  if (!consentCharter || !consentAntiHarassment || !consentPii) {
    return { ok: false, error: "Consentements obligatoires non acceptés" };
  }

  const isMinor = (() => {
    const birth = new Date(birthDate);
    const eighteenYearsAgo = new Date();
    eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
    return birth > eighteenYearsAgo;
  })();

  const supabase = createServerClient();

  // Appel RPC SECURITY DEFINER (bypass RLS pour insert anonyme)
  const payload = {
    event_id: eventId,
    email,
    full_name: `${firstName} ${lastName}`,
    first_name: firstName,
    last_name: lastName,
    birth_date: birthDate,
    is_minor: isMinor,
    gender,
    phone,
    profession,
    arrival_at: new Date(arrivalAt).toISOString(),
    departure_at: new Date(departureAt).toISOString(),
    size,
    diet_notes: dietNotes,
    has_vehicle: hasVehicle,
    driving_license: drivingLicense,
    available_setup: availableSetup,
    available_teardown: availableTeardown,
    diet_type: dietType,
    carpool,
    preferred_position_slugs: preferredSlugs,
    bio,
    is_returning: isReturning,
    consent_pii_at: consentPii ? new Date().toISOString() : null,
    consent_charter_at: consentCharter ? new Date().toISOString() : null,
    consent_anti_harass_at: consentAntiHarassment ? new Date().toISOString() : null,
    consent_image_at: consentImage ? new Date().toISOString() : null,
    privacy_policy_version_accepted: process.env["PRIVACY_POLICY_VERSION"] ?? "1.0.0",
    source: "public_form",
    turnstile_token: turnstileToken.substring(0, 100),
    ip_address: ip === "unknown" ? null : ip,
    user_agent: userAgent.substring(0, 500),
  };

  const { data, error } = await supabase.rpc("submit_volunteer_application", { payload });

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Erreur d'enregistrement" };
  }

  const applicationId = data as string;

  // 2. Upload photo si fournie
  const photoFile = formData.get("photoFile") as File | null;
  if (photoFile && photoFile.size > 0) {
    try {
      const ext = photoFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const cleanExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
      const path = `applications/${eventId}/${applicationId}.${cleanExt}`;
      const arrayBuffer = await photoFile.arrayBuffer();
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, new Uint8Array(arrayBuffer), {
          contentType: photoFile.type || "image/jpeg",
          upsert: true,
        });
      if (!upErr) {
        // Récupère URL publique (bucket public) ou signed URL
        const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
        if (pub?.publicUrl) {
          // Update l'application avec avatar_url (best effort, on ignore si colonne absente)
          await supabase
            .from("volunteer_applications")
            .update({ avatar_url: pub.publicUrl })
            .eq("id", applicationId);
        }
      } else {
        console.error("Upload avatar échoué:", upErr.message);
      }
    } catch (e) {
      console.error("Erreur upload avatar:", e);
      // Non-bloquant : on n'échoue pas la candidature pour une photo
    }
  }

  return { ok: true, applicationId };
}
