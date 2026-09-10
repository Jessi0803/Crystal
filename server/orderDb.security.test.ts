import { describe, expect, it } from "vitest";
import { generateBalanceMerchantTradeNo } from "./orderDb";

describe("balance payment link identifiers", () => {
  it("uses fixed-length cryptographically random ECPay-safe identifiers", () => {
    const values = Array.from({ length: 1_000 }, () => generateBalanceMerchantTradeNo());
    expect(new Set(values).size).toBe(values.length);
    for (const value of values) {
      expect(value).toMatch(/^CB[A-F0-9]{18}$/);
      expect(value).toHaveLength(20);
    }
  });
});
