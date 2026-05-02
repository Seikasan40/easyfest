"use server";

import { revalidatePath } from "next/cache";

import { createServerClient, createServiceClient } from "@/lib/supabase/server";

/**
 * À appeler quand un user vient de se connecter pour la 1ère fois.
 * Upgrade automatiquement les volunteer_applications validées correspondant
 * à son email en :
 * 1. volunteer_profile (créé si manquant)
 * 2. membership (role=volunteer is_active=true) sur l'event correspondant
 *
 * Si la photo a été uploadée à l'inscription, elle est recopiée dans le profil.
 *
 * Sécurité : les inserts memberships/profiles passent par le service-role client
 * (bypass RLS) car la policy `memberships_insert_lead` réserve les inserts à
 * volunteer_lead+. Un volunteer ne peut donc pas s'auto-créer sa membership en
 * user-context. Le contrat de sécurité reste tenu : on ne crée une membership
 * QUE pour les event_ids où il existe une volunteer_application `validated`
 * pour l'email authentifié de l'utilisateur courant.
 */
export async function onboardCurrentUser(): Promise<{
  ok: boolean;
  upgradedApps?: number;
  error?: string;
}> {
  const supabase = createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Non authentifié" };

  const userId = userData.user.id;
  const userEmail = (userData.user.email ?? "").toLowerCase();
  if (!userEmail) return { ok: false, error: "Email manquant" };

  const admin = createServiceClient();

  // 1. Trouver les applications validées pour cet email (via service-role pour
  //    s'affranchir de toute restriction RLS sur volunteer_applications).
  const { data: apps, error: appsErr } = await admin
    .from("volunteer_applications")
    .select(
      "id, event_id, full_name, first_name, last_name, birth_date, is_minor, gender, phone, profession, address_street, address_city, address_zip, size, diet_notes, has_vehicle, driving_license, available_setup, available_teardown, diet_type, carpool, preferred_position_slugs, skills, limitations, bio, is_returning, avatar_url",
    )
    .eq("email", userEmail)
    .eq("status", "validated");

  if (appsErr) return { ok: false, error: `Lookup applications: ${appsErr.message}` };
  if (!apps || apps.length === 0) {
    return { ok: true, upgradedApps: 0 };
  }

  // 2. Vérifier si profil existe déjà
  const { data: existingProfile } = await admin
    .from("volunteer_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  // 3. Créer profile si manquant (à partir de la dernière application)
  if (!existingProfile) {
    const lastApp = apps[0]!; // les applications sont datées, on prend la 1ère
    const { error: profErr } = await admin.from("volunteer_profiles").insert({
      user_id: userId,
      full_name: lastApp.full_name ?? userEmail,
      first_name: lastApp.first_name,
      last_name: lastApp.last_name,
      birth_date: lastApp.birth_date,
      gender: lastApp.gender,
      phone: lastApp.phone,
      email: userEmail,
      address_street: lastApp.address_street,
      address_city: lastApp.address_city,
      address_zip: lastApp.address_zip,
      profession: lastApp.profession,
      size: lastApp.size,
      diet_notes: lastApp.diet_notes,
      diet_type: lastApp.diet_type,
      carpool: lastApp.carpool,
      available_setup: lastApp.available_setup,
      available_teardown: lastApp.available_teardown,
      skills: lastApp.skills ?? [],
      limitations: lastApp.limitations ?? [],
      bio: lastApp.bio,
      avatar_url: lastApp.avatar_url,
      is_returning: lastApp.is_returning ?? false,
    });
    if (profErr) return { ok: false, error: `Profile creation: ${profErr.message}` };
  }

  // 4. Pour chaque application, créer membership si manquant. Fail-fast sur erreur.
  let upgraded = 0;
  for (const app of apps) {
    const { data: existingMembership } = await admin
      .from("memberships")
      .select("id")
      .eq("user_id", userId)
      .eq("event_id", app.event_id)
      .maybeSingle();

    if (!existingMembership) {
      const { error: memErr } = await admin.from("memberships").insert({
        user_id: userId,
        event_id: app.event_id,
        role: "volunteer",
        is_active: true,
      });
      if (memErr) {
        return {
          ok: false,
          upgradedApps: upgraded,
          error: `Membership creation: ${memErr.message}`,
        };
      }
      upgraded++;
    }
  }

  // 5. Audit
  if (upgraded > 0) {
    await admin.from("audit_log").insert({
      user_id: userId,
      action: "user.onboarded",
      payload: { upgraded_applications: upgraded, email: userEmail },
    });
  }

  revalidatePath("/hub");
  revalidatePath("/v", "layout");
  return { ok: true, upgradedApps: upgraded };
}
