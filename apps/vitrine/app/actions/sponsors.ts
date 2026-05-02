"use server";

import { revalidatePath } from "next/cache";

import { createServerClient } from "@/lib/supabase/server";

async function checkPermission(eventId: string) {
  const supabase = createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false as const, error: "Non authentifié" };

  // ⚠️ Multi-memberships safe : Pamela peut cumuler direction + volunteer_lead.
  const { data: memberships } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("event_id", eventId)
    .eq("is_active", true);

  const isDirection = (memberships ?? []).some((m: any) => m.role === "direction");
  if (!isDirection) {
    return { ok: false as const, error: "Réservé à la direction" };
  }

  return { ok: true as const, supabase, userId: userData.user.id };
}

export async function upsertSponsor(formData: FormData) {
  const eventId = formData.get("eventId") as string;
  const sponsorId = formData.get("sponsorId") as string | null;
  if (!eventId) return { ok: false, error: "eventId manquant" };

  const check = await checkPermission(eventId);
  if (!check.ok) return check;

  const counterpartsRaw = (formData.get("counterparts") as string) ?? "";
  const counterparts = counterpartsRaw.split("\n").map((s) => s.trim()).filter(Boolean);

  const payload = {
    event_id: eventId,
    name: (formData.get("name") as string).trim(),
    tier: (formData.get("tier") as string) || "bronze",
    status: (formData.get("status") as string) || "prospect",
    contact_name: (formData.get("contactName") as string) || null,
    contact_email: (formData.get("contactEmail") as string) || null,
    contact_phone: (formData.get("contactPhone") as string) || null,
    amount_eur: parseFloat((formData.get("amountEur") as string) || "0") || 0,
    amount_in_kind: (formData.get("amountInKind") as string) || null,
    counterparts,
    internal_notes: (formData.get("internalNotes") as string) || null,
    next_action: (formData.get("nextAction") as string) || null,
    next_action_at: (formData.get("nextActionAt") as string) || null,
    created_by: check.userId,
  };

  let result;
  if (sponsorId) {
    const { error } = await check.supabase
      .from("sponsors")
      .update(payload)
      .eq("id", sponsorId);
    result = { error };
  } else {
    const { error } = await check.supabase.from("sponsors").insert(payload);
    result = { error };
  }

  if (result.error) return { ok: false, error: result.error.message };

  await check.supabase.from("audit_log").insert({
    user_id: check.userId,
    event_id: eventId,
    action: sponsorId ? "sponsor.updated" : "sponsor.created",
    payload: { name: payload.name, sponsorId },
  });

  revalidatePath(`/regie`, "layout");
  return { ok: true };
}

export async function updateSponsorStatus(sponsorId: string, status: string) {
  const supabase = createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Non authentifié" };

  // Récupérer event_id pour audit
  const { data: sp } = await supabase.from("sponsors").select("event_id, name").eq("id", sponsorId).maybeSingle();
  if (!sp) return { ok: false, error: "Sponsor introuvable" };

  const updates: any = { status };
  if (status === "signed" && !sp.signed_at) updates.signed_at = new Date().toISOString();
  if (status === "paid") updates.paid_at = new Date().toISOString();

  const { error } = await supabase.from("sponsors").update(updates).eq("id", sponsorId);
  if (error) return { ok: false, error: error.message };

  await supabase.from("audit_log").insert({
    user_id: userData.user.id,
    event_id: sp.event_id,
    action: "sponsor.status_changed",
    payload: { sponsorId, name: sp.name, new_status: status },
  });

  revalidatePath(`/regie`, "layout");
  return { ok: true };
}

export async function deleteSponsor(sponsorId: string) {
  const supabase = createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Non authentifié" };

  const { data: sp } = await supabase.from("sponsors").select("event_id, name").eq("id", sponsorId).maybeSingle();
  if (!sp) return { ok: false, error: "Sponsor introuvable" };

  const check = await checkPermission(sp.event_id);
  if (!check.ok) return check;

  const { error } = await check.supabase.from("sponsors").delete().eq("id", sponsorId);
  if (error) return { ok: false, error: error.message };

  await check.supabase.from("audit_log").insert({
    user_id: check.userId,
    event_id: sp.event_id,
    action: "sponsor.deleted",
    payload: { sponsorId, name: sp.name },
  });

  revalidatePath(`/regie`, "layout");
  return { ok: true };
}
