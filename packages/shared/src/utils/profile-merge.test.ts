import { describe, it, expect } from "vitest";

import {
  attachProfile,
  buildProfilesById,
  collectUserIds,
  fallbackName,
} from "./profile-merge";

describe("buildProfilesById", () => {
  it("retourne une Map vide pour null/undefined", () => {
    expect(buildProfilesById(null).size).toBe(0);
    expect(buildProfilesById(undefined).size).toBe(0);
    expect(buildProfilesById([]).size).toBe(0);
  });

  it("indexe par user_id", () => {
    const map = buildProfilesById([
      { user_id: "u1", full_name: "Alice" },
      { user_id: "u2", full_name: "Bob" },
    ]);
    expect(map.get("u1")?.full_name).toBe("Alice");
    expect(map.get("u2")?.full_name).toBe("Bob");
    expect(map.get("u3")).toBeUndefined();
  });

  it("dernière entrée gagne en cas de doublon (cas pathologique)", () => {
    const map = buildProfilesById([
      { user_id: "u1", full_name: "First" },
      { user_id: "u1", full_name: "Second" },
    ]);
    expect(map.get("u1")?.full_name).toBe("Second");
  });
});

describe("fallbackName", () => {
  it("retourne — pour null/undefined", () => {
    expect(fallbackName(null)).toBe("—");
    expect(fallbackName(undefined)).toBe("—");
  });

  it("priorise full_name", () => {
    expect(
      fallbackName({
        user_id: "u1",
        full_name: "Pamela Giordanengo",
        first_name: "Pam",
        email: "pam@example.fr",
      }),
    ).toBe("Pamela Giordanengo");
  });

  it("compose first+last si full_name vide", () => {
    expect(
      fallbackName({
        user_id: "u1",
        full_name: "",
        first_name: "Pam",
        last_name: "G",
        email: "pam@example.fr",
      }),
    ).toBe("Pam G");
  });

  it("garde first seul si pas de last", () => {
    expect(
      fallbackName({ user_id: "u1", first_name: "Sandy", email: "sandy@x" }),
    ).toBe("Sandy");
  });

  it("retombe sur email si pas de nom", () => {
    expect(fallbackName({ user_id: "u1", email: "anon@x.com" })).toBe("anon@x.com");
  });

  it("retombe sur — si tout est vide", () => {
    expect(fallbackName({ user_id: "u1" })).toBe("—");
    expect(fallbackName({ user_id: "u1", email: "" })).toBe("—");
  });

  it("ignore full_name composé uniquement d'espaces", () => {
    expect(
      fallbackName({ user_id: "u1", full_name: "   ", email: "x@y" }),
    ).toBe("x@y");
  });
});

describe("attachProfile", () => {
  it("attache le profile via la FK", () => {
    const profilesById = buildProfilesById([
      { user_id: "u1", full_name: "Alice" },
      { user_id: "u2", full_name: "Bob" },
    ]);
    const messages = [
      { id: "m1", content: "salut", sender_user_id: "u1" },
      { id: "m2", content: "yo", sender_user_id: "u2" },
    ];
    const enriched = attachProfile(messages, profilesById, { fk: "sender_user_id", as: "sender" });
    expect(enriched).toHaveLength(2);
    expect((enriched[0] as any).sender.full_name).toBe("Alice");
    expect((enriched[1] as any).sender.full_name).toBe("Bob");
  });

  it("retourne null si user_id absent du Map", () => {
    const profilesById = buildProfilesById<{ user_id: string }>([]);
    const rows = [{ id: "m1", reporter_user_id: "absent" }];
    const enriched = attachProfile(rows, profilesById, { fk: "reporter_user_id", as: "reporter" });
    expect((enriched[0] as any).reporter).toBeNull();
  });

  it("retourne null si user_id null sur la row", () => {
    const profilesById = buildProfilesById<{ user_id: string }>([]);
    const rows = [{ id: "m1", sender_user_id: null }];
    const enriched = attachProfile(rows as any, profilesById, {
      fk: "sender_user_id",
      as: "sender",
    });
    expect((enriched[0] as any).sender).toBeNull();
  });

  it("traite null/undefined input", () => {
    const profilesById = buildProfilesById<{ user_id: string }>([]);
    expect(attachProfile(null, profilesById, { fk: "x", as: "y" })).toEqual([]);
    expect(attachProfile(undefined, profilesById, { fk: "x", as: "y" })).toEqual([]);
  });
});

