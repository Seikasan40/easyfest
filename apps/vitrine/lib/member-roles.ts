/**
 * Shared member roles list — importable by both server actions and client components.
 * Must NOT be in a "use server" file (non-function exports are stripped by Next.js bundler
 * on the client side when imported from a "use server" module).
 */
export const MEMBER_ROLES = [
  { value: "volunteer",      label: "Bénévole" },
  { value: "volunteer_lead", label: "Resp. bénévoles" },
  { value: "post_lead",      label: "Resp. de poste" },
  { value: "staff_scan",     label: "Staff scan" },
  { value: "direction",      label: "Direction" },
] as const;

export type MemberRole = (typeof MEMBER_ROLES)[number]["value"];
