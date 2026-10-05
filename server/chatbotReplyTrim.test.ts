/**
 * 回覆被模型截斷時的收尾處理
 */
import { describe, expect, it } from "vitest";
import { trimIncompleteTail } from "./routers/chatbot";

describe("trimIncompleteTail", () => {
  it("正常收尾的回覆原封不動", () => {
    const text = "這款手鍊能幫助您提升自信。";
    expect(trimIncompleteTail(text)).toBe(text);
  });

  it("以完整商品連結結尾也算正常（回答格式允許）", () => {
    const text = "曦光心語手鏈\nhttps://goodaytarot.com/products/prod-1780638076566";
    expect(trimIncompleteTail(text)).toBe(text);
  });

  it("砍掉結尾沒寫完的那一行", () => {
    const text = [
      "以下幾款能幫助您提升自信：",
      "曦光心語手鏈",
      "https://goodaytarot.com/products/prod-1780638076566",
      "人魚",
    ].join("\n");
    expect(trimIncompleteTail(text)).toBe(
      "以下幾款能幫助您提升自信：\n曦光心語手鏈\nhttps://goodaytarot.com/products/prod-1780638076566"
    );
  });

  it("連續多行殘句都要砍掉，但收好引號的品名算完整，保留", () => {
    // 「暖橙之戀手鍊」有收引號，是完整的詞；真正要砍的是後面那行沒寫完的「它能」
    const text = "這款很適合您。\n「暖橙之戀手鍊」\n它能";
    expect(trimIncompleteTail(text)).toBe("這款很適合您。\n「暖橙之戀手鍊」");
  });

  it("只有一行而且是殘句時整段清掉", () => {
    expect(trimIncompleteTail("這款能幫助您增強自信與行動")).toBe("");
  });

  it("整段都是殘句時回空字串，讓呼叫端改用罐頭訊息", () => {
    expect(trimIncompleteTail("它能幫助您增強自信與行動")).toBe("");
  });

  it("空字串與空白安全處理", () => {
    expect(trimIncompleteTail("")).toBe("");
    expect(trimIncompleteTail("   \n  ")).toBe("");
  });

  it("實際案例：圖一那則停在品名的回覆", () => {
    const text = [
      "為您推薦以下幾款能幫助提升自信的手鍊：",
      "曦光心語手鏈",
      "https://goodaytarot.com/products/prod-1780638076566",
      "人魚絮語手鏈",
      "https://goodaytarot.com/products/prod-1780675070026",
      "「暖橙之戀手鍊",
    ].join("\n");
    const result = trimIncompleteTail(text);
    expect(result.endsWith("https://goodaytarot.com/products/prod-1780675070026")).toBe(true);
    expect(result).not.toContain("暖橙之戀");
  });
});
