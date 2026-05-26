import { expect, type Page } from "@playwright/test";

export async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill("Test123456");
  await page.locator('button[type="submit"]').click();
}

export async function addSeededBraceletToCart(page: Page) {
  await page.goto("/products/e2e-bracelet-in-stock");
  await expect(page.getByRole("heading", { name: "E2E 現貨手鍊" })).toBeVisible({ timeout: 30_000 });
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

export async function fillPureCustomDepositForm(page: Page) {
  await page.goto("/custom/form");
  await page.locator("textarea").first().fill("E2E 測試：希望提升專注力與穩定情緒");
  await page.locator('input[type="number"]').fill("13");
  await page.getByRole("button", { name: /剛好/ }).click();
  await page.getByRole("button", { name: "都可以" }).click();
  await page.locator("section").filter({ hasText: "銀管" }).getByRole("button", { name: "不要" }).first().click();
  await page.locator("section").filter({ hasText: "珠框" }).getByRole("button", { name: "不要" }).last().click();
  await page.getByRole("button", { name: /彈力繩/ }).click();
  await page.locator("section").filter({ hasText: "要加吊飾嗎" }).getByRole("button", { name: "不要" }).click();
  await page.locator('input[placeholder="例如：@your_ig_handle"]').fill("@e2e_test");
  await page.getByRole("button", { name: /確認，前往下訂金/ }).click();
  await expect(page).toHaveURL(/\/checkout/);
}

export async function createAtmCustomDepositOrder(page: Page, email: string) {
  await fillPureCustomDepositForm(page);
  return submitAtmCustomDepositCheckout(page, email);
}

export async function submitAtmCustomDepositCheckout(page: Page, email: string) {
  await page.locator('input[placeholder="請輸入真實姓名"]').fill("E2E 客製化測試");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="tel"]').fill("0912345678");
  await page.getByRole("button", { name: /^轉帳/ }).click();
  await page.getByRole("button", { name: "確認下單" }).click();
  await expect(page).toHaveURL(/\/order\//);
  return page.url().split("/order/")[1]?.split("?")[0] ?? "";
}

export async function fillProfileCustomDepositForm(
  page: Page,
  path: "/custom/form-c" | "/custom/form-d",
  productName: string,
  customerName: string,
  wristSize = "15.5",
) {
  await page.goto(path);
  await page.locator('input[placeholder="請填寫真實姓名"]').fill(customerName);
  await page.locator('input[placeholder="例如：1995/08/22"]').fill("1994/06/18");
  await page.locator('textarea[placeholder*="招財"]').fill("E2E 穩定情緒");
  await page.locator('input[type="number"]').fill(wristSize);
  await page.getByRole("button", { name: /剛好/ }).click();
  await page.getByRole("button", { name: "都可以" }).click();
  await page.locator("section").filter({ hasText: "銀管" }).getByRole("button", { name: "不要" }).first().click();
  await page.locator("section").filter({ hasText: "珠框" }).getByRole("button", { name: "不要" }).last().click();
  await page.getByRole("button", { name: /彈力繩/ }).click();
  await page.getByRole("button", { name: "不要吊飾" }).click();
  await page.locator('input[placeholder="例如：@your_ig_handle"]').fill("@e2e_profile");
  await page.getByRole("button", { name: /確認，前往下訂金/ }).click();

  await expect(page).toHaveURL(/\/checkout/);
  await expect(page.locator("body")).toContainText(productName);
}

export async function fillTarotCustomDepositForm(page: Page) {
  await page.goto("/custom/form-b");
  await page.getByRole("button", { name: /財富密碼/ }).click();
  await page.locator('input[placeholder="請填寫真實姓名"]').fill("E2E 塔羅客戶");
  await page.locator('input[placeholder="例如：1995/08/22"]').fill("1993/03/15");
  await page.locator('textarea[placeholder*="功效"]').fill("E2E 財運測試");
  await page.locator('input[type="number"]').fill("19");
  await page.getByRole("button", { name: /微鬆/ }).click();
  await page.getByRole("button", { name: "都可以" }).click();
  await page.locator("section").filter({ hasText: "銀管" }).getByRole("button", { name: "不要" }).first().click();
  await page.locator("section").filter({ hasText: "珠框" }).getByRole("button", { name: "不要" }).last().click();
  await page.getByRole("button", { name: /彈力繩/ }).click();
  await page.getByRole("button", { name: "不要吊飾" }).click();
  await page.locator('input[placeholder="例如：@your_ig_handle"]').fill("@e2e_tarot");
  await page.getByRole("button", { name: /確認，前往下訂金/ }).click();

  await expect(page).toHaveURL(/\/checkout/);
  await expect(page.locator("body")).toContainText("塔羅 × 水晶手鍊客製化商品");
}
