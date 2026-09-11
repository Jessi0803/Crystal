import { describe, expect, it } from "vitest";
import { sanitizeAuditDetails } from "./auditDb";

describe("audit detail sanitization", () => {
  it("redacts credentials and large binary fields while preserving operational context", () => {
    expect(sanitizeAuditDetails({
      orderId: 42,
      status: "paid",
      accessToken: "private-token",
      password: "private-password",
      transferReceiptImageBase64: "a".repeat(1000),
      nested: { CheckMacValue: "secret", amount: 500 },
    })).toEqual({
      orderId: 42,
      status: "paid",
      accessToken: "[redacted]",
      password: "[redacted]",
      transferReceiptImageBase64: "[redacted]",
      nested: { CheckMacValue: "[redacted]", amount: 500 },
    });
  });
});
