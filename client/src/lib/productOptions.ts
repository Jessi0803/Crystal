import type { Product } from "@/lib/data";
import { isCustomDepositProduct } from "@/lib/customOrderingContent";

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

export function requiresCustomFormBeforeCart(product: Pick<Product, "id" | "category">) {
  return product.category === "custom" && isCustomDepositProduct(product.id);
}

export function requiresDetailSelectionBeforeCart(
  product: Pick<Product, "id" | "category" | "categories" | "showWristSize" | "showFitPreference" | "claspOptions">
) {
  return (
    requiresCustomFormBeforeCart(product) ||
    (hasWristSizeOption(product) && hasFitPreferenceOption(product) && hasClaspOption(product))
  );
}

export function getQuickCartActionLabel(
  product: Pick<Product, "id" | "category" | "categories" | "showWristSize" | "showFitPreference" | "claspOptions">
) {
  if (requiresCustomFormBeforeCart(product)) return "填寫表單";
  if (requiresDetailSelectionBeforeCart(product)) return "選擇規格";
  return null;
}
