import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { CUSTOM_LINE_URL } from "@/lib/customOrderingContent";
import { MEMBER_COUPON_STATUS_LABELS, type MemberCouponDisplayStatus } from "@shared/coupons";
import { COUPON_STATUS_BADGE_CLASS, formatCouponDate, formatCouponMinimum } from "@/lib/coupons";

type CouponFilter = "usable" | "used" | "expired";

const FILTERS: { key: CouponFilter; label: string; statuses: MemberCouponDisplayStatus[] }[] = [
  { key: "usable", label: "可使用", statuses: ["available", "pending"] },
  { key: "used", label: "已使用", statuses: ["used"] },
  { key: "expired", label: "已過期", statuses: ["expired"] },
];

export function lineLinkUrl(returnTo: string) {
  const params = new URLSearchParams({ mode: "link", returnTo });
  return `${window.location.origin}/api/trpc/line-oauth-start?${params.toString()}`;
}

/** LINE 好友禮領取卡：未綁定 → 綁定 LINE；已綁定未領 → 加好友後由伺服器確認並領取 */
export function LineFriendRewardCard() {
  const utils = trpc.useUtils();
  const { data: status } = trpc.coupons.lineRewardStatus.useQuery();
  const claim = trpc.coupons.claimLineFriendReward.useMutation({
    onSuccess: async (result) => {
      if (result.status === "granted") toast.success(result.message);
      else if (result.status === "already") toast.info(result.message);
      else toast.error(result.message);
      await Promise.all([utils.coupons.lineRewardStatus.invalidate(), utils.coupons.mine.invalidate()]);
    },
    onError: (err) => toast.error(err.message || "領取失敗，請稍後再試"),
  });

  if (!status?.offer || status.claimed) return null;
  const amount = `$${status.offer.discountAmount.toLocaleString()}`;

  return (
    <div className="mb-6 bg-white border border-[oklch(0.9_0.03_150)] px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1">
        <p className="text-sm font-medium text-[oklch(0.2_0_0)]" style={{ fontFamily: "'Noto Sans TC', sans-serif" }}>
          LINE 好友禮 · 折 {amount}
        </p>
        <p className="text-xs text-[oklch(0.5_0_0)] font-body mt-0.5 leading-relaxed">
          {status.lineBound
            ? "加入官方 LINE 好友後按「領取」，確認完成後優惠券會直接放入帳戶。"
            : `綁定 LINE 並加入官方帳號好友，即可獲得 ${amount} 優惠券（每位會員限領一次）。`}
        </p>
      </div>
      {status.lineBound ? (
        <div className="flex gap-2 shrink-0">
          <a
            href={CUSTOM_LINE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-body border border-[oklch(0.8_0_0)] px-4 py-2 text-[oklch(0.3_0_0)] hover:bg-[oklch(0.96_0_0)]"
          >
            加入好友
          </a>
          <button
            type="button"
            onClick={() => claim.mutate()}
            disabled={claim.isPending}
            className="text-xs font-body bg-[#06C755] text-white px-4 py-2 hover:opacity-90 disabled:opacity-60"
          >
            {claim.isPending ? "確認中..." : `領取 ${amount}`}
          </button>
        </div>
      ) : (
        <a
          href={lineLinkUrl("/member?tab=coupons")}
          className="shrink-0 text-center text-xs font-body bg-[#06C755] text-white px-4 py-2 hover:opacity-90"
        >
          綁定 LINE・領取 {amount}
        </a>
      )}
    </div>
  );
}

export function MemberCouponList() {
  const [filter, setFilter] = useState<CouponFilter>("usable");
  const { data: coupons = [], isLoading, error } = trpc.coupons.mine.useQuery();
  const active = FILTERS.find((item) => item.key === filter)!;
  const visible = coupons.filter((coupon) => active.statuses.includes(coupon.displayStatus));

  return (
    <div>
      <LineFriendRewardCard />

      <div className="flex gap-2 mb-4">
        {FILTERS.map((item) => {
          const count = coupons.filter((coupon) => item.statuses.includes(coupon.displayStatus)).length;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={`text-xs font-body px-3 py-1.5 border transition-colors ${
                filter === item.key
                  ? "border-[oklch(0.15_0_0)] bg-[oklch(0.15_0_0)] text-white"
                  : "border-[oklch(0.88_0_0)] text-[oklch(0.45_0_0)] hover:bg-[oklch(0.96_0_0)]"
              }`}
            >
              {item.label} {count > 0 ? count : ""}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <p className="text-sm text-[oklch(0.55_0_0)] font-body text-center py-12">載入優惠券中...</p>
      ) : error ? (
        <p className="text-sm text-red-600 font-body text-center py-12">載入優惠券失敗</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-[oklch(0.55_0_0)] font-body text-center py-12">
          {filter === "usable" ? "目前沒有可使用的優惠券" : `沒有${active.label}的優惠券`}
        </p>
      ) : (
        <div className="space-y-3">
          {visible.map((coupon) => {
            const muted = coupon.displayStatus === "used" || coupon.displayStatus === "expired";
            return (
              <div
                key={coupon.id}
                className={`bg-white border border-[oklch(0.93_0_0)] flex items-stretch ${muted ? "opacity-70" : ""}`}
              >
                <div className="w-24 shrink-0 flex flex-col items-center justify-center border-r border-dashed border-[oklch(0.88_0_0)] bg-[oklch(0.985_0.005_60)] px-2 py-4">
                  <span className="text-[0.65rem] font-body text-[oklch(0.5_0_0)]">折</span>
                  <span className="text-xl text-[oklch(0.2_0_0)]" style={{ fontFamily: "'Noto Serif TC', serif" }}>
                    ${coupon.discountAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex-1 min-w-0 px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-[oklch(0.2_0_0)] font-body">{coupon.name}</p>
                    <span
                      className={`shrink-0 text-[0.65rem] font-body border px-2 py-0.5 ${COUPON_STATUS_BADGE_CLASS[coupon.displayStatus]}`}
                    >
                      {MEMBER_COUPON_STATUS_LABELS[coupon.displayStatus]}
                    </span>
                  </div>
                  <p className="text-xs text-[oklch(0.5_0_0)] font-body mt-1">{formatCouponMinimum(coupon.minOrderAmount)}</p>
                  <p className="text-xs text-[oklch(0.5_0_0)] font-body mt-0.5">
                    {coupon.displayStatus === "used"
                      ? `使用於 ${formatCouponDate(coupon.usedAt)}${coupon.orderMerchantTradeNo ? `・訂單 #${coupon.orderMerchantTradeNo}` : ""}`
                      : `有效期限：${formatCouponDate(coupon.expiresAt)}`}
                  </p>
                  {coupon.displayStatus === "pending" && (
                    <p className="text-xs text-amber-700 font-body mt-0.5">
                      已套用在待付款訂單{coupon.orderMerchantTradeNo ? ` #${coupon.orderMerchantTradeNo}` : ""}，付款失敗或取消後會退回。
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="mt-4 text-xs text-[oklch(0.6_0_0)] font-body">結帳時可選擇一張優惠券折抵商品金額（不含運費）。</p>
    </div>
  );
}
