"use server";

/**
 * Server actions Safer Space — médiateurs + direction.
 * - acknowledgeSaferAlert : un médiateur prend en charge une alerte open
 * - resolveSaferAlert : le médiateur en charge marque l'alerte résolue
 * - markFalseAlarm : le médiateur en charge marque l'alerte comme fausse alerte
 *
 * Sécurité : on vérifie en DB que le user est bien is_mediator OU direction sur l'event.
 * Le service client est utilisé uniquement APRÈS le check, pour bypasser RLS sur l'UPDATE
 * (les médiateurs anon n'ont pas de droits UPDATE direct sur safer_alerts).
 */

import { revalidatePath } from "next/cache";

import { createServerClient, createServiceClient } from "@/lib/supabase/server";

interface ActionResult {
  ok: boolean;
  error?: string;
}

interface AlertActionInput {
  alertId: string;
  orgSlug: string;
  eventSlug: string;
  notes?: string;
}

async function checkMediatorAuth(eventSlug: string, orgSlug: string) {
  const supabase = createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false as const, error: "Non authentifié" };

  // ⚠️ Multi-memberships safe : Sandy peut être volunteer + volunteer_lead, Pamela direction + volunteer.
  // On récupère toutes les memberships actives et on agrège is_mediator || direction OR.
  const { data: memberships } = await supabase
    .from("memberships")
    .select("role, is_mediator, event:event_id (id, slug, organization:organization_id (slug))")
    .eq("user_id", userData.user.id)
    .eq("is_active", true)
    .filter("event.slug", "eq", eventSlug)
    .filter("event.organization.slug", "eq", orgSlug);

  const all = (memberships ?? []) as any[];
  if (all.length === 0) return { ok: false as const, error: "Membership inexistant" };
  const isMediator = all.some((mb) => mb.is_mediator === true || mb.role === "direction");
  if (!isMediator) return { ok: false as const, error: "Pas autorisé (mediator/direction requis)" };
  const eventId = all.find((mb) => mb.event?.id)?.event?.id as string;

  return { ok: true as const, userId: userData.user.id, eventId };
}

export async function acknowledgeSaferAlert(input: AlertActionInput): Promise<ActionResult> {
  const auth = await checkMediatorAuth(input.eventSlug, input.orgSlug);
  if (!auth.ok) return { ok: false, error: auth.error };

  let admin;
  try {
    admin = createServiceClient();
  } catch {
    return { ok: false, error: "Configuration serveur indisponible" };
  }

  const { data: existing } = await admin
    .from("safer_alerts")
    .select("id, status, mediator_user_id, event_id")
    .eq("id", input.alertId)
    .maybeSingle();

  if (!existing) return { ok: false, error: "Alerte introuvable" };
  if ((existing as any).event_id !== auth.eventId) return { ok: false, error: "Alerte d'un autre festival" };
  if ((existing as any).status === "resolved" || (existing as any).status === "false_alarm") {
    return { ok: false, error: "Alerte déjà clôturée" };
  }
  if ((existing as any).mediator_user_id && (existing as any).mediator_user_id !== auth.userId) {
    return { ok: false, error: "Déjà prise en charge par un autre médiateur" };
  }

  const { error } = await admin
    .from("safer_alerts")
    .update({
      status: "acknowledged",
      mediator_user_id: auth.userId,
      acknowledged_by: auth.userId,
      acknowledged_at: new Date().toISOString(),
    })
    .eq("id", input.alertId);

  if (error) return { ok: false, error: error.message };

  await admin.from("audit_log").insert({
    event_id: auth.eventId,
    user_id: auth.userId,
    action: "safer.alert.acknowledged",
    payload: { alert_id: input.alertId },
  });

  revalidatePath(`/v/${input.orgSlug}/${input.eventSlug}/safer`);
  revalidatePath(`/regie/${input.orgSlug}/${input.eventSlug}/safer`);
  return { ok: true };
}

export async function resolveSaferAlert(input: AlertActionInput): Promise<ActionResult> {
  const auth = await checkMediatorAuth(input.eventSlug, input.orgSlug);
  if (!auth.ok) return { ok: false, error: auth.error };

  let admin;
  try {
    admin = createServiceClient();
  } catch {
    return { ok: false, error: "Configuration serveur indisponible" };
  }

  const { data: existing } = await admin
    .from("safer_alerts")
    .select("id, status, mediator_user_id, event_id")
    .eq("id", input.alertId)
    .maybeSingle();

  if (!existing) return { ok: false, error: "Alerte introuvable" };
  if ((existing as any).event_id !== auth.eventId) return { ok: false, error: "Alerte d'un autre festival" };
  if ((existing as any).mediator_user_id !== auth.userId) {
    return { ok: false, error: "Tu dois prendre en charge l'alerte avant de la résoudre" };
  }

  const { error } = await admin
    .from("safer_alerts")
    .update({
      status: "resolved",
      resolved_by: auth.userId,
      resolved_at: new Date().toISOString(),
      resolution_notes: input.notes ?? null,
    })
    .eq("id", input.alertId);

  if (error) return { ok: false, error: error.message };

  await admin.from("audit_log").insert({
    event_id: auth.eventId,
    user_id: auth.userId,
    action: "safer.alert.resolved",
    payload: { alert_id: input.alertId, notes: input.notes ?? null },
  });

  revalidatePath(`/v/${input.orgSlug}/${input.eventSlug}/safer`);
  revalidatePath(`/regie/${input.orgSlug}/${input.eventSlug}/safer`);
  return { ok: true };
}

export async function markFalseAlarmSaferAlert(input: AlertActionInput): Promise<ActionResult> {
  const auth = await checkMediatorAuth(input.eventSlug, input.orgSlug);
  if (!auth.ok) return { ok: false, error: auth.error };

  let admin;
  try {
    admin = createServiceClient();
  } catch {
    return { ok: false, error: "Configuration serveur indisponible" };
  }

  const { data: existing } = await admin
    .from("safer_alerts")
    .select("id, status, mediator_user_id, event_id")
    .eq("id", input.alertId)
    .maybeSingle();

  if (!existing) return { ok: false, error: "Alerte introuvable" };
  if ((existing as any).event_id !== auth.eventId) return { ok: false, error: "Alerte d'un autre festival" };
  if ((existing as any).mediator_user_id !== auth.userId) {
    return { ok: false, error: "Tu dois prendre en charge l'alerte avant de la classer fausse alerte" };
  }

  const { error } = await admin
    .from("safer_alerts")
    .update({
      status: "false_alarm",
      resolved_by: auth.userId,
      resolved_at: new Date().toISOString(),
      resolution_notes: input.notes ?? "Fausse alerte",
    })
    .eq("id", input.alertId);

  if (error) return { ok: false, error: error.message };

  await admin.from("audit_log").insert({
    event_id: auth.eventId,
    user_id: auth.userId,
    action: "safer.alert.false_alarm",
    payload: { alert_id: input.alertId, notes: input.notes ?? null },
  });

  revalidatePath(`/v/${input.orgSlug}/${input.eventSlug}/safer`);
  revalidatePath(`/regie/${input.orgSlug}/${input.eventSlug}/safer`);
  return { ok: true };
}
