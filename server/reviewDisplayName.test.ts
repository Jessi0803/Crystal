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

describe("maskPersonalName", () => {
  it("中文 3 字：只留姓與最後一字", () => {
    expect(maskPersonalName("王小明")).toBe("王○明");
  });

  it("中文 4 字以上：中間全部遮掉", () => {
    expect(maskPersonalName("歐陽小明")).toBe("歐○○明");
    expect(maskPersonalName("王小明明明")).toBe("王○○○明");
  });

  it("中文 2 字：只留姓，不產生奇怪的空遮罩", () => {
    expect(maskPersonalName("王大")).toBe("王○");
  });

  it("中文 1 字：原樣輸出", () => {
    expect(maskPersonalName("王")).toBe("王");
  });

  it("英文：只留第一段，不顯示姓氏", () => {
    expect(maskPersonalName("John Smith")).toBe("John");
    expect(maskPersonalName("Yuki")).toBe("Yuki");
    expect(maskPersonalName("  Mary  Jane  Watson ")).toBe("Mary");
  });

  it("看起來像 Email：只留第一個字", () => {
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
      resolveReviewDisplayName({ name: "王小明", lineDisplayName: "小兔子" }, { anonymous: true })
    ).toBe(ANONYMOUS_DISPLAY_NAME);
  });

  it("有 LINE 暱稱就直接用：那是公開暱稱，不是真實姓名", () => {
    expect(
      resolveReviewDisplayName({ name: "王小明", lineDisplayName: "小兔子🐰" }, { anonymous: false })
    ).toBe("小兔子🐰");
  });

  it("沒有 LINE 暱稱時用遮罩過的姓名", () => {
    expect(resolveReviewDisplayName({ name: "王小明" }, { anonymous: false })).toBe("王○明");
  });

  it("兩者都沒有時用會員當 fallback", () => {
    expect(resolveReviewDisplayName({}, { anonymous: false })).toBe(FALLBACK_DISPLAY_NAME);
    expect(resolveReviewDisplayName({ name: "  ", lineDisplayName: "" }, { anonymous: false })).toBe(
      FALLBACK_DISPLAY_NAME
    );
  });

  it("名稱過長會截斷到欄位長度", () => {
    const long = "暱".repeat(80);
    expect(resolveReviewDisplayName({ lineDisplayName: long }, { anonymous: false })).toHaveLength(50);
  });
});
