import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../auditDb", () => ({
  recordAuditEventSafely: vi.fn().mockResolvedValue(true),
}));

import { recordAuditEventSafely } from "../auditDb";
import { adminProcedure, router } from "./trpc";

const testRouter = router({
  update: adminProcedure.mutation(() => ({ success: true })),
});

describe("admin mutation audit middleware", () => {
  beforeEach(() => vi.clearAllMocks());

  it("records the actor, action and sanitized input context", async () => {
    const caller = testRouter.createCaller({
      user: { id: 9, role: "admin" } as any,
      req: {} as any,
      res: {} as any,
    });

    await caller.update();

    expect(recordAuditEventSafely).toHaveBeenCalledWith(expect.objectContaining({
      source: "admin",
      action: "update",
      outcome: "success",
      actorUserId: 9,
    }));
  });
});
