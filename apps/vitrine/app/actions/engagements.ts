"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { createServerClient } from "@/lib/supabase/server";

interface SignConventionInput {
  eventId: string;
  version: string;
  consent: { acceptCharter: boolean; acceptImage: boolean };
}

/**
 * Signe électroniquement la convention de bénévolat (modèle ZIK en PACA).
 * Insère dans signed_engagements avec horodatage + IP + user-agent pour
 * valeur juridique probante.
 */
export async function signConventionBenevolat(input: SignConventionInput) {
  const supabase = createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false as const, error: "Non authentifié" };

  if (!input.consent.acceptCharter) {
    return { ok: false as const, error: "Tu dois accepter les articles de la convention" };
  }

  // Récup IP + User-Agent
  const h = await headers();
  const fwd = h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? null;
  const ip = fwd?.split(",")[0]?.trim() ?? null;
  const userAgent = h.get("user-agent") ?? null;

  // Insert engagement principal (convention)
  const { error } = await supabase.from("signed_engagements").insert({
    event_id: input.eventId,
    user_id: userData.user.id,
    engagement_kind: "convention_benevolat",
    version: input.version,
    ip_address: ip,
    user_agent: userAgent,
  });

  if (error) {
    // Si déjà signée pour cette version
    if (error.code === "23505") {
      return { ok: false as const, error: "Convention déjà signée pour cette version" };
    }
    return { ok: false as const, error: error.message };
  }

  // Si autorisation image cochée → engagement séparé image_rights
  if (input.consent.acceptImage) {
    await supabase.from("signed_engagements").insert({
      event_id: input.eventId,
      user_id: userData.user.id,
      engagement_kind: "image_rights",
      version: input.version,
      ip_address: ip,
      user_agent: userAgent,
    });
  }

  // Audit log
  await supabase.from("audit_log").insert({
    user_id: userData.user.id,
    event_id: input.eventId,
    action: "engagement.convention.signed",
    payload: {
      version: input.version,
      image_rights: input.consent.acceptImage,
      ip,
    },
  });

  revalidatePath("/v", "layout");
  return { ok: true as const };
}
