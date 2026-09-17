import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ getDb: vi.fn() }));
vi.mock("./auditDb", () => ({ recordAuditEventSafely: vi.fn() }));
vi.mock("./storage", () => ({ storagePut: vi.fn() }));
vi.mock("./crystalKnowledge", () => ({
  removeProductKnowledge: vi.fn(),
  syncProductKnowledge: vi.fn(),
  syncProductKnowledgeById: vi.fn(),
}));

import { getDb } from "./db";
import { recordAuditEventSafely } from "./auditDb";
import { syncProductKnowledgeById } from "./crystalKnowledge";
import { publishDueProducts } from "./routers/products";

const getDbMock = vi.mocked(getDb);
const syncMock = vi.mocked(syncProductKnowledgeById);
const auditMock = vi.mocked(recordAuditEventSafely);

function fakeDb(dueIds: string[]) {
  const updates: Record<string, unknown>[] = [];
  const db = {
    updates,
    select: () => ({ from: () => ({ where: () => Promise.resolve(dueIds.map((id) => ({ id }))) }) }),
    update: () => ({
      set: (values: Record<string, unknown>) => {
        updates.push(values);
        return { where: () => Promise.resolve([{ affectedRows: dueIds.length }]) };
      },
    }),
  };
  getDbMock.mockResolvedValue(db as any);
  return db;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("publishDueProducts", () => {
  it("activates due products and syncs their chatbot knowledge", async () => {
    const db = fakeDb(["prod-a", "prod-b"]);

    await publishDueProducts();

    expect(db.updates).toEqual([{ active: true, scheduledPublishAt: null }]);
    expect(syncMock).toHaveBeenCalledTimes(2);
    expect(syncMock).toHaveBeenCalledWith("prod-a");
    expect(syncMock).toHaveBeenCalledWith("prod-b");
  });

  it("does nothing when no product is due", async () => {
    const db = fakeDb([]);

    await publishDueProducts();

    expect(db.updates).toHaveLength(0);
    expect(syncMock).not.toHaveBeenCalled();
  });

  it("keeps publishing and records a warning when knowledge sync fails", async () => {
    const db = fakeDb(["prod-a", "prod-b"]);
    syncMock.mockRejectedValueOnce(new Error("embedding failed"));

    await expect(publishDueProducts()).resolves.toBeUndefined();

    expect(db.updates).toHaveLength(1);
    expect(syncMock).toHaveBeenCalledTimes(2);
    expect(auditMock).toHaveBeenCalledWith(expect.objectContaining({
      action: "chatbot.knowledge.sync",
      outcome: "failed",
      severity: "warning",
      details: expect.objectContaining({ productIds: ["prod-a"] }),
    }));
  });
});