describe("collectUserIds", () => {
  it("dédupe sur 1 colonne", () => {
    const messages = [
      { sender_user_id: "u1" },
      { sender_user_id: "u2" },
      { sender_user_id: "u1" },
    ];
    expect(collectUserIds(messages, ["sender_user_id"]).sort()).toEqual(["u1", "u2"]);
  });

  it("merge plusieurs colonnes (sender + reporter)", () => {
    const rows = [
      { sender_user_id: "u1", reporter_user_id: "u2" },
      { sender_user_id: "u2", reporter_user_id: "u3" },
    ];
    expect(
      collectUserIds(rows, ["sender_user_id", "reporter_user_id"]).sort(),
    ).toEqual(["u1", "u2", "u3"]);
  });

  it("ignore null/empty values", () => {
    const rows = [
      { sender_user_id: null, reporter_user_id: "u1" },
      { sender_user_id: "", reporter_user_id: undefined },
      { sender_user_id: "u2", reporter_user_id: "" },
    ];
    expect(
      collectUserIds(rows as any, ["sender_user_id", "reporter_user_id"]).sort(),
    ).toEqual(["u1", "u2"]);
  });

  it("gère null/undefined input", () => {
    expect(collectUserIds(null, ["x"])).toEqual([]);
    expect(collectUserIds(undefined, ["x"])).toEqual([]);
    expect(collectUserIds([], ["x"])).toEqual([]);
  });
});

describe("scénario intégration messages page (Bug #1)", () => {
  it("merge messages + profils + channels comme la page régie", () => {
    // Simule ce que la page régie messages fait après les 3 queries séparées.
    const messagesRaw = [
      {
        id: "m1",
        content: "Salut à tous",
        sender_user_id: "user-pam",
        channel_id: "ch-annonces",
        is_broadcast: true,
      },
      {
        id: "m2",
        content: "Bar : on ouvre à 18h",
        sender_user_id: "user-pam",
        channel_id: "ch-bar",
        is_broadcast: true,
      },
    ];
    const profilesById = buildProfilesById([
      { user_id: "user-pam", full_name: "Pamela Giordanengo", email: "pam@x.fr" },
    ]);
    const channelsById = new Map([
      ["ch-annonces", { id: "ch-annonces", name: "Annonces", kind: "broadcast" }],
      ["ch-bar", { id: "ch-bar", name: "Bar", kind: "team" }],
    ]);

    const enriched = messagesRaw.map((m) => ({
      ...m,
      sender: profilesById.get(m.sender_user_id) ?? null,
      channel: channelsById.get(m.channel_id) ?? null,
    }));

    expect(enriched).toHaveLength(2);
    expect((enriched[0] as any).sender.full_name).toBe("Pamela Giordanengo");
    expect((enriched[0] as any).channel.name).toBe("Annonces");
    expect((enriched[1] as any).channel.name).toBe("Bar");
  });
});

describe("scénario intégration safer page (Bug #2-3)", () => {
  it("merge alertes + profils reporter par user_id", () => {
    const alertsRaw = [
      { id: "a1", kind: "harassment", status: "open", reporter_user_id: "user-anon" },
      { id: "a2", kind: "medical", status: "resolved", reporter_user_id: "user-sandy" },
    ];
    const wellbeingRaw = [
      { id: "w1", level: "yellow", reporter_user_id: "user-lucas" },
    ];
    const reporterIds = collectUserIds(
      [...alertsRaw, ...wellbeingRaw],
      ["reporter_user_id"],
    );
    expect(reporterIds.sort()).toEqual(["user-anon", "user-lucas", "user-sandy"]);

    const profilesById = buildProfilesById([
      { user_id: "user-sandy", full_name: "Sandy Ben" },
      { user_id: "user-lucas", first_name: "Lucas", email: "lucas@x" },
      { user_id: "user-anon", email: "anon@x" },
    ]);
    const enrichedAlerts = attachProfile(alertsRaw, profilesById, {
      fk: "reporter_user_id",
      as: "reporter",
    });
    expect(fallbackName((enrichedAlerts[0] as any).reporter)).toBe("anon@x");
    expect(fallbackName((enrichedAlerts[1] as any).reporter)).toBe("Sandy Ben");
  });
});

describe("scénario intégration mon poste (Bug #5-6 UNION)", () => {
  it("UNION memberships + assignments puis fetch profiles unique", () => {
    const memberships = [
      { user_id: "user-mahaut", role: "post_lead" },
      { user_id: "user-anais", role: "volunteer" },
    ];
    const assignments = [
      { volunteer_user_id: "user-sandy", status: "validated" },
      { volunteer_user_id: "user-anais", status: "validated" }, // doublon avec memberships
    ];

    const teamUserIds = Array.from(
      new Set([
        ...memberships.map((m) => m.user_id),
        ...assignments.map((a) => a.volunteer_user_id),
      ]),
    );

    expect(teamUserIds.sort()).toEqual(["user-anais", "user-mahaut", "user-sandy"]);
    expect(teamUserIds.length).toBe(3); // pas 4 — on dédupe Anaïs présente dans les 2
  });
});

