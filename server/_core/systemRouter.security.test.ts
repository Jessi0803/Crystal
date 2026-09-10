import { describe, expect, it } from "vitest";
import { systemRouter } from "./systemRouter";

function caller(role?: "user" | "admin") {
  return systemRouter.createCaller({
    user: role ? ({ id: 1, role } as any) : null,
    req: {} as any,
    res: {} as any,
  });
}

describe("system diagnostics access", () => {
  it("keeps detailed environment diagnostics admin-only", async () => {
    await expect(caller().envCheck()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("never returns merchant identifiers or secret prefixes", async () => {
    const result = await caller("admin").envCheck();
    expect(result).not.toHaveProperty("ecpayMerchantId");
    expect(result).not.toHaveProperty("ecpayHashKeyPrefix");
    expect(result).not.toHaveProperty("resendApiKeyPrefix");
  });

  it("exposes only harmless sandbox mode flags publicly", async () => {
    await expect(caller().paymentMode()).resolves.toEqual({
      ecpaySandbox: expect.any(Boolean),
      ecpayLogisticsSandbox: expect.any(Boolean),
    });
  });
});
