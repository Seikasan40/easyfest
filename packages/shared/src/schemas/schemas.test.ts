import { describe, it, expect } from "vitest";

import { isMinor, slugify, isValidSlug } from "../index";
import { WellbeingReportSchema } from "./wellbeing";
import { SaferAlertSchema } from "./safer-alert";

describe("slugify", () => {
  it("normalizes a French festival name", () => {
    expect(slugify("Roots du Lac 2026")).toBe("roots-du-lac-2026");
    expect(slugify("Fréjus Reggae Festival")).toBe("frejus-reggae-festival");
    expect(slugify("  Multiple   spaces  ")).toBe("multiple-spaces");
    expect(slugify("Spéciaux !@#$%")).toBe("speciaux");
  });

  it("validates slugs", () => {
    expect(isValidSlug("rdl-2026")).toBe(true);
    expect(isValidSlug("icmpaca")).toBe(true);
    expect(isValidSlug("-invalid")).toBe(false);
    expect(isValidSlug("invalid-")).toBe(false);
    expect(isValidSlug("INVALID")).toBe(false);
    expect(isValidSlug("a")).toBe(true);
  });
});

describe("isMinor", () => {
  it("detects a minor born this year", () => {
    expect(isMinor(new Date().toISOString().slice(0, 10))).toBe(true);
  });

  it("detects a non-minor born 30 years ago", () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 30);
    expect(isMinor(d.toISOString().slice(0, 10))).toBe(false);
  });

  it("edge case — born exactly 18 years ago", () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    d.setDate(d.getDate() - 1); // hier
    expect(isMinor(d.toISOString().slice(0, 10))).toBe(false);
  });
});

describe("WellbeingReportSchema", () => {
  it("accepts a green report", () => {
    const result = WellbeingReportSchema.safeParse({
      eventId: "22222222-2222-2222-2222-222222222222",
      level: "green",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid level", () => {
    const result = WellbeingReportSchema.safeParse({
      eventId: "22222222-2222-2222-2222-222222222222",
      level: "rainbow",
    });
    expect(result.success).toBe(false);
  });

  it("rejects too long comment", () => {
    const result = WellbeingReportSchema.safeParse({
      eventId: "22222222-2222-2222-2222-222222222222",
      level: "yellow",
      comment: "x".repeat(600),
    });
    expect(result.success).toBe(false);
  });
});

describe("SaferAlertSchema", () => {
  it("accepts a harassment alert with description", () => {
    const r = SaferAlertSchema.safeParse({
      eventId: "22222222-2222-2222-2222-222222222222",
      kind: "harassment",
      description: "Témoin d'un comportement inadmissible au bar.",
      locationHint: "Bar principal",
    });
    expect(r.success).toBe(true);
  });

  it("rejects out-of-range geo", () => {
    const r = SaferAlertSchema.safeParse({
      eventId: "22222222-2222-2222-2222-222222222222",
      kind: "medical",
      geoLat: 200,
    });
    expect(r.success).toBe(false);
  });
});
