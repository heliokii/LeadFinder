import { describe, expect, it } from "vitest";
import { canChangeDraftStatus, canChangeLeadStatus } from "@/lib/workflow";

describe("workflow transitions", () => {
  it("requires lead statuses to move forward or into DNC", () => {
    expect(canChangeLeadStatus("NEW", "QUALIFIED")).toBe(true);
    expect(canChangeLeadStatus("NEW", "SENT")).toBe(false);
    expect(canChangeLeadStatus("SENT", "DNC")).toBe(true);
    expect(canChangeLeadStatus("DNC", "NEW")).toBe(false);
  });

  it("requires draft approval before sending", () => {
    expect(canChangeDraftStatus("DRAFT", "APPROVED")).toBe(true);
    expect(canChangeDraftStatus("DRAFT", "SENT")).toBe(false);
    expect(canChangeDraftStatus("APPROVED", "SENT")).toBe(true);
  });
});
