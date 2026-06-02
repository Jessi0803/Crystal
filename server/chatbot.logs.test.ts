import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";

vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "./db";
import { chatbotRouter } from "./routers/chatbot";

const getDbMock = vi.mocked(getDb);

function createCaller(user: { id: number; role: string } | null) {
  return chatbotRouter.createCaller({
    user: user as any,
    req: {} as any,
    res: {} as any,
  });
}

describe("chatbot log admin mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects chatbot log deletion for non-admin users", async () => {
    const caller = createCaller({ id: 2, role: "user" });

    await expect(caller.deleteLogs({ ids: [1] })).rejects.toThrow(TRPCError);
    await expect(caller.deleteLogs({ ids: [1] })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("deletes unique selected chatbot log ids for admins", async () => {
    const where = vi.fn().mockResolvedValue(undefined);
    const deleteMock = vi.fn(() => ({ where }));
    getDbMock.mockResolvedValue({ delete: deleteMock } as any);

    const caller = createCaller({ id: 1, role: "admin" });
    const result = await caller.deleteLogs({ ids: [10, 11, 10] });

    expect(result).toEqual({ success: true, deletedCount: 2 });
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(where).toHaveBeenCalledTimes(1);
  });
});
