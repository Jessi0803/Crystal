import { describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getDb: vi.fn(async () => null),
}));

import { searchKnowledge } from "./crystalKnowledge";

describe("searchKnowledge", () => {
  it("matches the pre-shipping cleanse FAQ by keywords", async () => {
    const results = await searchKnowledge("商品出貨前會先消磁嗎？", [], 1);

    expect(results[0]).toMatchObject({
      id: "faq-pre-shipping-cleanse",
      answer: "我們出貨之前都會淨化消磁，收到包裹之後可以直接攜帶～",
    });
  });
});
