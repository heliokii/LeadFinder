import { describe, expect, it } from "vitest";
import { csvEscape } from "@/pages/api/export";

describe("csvEscape", () => {
  it("neutralizes spreadsheet formula prefixes", () => {
    expect(csvEscape("=SUM(A1:A2)")).toBe("'=SUM(A1:A2)");
    expect(csvEscape("Acme, Inc.")).toBe('"Acme, Inc."');
  });
});
