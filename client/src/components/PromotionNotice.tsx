import { promotionNextThreshold, type PromotionRule } from "@shared/promotions";
export default function PromotionNotice({
  rule,
  subtotal,
  discount,
  custom = false,
}: {
  rule: PromotionRule;
  subtotal: number;
  discount: number;
  custom?: boolean;
}) {
  const next = promotionNextThreshold(subtotal, rule);
  return (
    <div
      className="my-3 border border-sf-line rounded p-3 text-xs font-body text-sf-text bg-sf-cream"
      aria-live="polite"
    >
      <p className="font-medium">
        {rule.name} · 每滿 NT$ {rule.threshold.toLocaleString()} 折 NT${" "}
        {rule.discountAmount.toLocaleString()}
        {rule.maxDiscount != null
          ? `，最高折 NT$ ${rule.maxDiscount.toLocaleString()}`
          : ""}
      </p>
      <p className="mt-1">
        {custom
          ? "客製訂單將保留下單時的活動規則，最終報價後自動於尾款折抵；訂金照原額支付。"
          : `預估活動折抵 NT$ ${discount.toLocaleString()}${next != null ? `，再買 NT$ ${next.toLocaleString()} 可增加優惠。` : "，已達折抵上限。"}`}
      </p>
      <p className="mt-1">
        活動期間：
        {new Date(rule.startsAt).toLocaleString("zh-TW", {
          timeZone: "Asia/Taipei",
        })}{" "}
        ～{" "}
        {new Date(rule.endsAt).toLocaleString("zh-TW", {
          timeZone: "Asia/Taipei",
        })}
        （台灣時間，結束時刻不含）。
      </p>
      <p className="mt-1">
        可併用優惠券，低消以活動後商品金額計算。運費不計入活動門檻。
      </p>
    </div>
  );
}
