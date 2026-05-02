/**
 * 5 rôles primaires + 2 sous-rôles flag-based.
 * Source de vérité unique pour : RLS Postgres, picker home, libellés UI, redirects auth.
 * NE PAS RENOMMER les codes internes — ils sont liés à l'enum Postgres `role_kind`.
 */

export const ROLE_KINDS = ["volunteer", "post_lead", "staff_scan", "volunteer_lead", "direction"] as const;
export type RoleKind = (typeof ROLE_KINDS)[number];

export interface RoleDefinition {
  code: RoleKind;
  label: string;
  shortLabel: string;
  subtitleTemplate: string;
  routePrefix: string;
  hierarchy: number; // 1 = le plus haut (direction), 5 = le plus bas (volunteer)
  canModerate: boolean;
  canValidateApplications: boolean;
  canViewAllVolunteers: boolean;
  canScanArrival: boolean;
  canScanMeal: boolean;
  canScanPostTake: boolean;
  canExport: boolean;
}

export const ROLE_DEFINITIONS: Record<RoleKind, RoleDefinition> = {
  direction: {
    code: "direction",
    label: "Je suis régie",
    shortLabel: "Régie",
    subtitleTemplate: "Vue d'ensemble du festival",
    routePrefix: "/regie",
    hierarchy: 1,
    canModerate: true,
    canValidateApplications: true,
    canViewAllVolunteers: true,
    canScanArrival: true,
    canScanMeal: true,
    canScanPostTake: true,
    canExport: true,
  },
  volunteer_lead: {
    code: "volunteer_lead",
    label: "Je suis resp. bénévoles",
    shortLabel: "Resp. bénévoles",
    subtitleTemplate: "{firstName} · Validation, planning, modération",
    routePrefix: "/r",
    hierarchy: 2,
    canModerate: false,
    canValidateApplications: true,
    canViewAllVolunteers: true,
    canScanArrival: true,
    canScanMeal: false,
    canScanPostTake: false,
    canExport: true,
  },
  post_lead: {
    code: "post_lead",
    label: "Je suis resp. de poste",
    shortLabel: "Resp. de poste",
    subtitleTemplate: "{firstName} · {positionName} — son équipe seulement",
    routePrefix: "/poste",
    hierarchy: 3,
    canModerate: false,
    canValidateApplications: false,
    canViewAllVolunteers: false,
    canScanArrival: true,
    canScanMeal: false,
    canScanPostTake: true,
    canExport: false,
  },
  staff_scan: {
    code: "staff_scan",
    label: "Je suis staff terrain",
    shortLabel: "Staff terrain",
    subtitleTemplate: "{firstName} · Scan d'accueil",
    routePrefix: "/staff",
    hierarchy: 4,
    canModerate: false,
    canValidateApplications: false,
    canViewAllVolunteers: false,
    canScanArrival: true,
    canScanMeal: true,
    canScanPostTake: false,
    canExport: false,
  },
  volunteer: {
    code: "volunteer",
    label: "Je suis bénévole",
    shortLabel: "Bénévole",
    subtitleTemplate: "{firstName} · {positionName}",
    routePrefix: "/v",
    hierarchy: 5,
    canModerate: false,
    canValidateApplications: false,
    canViewAllVolunteers: false,
    canScanArrival: false, // sauf flag is_entry_scanner
    canScanMeal: false,
    canScanPostTake: false,
    canExport: false,
  },
};

export const ROLE_CARDS_ORDER: RoleKind[] = [
  "volunteer",
  "post_lead",
  "staff_scan",
  "volunteer_lead",
  "direction",
];

/**
 * Sous-rôles flag-based stockés dans `memberships`.
 * Ces flags ne sont PAS des cartes du picker home — ils ajoutent des permissions
 * spécifiques au rôle de base (volunteer).
 */
export const SUB_ROLE_FLAGS = ["is_entry_scanner", "is_mediator"] as const;
export type SubRoleFlag = (typeof SUB_ROLE_FLAGS)[number];

export const SUB_ROLE_DEFINITIONS: Record<SubRoleFlag, { label: string; subtitle: string }> = {
  is_entry_scanner: {
    label: "Bénévole d'entrée",
    subtitle: "Premier scan à la guérite — accueil arrivants",
  },
  is_mediator: {
    label: "Médiateur·ice Safer Space",
    subtitle: "Personne de confiance, écoute bien-être bénévoles",
  },
};

/** Helper : la role kind A peut-elle agir sur la role kind B ? (hiérarchie) */
export function canActOn(actor: RoleKind, target: RoleKind): boolean {
  return ROLE_DEFINITIONS[actor].hierarchy <= ROLE_DEFINITIONS[target].hierarchy;
}

/** Format human-friendly du sous-titre (template interpolation light). */
export function formatRoleSubtitle(
  roleCode: RoleKind,
  context: { firstName?: string; positionName?: string },
): string {
  const tpl = ROLE_DEFINITIONS[roleCode].subtitleTemplate;
  return tpl
    .replace("{firstName}", context.firstName ?? "Bénévole")
    .replace("{positionName}", context.positionName ?? "Poste à confirmer");
}
