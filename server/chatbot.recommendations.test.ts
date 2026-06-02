import { describe, expect, it } from "vitest";
import { knowledgeChunks, searchKnowledge, type ScoredChunk } from "./crystalKnowledge";
import { selectRelatedProductIds } from "./routers/chatbot";

function recommendationChunk(id: string) {
  const chunk = knowledgeChunks.find((entry) => entry.id === id);
  expect(chunk).toBeDefined();
  return chunk!;
}

describe("chatbot product recommendations", () => {
  it("offers three relevant products for broad confidence, healing and protection needs", () => {
    expect(recommendationChunk("rec-confidence").relatedProductIds).toHaveLength(3);
    expect(recommendationChunk("rec-healing").relatedProductIds).toHaveLength(3);
    expect(recommendationChunk("rec-protection").relatedProductIds).toHaveLength(3);
  });

  it("merges two relevant recommendation matches without duplicate or excessive cards", () => {
    const chunks = [
      { ...recommendationChunk("rec-confidence"), score: 0.76 },
      { ...recommendationChunk("rec-healing"), score: 0.72 },
    ] as ScoredChunk[];

    expect(selectRelatedProductIds(chunks)).toEqual([
      "d003-venus",
      "d002-honey-realm",
      "d001-moon-secret",
      "d005-moon-clear-heart",
    ]);
  });

  it("does not recommend products from weak matches", () => {
    const chunks = [
      { ...recommendationChunk("rec-confidence"), score: 0.54 },
    ] as ScoredChunk[];

    expect(selectRelatedProductIds(chunks)).toEqual([]);
  });

  it("has standalone knowledge for each limited design product", () => {
    const productKnowledge = [
      ["product-d001-moon-secret", "d001-moon-secret"],
      ["product-d002-honey-realm", "d002-honey-realm"],
      ["product-d003-venus", "d003-venus"],
      ["product-d004-morning-whisper", "d004-morning-whisper"],
      ["product-d005-moon-clear-heart", "d005-moon-clear-heart"],
    ] as const;

    for (const [chunkId, productId] of productKnowledge) {
      expect(recommendationChunk(chunkId)).toMatchObject({
        category: "商品推薦",
        relatedProductIds: [productId],
      });
    }
  });

  it("finds limited design products for limited-edition questions", async () => {
    const results = await searchKnowledge("限定款有哪些 每月限量手鍊", Array(768).fill(1), 5, 0.45);
    const resultIds = results.map((chunk) => chunk.id);

    expect(resultIds).toHaveLength(5);
    expect(resultIds).toEqual(
      expect.arrayContaining([
        "product-d001-moon-secret",
        "product-d002-honey-realm",
        "product-d003-venus",
        "product-d004-morning-whisper",
        "product-d005-moon-clear-heart",
      ])
    );
  });
});
