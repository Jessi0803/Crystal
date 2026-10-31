import {
  promotionProductSubtotal,
  type OrderPromotion,
  type PromotionQuote,
} from "@shared/promotions";

export default function OrderPromotionSummary({
  promotion,
  quote,
  custom,
  showDetails = false,
}: {
  promotion?: OrderPromotion | null;
  quote?: PromotionQuote | null;
  custom?: boolean;
  showDetails?: boolean;
}) {
  if (!promotion && !quote) return null;
  const discount = quote?.discount ?? promotion?.discount ?? 0;
  if (!showDetails && (!promotion || ((quote || !custom) && discount <= 0)))
    return null;

  return (
    <div className="my-3 rounded border p-3 text-xs font-body space-y-1">
      {promotion && (
        <p className="font-medium">
          {promotion.rule.name}
          {showDetails && (
            <>
              {" "}
              · 每滿 NT$ {promotion.rule.threshold.toLocaleString()} 折 NT${" "}
              {promotion.rule.discountAmount.toLocaleString()}
            </>
          )}
        </p>
      )}
      {showDetails && quote && (
        <>
          <p>
            客製商品金額 NT$ {quote.finalPrice.toLocaleString()} · 已付訂金 NT${" "}
            {quote.depositPaid.toLocaleString()}
          </p>
          {(quote.paidRegularSubtotal ?? 0) > 0 && (
            <>
              <p>
                其他已付商品 NT$ {quote.paidRegularSubtotal!.toLocaleString()}
              </p>
              <p>
                活動適用金額 NT${" "}
                {promotionProductSubtotal(quote).toLocaleString()}
              </p>
            </>
          )}
        </>
      )}
      {custom && !quote ? (
        <p>活動優惠將於尾款折抵。</p>
      ) : (
        discount > 0 && <p>活動優惠 NT$ {discount.toLocaleString()}</p>
      )}
    </div>
  );
}
