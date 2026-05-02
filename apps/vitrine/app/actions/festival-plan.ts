"use server";

import { revalidatePath } from "next/cache";

import { createServerClient } from "@/lib/supabase/server";

export async function uploadFestivalPlan(formData: FormData) {
  const eventId = formData.get("eventId") as string;
  if (!eventId) return { ok: false, error: "eventId manquant" };

  const supabase = createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Non authentifié" };

  // Permission direction (multi-memberships safe : Pamela peut être direction + volunteer)
  const { data: memberships } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("event_id", eventId)
    .eq("is_active", true);

  const isDirection = (memberships ?? []).some((m: any) => m.role === "direction");
  if (!isDirection) {
    return { ok: false, error: "Réservé à la direction" };
  }

  const updates: any = {};

  // Upload plan jour
  const planFile = formData.get("planFile") as File | null;
  if (planFile && planFile.size > 0) {
    if (planFile.size > 10 * 1024 * 1024) {
      return { ok: false, error: "Plan trop lourd (max 10 Mo)" };
    }
    const ext = planFile.name.split(".").pop()?.toLowerCase() ?? "png";
    const path = `plans/${eventId}/site-plan-${Date.now()}.${ext}`;
    const buffer = await planFile.arrayBuffer();
    const { error: upErr } = await supabase.storage
      .from("festival-assets")
      .upload(path, new Uint8Array(buffer), {
        contentType: planFile.type || "image/png",
        upsert: true,
      });
    if (upErr) return { ok: false, error: `Upload plan jour échoué : ${upErr.message}` };
    const { data: pub } = supabase.storage.from("festival-assets").getPublicUrl(path);
    updates.site_plan_url = pub.publicUrl;
  }

  // Upload plan nuit (optionnel)
  const planDarkFile = formData.get("planDarkFile") as File | null;
  if (planDarkFile && planDarkFile.size > 0) {
    if (planDarkFile.size > 10 * 1024 * 1024) {
      return { ok: false, error: "Plan nuit trop lourd (max 10 Mo)" };
    }
    const ext = planDarkFile.name.split(".").pop()?.toLowerCase() ?? "png";
    const path = `plans/${eventId}/site-plan-dark-${Date.now()}.${ext}`;
    const buffer = await planDarkFile.arrayBuffer();
    const { error: upErr } = await supabase.storage
      .from("festival-assets")
      .upload(path, new Uint8Array(buffer), {
        contentType: planDarkFile.type || "image/png",
        upsert: true,
      });
    if (upErr) return { ok: false, error: `Upload plan nuit échoué : ${upErr.message}` };
    const { data: pub } = supabase.storage.from("festival-assets").getPublicUrl(path);
    updates.site_plan_dark_url = pub.publicUrl;
  }

  // Caption
  const caption = (formData.get("caption") as string) || null;
  if (caption !== null) updates.site_plan_caption = caption;

  if (Object.keys(updates).length === 0) {
    return { ok: false, error: "Aucun fichier ni légende fourni" };
  }

  const { error } = await supabase.from("events").update(updates).eq("id", eventId);
  if (error) return { ok: false, error: error.message };

  await supabase.from("audit_log").insert({
    user_id: userData.user.id,
    event_id: eventId,
    action: "festival_plan.uploaded",
    payload: { fields: Object.keys(updates) },
  });

  revalidatePath("/regie", "layout");
  revalidatePath("/v", "layout");
  return { ok: true };
}
