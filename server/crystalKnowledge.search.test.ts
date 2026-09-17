import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ getDb: vi.fn() }));

import { getDb } from "./db";
import { searchKnowledge } from "./crystalKnowledge";

const getDbMock = vi.mocked(getDb);

function fakeDb(activeRows: Record<string, unknown>[]) {
  const db = {
    execute: vi.fn().mockResolvedValue(undefined),
    select: () => ({ from: () => ({ where: () => Promise.resolve(activeRows) }) }),
  };
  getDbMock.mockResolvedValue(db as any);
}

function row(overrides: Record<string, unknown>) {
  return {
    id: "faq-x",
    question: "問題",
    answer: "答案",
    embedText: "",
    keywords: [],
    category: "常見問題",
    relatedProductIds: null,
    vector: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("searchKnowledge", () => {
  it("matches database FAQ by keywords", async () => {
    fakeDb([
      row({ id: "faq-pre-shipping-cleanse", question: "商品或水晶出貨前會消磁嗎？", keywords: ["消磁", "出貨"] }),
      row({ id: "faq-warranty", question: "手鍊有保固嗎？", keywords: ["保固"] }),
    ]);

    const results = await searchKnowledge("商品出貨前會先消磁嗎？", [], 3);

    expect(results.map((result) => result.id)).toEqual(["faq-pre-shipping-cleanse"]);
  });

  it("ranks by vector similarity and does not return the vectors", async () => {
    fakeDb([
      row({ id: "faq-near", vector: [1, 0] }),
      row({ id: "faq-far", vector: [0, 1] }),
    ]);

    const results = await searchKnowledge("任意問題", [1, 0.1], 3);

    expect(results.map((result) => result.id)).toEqual(["faq-near"]);
    expect(results[0]).not.toHaveProperty("vector");
  });

  it("returns nothing without a database", async () => {
    getDbMock.mockResolvedValue(null as any);
    await expect(searchKnowledge("保固", [], 3)).resolves.toEqual([]);
  });
});
