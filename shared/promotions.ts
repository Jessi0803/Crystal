/** 下單時保存完整活動規則，尾款不查詢目前活動。期間採 [開始, 結束)。 */
export type PromotionRule = {
  id: number;
  name: string;
  threshold: number;
  discountAmount: number;
  maxDiscount: number | null;
  startsAt: string;
  endsAt: string;
};
export type PromotionQuote = {
  /** 僅客製商品的完整售價，含訂金，不含首單一般商品與運費。 */
  finalPrice: number;
  /** 首單已付款的一般商品；舊報價未保存時維持原值 0，需重新報價才更新。 */
  paidRegularSubtotal?: number;
  depositPaid: number;
  discount: number;
};
export type OrderPromotion = {
  rule: PromotionRule;
  qualifiedAt: string;
  discount: number;
  quote?: PromotionQuote;
};
export const PROMOTION_DISCOUNT_PRODUCT_ID = "promotion-discount";
export function promotionDiscount(
  subtotal: number,
  rule?: PromotionRule | null
): number {
  if (!rule || subtotal <= 0) return 0;
  return Math.min(
    subtotal,
    rule.maxDiscount ?? subtotal,
    Math.floor(subtotal / rule.threshold) * rule.discountAmount
  );
}
export function promotionNextThreshold(subtotal: number, rule: PromotionRule) {
  if (
    rule.maxDiscount != null &&
    promotionDiscount(subtotal, rule) >= rule.maxDiscount
  )
    return null;
  return (
    (Math.floor(subtotal / rule.threshold) + 1) * rule.threshold - subtotal
  );
}
export function quoteCustomPromotion(
  finalPrice: number,
  depositPaid: number,
  rule?: PromotionRule | null,
  paidRegularSubtotal = 0
) {
  const discount = promotionDiscount(finalPrice + paidRegularSubtotal, rule);
  return { finalPrice, depositPaid, paidRegularSubtotal, discount };
}
/** 門檻包含首單一般商品；應付尾款仍只收客製尚欠本金。 */
export function promotionProductSubtotal(quote: PromotionQuote) {
  return quote.finalPrice + (quote.paidRegularSubtotal ?? 0);
}
/** 尾款本金尚未折活動；多餘的活動優惠可以繼續折運費，不回抵訂金。 */
export function balancePromotionTotal(
  amount: number,
  shippingFee: number,
  addOn: number,
  quote?: PromotionQuote | null
) {
  const discount = quote?.discount ?? 0;
  const total = Math.max(0, amount + addOn + shippingFee - discount);
  return { total, discount: Math.min(discount, amount + addOn + shippingFee) };
}

/** NULL / undefined 的既有訂單一律沿用原流程，不依日期或活動內容推測。 */
export const PROMOTION_FLOW_VERSION = 1;
export function usesPromotionFlow(order: {
  promotionFlowVersion?: number | null;
}) {
  return order.promotionFlowVersion === PROMOTION_FLOW_VERSION;
}
