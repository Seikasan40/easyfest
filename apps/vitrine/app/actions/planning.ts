"use server";

import { revalidatePath } from "next/cache";

import { createServerClient } from "@/lib/supabase/server";

interface ReassignInput {
  assignmentId: string;
  targetShiftId: string | null; // null = retour au pool (assignment supprimée)
}

export async function reassignVolunteer(input: ReassignInput) {
  const supabase = createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Non authentifié" };

  // 1. Récup l'affectation source
  const { data: source } = await supabase
    .from("assignments")
    .select("id, shift_id, volunteer_user_id, shift:shift_id (position:position_id (event_id))")
    .eq("id", input.assignmentId)
    .single();

  if (!source) return { ok: false, error: "Affectation introuvable" };
  const eventId = (source as any).shift?.position?.event_id;

  // 2. Si target shift = null, on supprime l'affectation
  if (!input.targetShiftId) {
    const { error } = await supabase.from("assignments").delete().eq("id", input.assignmentId);
    if (error) return { ok: false, error: error.message };
    await supabase.from("audit_log").insert({
      user_id: userData.user.id,
      event_id: eventId,
      action: "assignment.removed",
      payload: { assignment_id: input.assignmentId },
    });
    revalidatePath("/regie", "layout");
    return { ok: true };
  }

  // 3. Sinon update shift_id (ne change pas le bénévole)
  const { error } = await supabase
    .from("assignments")
    .update({ shift_id: input.targetShiftId, assigned_by: userData.user.id })
    .eq("id", input.assignmentId);

  if (error) return { ok: false, error: error.message };

  await supabase.from("audit_log").insert({
    user_id: userData.user.id,
    event_id: eventId,
    action: "assignment.reassigned",
    payload: {
      assignment_id: input.assignmentId,
      from_shift: source.shift_id,
      to_shift: input.targetShiftId,
    },
  });

  revalidatePath("/regie", "layout");
  return { ok: true };
}

export async function manualVolunteerSignup(input: {
  eventId: string;
  email: string;
  fullName: string;
  phone?: string;
  positionSlug?: string;
}) {
  const supabase = createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Non authentifié" };

  const { data: app, error } = await supabase
    .from("volunteer_applications")
    .insert({
      event_id: input.eventId,
      email: input.email,
      full_name: input.fullName,
      phone: input.phone,
      preferred_position_slugs: input.positionSlug ? [input.positionSlug] : [],
      status: "validated",
      validated_by: userData.user.id,
      validated_at: new Date().toISOString(),
      source: "admin_manual",
      consent_pii_at: new Date().toISOString(),
      consent_charter_at: new Date().toISOString(),
      consent_anti_harass_at: new Date().toISOString(),
      privacy_policy_version_accepted: "1.0.0",
    })
    .select("id")
    .single();

  if (error || !app) return { ok: false, error: error?.message ?? "Insert failed" };

  // Trigger send_validation_mail
  await supabase.functions.invoke("send_validation_mail", {
    body: { application_id: app.id },
  });

  await supabase.from("audit_log").insert({
    user_id: userData.user.id,
    event_id: input.eventId,
    action: "application.manual_signup",
    payload: { application_id: app.id, email: input.email },
  });

  revalidatePath("/regie", "layout");
  return { ok: true, applicationId: app.id };
}

interface AssignToTeamInput {
  volunteerUserId: string;
  targetPositionId: string | null; // null = pool (retire toutes les assignments du bénévole sur cet event)
  eventId: string;
}

/**
 * Affecte un bénévole à une équipe (position) sur un event :
 * 1. Supprime toutes ses assignments actives sur l'event
 * 2. Si targetPositionId fourni, crée une assignment sur le 1er shift disponible de cette position
 * 3. Si pas de shift défini, crée un shift "couverture totale" par défaut
 */
export async function assignVolunteerToTeam(input: AssignToTeamInput) {
  const supabase = createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Non authentifié" };

  // ⚠️ Multi-memberships safe : Sandy a volunteer + volunteer_lead → .maybeSingle()
  // erroriait, retournant Permission refusée à chaque drag. On agrège via .some().
  const { data: memberships } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("event_id", input.eventId)
    .eq("is_active", true);

  const allowedRoles = ["direction", "volunteer_lead"];
  const hasAccess = (memberships ?? []).some((m: any) => allowedRoles.includes(m.role));
  if (!hasAccess) {
    return { ok: false, error: "Permission refusée" };
  }

  // 1. Récupérer toutes les assignments du bénévole sur les shifts de cet event
  const { data: existingAssignments } = await supabase
    .from("assignments")
    .select(`id, shift:shift_id (position:position_id (event_id))`)
    .eq("volunteer_user_id", input.volunteerUserId)
    .in("status", ["pending", "validated"]);

  const eventAssignmentIds = (existingAssignments ?? [])
    .filter((a: any) => a.shift?.position?.event_id === input.eventId)
    .map((a: any) => a.id);

  if (eventAssignmentIds.length > 0) {
    const { error: delErr } = await supabase
      .from("assignments")
      .delete()
      .in("id", eventAssignmentIds);
    if (delErr) return { ok: false, error: `Suppression échouée : ${delErr.message}` };
  }

  // 2. Si targetPositionId est null, on s'arrête ici (= renvoi au pool)
  if (!input.targetPositionId) {
    await supabase.from("audit_log").insert({
      user_id: userData.user.id,
      event_id: input.eventId,
      action: "assignment.team.removed",
      payload: { volunteer_user_id: input.volunteerUserId },
    });
    revalidatePath("/regie", "layout");
    return { ok: true };
  }

  // 3. Sinon, trouver un shift dans la position cible
  const { data: shifts } = await supabase
    .from("shifts")
    .select("id, starts_at")
    .eq("position_id", input.targetPositionId)
    .order("starts_at", { ascending: true })
    .limit(1);

  let targetShiftId = shifts?.[0]?.id;

  // 3b. Pas de shift défini ? Créer un shift "default" couvrant tout l'event
  if (!targetShiftId) {
    const { data: ev } = await supabase
      .from("events")
      .select("starts_at, ends_at")
      .eq("id", input.eventId)
      .maybeSingle();
    if (!ev) return { ok: false, error: "Event introuvable" };

    const { data: newShift, error: shiftErr } = await supabase
      .from("shifts")
      .insert({
        position_id: input.targetPositionId,
        starts_at: ev.starts_at,
        ends_at: ev.ends_at,
        needs_count: 1,
        notes: "Shift couverture totale créé via planning équipes",
      })
      .select("id")
      .single();
    if (shiftErr || !newShift) {
      return { ok: false, error: `Création shift échouée : ${shiftErr?.message}` };
    }
    targetShiftId = newShift.id;
  }

  // 4. Créer l'assignment
  const { error: insertErr } = await supabase.from("assignments").insert({
    shift_id: targetShiftId,
    volunteer_user_id: input.volunteerUserId,
    status: "validated",
    assigned_by: userData.user.id,
  });

  if (insertErr) {
    // Si conflict (déjà assigné — peut arriver après cleanup), on considère ok
    if (insertErr.code === "23505") {
      // already exists — pas grave
    } else {
      return { ok: false, error: `Assignment échouée : ${insertErr.message}` };
    }
  }

  await supabase.from("audit_log").insert({
    user_id: userData.user.id,
    event_id: input.eventId,
    action: "assignment.team.assigned",
    payload: {
      volunteer_user_id: input.volunteerUserId,
      position_id: input.targetPositionId,
      shift_id: targetShiftId,
    },
  });

  revalidatePath("/regie", "layout");
  return { ok: true };
}
