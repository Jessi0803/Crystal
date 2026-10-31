/** 優惠券低消看完整商品的活動後金額，實際折抵不超過尚未支付的商品尾款。 */
export function balanceCouponDiscount(params: {
  productAmountAfterPromotion: number;
  remainingProductAmount: number;
  coupon: { discountAmount: number; minOrderAmount: number };
}) {
  if (params.productAmountAfterPromotion < params.coupon.minOrderAmount)
    return {
      ok: false as const,
      reason: `未達優惠券使用門檻 NT$ ${params.coupon.minOrderAmount.toLocaleString()}`,
    };
  const discount = Math.min(
    params.coupon.discountAmount,
    Math.max(0, params.remainingProductAmount)
  );
  if (discount <= 0)
    return { ok: false as const, reason: "沒有可折抵的商品尾款" };
  return { ok: true as const, discount };
}
