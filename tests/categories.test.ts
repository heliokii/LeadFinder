import { describe, expect, it } from "vitest";
import { CATEGORY_CATALOG, CATEGORY_VALUES, getCategory } from "@/lib/categories";

describe("category catalog", () => {
  it("keeps legacy categories and adds searchable options", () => {
    expect(CATEGORY_VALUES).toContain("dentist");
    expect(CATEGORY_VALUES).toContain("real_estate");
    expect(CATEGORY_VALUES.length).toBeGreaterThan(50);
    expect(getCategory("dental")?.value).toBe("dentist");
  });

  it("gives every category a usable OSM mapping", () => {
    expect(new Set(CATEGORY_VALUES).size).toBe(CATEGORY_CATALOG.length);
    expect(CATEGORY_CATALOG.every((category) => category.tags.length > 0 && category.aliases.length > 0)).toBe(true);
  });
});
