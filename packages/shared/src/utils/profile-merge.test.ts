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
