import { describe, it, expect } from "vitest";
import { generateDraft, generateAllVariants } from "@/lib/draftGenerator";
import type { Lead } from "@prisma/client";

function lead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: "lead_1",
    osmId: "node/1",
    source: "osm",
    name: "Bright Smile Dental",
    category: "dentist",
    address: "P. Burgos St, Batangas City",
    phone: "+639171234567",
    phoneNormalized: "+639171234567",
    websiteRaw: null,
    openingHours: "Mo-Sa 09:00-18:00",
    lat: 13.7565,
    lon: 121.0583,
    mapsUrl: "https://www.openstreetmap.org/node/1",
    score: 85,
    scoreFlags: "[]",
    status: "NEW",
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Lead;
}

describe("generateDraft", () => {
  it("keeps ULTRA_SHORT under 300 characters", () => {
    const content = generateDraft(lead(), "ULTRA_SHORT");
    expect(content.length).toBeLessThanOrEqual(300);
  });

  it("includes an opt-out line in every variant", () => {
    for (const variant of ["ULTRA_SHORT", "NORMAL", "VALUE_FIRST"] as const) {
      const content = generateDraft(lead(), variant);
      expect(content.toLowerCase()).toContain("stop");
    }
  });

  it("generateAllVariants returns exactly the three variants", () => {
    const drafts = generateAllVariants(lead());
    expect(drafts.map((d) => d.variant).sort()).toEqual(["NORMAL", "ULTRA_SHORT", "VALUE_FIRST"]);
  });
});
