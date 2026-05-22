import { expect, test } from "@playwright/test";
import { createAtmHomeDeliveryOrder } from "./helpers";

test("energy quiz completes, recommends a product, and can add it to the cart", async ({ page }) => {
  await page.goto("/quiz");

  await expect(page.getByRole("heading", { name: "能量水晶測驗" })).toBeVisible();
  await page.getByRole("button", { name: /開始測驗/ }).click();

  for (const buttonName of [/情緒不穩定/, /平靜/, /紫色/]) {
    await page.getByRole("button", { name: buttonName }).click();
    await page.getByRole("button", { name: /下一題|查看結果/ }).click();
  }

  await expect(page.locator("body")).toContainText("你的能量水晶是");
  await page.getByRole("button", { name: /加入購物袋/ }).click();
  await expect(page.locator("body")).toContainText("已加入購物袋");
  await expect(page.getByRole("button", { name: "前往結帳" })).toBeVisible();
});

test("unknown order result shows the not-found order state", async ({ page }) => {
  await page.goto(`/order/E2E-NOT-FOUND-${Date.now()}`);

  await expect(page.locator("body")).toContainText("找不到訂單");
  await expect(page.getByRole("button", { name: "返回首頁" })).toBeVisible();
});

test("order result supports PayPal cancel return without losing the order view", async ({ page }) => {
  const merchantTradeNo = await createAtmHomeDeliveryOrder(page, `e2e-paypal-cancel-${Date.now()}@example.com`);

  await page.goto(`/order/${merchantTradeNo}?paypal_cancel=1`);

  await expect(page).toHaveURL(new RegExp(`/order/${merchantTradeNo}$`));
  await expect(page.locator("body")).toContainText("等待轉帳確認");
  await expect(page.locator("body")).toContainText(merchantTradeNo);
});
