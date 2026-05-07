"use server";

/**
 * Server actions Safer Space.
 * - submitSaferAlert   : n'importe quel bénévole actif peut signaler un incident
 * - acknowledgeSaferAlert : un médiateur prend en charge une alerte open
 * - resolveSaferAlert : le médiateur en charge marque l'alerte résolue
 * - markFalseAlarm : le médiateur en charge marque l'alerte comme fausse alerte
 *
 * Sécurité : on vérifie en DB que le user a bien une membership active sur l'event.
 * Pour les actions médiateur, on vérifie en plus is_mediator OU direction.
 * Le service client est utilisé APRÈS le check pour bypasser RLS sur l'UPDATE.
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

// ─── Signalement par un bénévole quelconque ──────────────────────────────────

interface SubmitAlertInput {
  orgSlug: string;
  eventSlug: string;
  kind: string;
  description?: string;
  locationHint?: string;
}

export async function submitSaferAlert(input: SubmitAlertInput): Promise<ActionResult> {
  const supabase = createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Non authentifié" };

  // Vérifier qu'il a une membership active sur cet event
  const { data: memberships } = await supabase
    .from("memberships")
    .select("id, event:event_id (id, slug, organization:organization_id (slug))")
    .eq("user_id", userData.user.id)
    .eq("is_active", true)
    .filter("event.slug", "eq", input.eventSlug)
    .filter("event.organization.slug", "eq", input.orgSlug);

  const all = (memberships ?? []) as any[];
  if (all.length === 0) return { ok: false, error: "Aucune membership active sur cet événement" };
  const eventId = all.find((mb) => mb.event?.id)?.event?.id as string | undefined;
  if (!eventId) return { ok: false, error: "Événement introuvable" };

  const validKinds = ["harassment", "physical_danger", "medical", "wellbeing_red", "other"];
  if (!validKinds.includes(input.kind)) return { ok: false, error: "Type d'incident invalide" };

  let admin;
  try {
    admin = createServiceClient();
  } catch {
    return { ok: false, error: "Configuration serveur indisponible" };
  }

  const { error } = await admin.from("safer_alerts").insert({
    event_id: eventId,
    kind: input.kind,
    description: input.description?.trim() ?? null,
    location_hint: input.locationHint?.trim() ?? null,
    status: "open",
    reporter_user_id: userData.user.id,
  });

  if (error) return { ok: false, error: error.message };

  await admin.from("audit_log").insert({
    event_id: eventId,
    user_id: userData.user.id,
    action: "safer.alert.submitted",
    payload: { kind: input.kind },
  });

  revalidatePath(`/v/${input.orgSlug}/${input.eventSlug}/safer`);
  revalidatePath(`/regie/${input.orgSlug}/${input.eventSlug}/safer`);
  return { ok: true };
}

// ─── Auth médiateur ───────────────────────────────────────────────────────────

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

// ─── Suppression d'une alerte (direction uniquement) ─────────────────────────

export async function deleteSaferAlert(input: AlertActionInput): Promise<ActionResult> {
  const supabase = createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Non authentifié" };

  // Vérifier que le user est "direction" sur cet event
  const { data: memberships } = await supabase
    .from("memberships")
    .select("role, event:event_id (id, slug, organization:organization_id (slug))")
    .eq("user_id", userData.user.id)
    .eq("is_active", true)
    .filter("event.slug", "eq", input.eventSlug)
    .filter("event.organization.slug", "eq", input.orgSlug);

  const all = (memberships ?? []) as any[];
  const isDirection = all.some((mb) => mb.role === "direction");
  if (!isDirection) return { ok: false, error: "Direction uniquement" };
  const eventId = all.find((mb) => mb.event?.id)?.event?.id as string | undefined;
  if (!eventId) return { ok: false, error: "Événement introuvable" };

  let admin;
  try {
    admin = createServiceClient();
  } catch {
    return { ok: false, error: "Configuration serveur indisponible" };
  }

  // Vérifier que l'alerte appartient bien à cet event
  const { data: existing } = await admin
    .from("safer_alerts")
    .select("id, event_id")
    .eq("id", input.alertId)
    .maybeSingle();
  if (!existing || (existing as any).event_id !== eventId)
    return { ok: false, error: "Alerte introuvable" };

  const { error } = await admin.from("safer_alerts").delete().eq("id", input.alertId);
  if (error) return { ok: false, error: error.message };

  await admin.from("audit_log").insert({
    event_id: eventId,
    user_id: userData.user.id,
    action: "safer.alert.deleted",
    payload: { alert_id: input.alertId },
  });

  revalidatePath(`/v/${input.orgSlug}/${input.eventSlug}/safer`);
  revalidatePath(`/regie/${input.orgSlug}/${input.eventSlug}/safer`);
  return { ok: true };
}

// ─── Vider l'historique résolu/fausse alerte (direction uniquement) ───────────

export async function clearSaferHistory(input: {
  orgSlug: string;
  eventSlug: string;
}): Promise<ActionResult> {
  const supabase = createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Non authentifié" };

  const { data: memberships } = await supabase
    .from("memberships")
    .select("role, event:event_id (id, slug, organization:organization_id (slug))")
    .eq("user_id", userData.user.id)
    .eq("is_active", true)
    .filter("event.slug", "eq", input.eventSlug)
    .filter("event.organization.slug", "eq", input.orgSlug);

  const all = (memberships ?? []) as any[];
  const isDirection = all.some((mb) => mb.role === "direction");
  if (!isDirection) return { ok: false, error: "Direction uniquement" };
  const eventId = all.find((mb) => mb.event?.id)?.event?.id as string | undefined;
  if (!eventId) return { ok: false, error: "Événement introuvable" };

  let admin;
  try {
    admin = createServiceClient();
  } catch {
    return { ok: false, error: "Configuration serveur indisponible" };
  }

  const { error } = await admin
    .from("safer_alerts")
    .delete()
    .eq("event_id", eventId)
    .in("status", ["resolved", "false_alarm"]);

  if (error) return { ok: false, error: error.message };

  await admin.from("audit_log").insert({
    event_id: eventId,
    user_id: userData.user.id,
    action: "safer.history.cleared",
    payload: {},
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
