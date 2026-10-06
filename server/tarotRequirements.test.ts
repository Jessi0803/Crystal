import { describe, expect, it } from "vitest";
import { TAROT_TOPICS } from "../shared/tarotPricing";
import {
  TAROT_GROUP_REQUIREMENTS,
  TAROT_GROUP_SPEC,
  getTarotGroupByLabel,
  getTarotGroupFields,
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

describe("TAROT_GROUP_SPEC", () => {
  it("有欄位的組合一定要有商品頁承諾，反之亦然", () => {
    // 這兩者原本分開維護，靠註解提醒同步。只要有一邊是空的就代表脫鉤了。
    for (const [group, spec] of Object.entries(TAROT_GROUP_SPEC)) {
      const hasFields = spec.fields.length > 0;
      const hasPromise = spec.requirements.length > 0;
      expect(hasFields, `${group} 有承諾卻沒有欄位`).toBe(hasPromise);
    }
  });

  it("沒有欄位的組合必須說明原因", () => {
    for (const [group, spec] of Object.entries(TAROT_GROUP_SPEC)) {
      if (spec.fields.length > 0) continue;
      expect(Boolean(spec.note), `${group} 沒有欄位也沒有說明`).toBe(true);
    }
  });

  it("商品頁承諾的每一項都有對應的必填欄位", () => {
    // 承諾比欄位粗（「雙方姓名」涵蓋 selfName + partnerName），
    // 所以這裡比的是數量關係：承諾項數不可以多於必填欄位數，
    // 否則就是對客人承諾了表單其實沒有在收的東西。
    for (const [group, spec] of Object.entries(TAROT_GROUP_SPEC)) {
      const required = spec.fields.filter((field) => field.errorMessage);
      expect(
        required.length,
        `${group} 承諾 ${spec.requirements.length} 項但只有 ${required.length} 個必填欄位`
      ).toBeGreaterThanOrEqual(spec.requirements.length);
    }
  });

  it("欄位渲染、驗證、寫備註用的屬性都齊全", () => {
    for (const [group, spec] of Object.entries(TAROT_GROUP_SPEC)) {
      for (const field of spec.fields) {
        expect(field.label, `${group}.${field.key} 缺 label`).toBeTruthy();
        expect(field.placeholder, `${group}.${field.key} 缺 placeholder`).toBeTruthy();
      }
    }
  });

  it("同一組合內不會有重複的欄位 key", () => {
    // 重複的 key 會讓兩個輸入框綁到同一個 state，後者覆蓋前者
    for (const [group, spec] of Object.entries(TAROT_GROUP_SPEC)) {
      const keys = spec.fields.map((field) => field.key);
      expect(new Set(keys).size, `${group} 有重複的欄位`).toBe(keys.length);
    }
  });

  it("每個可購買的主題都查得到欄位定義", () => {
    for (const topic of TAROT_TOPICS) {
      const group = getTarotGroupByLabel(topic.label);
      expect(group, `${topic.label} 查不到組合`).toBeTruthy();
      expect(getTarotGroupFields(group).length, `${topic.label} 沒有任何欄位`).toBeGreaterThan(0);
    }
  });

  it("TAROT_GROUP_REQUIREMENTS 是 TAROT_GROUP_SPEC 的檢視，不是另一份資料", () => {
    for (const [group, spec] of Object.entries(TAROT_GROUP_SPEC)) {
      const view = TAROT_GROUP_REQUIREMENTS[group as keyof typeof TAROT_GROUP_REQUIREMENTS];
      expect(view.requirements).toEqual(spec.requirements);
      expect(view.note).toEqual(spec.note);
    }
  });
});
