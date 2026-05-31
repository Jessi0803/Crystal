type ProductPricingFields = {
  id: string;
  price: number;
  originalPrice?: number | null;
  howToUse?: string[];
};

type TieredBraceletPrices = {
  small: number;
  medium: number;
  large: number;
};

const DEFAULT_TIERED_BRACELET_PRICES: TieredBraceletPrices = {
  small: 1480,
  medium: 1580,
  large: 1680,
};

const TIERED_BRACELET_PRICES_BY_PRODUCT_ID: Record<string, TieredBraceletPrices> = {
  "d004-morning-whisper": {
    small: 1700,
    medium: 1800,
    large: 1900,
  },
  "d005-moon-clear-heart": {
    small: 1400,
    medium: 1500,
    large: 1600,
  },
};

function formatPrice(price: number) {
  return `NT$ ${price.toLocaleString()}`;
}

export function usesTieredBraceletPricing(product: ProductPricingFields) {
  return product.id !== "d003-venus" && Boolean(product.howToUse?.some((line) => line.includes("手圍")));
}

export function getTieredBraceletPrices(productId: string) {
  return TIERED_BRACELET_PRICES_BY_PRODUCT_ID[productId] ?? DEFAULT_TIERED_BRACELET_PRICES;
}

export function getSaleRate(product: ProductPricingFields) {
  if (!product.originalPrice || product.originalPrice <= 0 || product.price >= product.originalPrice) {
    return null;
  }
  return product.price / product.originalPrice;
}

export function applySaleRate(price: number, saleRate: number | null) {
  return saleRate ? Math.round(price * saleRate) : price;
}

export function getTieredBraceletBasePrice(productId: string, wristSize: number) {
  const prices = getTieredBraceletPrices(productId);
  if (wristSize <= 13.5) return prices.small;
  if (wristSize <= 17) return prices.medium;
  return prices.large;
}

export function getTieredBraceletDisplay(product: ProductPricingFields) {
  const prices = getTieredBraceletPrices(product.id);
  const saleRate = getSaleRate(product);
  const originalRange = `${formatPrice(prices.small)} ~ ${prices.large.toLocaleString()}`;
  const saleRange = `${formatPrice(applySaleRate(prices.small, saleRate))} ~ ${applySaleRate(prices.large, saleRate).toLocaleString()}`;

  return {
    hasSale: saleRate !== null,
    originalRange,
    saleRange,
  };
}

