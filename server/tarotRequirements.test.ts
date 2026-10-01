import { describe, expect, it } from "vitest";
import { TAROT_TOPICS } from "../shared/tarotPricing";
import {
  TAROT_GROUP_REQUIREMENTS,
  getTarotGroupByLabel,
} from "../shared/tarotRequirements";

describe("getTarotGroupByLabel", () => {
  it("商品頁的主題名稱都對得到組合", () => {
    // 價目表是商品頁實際可選的主題，每一個都必須查得到「占卜前需提供」
    const missing = TAROT_TOPICS.filter((topic) => !getTarotGroupByLabel(topic.label));
    expect(missing.map((t) => t.label)).toEqual([]);
  });

  it("名稱中的空白不影響比對", () => {
    // 商品頁寫「前世今生 1」，表單寫「前世今生1」
    expect(getTarotGroupByLabel("前世今生 1")).toBe("basic");
    expect(getTarotGroupByLabel("前世今生1")).toBe("basic");
    expect(getTarotGroupByLabel("流年運勢 2")).toBe("basic");
  });

  it("每個組合都有定義需求或說明", () => {
    for (const [group, value] of Object.entries(TAROT_GROUP_REQUIREMENTS)) {
      const hasContent = value.requirements.length > 0 || Boolean(value.note);
      expect(hasContent, `${group} 沒有需求也沒有說明`).toBe(true);
    }
  });

  it("查不到的名稱回 undefined", () => {
    expect(getTarotGroupByLabel("不存在的主題")).toBeUndefined();
    expect(getTarotGroupByLabel("")).toBeUndefined();
  });
});
