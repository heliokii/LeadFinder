import { describe, it, expect } from "vitest";
import { hasNoWebsite, normalizePhone } from "@/lib/normalize";

describe("hasNoWebsite", () => {
  it("treats an empty/missing field as no website", async () => {
    expect(await hasNoWebsite(undefined)).toBe(true);
    expect(await hasNoWebsite("")).toBe(true);
    expect(await hasNoWebsite("   ")).toBe(true);
  });

  it("treats a non-URL string as no website", async () => {
    expect(await hasNoWebsite("facebook")).toBe(true);
  });

  it("treats a resolving real domain as having a website", async () => {
    // example.com is IANA-reserved and always resolves; safe to depend on in tests.
    expect(await hasNoWebsite("example.com")).toBe(false);
    expect(await hasNoWebsite("https://example.com")).toBe(false);
  });

  it("treats a domain that cannot possibly resolve as no website", async () => {
    expect(await hasNoWebsite("this-domain-should-not-exist-12345.invalid")).toBe(true);
  });
});

describe("normalizePhone", () => {
  it("normalizes a local PH number to E.164", () => {
    expect(normalizePhone("0917 123 4567", "PH")).toBe("+639171234567");
  });

  it("returns undefined for garbage input", () => {
    expect(normalizePhone("call us!", "PH")).toBeUndefined();
    expect(normalizePhone(undefined, "PH")).toBeUndefined();
  });
});
