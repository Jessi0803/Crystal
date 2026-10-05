/**
 * RAG 注入時的知識截斷：長度要控制，但價格與商品連結一定要留著
 */
import { describe, expect, it } from "vitest";
import { clipKnowledgeAnswer, extractPriceAndLinkTail } from "./routers/chatbot";

const TAIL = "價格 NT$950，商品連結：https://goodaytarot.com/products/d003-venus";
const LONG_BENEFITS = "·太陽石｜增強自信、提升行動力 帶來積極、勇氣與活力，改善容易自我懷疑的狀態。".repeat(12);

describe("extractPriceAndLinkTail", () => {
  it("取得「價格…商品連結」整段", () => {
    expect(extractPriceAndLinkTail(`「維納斯 Venus」${LONG_BENEFITS}${TAIL}`)).toBe(TAIL);
  });

  it("沒有連結時回空字串", () => {
    expect(extractPriceAndLinkTail("這款手鍊適合想提升自信的人。")).toBe("");
  });

  it("連結自成一行時，帶著那一行回傳", () => {
    const text = "手鍊怎麼淨化？請參考說明：\nhttps://goodaytarot.com/custom";
    expect(extractPriceAndLinkTail(text)).toBe("https://goodaytarot.com/custom");
  });
});

describe("clipKnowledgeAnswer", () => {
  it("短的答案原封不動", () => {
    const short = `「月下密語手鍊」適合想安定情緒的人。${TAIL}`;
    expect(clipKnowledgeAnswer(short, 400)).toBe(short);
  });

  it("長答案會截斷，但價格與連結保留", () => {
    const answer = `「維納斯 Venus」${LONG_BENEFITS}${TAIL}`;
    expect(answer.length).toBeGreaterThan(400);

    const clipped = clipKnowledgeAnswer(answer, 400);
    expect(clipped).toContain("https://goodaytarot.com/products/d003-venus");
    expect(clipped).toContain("NT$950");
    expect(clipped).toContain("…（中略）");
    expect(clipped.startsWith("「維納斯 Venus」")).toBe(true);
  });

  it("截斷後總長度不超過上限", () => {
    const answer = `「維納斯 Venus」${LONG_BENEFITS}${TAIL}`;
    expect(clipKnowledgeAnswer(answer, 400).length).toBeLessThanOrEqual(400);
  });

  it("沒有連結的長答案沿用原本的尾端截斷", () => {
    const answer = "手鍊淨化說明。".repeat(100);
    const clipped = clipKnowledgeAnswer(answer, 400);
    expect(clipped.endsWith("…（後略）")).toBe(true);
    expect(clipped.length).toBeLessThanOrEqual(400 + "…（後略）".length);
  });

  it("預設上限是 400 字（原本 240 會把連結切掉）", () => {
    const answer = `「維納斯 Venus」${LONG_BENEFITS}${TAIL}`;
    expect(clipKnowledgeAnswer(answer)).toContain("https://goodaytarot.com/products/d003-venus");
  });
});
