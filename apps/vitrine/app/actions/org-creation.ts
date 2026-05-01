"use server";

/**
 * Server actions — OC-01 onboarding self-service direction.
 * Distinct de actions/onboard.ts (auto-upgrade bénévole post-magic-link).
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createServerClient, createServiceClient } from "@/lib/supabase/server";

// ─── Schémas Zod (validation server-side) ───────────────────────────
const slugSchema = z
  .string()
  .min(3)
  .max(42)
  .regex(
    /^[a-z0-9][a-z0-9-]{1,40}[a-z0-9]$/,
    "Slug invalide (lettres minuscules, chiffres et tirets)",
  );

const createOrgSchema = z.object({
  org_name: z.string().min(2, "Nom de l'asso trop court").max(100),
  org_slug: slugSchema,
  event_name: z.string().min(2, "Nom de l'événement trop court").max(120),
  event_slug: slugSchema,
  event_starts: z.string().datetime({ offset: true }),
  event_ends: z.string().datetime({ offset: true }),
  template_slug: z.string().optional().nullable(),
});

const TEAM_ROLES = ["direction", "volunteer_lead", "post_lead", "staff_scan"] as const;

const inviteSchema = z.object({
  event_id: z.string().uuid(),
  invites: z
    .array(
      z.object({
        email: z.string().email("Email invalide"),
        role: z.enum(TEAM_ROLES),
      }),
    )
    .min(0)
    .max(10, "Maximum 10 invitations par envoi"),
});

// ─── Action 1 : créer org + event + appliquer template ───────────────
export type CreateOrgResult =
  | { ok: true; org_slug: string; event_slug: string; event_id: string }
  | { ok: false; error: string; field?: string };

export async function createOrganizationFromWizard(
  raw: z.input<typeof createOrgSchema>,
): Promise<CreateOrgResult> {
  const parsed = createOrgSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: issue?.message ?? "Validation",
      field: issue?.path?.[0]?.toString(),
    };
  }

  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Non authentifié" };
  }

  // Skip auto si l'user a déjà une membership direction (l'OC-01 wizard est pour les NOUVEAUX directeurs)
  const { data: existingDirection } = await (supabase as any)
    .from("memberships")
    .select("id")
    .eq("user_id", user.id)
    .eq("role", "direction")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (existingDirection) {
    return { ok: false, error: "already_direction" };
  }

  const { data, error } = await (supabase as any).rpc("bootstrap_org_for_user", {
    p_org_name: parsed.data.org_name,
    p_org_slug: parsed.data.org_slug,
    p_event_name: parsed.data.event_name,
    p_event_slug: parsed.data.event_slug,
    p_event_starts: parsed.data.event_starts,
    p_event_ends: parsed.data.event_ends,
    p_template_slug: parsed.data.template_slug ?? null,
  });

  if (error) {
    // Mapping des codes d'erreur Postgres → messages utilisateur
    const code = (error as { code?: string }).code;
    const msg =
      code === "23505"
        ? "Ce slug est déjà utilisé"
        : code === "23514"
          ? "Données invalides (slug, dates ou nom)"
          : code === "42501"
            ? "Non authentifié"
            : ((error as Error).message ?? "Création impossible");
    return { ok: false, error: msg };
  }

  // RPC retourne un table — Supabase renvoie un array.
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.event_id) {
    return { ok: false, error: "RPC sans réponse" };
  }

  revalidatePath("/hub");
  return {
    ok: true,
    org_slug: row.org_slug,
    event_slug: row.event_slug,
    event_id: row.event_id,
  };
}

// ─── Action 2 : inviter l'équipe initiale par email ─────────────────
export type InviteTeamResult = {
  ok: boolean;
  invited: number;
  errors: { email: string; reason: string }[];
};

export async function inviteTeamMembers(
  raw: z.input<typeof inviteSchema>,
): Promise<InviteTeamResult> {
  const parsed = inviteSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      invited: 0,
      errors: [{ email: "*", reason: parsed.error.issues[0]?.message ?? "Validation" }],
    };
  }

  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, invited: 0, errors: [{ email: "*", reason: "unauthenticated" }] };
  }

  // Vérifie que l'utilisateur est bien direction sur l'event
  const { data: actorMembership } = await (supabase as any)
    .from("memberships")
    .select("id")
    .eq("user_id", user.id)
    .eq("event_id", parsed.data.event_id)
    .eq("role", "direction")
    .eq("is_active", true)
    .maybeSingle();
  if (!actorMembership) {
    return { ok: false, invited: 0, errors: [{ email: "*", reason: "forbidden" }] };
  }

  const admin: any = createServiceClient();
  const errors: { email: string; reason: string }[] = [];
  let invited = 0;

  for (const invite of parsed.data.invites) {
    const email = invite.email.toLowerCase();

    // 1. Crée (ou récupère) l'utilisateur via invite Supabase Auth
    const { data: inviteData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { source: "easyfest_team_invite", event_id: parsed.data.event_id, role: invite.role },
    });

    let invitedUserId: string | null = null;
    if (inviteErr) {
      // Si l'utilisateur existe déjà, Supabase retourne une erreur — on tente getUserByEmail
      const { data: lookup } = await admin.auth.admin
        .listUsers({ page: 1, perPage: 1, filter: `email = "${email}"` })
        .catch(() => ({ data: { users: [] } }));
      const existing = (lookup as any)?.users?.find?.(
        (u: any) => (u.email ?? "").toLowerCase() === email,
      );
      if (existing) {
        invitedUserId = existing.id;
      } else {
        errors.push({ email, reason: inviteErr.message ?? "invite_failed" });
        continue;
      }
    } else {
      invitedUserId = inviteData?.user?.id ?? null;
    }

    if (!invitedUserId) {
      errors.push({ email, reason: "no_user_id_returned" });
      continue;
    }

    // 2. Insère le membership inactif (sera activé à l'acceptation côté /hub)
    const { error: memErr } = await admin.from("memberships").insert({
      user_id: invitedUserId,
      event_id: parsed.data.event_id,
      role: invite.role,
      is_active: false,
      invited_at: new Date().toISOString(),
      invited_by: user.id,
    });
    if (memErr && !memErr.message?.includes("duplicate")) {
      errors.push({ email, reason: memErr.message ?? "membership_failed" });
      continue;
    }

    invited++;
  }

  if (invited > 0) {
    await admin.from("audit_log").insert({
      user_id: user.id,
      event_id: parsed.data.event_id,
      action: "onboarding.team_invited",
      payload: { invited_count: invited, errors_count: errors.length },
    });
  }

  return { ok: errors.length === 0, invited, errors };
}
