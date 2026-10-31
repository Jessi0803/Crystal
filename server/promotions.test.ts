import { describe, expect, it } from "vitest";
import {
  usesPromotionFlow,
  promotionDiscount,
  promotionNextThreshold,
  quoteCustomPromotion,
  balancePromotionTotal,
  type PromotionRule,
} from "../shared/promotions";
import { calcCouponDiscount } from "../shared/coupons";
import { balanceCouponDiscount } from "../shared/balanceCoupons";
const rule: PromotionRule = {
  id: 1,
  name: "雙十一",
  threshold: 1111,
  discountAmount: 111,
  maxDiscount: null,
  startsAt: "2026-11-01T00:00:00+08:00",
  endsAt: "2026-11-12T00:00:00+08:00",
};
describe("活動計算驗收條件", () => {
  it.each([
    [1110, 0],
    [1111, 111],
    [2221, 111],
    [2222, 222],
    [3333, 333],
  ])("商品 %i 折 %i", (subtotal, expected) =>
    expect(promotionDiscount(subtotal, rule)).toBe(expected)
  );
  it("活動後金額才是優惠券低消基準", () => {
    const subtotal = 2500 - promotionDiscount(2500, rule);
    expect(
      calcCouponDiscount({
        subtotal,
        shippingFee: 130,
        coupon: { discountAmount: 100, minOrderAmount: 2400 },
      }).ok
    ).toBe(false);
    expect(
      calcCouponDiscount({
        subtotal,
        shippingFee: 130,
        coupon: { discountAmount: 100, minOrderAmount: 2000 },
      })
    ).toMatchObject({ ok: true, total: 2308 });
  });
  it("上限與下一階提示", () => {
    expect(promotionNextThreshold(2221, rule)).toBe(1);
    expect(promotionDiscount(3333, { ...rule, maxDiscount: 250 })).toBe(250);
    expect(
      promotionNextThreshold(3333, { ...rule, maxDiscount: 250 })
    ).toBeNull();
  });
  it("客製依保存規則報價，不依尾款付款日期", () => {
    const saved = structuredClone(rule);
    const edited = { ...rule, discountAmount: 1 };
    expect(quoteCustomPromotion(3333, 1000, saved).discount).toBe(333);
    expect(quoteCustomPromotion(3333, 1000, edited).discount).toBe(3);
    expect(
      balancePromotionTotal(
        2333,
        130,
        0,
        quoteCustomPromotion(3333, 1000, saved)
      ).total
    ).toBe(2130);
  });
  it("活動可以折抵運費，最低為零", () => {
    const quote = quoteCustomPromotion(1111, 1100, rule);
    expect(balancePromotionTotal(11, 60, 0, quote)).toEqual({
      total: 0,
      discount: 71,
    });
    expect(balancePromotionTotal(11, 130, 0, quote).total).toBe(30);
  });
  it("客製優惠券門檻看完整活動後金額，但不重扣已付訂金", () => {
    expect(
      balanceCouponDiscount({
        productAmountAfterPromotion: 3000,
        remainingProductAmount: 20,
        coupon: { discountAmount: 100, minOrderAmount: 2000 },
      })
    ).toEqual({ ok: true, discount: 20 });
  });
  it("合併客製單逐單計算，不以合計金額重新跨門檻", () => {
    const first = quoteCustomPromotion(1500, 1000, rule);
    const second = quoteCustomPromotion(2000, 1000, null);
    expect(first.discount + second.discount).toBe(111);
    expect(
      balancePromotionTotal(1500, 0, 0, {
        finalPrice: 3500,
        depositPaid: 2000,
        discount: first.discount + second.discount,
      }).total
    ).toBe(1389);
  });
});

describe("新舊訂單流程分界（不依日期或目前活動推測）", () => {
  it("既有 NULL 或未帶版本的訂單沿用舊流程", () => {
    expect(usesPromotionFlow({})).toBe(false);
    expect(usesPromotionFlow({ promotionFlowVersion: null })).toBe(false);
  });
  it("只有建立訂單時明確寫入版本 1 才進入新流程", () => {
    expect(usesPromotionFlow({ promotionFlowVersion: 1 })).toBe(true);
    expect(usesPromotionFlow({ promotionFlowVersion: 0 })).toBe(false);
  });
});
