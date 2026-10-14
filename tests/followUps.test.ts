import { describe, expect, it } from "vitest";
import { buildFollowUpIcs, parseDueAt } from "@/lib/followUps";

describe("follow-up helpers", () => {
  it("parses valid dates and rejects invalid values", () => {
    expect(parseDueAt("2026-10-14T10:00:00Z")?.toISOString()).toBe("2026-10-14T10:00:00.000Z");
    expect(parseDueAt("nope")).toBeNull();
  });

  it("creates escaped ICS content", () => {
    const ics = buildFollowUpIcs({
      id: "f1",
      leadName: "A;B",
      note: "Call, again\nsoon",
      dueAt: new Date("2026-10-14T10:00:00Z"),
      createdAt: new Date("2026-10-13T10:00:00Z"),
    });
    expect(ics).toContain("SUMMARY:Follow up: A\\;B");
    expect(ics).toContain("DESCRIPTION:Call\\, again\\nsoon");
    expect(ics).toContain("DTSTART:20261014T100000Z");
  });
});
