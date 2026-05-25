import { describe, expect, it } from "vitest";
import { knowledgeChunks, type ScoredChunk } from "./crystalKnowledge";
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
});
