import { CUSTOM_PRODUCT_IDS } from "./const";
import type { OverseasShipCountryCode } from "./overseasShipping";

export type CheckoutRegion = "domestic" | "overseas";
export type DomesticShippingMethod = "cvs_711" | "cvs_family" | "home";
export type CheckoutPaymentMethod = "credit" | "atm" | "paypal";

export const DOMESTIC_SHIPPING_FEES: Record<DomesticShippingMethod, number> = {
  home: 130,
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
  credit: 0,
  paypal: 0,
};

export const FREE_SHIPPING_EMAILS = ["baby90522@gmail.com"];

export type CheckoutFeeItem = {
  id: string;
  baseProductId?: string;
  name?: string;
  price: number;
  quantity: number;
  twoItemFreeShippingEligible?: boolean;
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

function isTestProduct(item: { id: string; baseProductId?: string; name?: string }) {
  const productId = item.baseProductId ?? item.id;
  return productId.startsWith("test-") || item.id.startsWith("test-") || item.name?.includes("測試用") === true;
}

function calcFreeShippingQuantity(items: CheckoutFeeItem[]) {
  return items
    .filter((item) => !isTestProduct(item) && item.twoItemFreeShippingEligible !== false)
    .reduce((sum, item) => sum + item.quantity, 0);
}

export function isFreeShippingEmail(email?: string | null) {
  return email ? FREE_SHIPPING_EMAILS.includes(email.trim().toLowerCase()) : false;
}

export function calcCheckoutFees(params: {
  items: CheckoutFeeItem[];
  checkoutRegion: CheckoutRegion;
  shippingMethod: DomesticShippingMethod;
  paymentMethod: CheckoutPaymentMethod;
  overseasCountry?: OverseasShipCountryCode | null;
  buyerEmail?: string | null;
  forceFreeShipping?: boolean;
  forcePaidShipping?: boolean;
}) {
  const subtotal = params.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const chargeableSubtotal = params.items
    .filter((item) => !isCheckoutFeeExemptProduct(item))
    .reduce((sum, item) => sum + item.price * item.quantity, 0);
  const appliesFees = chargeableSubtotal > 0;
  const domesticFreeShipping = params.checkoutRegion === "domestic" && calcFreeShippingQuantity(params.items) >= 2;
  const emailFreeShipping = isFreeShippingEmail(params.buyerEmail);
  const forcedFreeShipping = params.forceFreeShipping === true;
  const forcedPaidShipping = params.forcePaidShipping === true;

  const shippingFee = !appliesFees
    ? 0
    : forcedFreeShipping
      ? 0
    : forcedPaidShipping
      ? params.checkoutRegion === "overseas"
        ? params.overseasCountry
          ? OVERSEAS_SHIPPING_FEES[params.overseasCountry]
          : 0
        : DOMESTIC_SHIPPING_FEES[params.shippingMethod]
    : emailFreeShipping
      ? 0
    : domesticFreeShipping
      ? 0
    : params.checkoutRegion === "overseas"
      ? params.overseasCountry
        ? OVERSEAS_SHIPPING_FEES[params.overseasCountry]
        : 0
      : DOMESTIC_SHIPPING_FEES[params.shippingMethod];

  const paymentFee = 0;
  const total = subtotal + shippingFee + paymentFee;

  return {
    subtotal,
    chargeableSubtotal,
    shippingFee,
    paymentFee,
    total,
    appliesFees,
    domesticFreeShipping,
    emailFreeShipping,
    forcedFreeShipping,
    forcedPaidShipping,
  };
}
