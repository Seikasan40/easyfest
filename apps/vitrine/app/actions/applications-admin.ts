"use server";

import { revalidatePath } from "next/cache";

import { createServerClient } from "@/lib/supabase/server";

export async function validateApplication(applicationId: string) {
  const supabase = createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Non authentifié" };

  // 1. Update status validated
  const { data: updated, error } = await supabase
    .from("volunteer_applications")
    .update({
      status: "validated",
      validated_by: userData.user.id,
      validated_at: new Date().toISOString(),
    })
    .eq("id", applicationId)
    .select("id, event_id")
    .single();

  if (error || !updated) return { ok: false, error: error?.message ?? "Update failed" };

  // 2. Audit log
  await supabase.from("audit_log").insert({
    user_id: userData.user.id,
    event_id: updated.event_id,
    action: "application.validated",
    payload: { application_id: applicationId },
  });

  // 3. Trigger Edge fn send_validation_mail (Resend + magic-link)
  const { data: mailRes, error: mailErr } = await supabase.functions.invoke("send_validation_mail", {
    body: { application_id: applicationId },
  });

  if (mailErr) {
    return { ok: true, warning: `Mail non envoyé : ${mailErr.message}` };
  }

  revalidatePath("/regie", "layout");
  return { ok: true, mailSent: mailRes?.ok };
}

export async function refuseApplication(applicationId: string, reason: string) {
  const supabase = createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Non authentifié" };

  const { data: updated, error } = await supabase
    .from("volunteer_applications")
    .update({
      status: "refused",
      validated_by: userData.user.id,
      validated_at: new Date().toISOString(),
      refusal_reason: reason,
    })
    .eq("id", applicationId)
    .select("event_id")
    .single();

  if (error || !updated) return { ok: false, error: error?.message ?? "Update failed" };

  await supabase.from("audit_log").insert({
    user_id: userData.user.id,
    event_id: updated.event_id,
    action: "application.refused",
    payload: { application_id: applicationId, reason },
  });

  revalidatePath("/regie", "layout");
  return { ok: true };
}
