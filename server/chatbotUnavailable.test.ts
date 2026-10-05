/**
 * 「顧客問的晶石沒現貨」的判定
 *
 * 這個判定一成立就會把所有商品推薦清空，所以不能太寬鬆：
 * 中文裡「有綠幽靈嗎」與「有吊飾嗎」同為「有沒有某類商品」的問句，
 * 語意相似度天生就高，必須靠「是不是最高分」來區分顧客真正在問什麼。
 */
import { describe, expect, it } from "vitest";
import { isUnavailableCrystalQuestion } from "./routers/chatbot";

const UNAVAILABLE = "rec-crystal-green-phantom-unavailable";

describe("isUnavailableCrystalQuestion", () => {
  it("顧客真的在問那款缺貨晶石：缺貨條目分數最高 → 成立", () => {
    expect(
      isUnavailableCrystalQuestion([
        { id: UNAVAILABLE, score: 0.82 },
        { id: "product-d003-venus", score: 0.61 },
      ])
    ).toBe(true);
  });

  it("問吊飾時缺貨條目被商品壓過去 → 不成立（原本會誤殺）", () => {
    expect(
      isUnavailableCrystalQuestion([
        { id: "product-d003-venus", score: 0.73 },
        { id: UNAVAILABLE, score: 0.614 },
        { id: "product-prod-1780813166092", score: 0.6 },
      ])
    ).toBe(false);
  });

  it("完全沒有缺貨條目 → 不成立", () => {
    expect(
      isUnavailableCrystalQuestion([
        { id: "product-d003-venus", score: 0.73 },
        { id: "faq-cleanse", score: 0.5 },
      ])
    ).toBe(false);
  });

  it("缺貨條目最高分但低於 0.55 → 不成立，避免弱匹配也清空商品", () => {
    expect(isUnavailableCrystalQuestion([{ id: UNAVAILABLE, score: 0.48 }])).toBe(false);
  });

  it("剛好等於門檻 0.55 → 成立", () => {
    expect(isUnavailableCrystalQuestion([{ id: UNAVAILABLE, score: 0.55 }])).toBe(true);
  });

  it("沒有任何檢索結果 → 不成立", () => {
    expect(isUnavailableCrystalQuestion([])).toBe(false);
  });

  it("順序顛倒也要看分數，不是看位置", () => {
    expect(
      isUnavailableCrystalQuestion([
        { id: "product-d003-venus", score: 0.61 },
        { id: UNAVAILABLE, score: 0.82 },
      ])
    ).toBe(true);
  });
});
