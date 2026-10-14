import { describe, expect, it } from "vitest";
import { generatePaymentMessage } from "@/lib/payment";

describe("generatePaymentMessage", () => {
  it("omits invalid amounts instead of emitting NaN or a negative total", () => {
    expect(generatePaymentMessage({ amount: Number.NaN })).not.toContain("NaN");
    expect(generatePaymentMessage({ amount: -10 })).not.toContain("-10");
  });

  it("normalizes a valid currency code", () => {
    expect(generatePaymentMessage({ amount: 100, currency: "php" })).toContain("100 PHP");
  });
});
