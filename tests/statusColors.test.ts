import { describe, expect, it } from "vitest";
import { STATUS_COLORS, STATUS_OPTIONS, statusColor } from "@/lib/statusColors";

describe("map status colors", () => {
  it("has a color and legend entry for every lead status", () => {
    expect(STATUS_OPTIONS).toEqual(["NEW", "QUALIFIED", "DRAFTED", "APPROVED", "SENT", "REPLIED", "WON", "CLOSED", "DNC"]);
    expect(Object.values(STATUS_COLORS).every((color) => /^#[0-9a-f]{6}$/i.test(color))).toBe(true);
  });

  it("uses a stable fallback for unknown statuses", () => {
    expect(statusColor("UNKNOWN")).toBe(STATUS_COLORS.NEW);
  });
});
