import { describe, expect, it } from "vitest";
import { normalizeRateLimitInterval } from "@/lib/rateLimiter";

describe("normalizeRateLimitInterval", () => {
  it("falls back for invalid values and preserves valid intervals", () => {
    expect(normalizeRateLimitInterval(undefined)).toBe(1200);
    expect(normalizeRateLimitInterval("not-a-number")).toBe(1200);
    expect(normalizeRateLimitInterval("-1")).toBe(1200);
    expect(normalizeRateLimitInterval("250")).toBe(250);
  });
});
