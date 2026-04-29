/**
 * Edge Function : ban_validator
 * Workflow ban 3-of-N : valide un ban_proposal et applique le ban si seuil atteint.
 * INPUT  : { ban_proposal_id }
 * OUTPUT : { ok, validations_count, required, ban_enforced }
 */
// deno-lint-ignore-file no-explicit-any
import { createServiceClient } from "../_shared/supabase.ts";
import { corsHeaders, preflightResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const preflight = preflightResponse(req);
  if (preflight) return preflight;
  const headers = { ...corsHeaders(req.headers.get("origin")), "Content-Type": "application/json" };

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers });
  }

  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers });
  }

  const supabase = createServiceClient();

  const { data: userData } = await supabase.auth.getUser(authHeader.replace(/^Bearer\s+/iu, ""));
  if (!userData?.user) {
    return new Response(JSON.stringify({ error: "auth_failed" }), { status: 401, headers });
  }
  const validatorId = userData.user.id;

  let body: { ban_proposal_id: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400, headers });
  }

  if (!body.ban_proposal_id) {
    return new Response(JSON.stringify({ error: "missing_ban_proposal_id" }), { status: 400, headers });
  }

  // Récupérer le ban_proposal
  const { data: proposal, error: pErr } = await supabase
    .from("moderation_actions")
    .select("id, event_id, target_user_id, kind, reason, related_alert_id")
    .eq("id", body.ban_proposal_id)
    .maybeSingle();

  if (pErr || !proposal || proposal.kind !== "ban_proposal") {
    return new Response(JSON.stringify({ error: "proposal_not_found" }), { status: 404, headers });
  }

  // Vérifier que le validateur a au moins le rôle volunteer_lead sur l'event
  const { data: membership } = await supabase
    .from("memberships")
    .select("role, is_active")
    .eq("user_id", validatorId)
    .eq("event_id", proposal.event_id)
    .eq("is_active", true)
    .maybeSingle();

  if (!membership || !["direction", "volunteer_lead"].includes(membership.role)) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers });
  }

  // Empêcher l'auto-validation par l'auteur de la proposition
  const { data: originalProposal } = await supabase
    .from("moderation_actions")
    .select("actor_user_id")
    .eq("id", proposal.id)
    .single();

  if (originalProposal?.actor_user_id === validatorId) {
    return new Response(JSON.stringify({ error: "cannot_self_validate" }), { status: 400, headers });
  }

  // Vérifier qu'il n'a pas déjà validé
  const { data: alreadyValidated } = await supabase
    .from("moderation_actions")
    .select("id")
    .eq("ban_proposal_id", proposal.id)
    .eq("kind", "ban_validate")
    .eq("actor_user_id", validatorId)
    .maybeSingle();

  if (alreadyValidated) {
    return new Response(JSON.stringify({ error: "already_validated" }), { status: 400, headers });
  }

  // Insérer la validation
  const { error: insertErr } = await supabase.from("moderation_actions").insert({
    event_id: proposal.event_id,
    target_user_id: proposal.target_user_id,
    actor_user_id: validatorId,
    kind: "ban_validate",
    reason: proposal.reason,
    ban_proposal_id: proposal.id,
    related_alert_id: proposal.related_alert_id,
  });

  if (insertErr) {
    return new Response(JSON.stringify({ error: "insert_failed", details: insertErr.message }), {
      status: 500,
      headers,
    });
  }

  // Compter les validations + récupérer le seuil de l'organization
  const { data: validations } = await supabase
    .from("moderation_actions")
    .select("actor_user_id")
    .eq("ban_proposal_id", proposal.id)
    .eq("kind", "ban_validate");

  const { data: ev } = await supabase
    .from("events")
    .select("organization:organization_id (ban_required_approvals)")
    .eq("id", proposal.event_id)
    .single();

  const required = (ev as any)?.organization?.ban_required_approvals ?? 3;
  const validatorIds = (validations ?? []).map((v: any) => v.actor_user_id);
  const validationsCount = validatorIds.length;
  let banEnforced = false;

  if (validationsCount >= required) {
    // Insérer ban dans table bans (via service role qui bypass RLS bans_insert_via_function_only)
    const { error: banErr } = await supabase.from("bans").insert({
      event_id: proposal.event_id,
      target_user_id: proposal.target_user_id,
      reason: proposal.reason,
      ban_proposal_id: proposal.id,
      validated_by: validatorIds,
    });

    if (!banErr) {
      banEnforced = true;
      // Désactiver le membership de la cible
      await supabase
        .from("memberships")
        .update({ is_active: false })
        .eq("user_id", proposal.target_user_id)
        .eq("event_id", proposal.event_id);

      await supabase.from("audit_log").insert({
        user_id: validatorId,
        event_id: proposal.event_id,
        action: "ban.enforced",
        payload: {
          target_user_id: proposal.target_user_id,
          ban_proposal_id: proposal.id,
          validators: validatorIds,
        },
      });
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      validations_count: validationsCount,
      required,
      ban_enforced: banEnforced,
    }),
    { status: 200, headers },
  );
});
