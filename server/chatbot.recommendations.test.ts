import { describe, expect, it } from "vitest";
import {
  buildProductKnowledgeChunk,
  knowledgeChunks,
  searchKnowledge,
  selectStaticKnowledgeForSearch,
  type ScoredChunk,
} from "./crystalKnowledge";
import { selectRelatedProductIds } from "./routers/chatbot";

function recommendationChunk(id: string) {
  const chunk = knowledgeChunks.find((entry) => entry.id === id);
  expect(chunk).toBeDefined();
  return chunk!;
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
      { ...recommendationChunk("product-prod-1780212635593"), score: 0.68 },
      { ...recommendationChunk("product-prod-1780213098870"), score: 0.66 },
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

  it("moves legacy static products behind newer product matches when enough newer options match", () => {
    const chunks = [
      { ...recommendationChunk("product-d001-moon-secret"), score: 0.8 },
      { ...recommendationChunk("product-d005-moon-clear-heart"), score: 0.78 },
      { ...recommendationChunk("product-prod-1780213098870"), score: 0.7 },
      { ...recommendationChunk("product-prod-1780212635593"), score: 0.68 },
    ] as ScoredChunk[];

    expect(selectRelatedProductIds(chunks)).toEqual([
      "prod-1780213098870",
      "prod-1780212635593",
      "d001-moon-secret",
      "d005-moon-clear-heart",
    ]);
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

  it("skips static product knowledge when the same product exists in dynamic knowledge", () => {
    const dynamicProduct = buildProductKnowledgeChunk({
      id: "d001-moon-secret",
      name: "月下密語手鍊",
      subtitle: "DB 商品知識",
      category: "healing",
      categoryLabel: "療癒系列",
      categories: ["healing"],
      categoryLabels: ["療癒系列"],
      price: 1580,
      priceRange: null,
      tags: ["淨化"],
      description: "",
      story: "",
      benefits: ["安撫情緒與壓力"],
      suitableFor: [],
      crystalType: "白幽靈、藍月光",
      active: true,
      isMonthlyLimited: false,
    });

    const searchable = selectStaticKnowledgeForSearch(knowledgeChunks, [dynamicProduct]);
    const ids = searchable.map((chunk) => chunk.id);

    expect(ids).not.toContain("product-d001-moon-secret");
    expect(ids).toContain("rec-healing");
    expect(ids).toContain("product-d002-honey-realm");
  });

  it("finds limited design products for limited-edition questions", async () => {
    const results = await searchKnowledge("限定款有哪些 每月限量手鍊", Array(768).fill(1), 5, 0.45);
    const resultIds = results.map((chunk) => chunk.id);

    expect(resultIds).toHaveLength(5);
    expect(resultIds).toEqual(
      expect.arrayContaining([
        "product-prod-1780212635593",
        "product-prod-1780212866677",
        "product-prod-1780212957392",
        "product-prod-1780213098870",
        "product-prod-1780213199030",
      ])
    );
  });

  it("does not classify regular design products as limited editions", async () => {
    const results = await searchKnowledge("限定款有哪些 每月限量手鍊", Array(768).fill(1), 10, 0.45);
    const resultIds = results.map((chunk) => chunk.id);

    expect(resultIds).not.toContain("product-d001-moon-secret");
    expect(resultIds).not.toContain("product-d002-honey-realm");
    expect(resultIds).not.toContain("product-d003-venus");
    expect(resultIds).not.toContain("product-d004-morning-whisper");
    expect(resultIds).not.toContain("product-d005-moon-clear-heart");
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
