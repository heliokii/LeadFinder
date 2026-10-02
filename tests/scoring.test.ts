import { describe, it, expect } from "vitest";
import { scoreLead } from "@/lib/scoring";
import type { RawOsmBusiness } from "@/lib/osm";

function business(overrides: Partial<RawOsmBusiness> = {}): RawOsmBusiness {
  return {
    osmId: "node/1",
    name: "Bright Smile Dental",
    category: "dentist",
    address: "P. Burgos St, Batangas City",
    phone: "+639171234567",
    openingHours: "Mo-Sa 09:00-18:00",
    ...overrides,
  };
}

describe("scoreLead", () => {
  it("scores a complete listing highly with no flags", () => {
    const { score, flags } = scoreLead(business());
    expect(score).toBeGreaterThanOrEqual(70);
    expect(flags).not.toContain("no_phone");
  });

  it("penalizes and flags a listing with no phone", () => {
    const { score, flags } = scoreLead(business({ phone: undefined }));
    expect(flags).toContain("no_phone");
    expect(score).toBeLessThan(70);
  });

  it("flags a sparse listing (no phone, no hours, no address)", () => {
    const { flags } = scoreLead(
      business({ phone: undefined, openingHours: undefined, address: undefined })
    );
    expect(flags).toContain("sparse_listing");
  });

  it("flags placeholder-like names", () => {
    const { flags } = scoreLead(business({ name: "Shop 3" }));
    expect(flags).toContain("placeholder_like_name");
  });

  it("keeps score within 0-100", () => {
    const { score } = scoreLead(
      business({ phone: undefined, openingHours: undefined, address: undefined, name: "x" })
    );
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
