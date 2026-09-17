import { describe, expect, it, vi } from "vitest";

// 未連資料庫：只有固定問答，沒有資料庫的商品知識
vi.mock("./db", () => ({ getDb: vi.fn(async () => null) }));
import {
  buildProductKnowledgeChunk,
  knowledgeChunks,
  searchKnowledge,
  type ScoredChunk,
} from "./crystalKnowledge";
import { selectRelatedProductIds } from "./routers/chatbot";

function recommendationChunk(id: string) {
  const chunk = knowledgeChunks.find((entry) => entry.id === id);
  expect(chunk).toBeDefined();
  return chunk!;
}

/** 資料庫商品知識的最小形狀（固定問答已不含商品） */
function productChunk(productId: string) {
  return {
    id: `product-${productId}`,
    question: `${productId}適合什麼需求？`,
    answer: "",
    embedText: "",
    keywords: [],
    category: "商品推薦",
    relatedProductIds: [productId],
  };
}

describe("chatbot product recommendations", () => {
  it("uses broad need knowledge as guidance instead of hard-coded product bundles", () => {
    expect(recommendationChunk("rec-confidence")).toMatchObject({ category: "選購需求" });
    expect(recommendationChunk("rec-healing")).toMatchObject({ category: "選購需求" });
    expect(recommendationChunk("rec-protection")).toMatchObject({ category: "選購需求" });
    expect(recommendationChunk("rec-confidence").relatedProductIds).toBeUndefined();
    expect(recommendationChunk("rec-healing").relatedProductIds).toBeUndefined();
    expect(recommendationChunk("rec-protection").relatedProductIds).toBeUndefined();
  });

  it("merges two relevant recommendation matches without duplicate or excessive cards", () => {
    const chunks = [
      {
        id: "manual-confidence",
        question: "confidence",
        answer: "",
        embedText: "",
        keywords: [],
        category: "商品推薦",
        relatedProductIds: ["d003-venus", "d002-honey-realm", "d001-moon-secret"],
        score: 0.76,
      },
      {
        id: "manual-healing",
        question: "healing",
        answer: "",
        embedText: "",
        keywords: [],
        category: "商品推薦",
        relatedProductIds: ["d001-moon-secret", "d005-moon-clear-heart", "d004-morning-whisper"],
        score: 0.72,
      },
    ] as ScoredChunk[];

    expect(selectRelatedProductIds(chunks)).toEqual([
      "d003-venus",
      "d002-honey-realm",
      "d001-moon-secret",
      "d005-moon-clear-heart",
      "d004-morning-whisper",
    ]);
  });

  it("prefers standalone product matches over broad fixed recommendation groups", () => {
    const chunks = [
      {
        id: "manual-healing",
        question: "healing",
        answer: "",
        embedText: "",
        keywords: [],
        category: "商品推薦",
        relatedProductIds: ["d001-moon-secret", "d005-moon-clear-heart", "d004-morning-whisper"],
        score: 0.8,
      },
      { ...productChunk("prod-1780212635593"), score: 0.68 },
      { ...productChunk("prod-1780213098870"), score: 0.66 },
      {
        id: "manual-confidence",
        question: "confidence",
        answer: "",
        embedText: "",
        keywords: [],
        category: "商品推薦",
        relatedProductIds: ["d003-venus", "d002-honey-realm", "d001-moon-secret"],
        score: 0.64,
      },
    ] as ScoredChunk[];

    expect(selectRelatedProductIds(chunks)).toEqual([
      "prod-1780212635593",
      "prod-1780213098870",
    ]);
  });

  it("keeps the highest-scoring product first even when many products match", () => {
    const chunks = [
      { ...productChunk("d001-moon-secret"), score: 0.75 },
      ...["a", "b", "c", "d", "e", "f"].map((suffix, index) => ({
        ...productChunk(`prod-${suffix}`),
        score: 0.7 - index * 0.01,
      })),
    ] as ScoredChunk[];

    const ids = selectRelatedProductIds(chunks);
    expect(ids).toHaveLength(6);
    expect(ids[0]).toBe("d001-moon-secret");
  });

  it("does not recommend products from weak matches", () => {
    const chunks = [
      {
        id: "manual-confidence",
        question: "confidence",
        answer: "",
        embedText: "",
        keywords: [],
        category: "商品推薦",
        relatedProductIds: ["d003-venus"],
        score: 0.54,
      },
    ] as ScoredChunk[];

    expect(selectRelatedProductIds(chunks)).toEqual([]);
  });

  it("keeps product recommendations out of the static FAQ so delisted products are never suggested", () => {
    expect(knowledgeChunks.filter((chunk) => chunk.category === "商品推薦")).toEqual([]);
    expect(knowledgeChunks.filter((chunk) => chunk.id.startsWith("product-"))).toEqual([]);
    expect(knowledgeChunks.some((chunk) => chunk.relatedProductIds?.length)).toBe(false);
  });

  it("does not return any product from static knowledge when no product knowledge is loaded", async () => {
    const results = await searchKnowledge("限定款有哪些 每月限量手鍊 潛月之境 月下密語", Array(768).fill(1), 10, 0.3);

    expect(results.filter((chunk) => chunk.category === "商品推薦")).toEqual([]);
    expect(selectRelatedProductIds(results)).toEqual([]);
  });

  it("builds searchable recommendation knowledge from an admin product", () => {
    const chunk = buildProductKnowledgeChunk({
      id: "prod-dynamic-protection",
      name: "御光而行",
      subtitle: "每月限量防護手鍊",
      category: "protect",
      categoryLabel: "能量防護",
      categories: ["protect", "healing"],
      categoryLabels: ["能量防護", "療癒系列"],
      price: 1422,
      priceRange: null,
      tags: ["限定款", "防護"],
      description: "",
      story: "",
      benefits: [
        "強力驅除負能量與外界干擾",
        "建立深層保護結界",
        "淨化氣場與空間",
        "提升自信與意志力",
      ],
      suitableFor: [],
      crystalType: "銀曜石・黑碧璽・白水晶・白月光・黑曜石・白幽靈",
      active: true,
      isMonthlyLimited: true,
    });

    expect(chunk).toMatchObject({
      id: "product-prod-dynamic-protection",
      category: "商品推薦",
      relatedProductIds: ["prod-dynamic-protection"],
    });
    expect(chunk.keywords).toEqual(
      expect.arrayContaining(["銀曜石", "黑碧璽", "黑曜石", "強力驅除負能量與外界干擾", "提升自信與意志力"])
    );
    expect(chunk.embedText).toContain("建立深層保護結界");
    expect(chunk.answer).toContain("https://goodaytarot.com/products/prod-dynamic-protection");
  });
});
