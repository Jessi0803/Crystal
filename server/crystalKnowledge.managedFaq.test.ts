import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ getDb: vi.fn() }));

import { getDb } from "./db";
import { searchKnowledge } from "./crystalKnowledge";

const getDbMock = vi.mocked(getDb);

/** loadDynamicKnowledgeChunks 讀取啟用中的知識；hasManagedFaq 以 limit(1) 檢查是否已有問答 */
function fakeDb(activeRows: Record<string, unknown>[], hasFaq: boolean) {
  const db = {
    execute: vi.fn().mockResolvedValue(undefined),
    select: () => {
      const whereResult: any = Promise.resolve(activeRows);
      whereResult.limit = () => Promise.resolve(hasFaq ? [{ id: "faq-x" }] : []);
      return { from: () => ({ where: () => whereResult }) };
    },
  };
  getDbMock.mockResolvedValue(db as any);
}

const managedFaq = {
  id: "faq-managed",
  question: "後台管理的出貨淨化問答",
  answer: "後台版本的答案",
  embedText: "出貨 消磁",
  keywords: ["消磁", "出貨"],
  category: "常見問題",
  relatedProductIds: null,
  vector: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("searchKnowledge with managed FAQ", () => {
  it("uses the bundled FAQ until the database has managed FAQ", async () => {
    fakeDb([], false);

    const results = await searchKnowledge("商品出貨前會先消磁嗎？", [], 3);

    expect(results.map((result) => result.id)).toContain("faq-pre-shipping-cleanse");
  });

  it("uses only database FAQ once managed FAQ exists", async () => {
    fakeDb([managedFaq], true);

    const results = await searchKnowledge("商品出貨前會先消磁嗎？", [], 3);

    expect(results.map((result) => result.id)).toEqual(["faq-managed"]);
  });

  it("does not bring back the bundled FAQ when all managed FAQ are disabled", async () => {
    fakeDb([], true);

    await expect(searchKnowledge("商品出貨前會先消磁嗎？", [], 3)).resolves.toEqual([]);
  });
});
