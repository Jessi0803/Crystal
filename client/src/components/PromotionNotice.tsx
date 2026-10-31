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
          ? "活動優惠將於尾款折抵。"
          : `預估折抵 NT$ ${discount.toLocaleString()}${next != null ? `，再買 NT$ ${next.toLocaleString()} 即享下一階優惠。` : "，已達優惠上限。"}`}
      </p>
    </div>
  );
}
