import { CUSTOM_PRODUCT_IDS } from "./const";
import type { OverseasShipCountryCode } from "./overseasShipping";

export type CheckoutRegion = "domestic" | "overseas";
export type DomesticShippingMethod = "cvs_711" | "cvs_family" | "home";
export type CheckoutPaymentMethod = "credit" | "atm" | "paypal";

export const DOMESTIC_SHIPPING_FEES: Record<DomesticShippingMethod, number> = {
  home: 100,
  cvs_711: 60,
  cvs_family: 60,
};

export const OVERSEAS_SHIPPING_FEES: Record<OverseasShipCountryCode, number> = {
  MY: 334,
  HK: 350,
  SG: 350,
  US: 771,
  GB: 644,
  AU: 552,
};

export const PAYMENT_FEE_RATES: Partial<Record<CheckoutPaymentMethod, number>> = {
  credit: 0.02,
  paypal: 0.06,
};

export type CheckoutFeeItem = {
  id: string;
  baseProductId?: string;
  name?: string;
  price: number;
  quantity: number;
};

export function isCheckoutFeeExemptProduct(item: { id: string; baseProductId?: string; name?: string }) {
  const productId = item.baseProductId ?? item.id;
  return (
    CUSTOM_PRODUCT_IDS.includes(productId) ||
    productId.startsWith("test-") ||
    item.id.startsWith("test-") ||
    item.name?.includes("測試用") === true
  );
}

export function calcCheckoutFees(params: {
  items: CheckoutFeeItem[];
  checkoutRegion: CheckoutRegion;
  shippingMethod: DomesticShippingMethod;
  paymentMethod: CheckoutPaymentMethod;
  overseasCountry?: OverseasShipCountryCode | null;
}) {
  const subtotal = params.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const chargeableSubtotal = params.items
    .filter((item) => !isCheckoutFeeExemptProduct(item))
    .reduce((sum, item) => sum + item.price * item.quantity, 0);
  const appliesFees = chargeableSubtotal > 0;

  const shippingFee = !appliesFees
    ? 0
    : params.checkoutRegion === "overseas"
      ? params.overseasCountry
        ? OVERSEAS_SHIPPING_FEES[params.overseasCountry]
        : 0
      : DOMESTIC_SHIPPING_FEES[params.shippingMethod];

  const paymentFeeRate = appliesFees ? PAYMENT_FEE_RATES[params.paymentMethod] ?? 0 : 0;
  const paymentFee = Math.ceil((chargeableSubtotal + shippingFee) * paymentFeeRate);
  const total = subtotal + shippingFee + paymentFee;

  return {
    subtotal,
    chargeableSubtotal,
    shippingFee,
    paymentFee,
    total,
    appliesFees,
  };
}
