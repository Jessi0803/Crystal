/**
 * 顧客評價顯示名稱的隱私處理
 */
import { describe, expect, it } from "vitest";
import {
  ANONYMOUS_DISPLAY_NAME,
  FALLBACK_DISPLAY_NAME,
  maskPersonalName,
  resolveReviewDisplayName,
} from "./reviewDisplayName";

describe("maskPersonalName：像中文姓名就遮罩", () => {
  it("3 字姓名只留姓", () => {
    expect(maskPersonalName("葉小明")).toBe("葉**");
  });

  it("2 字姓名也遮", () => {
    expect(maskPersonalName("葉大")).toBe("葉*");
  });

  it("4 字（含複姓）只留第一個字", () => {
    expect(maskPersonalName("歐陽小明")).toBe("歐***");
  });

  it("單字沒得遮，原樣輸出", () => {
    expect(maskPersonalName("葉")).toBe("葉");
  });
});

describe("maskPersonalName：不像姓名就完整顯示", () => {
  it("英文姓名完整顯示", () => {
    expect(maskPersonalName("John Smith")).toBe("John Smith");
    expect(maskPersonalName("Yuki")).toBe("Yuki");
  });

  it("中英混合與含 emoji 的暱稱完整顯示", () => {
    expect(maskPersonalName("小兔子🐰")).toBe("小兔子🐰");
    expect(maskPersonalName("Amy 艾咪")).toBe("Amy 艾咪");
  });

  it("5 個字以上的中文不像姓名，完整顯示", () => {
    expect(maskPersonalName("愛吃糖的我")).toBe("愛吃糖的我");
  });

  it("連續空白會收斂成一個", () => {
    expect(maskPersonalName("  Mary   Jane  ")).toBe("Mary Jane");
  });
});

describe("maskPersonalName：誤填 Email", () => {
  it("只留第一個字，不把信箱公開", () => {
    expect(maskPersonalName("alice@example.com")).toBe("a***");
  });

  it("空值回空字串", () => {
    expect(maskPersonalName(null)).toBe("");
    expect(maskPersonalName(undefined)).toBe("");
    expect(maskPersonalName("   ")).toBe("");
  });
});

describe("resolveReviewDisplayName", () => {
  it("匿名一律是匿名顧客，不看任何個人資料", () => {
    expect(
      resolveReviewDisplayName({ name: "葉小明", lineDisplayName: "小兔子" }, { anonymous: true })
    ).toBe(ANONYMOUS_DISPLAY_NAME);
  });

  it("優先用 LINE 名稱，而且一樣會判斷要不要遮罩", () => {
    // 暱稱照常顯示
    expect(
      resolveReviewDisplayName({ name: "葉小明", lineDisplayName: "小兔子🐰" }, { anonymous: false })
    ).toBe("小兔子🐰");
    // LINE 名稱其實是真名時也要遮（正式站有 19 個是這種）
    expect(
      resolveReviewDisplayName({ name: "葉小明", lineDisplayName: "陳怡君" }, { anonymous: false })
    ).toBe("陳**");
  });

  it("沒有 LINE 名稱時用 users.name", () => {
    expect(resolveReviewDisplayName({ name: "葉小明" }, { anonymous: false })).toBe("葉**");
    expect(resolveReviewDisplayName({ name: "John Smith" }, { anonymous: false })).toBe("John Smith");
  });

  it("都沒有時用會員當 fallback", () => {
    expect(resolveReviewDisplayName({}, { anonymous: false })).toBe(FALLBACK_DISPLAY_NAME);
    expect(resolveReviewDisplayName({ name: "  ", lineDisplayName: "" }, { anonymous: false })).toBe(
      FALLBACK_DISPLAY_NAME
    );
  });

  it("名稱過長會截斷到欄位長度", () => {
    expect(
      resolveReviewDisplayName({ lineDisplayName: "暱".repeat(80) }, { anonymous: false })
    ).toHaveLength(50);
  });
});
