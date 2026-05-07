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

/**
 * Envoie un magic-link au bénévole pour qu'il se connecte la 1ère fois.
 * Utilise signInWithOtp (shouldCreateUser=true) qui :
 *  - crée le user dans auth.users si manquant
 *  - envoie le mail magic-link via SMTP Supabase (Resend dans notre cas)
 *
 * Marque l'application avec invited_at + invited_by pour suivi.
 *
 * À utiliser sur les imports Pam (51 inscrits qui n'ont pas de compte créé).
 */
export async function inviteVolunteer(applicationId: string) {
  const supabase = createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Non authentifié" };

  // Récup app
  const { data: app, error: appErr } = await supabase
    .from("volunteer_applications")
    .select("id, email, full_name, event_id, status, invited_at")
    .eq("id", applicationId)
    .single();

  if (appErr || !app) return { ok: false, error: appErr?.message ?? "Application introuvable" };
  if (app.status !== "validated") {
    return { ok: false, error: "L'application doit être validée avant d'inviter" };
  }

  // ⚠️ Multi-memberships safe : Sandy a volunteer + volunteer_lead → .maybeSingle() erroriait
  // → bouton 📧 Inviter retournait Permission refusée. On agrège via .some().
  const { data: memberships } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("event_id", app.event_id)
    .eq("is_active", true);

  const allowedRoles = ["direction", "volunteer_lead"];
  const hasAccess = (memberships ?? []).some((m: any) => allowedRoles.includes(m.role));
  if (!hasAccess) {
    return { ok: false, error: "Permission refusée" };
  }

  // Envoyer le magic-link (signInWithOtp crée le user si manquant).
  // Fallback URL = easyfest.app (prod). NEXT_PUBLIC_APP_URL aligné avec onboard-self-serve.ts.
  const baseUrl =
    process.env["NEXT_PUBLIC_APP_URL"] ?? process.env["NEXT_PUBLIC_SITE_URL"] ?? "https://easyfest.app";
  // Le redirect cible /auth/callback (page client) qui parse le hash JWT
  // produit par le flow implicit, pose la session via setSession() puis
  // route vers ?next=/hub où onboardCurrentUser crée la membership.
  // Sans cette indirection, Supabase ramène l'user sur /hub#access_token=…
  // que Next.js (server-side, hash invisible) ne peut pas exploiter.
  const { error: otpErr } = await supabase.auth.signInWithOtp({
    email: app.email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${baseUrl}/auth/callback?next=/hub`,
    },
  });

  if (otpErr) {
    return { ok: false, error: `Envoi mail échoué : ${otpErr.message}` };
  }

  // Marquer comme invité
  await supabase
    .from("volunteer_applications")
    .update({
      invited_at: new Date().toISOString(),
      invited_by: userData.user.id,
    })
    .eq("id", applicationId);

  // Audit
  await supabase.from("audit_log").insert({
    user_id: userData.user.id,
    event_id: app.event_id,
    action: "application.invited",
    payload: { application_id: applicationId, email: app.email },
  });

  revalidatePath("/regie", "layout");
  return { ok: true, email: app.email };
}

// ─── Supprimer une candidature ────────────────────────────────────────────────
export async function deleteApplication(applicationId: string) {
  const supabase = createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Non authentifié" };

  // Récupérer l'event_id pour l'audit + vérifier les droits
  const { data: app } = await supabase
    .from("volunteer_applications")
    .select("event_id, email")
    .eq("id", applicationId)
    .single();
  if (!app) return { ok: false, error: "Candidature introuvable" };

  const { data: memberships } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("event_id", app.event_id)
    .eq("is_active", true);
  const hasAccess = (memberships ?? []).some((m: any) =>
    ["direction", "volunteer_lead"].includes(m.role),
  );
  if (!hasAccess) return { ok: false, error: "Permission refusée" };

  const { error } = await supabase
    .from("volunteer_applications")
    .delete()
    .eq("id", applicationId);
  if (error) return { ok: false, error: error.message };

  await supabase.from("audit_log").insert({
    user_id: userData.user.id,
    event_id: app.event_id,
    action: "application.deleted",
    payload: { application_id: applicationId, email: app.email },
  });

  revalidatePath("/regie", "layout");
  return { ok: true };
}

// ─── Révoquer l'accès (désactiver membership) ──────────────────────────────
export async function revokeAccess(userId: string, eventId: string) {
  const supabase = createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Non authentifié" };

  const { data: memberships } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("event_id", eventId)
    .eq("is_active", true);
  const hasAccess = (memberships ?? []).some((m: any) =>
    ["direction"].includes(m.role),
  );
  if (!hasAccess) return { ok: false, error: "Seule la direction peut révoquer un accès" };

  const { error } = await supabase
    .from("memberships")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("event_id", eventId);
  if (error) return { ok: false, error: error.message };

  await supabase.from("audit_log").insert({
    user_id: userData.user.id,
    event_id: eventId,
    action: "membership.revoked",
    payload: { target_user_id: userId },
  });

  revalidatePath("/regie", "layout");
  return { ok: true };
}

// ─── Changer le rôle d'un membre ──────────────────────────────────────────────
export async function changeMemberRole(userId: string, eventId: string, newRole: MemberRole) {
  const supabase = createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Non authentifié" };

  const { data: memberships } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("event_id", eventId)
    .eq("is_active", true);
  const hasAccess = (memberships ?? []).some((m: any) =>
    ["direction"].includes(m.role),
  );
  if (!hasAccess) return { ok: false, error: "Seule la direction peut modifier un rôle" };

  const { error } = await supabase
    .from("memberships")
    .update({ role: newRole })
    .eq("user_id", userId)
    .eq("event_id", eventId)
    .eq("is_active", true);
  if (error) return { ok: false, error: error.message };

  await supabase.from("audit_log").insert({
    user_id: userData.user.id,
    event_id: eventId,
    action: "membership.role_changed",
    payload: { target_user_id: userId, new_role: newRole },
  });

  revalidatePath("/regie", "layout");
  return { ok: true };
}
