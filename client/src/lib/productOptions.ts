import type { Product } from "@/lib/data";

const WRIST_SIZE_CATEGORIES = new Set(["love", "wealth", "protect", "healing"]);

function productCategories(product: Pick<Product, "category" | "categories">) {
  return product.categories?.length ? product.categories : [product.category];
}

export function hasWristSizeOption(product: Pick<Product, "category" | "categories" | "showWristSize">) {
  return (
    product.category !== "custom" &&
    product.showWristSize !== false &&
    productCategories(product).some((category) => WRIST_SIZE_CATEGORIES.has(category))
  );
}

export function hasFitPreferenceOption(product: Pick<Product, "category" | "showFitPreference">) {
  return product.category !== "custom" && product.showFitPreference !== false;
}

export function hasClaspOption(product: Pick<Product, "category" | "claspOptions">) {
  return product.category !== "custom" && (product.claspOptions == null || product.claspOptions.length > 0);
}

export function requiresDetailSelectionBeforeCart(
  product: Pick<Product, "category" | "categories" | "showWristSize" | "showFitPreference" | "claspOptions">
) {
  return hasWristSizeOption(product) && hasFitPreferenceOption(product) && hasClaspOption(product);
}
