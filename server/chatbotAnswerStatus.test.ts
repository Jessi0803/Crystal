import { describe, expect, it } from "vitest";
import { classifyChatbotAnswer } from "./routers/chatbot";

const faq = (score: number) => ({
  id: "faq-warranty",
  question: "手鍊有保固嗎？",
  category: "售後服務",
  score,
});

describe("classifyChatbotAnswer", () => {
  it("marks a strongly grounded FAQ answer as complete", () => {
    expect(classifyChatbotAnswer({
      question: "手鍊有保固嗎？",
      reply: "手鍊提供三個月保固。",
      chunks: [faq(0.82)],
      usedFallback: false,
    })).toMatchObject({ status: "complete", topScore: 0.82 });
  });

  it("does not treat a strong product-name match as enough for an unsupported size detail", () => {
    expect(classifyChatbotAnswer({
      question: "密光之境最大顆水晶尺寸是多少？",
      reply: "密光之境使用天然水晶製作。",
      chunks: [{
        id: "product-honey-realm",
        question: "密光之境手鍊適合什麼需求？",
        category: "商品推薦",
        score: 0.88,
      }],
      usedFallback: false,
    })).toMatchObject({ status: "low_confidence" });
  });

  it("marks no good knowledge match as a knowledge gap", () => {
    expect(classifyChatbotAnswer({
      question: "你們的 IG 網址是什麼？",
      reply: "目前沒有提供相關資訊。",
      chunks: [faq(0.47)],
      usedFallback: true,
    })).toMatchObject({ status: "knowledge_gap" });
  });

  it("marks an explicit LINE referral as handoff", () => {
    expect(classifyChatbotAnswer({
      question: "這款的珠徑是幾 mm？",
      reply: "若想確認特定商品的水晶大小，歡迎透過官方 LINE 詢問。",
      chunks: [faq(0.51)],
      usedFallback: false,
    })).toMatchObject({ status: "handoff" });
  });

  it("keeps greetings out of the review queue", () => {
    expect(classifyChatbotAnswer({
      question: "你好",
      reply: "你好，想了解哪方面的水晶呢？",
      chunks: [],
      usedFallback: true,
    })).toMatchObject({ status: "complete" });
  });

  it("marks a weak match as low confidence even when fallback was not used", () => {
    expect(classifyChatbotAnswer({
      question: "有情侶款嗎？",
      reply: "可以參考愛情能量相關款式。",
      chunks: [faq(0.6)],
      usedFallback: false,
    })).toMatchObject({ status: "low_confidence", topScore: 0.6 });
  });
});
