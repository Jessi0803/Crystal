import { expect, test } from "@playwright/test";
import { fillDomesticHomeCheckout, goToCheckoutWithSeededBracelet } from "./helpers";

test("overseas checkout shows shipping fees and validates address before PayPal submission", async ({ page }) => {
  let createOrderRequested = false;
  page.on("request", (request) => {
    if (request.url().includes("/api/trpc/order.createAndPay")) createOrderRequested = true;
  });

  await goToCheckoutWithSeededBracelet(page);
  await page.getByRole("button").filter({ hasText: "國際宅配＋PayPal 付款" }).click();

  await expect(page.locator("body")).toContainText("海外訂單僅提供國際宅配與 PayPal 付款");
  await expect(page.getByRole("button", { name: /前往 PayPal 付款/ })).toBeVisible();

  await page.locator("select").first().selectOption("US");
  await expect(page.locator("body")).toContainText("NT$ 771");
  await page.locator('input[placeholder="請輸入真實姓名"]').fill("E2E Overseas");
  await page.locator('input[type="email"]').fill(`e2e-overseas-${Date.now()}@example.com`);
  await page.locator('input[type="tel"]').fill("+1 212 555 0100");
  await page.locator('input[placeholder="Street number, street name"]').fill("測試路 1 號");
  await page.locator('input[placeholder="City"]').fill("New York");
  await page.locator("select").nth(1).selectOption("NY");
  await page.locator('input[placeholder="ZIP Code"]').fill("123");
  await page.getByRole("button", { name: /前往 PayPal 付款/ }).click();

  await expect(page.locator("body")).toContainText("Please use English only");
  await expect(page.locator("body")).toContainText("ZIP code must be 5 digits");
  await expect(page).toHaveURL(/\/checkout/);
  expect(createOrderRequested).toBe(false);
});

test("server rejects an ATM checkout request tampered to contain a sold-out monthly product", async ({ page }) => {
  let tamperedRequestSent = false;
  await page.route("**/api/trpc/order.createAndPay**", async (route) => {
    const body = route.request().postData() ?? "";
    const tamperedBody = body
      .replaceAll("e2e-bracelet-in-stock", "e2e-monthly-sold-out")
      .replaceAll("E2E 現貨手鍊", "E2E 月限售完商品");
    expect(tamperedBody).not.toBe(body);
    tamperedRequestSent = true;
    await route.continue({ postData: tamperedBody });
  });

  await goToCheckoutWithSeededBracelet(page);
  await fillDomesticHomeCheckout(page, `e2e-soldout-guard-${Date.now()}@example.com`);
  await page.getByRole("button", { name: /^轉帳/ }).click();
  await page.getByRole("button", { name: "確認下單" }).click();

  await expect(page.locator("body")).toContainText("已售完，無法預購");
  await expect(page).toHaveURL(/\/checkout/);
  expect(tamperedRequestSent).toBe(true);
});
