import { expect, test } from "@playwright/test";
import { createAtmHomeDeliveryOrder, login } from "./helpers";

test("admin products page can search seeded products", async ({ page }) => {
  await login(page, "e2e-admin@example.com");
  await expect(page).toHaveURL(/\/admin\/orders/);

  await page.goto("/admin/products");
  await expect(page.locator("body")).toContainText("商品管理");

  await page.locator('input[placeholder="搜尋商品名稱或分類"]').fill("E2E 現貨");
  await expect(page.locator("body")).toContainText("E2E 現貨手鍊");
  await expect(page.locator("body")).not.toContainText("E2E 預購手鍊");
});

test("admin can find and confirm a transfer-pending test order", async ({ page }) => {
  const merchantTradeNo = await createAtmHomeDeliveryOrder(page, `e2e-admin-flow-${Date.now()}@example.com`);
  expect(merchantTradeNo.length).toBeGreaterThan(0);

  await login(page, "e2e-admin@example.com");
  await expect(page).toHaveURL(/\/admin\/orders/);

  await page.getByRole("button", { name: "轉帳待確認" }).click();
  await expect(page.locator("body")).toContainText(merchantTradeNo);

  await page.getByText(merchantTradeNo).click();
  await expect(page.locator("body")).toContainText("E2E 測試收件人");
  await expect(page.locator("body")).toContainText("E2E 現貨手鍊");

  await page.getByRole("button", { name: "確認收款" }).click();
  await expect(page.locator("body")).toContainText(/已付款|備貨中|確認收款/);
});
