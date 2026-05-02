/**
 * ════════════════════════════════════════════════════════════════════
 *  Cross-tenant guards — tests Vitest
 *  Objectif : valider l'isolation multi-tenant (Org × Event × Role)
 *  côté logique métier _avant_ que la requête n'atteigne RLS Postgres.
 *  Defense in depth : la couche app doit refuser ce que RLS refuserait
 *  même si quelqu'un retire RLS par erreur.
 * ════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from "vitest";

import { canActOn, ROLE_DEFINITIONS, ROLE_KINDS, type RoleKind } from "../constants/roles";
import { isValidSlug, slugify } from "../utils/slug";

// ─── Modèle de fixtures multi-tenant ───────────────────────────────
type Membership = {
  userId: string;
  orgId: string;
  eventId: string;
  role: RoleKind;
  isActive: boolean;
  positionId?: string | null;
  isEntryScanner?: boolean;
};

const ORG_A = "org-icmpaca";
const ORG_B = "org-astropolis";
const EVENT_A1 = "evt-rdl-2026"; // org A
const EVENT_A2 = "evt-rdl-2027"; // org A, autre édition
const EVENT_B1 = "evt-astro-2026"; // org B

const memberships: Membership[] = [
  // Direction org A / event A1
  { userId: "pam", orgId: ORG_A, eventId: EVENT_A1, role: "direction", isActive: true },
  // Volunteer lead org A / event A1
  { userId: "dorothee", orgId: ORG_A, eventId: EVENT_A1, role: "volunteer_lead", isActive: true },
  // Post lead org A / event A1, position bar
  {
    userId: "mahaut",
    orgId: ORG_A,
    eventId: EVENT_A1,
    role: "post_lead",
    isActive: true,
    positionId: "pos-bar",
  },
  // Bénévole org A / event A1, position bar
  {
    userId: "lucas",
    orgId: ORG_A,
    eventId: EVENT_A1,
    role: "volunteer",
    isActive: true,
    positionId: "pos-bar",
  },
  // Bénévole org A / event A1 sur autre poste
  {
    userId: "sandy",
    orgId: ORG_A,
    eventId: EVENT_A1,
    role: "volunteer",
    isActive: true,
    positionId: "pos-merch",
  },
  // Direction org B (autre tenant) — ne doit AVOIR AUCUN droit sur org A
  { userId: "intrus", orgId: ORG_B, eventId: EVENT_B1, role: "direction", isActive: true },
];

// ─── Helpers métier (miroir des helpers SQL role_in_event / has_role_at_least) ─
function roleInEvent(userId: string, eventId: string): RoleKind | null {
  const m = memberships
    .filter((x) => x.userId === userId && x.eventId === eventId && x.isActive)
    .sort((a, b) => ROLE_DEFINITIONS[a.role].hierarchy - ROLE_DEFINITIONS[b.role].hierarchy)[0];
  return m?.role ?? null;
}
function hasRoleAtLeast(userId: string, eventId: string, threshold: RoleKind): boolean {
  const r = roleInEvent(userId, eventId);
  if (!r) return false;
  return ROLE_DEFINITIONS[r].hierarchy <= ROLE_DEFINITIONS[threshold].hierarchy;
}

// ════════════════════════════════════════════════════════════════════
// 1. ISOLATION INTER-ORG (cross-tenant strict)
// ════════════════════════════════════════════════════════════════════
describe("Cross-tenant — isolation Organization × Organization", () => {
  it("Direction de l'org B n'a AUCUN rôle sur un event de l'org A", () => {
    expect(roleInEvent("intrus", EVENT_A1)).toBeNull();
    expect(hasRoleAtLeast("intrus", EVENT_A1, "volunteer")).toBe(false);
    expect(hasRoleAtLeast("intrus", EVENT_A1, "direction")).toBe(false);
  });

  it("Direction de l'org A n'a AUCUN rôle sur un event de l'org B", () => {
    expect(roleInEvent("pam", EVENT_B1)).toBeNull();
    expect(hasRoleAtLeast("pam", EVENT_B1, "volunteer")).toBe(false);
  });

  it("Slug de tenant : pas de collision entre orgs", () => {
    const slugA = slugify("ICM PACA");
    const slugB = slugify("Astropolis Productions");
    expect(slugA).not.toBe(slugB);
    expect(isValidSlug(slugA)).toBe(true);
    expect(isValidSlug(slugB)).toBe(true);
  });

  it("Énumération exhaustive : aucun rôle ne fuite cross-org", () => {
    for (const role of ROLE_KINDS) {
      expect(hasRoleAtLeast("intrus", EVENT_A1, role)).toBe(false);
      expect(hasRoleAtLeast("pam", EVENT_B1, role)).toBe(false);
    }
  });
});

// ════════════════════════════════════════════════════════════════════
// 2. ISOLATION INTER-EVENTS (même org, autre édition)
// ════════════════════════════════════════════════════════════════════
describe("Cross-tenant — isolation Event × Event (même Organization)", () => {
  it("Direction de RDL 2026 n'est PAS direction de RDL 2027 par défaut", () => {
    expect(roleInEvent("pam", EVENT_A2)).toBeNull();
    expect(hasRoleAtLeast("pam", EVENT_A2, "direction")).toBe(false);
  });

  it("Volunteer_lead n'a AUCUN droit sur une autre édition tant qu'aucun membership n'a été créé", () => {
    expect(hasRoleAtLeast("dorothee", EVENT_A2, "volunteer")).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════
// 3. HIÉRARCHIE — canActOn doit être strictement ordonné
// ════════════════════════════════════════════════════════════════════
describe("Hiérarchie — canActOn", () => {
  it("direction peut agir sur tous les rôles", () => {
    for (const target of ROLE_KINDS) {
      expect(canActOn("direction", target)).toBe(true);
    }
  });

  it("volunteer ne peut agir que sur volunteer", () => {
    expect(canActOn("volunteer", "volunteer")).toBe(true);
    expect(canActOn("volunteer", "post_lead")).toBe(false);
    expect(canActOn("volunteer", "staff_scan")).toBe(false);
    expect(canActOn("volunteer", "volunteer_lead")).toBe(false);
    expect(canActOn("volunteer", "direction")).toBe(false);
  });

  it("post_lead ne peut PAS agir sur volunteer_lead ni direction", () => {
    expect(canActOn("post_lead", "direction")).toBe(false);
    expect(canActOn("post_lead", "volunteer_lead")).toBe(false);
    expect(canActOn("post_lead", "post_lead")).toBe(true);
    expect(canActOn("post_lead", "volunteer")).toBe(true);
  });

  it("hiérarchie globale est cohérente (transitive et anti-symétrique strict)", () => {
    for (const a of ROLE_KINDS) {
      for (const b of ROLE_KINDS) {
        const aOnB = canActOn(a, b);
        const bOnA = canActOn(b, a);
        if (a === b) {
          expect(aOnB && bOnA).toBe(true);
        } else {
          // au moins l'un des deux doit être false (pas d'égalité hors a==b)
          expect(aOnB && bOnA).toBe(false);
        }
      }
    }
  });
});

// ════════════════════════════════════════════════════════════════════
// 4. POST_LEAD — scope limité à son équipe (même position)
// ════════════════════════════════════════════════════════════════════
describe("Cross-tenant — post_lead scope limité à sa position", () => {
  function postLeadCanSee(actorId: string, targetUserId: string, eventId: string): boolean {
    const actor = memberships.find(
      (m) => m.userId === actorId && m.eventId === eventId && m.role === "post_lead" && m.isActive,
    );
    if (!actor || !actor.positionId) return false;
    const target = memberships.find(
      (m) =>
        m.userId === targetUserId &&
        m.eventId === eventId &&
        m.role === "volunteer" &&
        m.isActive,
    );
    if (!target) return false;
    return target.positionId === actor.positionId;
  }

  it("Mahaut (post_lead bar) voit Lucas (bénévole bar)", () => {
    expect(postLeadCanSee("mahaut", "lucas", EVENT_A1)).toBe(true);
  });

  it("Mahaut (post_lead bar) ne voit PAS Sandy (bénévole merch)", () => {
    expect(postLeadCanSee("mahaut", "sandy", EVENT_A1)).toBe(false);
  });

  it("Mahaut ne voit aucun bénévole d'un autre event", () => {
    expect(postLeadCanSee("mahaut", "lucas", EVENT_A2)).toBe(false);
    expect(postLeadCanSee("mahaut", "lucas", EVENT_B1)).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════
// 5. SUB-ROLE FLAGS — is_entry_scanner cantonné à son event
// ════════════════════════════════════════════════════════════════════
describe("Cross-tenant — flags sous-rôles cantonnés à leur event", () => {
  const scanners: Membership[] = [
    {
      userId: "lucas",
      orgId: ORG_A,
      eventId: EVENT_A1,
      role: "volunteer",
      isActive: true,
      isEntryScanner: true,
    },
  ];
  function canScanArrival(userId: string, eventId: string): boolean {
    const role = roleInEvent(userId, eventId);
    if (role && ROLE_DEFINITIONS[role].canScanArrival) return true;
    const flag = scanners.find(
      (s) => s.userId === userId && s.eventId === eventId && s.isActive && s.isEntryScanner,
    );
    return Boolean(flag);
  }

  it("Lucas (entry_scanner sur EVENT_A1) peut scanner sur A1 uniquement", () => {
    expect(canScanArrival("lucas", EVENT_A1)).toBe(true);
    expect(canScanArrival("lucas", EVENT_A2)).toBe(false);
    expect(canScanArrival("lucas", EVENT_B1)).toBe(false);
  });

  it("Direction d'un autre tenant ne peut pas scanner sur EVENT_A1", () => {
    expect(canScanArrival("intrus", EVENT_A1)).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════
// 6. INACTIVE MEMBERSHIPS — révocation immédiate
// ════════════════════════════════════════════════════════════════════
describe("Cross-tenant — révocation : memberships inactifs sont ignorés", () => {
  const revoked: Membership[] = [
    { userId: "ex-staff", orgId: ORG_A, eventId: EVENT_A1, role: "direction", isActive: false },
  ];
  function roleInEventLocal(userId: string, eventId: string): RoleKind | null {
    const m = revoked
      .filter((x) => x.userId === userId && x.eventId === eventId && x.isActive)
      .sort((a, b) => ROLE_DEFINITIONS[a.role].hierarchy - ROLE_DEFINITIONS[b.role].hierarchy)[0];
    return m?.role ?? null;
  }

  it("Un membre désactivé n'a plus aucun rôle", () => {
    expect(roleInEventLocal("ex-staff", EVENT_A1)).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════════
// 7. PERMISSIONS DÉCLARATIVES — cohérence canValidateApplications etc.
// ════════════════════════════════════════════════════════════════════
describe("Cohérence des permissions déclaratives par rôle", () => {
  it("Seuls direction & volunteer_lead peuvent valider les candidatures", () => {
    const validators = ROLE_KINDS.filter((r) => ROLE_DEFINITIONS[r].canValidateApplications);
    expect(validators.sort()).toEqual(["direction", "volunteer_lead"].sort());
  });

  it("Seul direction peut modérer", () => {
    const moderators = ROLE_KINDS.filter((r) => ROLE_DEFINITIONS[r].canModerate);
    expect(moderators).toEqual(["direction"]);
  });

  it("volunteer (sans flag) ne peut pas scanner", () => {
    expect(ROLE_DEFINITIONS.volunteer.canScanArrival).toBe(false);
    expect(ROLE_DEFINITIONS.volunteer.canScanMeal).toBe(false);
    expect(ROLE_DEFINITIONS.volunteer.canScanPostTake).toBe(false);
  });

  it("staff_scan peut scanner arrivée + repas mais pas la prise de poste", () => {
    expect(ROLE_DEFINITIONS.staff_scan.canScanArrival).toBe(true);
    expect(ROLE_DEFINITIONS.staff_scan.canScanMeal).toBe(true);
    expect(ROLE_DEFINITIONS.staff_scan.canScanPostTake).toBe(false);
  });

  it("Export : direction + volunteer_lead seulement", () => {
    const exporters = ROLE_KINDS.filter((r) => ROLE_DEFINITIONS[r].canExport);
    expect(exporters.sort()).toEqual(["direction", "volunteer_lead"].sort());
  });
});
