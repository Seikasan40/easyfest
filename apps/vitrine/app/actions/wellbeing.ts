"use server";

import { createServerClient } from "@/lib/supabase/server";

interface ReportInput {
  eventId: string;
  level: "green" | "yellow" | "red";
  comment?: string;
}

export async function reportWellbeing(input: ReportInput): Promise<{ ok: boolean; error?: string }> {
  const supabase = createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Non authentifié" };

  const { error } = await supabase.from("wellbeing_reports").insert({
    event_id: input.eventId,
    reporter_user_id: userData.user.id,
    level: input.level,
    comment: input.comment,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

interface AlertInput {
  eventId: string;
  kind: string;
  description?: string;
  locationHint?: string;
}

export async function triggerSaferAlert(input: AlertInput): Promise<{ ok: boolean; alertId?: string; error?: string }> {
  const supabase = createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Non authentifié" };

  // Invocation Edge fn trigger_safer_alert qui gère cascade notif responsables + Resend
  const { data, error } = await supabase.functions.invoke("trigger_safer_alert", {
    body: {
      event_id: input.eventId,
      kind: input.kind,
      description: input.description,
      location_hint: input.locationHint,
    },
  });

  if (error || !data?.ok) {
    return { ok: false, error: error?.message ?? data?.error ?? "Erreur Edge fn" };
  }
  return { ok: true, alertId: data.alert_id };
}
