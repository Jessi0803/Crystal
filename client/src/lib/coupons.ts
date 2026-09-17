import type { MemberCouponDisplayStatus } from "@shared/coupons";

export function formatCouponDate(value?: Date | string | null) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function formatCouponMinimum(minOrderAmount: number) {
  return minOrderAmount > 0 ? `滿 NT$ ${minOrderAmount.toLocaleString()} 可用` : "無最低消費";
}

export function formatCouponValidity(template: {
  validityType: "days_after_issue" | "fixed_date";
  validDays: number | null;
  fixedExpiresAt: Date | string | null;
}) {
  return template.validityType === "fixed_date"
    ? `至 ${formatCouponDate(template.fixedExpiresAt)}`
    : `領取後 ${template.validDays ?? 0} 天`;
}

export const COUPON_STATUS_BADGE_CLASS: Record<MemberCouponDisplayStatus, string> = {
  available: "border-emerald-200 bg-emerald-50 text-emerald-800",
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  used: "border-[oklch(0.86_0_0)] bg-[oklch(0.96_0_0)] text-[oklch(0.45_0_0)]",
  expired: "border-[oklch(0.86_0_0)] bg-white text-[oklch(0.55_0_0)]",
};
