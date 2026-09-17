/** 優惠券折抵在 orderItems 中的列（與運費列 shipping-fee 相同做法） */
export const COUPON_DISCOUNT_PRODUCT_ID = "coupon-discount";

/** 非商品的訂單明細列：計算庫存、免運件數、銷售排行時要排除 */
export const NON_PRODUCT_ORDER_ITEM_IDS = ["shipping", "shipping-fee", "payment-fee", COUPON_DISCOUNT_PRODUCT_ID];

/** 待付款訂單保留優惠券的時間；超過後若訂單仍未付款，會員可把券用在新訂單 */
export const COUPON_RESERVATION_TTL_MS = 30 * 60_000;

export const COUPON_SOURCES = ["LINE_FRIEND", "BIRTHDAY", "ADMIN_GIFT", "CAMPAIGN"] as const;
export type CouponSource = (typeof COUPON_SOURCES)[number];

export const COUPON_SOURCE_LABELS: Record<CouponSource, string> = {
  LINE_FRIEND: "LINE 好友禮",
  BIRTHDAY: "生日禮",
  ADMIN_GIFT: "人工發放",
  CAMPAIGN: "活動",
};

/** available：可使用；pending：已套用在待付款訂單；used：已使用；expired：已過期 */
export type MemberCouponDisplayStatus = "available" | "pending" | "used" | "expired";

export const MEMBER_COUPON_STATUS_LABELS: Record<MemberCouponDisplayStatus, string> = {
  available: "可使用",
  pending: "待付款",
  used: "已使用",
  expired: "已過期",
};

export function getMemberCouponDisplayStatus(
  coupon: { status: "available" | "reserved" | "used"; expiresAt: Date },
  opts: { reservationReleasable: boolean; now?: Date }
): MemberCouponDisplayStatus {
  const now = opts.now ?? new Date();
  if (coupon.status === "used") return "used";
  if (coupon.status === "reserved" && !opts.reservationReleasable) return "pending";
  if (coupon.expiresAt.getTime() <= now.getTime()) return "expired";
  return "available";
}

export type CouponDiscountResult =
  | { ok: true; discount: number; total: number }
  | { ok: false; reason: string };

/**
 * 固定金額折抵：只折商品小計，不折運費；折抵後應付金額必須大於 0（金流無法處理 0 元）。
 */
export function calcCouponDiscount(params: {
  subtotal: number;
  shippingFee: number;
  coupon: { discountAmount: number; minOrderAmount: number };
}): CouponDiscountResult {
  const { subtotal, shippingFee, coupon } = params;
  if (subtotal < coupon.minOrderAmount) {
    return { ok: false, reason: `未達最低消費 NT$ ${coupon.minOrderAmount.toLocaleString()}` };
  }
  const discount = Math.min(coupon.discountAmount, subtotal);
  const total = subtotal - discount + shippingFee;
  if (discount <= 0 || total <= 0) {
    return { ok: false, reason: "此訂單金額無法使用這張優惠券" };
  }
  return { ok: true, discount, total };
}
