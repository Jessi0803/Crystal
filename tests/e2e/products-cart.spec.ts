import { expect, test } from "@playwright/test";

test("product detail can add seeded product to cart and continue to checkout", async ({ page }) => {
  await page.goto("/products");
  await expect(page.getByText("E2E 現貨手鍊")).toBeVisible();

  await page.getByText("E2E 現貨手鍊").first().click();
  await expect(page).toHaveURL(/\/products\/e2e-bracelet-in-stock/);
  await expect(page.getByRole("heading", { name: "E2E 現貨手鍊" })).toBeVisible();

  await page.getByRole("button", { name: /龍蝦扣/ }).click();
  await expect(page.locator("body")).toContainText(/龍蝦扣\+NT\$200/);

  await page.getByRole("button", { name: /加入購物袋/ }).click();
  await expect(page.getByText("購物袋").first()).toBeVisible();
  await expect(page.getByText("E2E 現貨手鍊").last()).toBeVisible();
  await expect(page.locator("body")).toContainText("龍蝦扣");

  await page.getByRole("button", { name: "前往結帳" }).click();
  await expect(page).toHaveURL(/\/checkout/);
  await expect(page.getByRole("heading", { name: "訂單摘要" })).toBeVisible();
  await expect(page.locator("body")).toContainText("E2E 現貨手鍊");
});

test("empty checkout shows empty cart state", async ({ page }) => {
  await page.goto("/checkout");
  await expect(page.locator("body")).toContainText("購物車是空的");
  await page.getByRole("button", { name: "前往選購" }).click();
  await expect(page).toHaveURL(/\/products/);
});

test("seeded inventory states are visible", async ({ page }) => {
  await page.goto("/products/e2e-bracelet-preorder");
  await expect(page.locator("body")).toContainText(/預購|7-14 天/);
  await expect(page.getByRole("button", { name: /加入購物袋/ })).toBeEnabled();

  await page.goto("/products/e2e-monthly-sold-out");
  await expect(page.locator("body")).toContainText("本月限量商品已售完");
  await expect(page.getByRole("button", { name: "售完" })).toBeDisabled();
});
