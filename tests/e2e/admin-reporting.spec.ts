import { expect, test } from "@playwright/test";
import { createAtmHomeDeliveryOrder, login } from "./helpers";

test("admin revenue dashboard shows confirmed order metrics and top products", async ({ page }) => {
  const merchantTradeNo = await createAtmHomeDeliveryOrder(page, `e2e-revenue-${Date.now()}@example.com`);

  await login(page, "e2e-admin@example.com");
  await expect(page).toHaveURL(/\/admin\/orders/);
  await page.locator("button").filter({ hasText: merchantTradeNo }).click();
  await page.getByRole("button", { name: "確認收款" }).click();
  await expect(page.locator("body")).toContainText("已確認收款");

  await page.goto("/admin/revenue");

  await expect(page.getByRole("heading", { name: "營收報表" })).toBeVisible();
  await expect(page.locator("body")).toContainText("總訂單數");
  await expect(page.locator("body")).toContainText("月營收趨勢");
  await expect(page.locator("body")).toContainText("熱銷商品排行");
  await expect(page.locator("body")).toContainText("E2E 現貨手鍊");
});

test("admin chatbot log page can search and expand seeded conversations", async ({ page }) => {
  await login(page, "e2e-admin@example.com");
  await expect(page).toHaveURL(/\/admin\/orders/);

  await page.goto("/admin/chatbot");
  await expect(page.getByRole("heading", { name: "AI 客服紀錄" })).toBeVisible();
  await expect(page.locator("body")).toContainText("問答紀錄");

  await page.locator('input[placeholder^="搜尋顧客問題"]').fill("提升自信");
  await page.getByRole("button", { name: "搜尋" }).click();

  await expect(page.locator("body")).toContainText("我想提升自信");
  await page.getByRole("button", { name: /我想提升自信/ }).first().click();
  await expect(page.locator("body")).toContainText("完整問題");
  await expect(page.locator("body")).toContainText("可以先參考 E2E 現貨手鍊");
});

test("legacy admin inventory route redirects admins to product management", async ({ page }) => {
  await login(page, "e2e-admin@example.com");
  await expect(page).toHaveURL(/\/admin\/orders/);

  await page.goto("/admin/inventory");

  await expect(page).toHaveURL(/\/admin\/products/);
  await expect(page.getByRole("heading", { name: "商品管理" })).toBeVisible();
});
