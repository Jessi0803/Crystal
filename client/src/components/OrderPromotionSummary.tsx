import type { OrderPromotion, PromotionQuote } from "@shared/promotions";
export default function OrderPromotionSummary({
  promotion,
  quote,
  custom,
}: {
  promotion?: OrderPromotion | null;
  quote?: PromotionQuote | null;
  custom?: boolean;
}) {
  if (!promotion && !quote) return null;
  return (
    <div className="my-3 rounded border p-3 text-xs font-body space-y-1">
      {promotion && (
        <>
          <p>
            {promotion.rule.name}：每滿 NT${" "}
            {promotion.rule.threshold.toLocaleString()} 折 NT${" "}
            {promotion.rule.discountAmount.toLocaleString()}
          </p>
          <p>資格依下單時間保留，付款時不重新判斷活動期間。</p>
        </>
      )}
      {quote ? (
        <>
          <p>
            最終總價 NT$ {quote.finalPrice.toLocaleString()} · 已付訂金 NT${" "}
            {quote.depositPaid.toLocaleString()}
          </p>
          <p>活動優惠 NT$ {quote.discount.toLocaleString()}，於尾款折抵。</p>
        </>
      ) : custom ? (
        <p>等待最終報價後自動計算優惠，訂金照原額支付。</p>
      ) : (
        promotion && <p>活動折抵 NT$ {promotion.discount.toLocaleString()}</p>
      )}
    </div>
  );
}
