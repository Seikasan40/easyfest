/**
 * Types TypeScript de la BDD Supabase.
 * Généré par : `pnpm db:types` (commande : supabase gen types typescript)
 *
 * NE PAS ÉDITER À LA MAIN — sera réécrit après J1.
 * Pour l'instant, placeholder type-safe pour permettre la compilation.
 */
export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      role_kind: "volunteer" | "post_lead" | "staff_scan" | "volunteer_lead" | "direction";
      application_status: "pending" | "validated" | "refused" | "reserve" | "pre_selected" | "duplicate";
      assignment_status: "pending" | "validated" | "refused" | "reserve" | "no_show" | "completed";
      wellbeing_level: "green" | "yellow" | "red";
      safer_alert_kind: "harassment" | "physical_danger" | "medical" | "wellbeing_red" | "other";
      moderation_action_kind: "mute" | "ban_proposal" | "ban_validate" | "unban";
      scan_kind: "arrival" | "meal" | "post_take" | "exit";
    };
  };
};