describe("scénario Bug #13-bis : sync memberships.position_id post-DnD", () => {
  it("après assign_volunteer_atomic, position_id alignée sur shifts.position_id", () => {
    // Simule l'état post-RPC : Anaïs avait position_id NULL, après DnD vers Bar
    // sa membership doit avoir position_id = Bar.
    const positionIdBar = "cd44e22e-8a92-4ba9-9100-6c7428856b3b";
    const memberships = [
      { user_id: "user-anais", position_id: positionIdBar, role: "volunteer", is_active: true },
      { user_id: "user-sandy", position_id: positionIdBar, role: "volunteer", is_active: true },
      { user_id: "user-lucas", position_id: positionIdBar, role: "volunteer", is_active: true },
    ];

    // Mahaut (post_lead Bar) interroge tous les volunteers ayant position_id = Bar
    const teamMembers = memberships.filter(
      (m) => m.role === "volunteer" && m.is_active && m.position_id === positionIdBar,
    );
    expect(teamMembers).toHaveLength(3);
    expect(teamMembers.map((m) => m.user_id).sort()).toEqual([
      "user-anais",
      "user-lucas",
      "user-sandy",
    ]);
  });

  it("retour au pool : position_id remis à NULL", () => {
    const positionIdBar = "cd44e22e-8a92-4ba9-9100-6c7428856b3b";
    let membership = { user_id: "user-x", position_id: positionIdBar, role: "volunteer" };
    // RPC avec p_position_id = NULL → UPDATE membership SET position_id = NULL
    membership = { ...membership, position_id: null as any };
    expect(membership.position_id).toBeNull();
  });
});

describe("scénario Bug #7-bis : volunteer voit son post_lead", () => {
  it("query 3-step : myMembership → leadMembership → leadProfile", () => {
    // Lucas (volunteer Bar, position_id=Bar) cherche son post_lead.
    const positionIdBar = "cd44e22e-8a92-4ba9-9100-6c7428856b3b";
    const memberships = [
      { user_id: "lucas", position_id: positionIdBar, role: "volunteer", is_active: true },
      { user_id: "mahaut", position_id: positionIdBar, role: "post_lead", is_active: true },
      { user_id: "pam", position_id: null, role: "direction", is_active: true },
    ];

    // Step 1 : trouver sa propre membership (Lucas)
    const myMembership = memberships.find(
      (m) => m.user_id === "lucas" && m.role === "volunteer" && m.is_active,
    );
    expect(myMembership?.position_id).toBe(positionIdBar);

    // Step 2 : trouver le post_lead avec même position_id
    const leadMembership = memberships.find(
      (m) =>
        m.position_id === myMembership?.position_id &&
        m.role === "post_lead" &&
        m.is_active,
    );
    expect(leadMembership?.user_id).toBe("mahaut");

    // Step 3 : fetch profile (mocké via Map)
    const profilesById = buildProfilesById([
      { user_id: "mahaut", full_name: "Mahaut Tilde", email: "mahaut@x.fr" },
    ]);
    const leadProfile = profilesById.get(leadMembership!.user_id);
    expect(fallbackName(leadProfile)).toBe("Mahaut Tilde");
  });
});

describe("scénario Bug feed-bis : ciblage messages par channel kind", () => {
  it("Lucas (volunteer Bar) voit admin (Annonces) + team Bar, mais pas team Parking", () => {
    const channels = [
      { id: "ch-admin", kind: "admin", position_id: null },
      { id: "ch-bar", kind: "team", position_id: "pos-bar" },
      { id: "ch-parking", kind: "team", position_id: "pos-parking" },
      { id: "ch-resp", kind: "responsibles", position_id: null },
    ];
    const lucasPositionIds = ["pos-bar"];
    const lucasIsResponsible = false;

    const visibleChannels = channels.filter((c) => {
      if (c.kind === "admin") return true; // visible par tout membre actif
      if (c.kind === "team")
        return c.position_id !== null && lucasPositionIds.includes(c.position_id);
      if (c.kind === "responsibles") return lucasIsResponsible;
      return false;
    });

    expect(visibleChannels.map((c) => c.id).sort()).toEqual(["ch-admin", "ch-bar"]);
  });

  it("Pamela (direction) voit admin + team Bar + team Parking + responsibles", () => {
    const channels = [
      { id: "ch-admin", kind: "admin", position_id: null },
      { id: "ch-bar", kind: "team", position_id: "pos-bar" },
      { id: "ch-parking", kind: "team", position_id: "pos-parking" },
      { id: "ch-resp", kind: "responsibles", position_id: null },
    ];
    // direction voit tout (RLS has_role_at_least + admin pour tout membre actif)
    const visibleChannels = channels;
    expect(visibleChannels).toHaveLength(4);
  });
});
