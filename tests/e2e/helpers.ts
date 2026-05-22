import { expect, type Page } from "@playwright/test";

export async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill("Test123456");
  await page.locator('button[type="submit"]').click();
}

export async function addSeededBraceletToCart(page: Page) {
  await page.goto("/products/e2e-bracelet-in-stock");
  await expect(page.getByRole("heading", { name: "E2E 現貨手鍊" })).toBeVisible();
  await page.getByRole("button", { name: /龍蝦扣/ }).click();
  await page.getByRole("button", { name: /加入購物袋/ }).click();
  await expect(page.locator("body")).toContainText("龍蝦扣");
}

export async function goToCheckoutWithSeededBracelet(page: Page) {
  await addSeededBraceletToCart(page);
  await page.getByRole("button", { name: "前往結帳" }).click();
  await expect(page).toHaveURL(/\/checkout/);
  await expect(page.getByRole("heading", { name: "訂單摘要" })).toBeVisible();
}

export async function fillDomesticHomeCheckout(page: Page, email: string) {
  await page.locator('input[placeholder="請輸入真實姓名"]').fill("E2E 測試收件人");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="tel"]').fill("0912345678");
  await page.locator('input[placeholder^="郵遞區號"]').fill("100");
  await page.locator('input[placeholder^="縣市"]').fill("台北市");
  await page.locator('input[placeholder^="鄉鎮市區"]').fill("中正區");
  await page.locator('input[placeholder^="路名"]').fill("測試路 1 號");
}

export async function createAtmHomeDeliveryOrder(page: Page, email: string) {
  await goToCheckoutWithSeededBracelet(page);
  await fillDomesticHomeCheckout(page, email);
  await page.getByRole("button", { name: /^轉帳/ }).click();
  await page.getByRole("button", { name: "確認下單" }).click();
  await expect(page).toHaveURL(/\/order\//);
  return page.url().split("/order/")[1]?.split("?")[0] ?? "";
}
