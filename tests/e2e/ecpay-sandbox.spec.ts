import { expect, test } from "@playwright/test";
import { fillDomesticHomeCheckout, fillTransferCheckoutFields, goToCheckoutWithSeededBracelet, login } from "./helpers";

const sandboxTest = process.env.RUN_ECPAY_SANDBOX === "true" ? test : test.skip;

async function expectSandboxConfiguration(page: import("@playwright/test").Page) {
  const response = await page.request.get("/api/trpc/system.envCheck");
  const text = await response.text();

  expect(response.ok()).toBeTruthy();
  expect(text).toContain('"ecpaySandbox":true');
  expect(text).toContain('"ecpayLogisticsSandbox":true');
}

sandboxTest("credit checkout posts only to the ECPay payment sandbox", async ({ page }) => {
  await expectSandboxConfiguration(page);
  await goToCheckoutWithSeededBracelet(page);
  await fillDomesticHomeCheckout(page, `e2e-ecpay-credit-${Date.now()}@example.com`);

  await Promise.all([
    page.waitForURL((url) => url.hostname === "payment-stage.ecpay.com.tw", { timeout: 20_000 }),
    page.getByRole("button", { name: /前往付款/ }).click(),
  ]);

  expect(page.url()).not.toContain("payment.ecpay.com.tw");
});

sandboxTest("convenience-store map opens only the ECPay logistics sandbox", async ({ page }) => {
  await expectSandboxConfiguration(page);

  await page.goto("/api/ecpay/cvs-map?tradeNo=MAPE2ESANDBOX01&subType=UNIMARTC2C");
  await page.waitForURL((url) => url.hostname === "logistics-stage.ecpay.com.tw", { timeout: 20_000 });

  expect(page.url()).not.toContain("logistics.ecpay.com.tw");
});

sandboxTest("admin creates a convenience-store logistics order through the ECPay sandbox", async ({ page }) => {
  await expectSandboxConfiguration(page);
  await goToCheckoutWithSeededBracelet(page);
  await page.locator("button").filter({ hasText: "先付款再取貨" }).click();
  await page.locator('input[placeholder="請輸入真實姓名"]').fill("測試收件");
  await page.locator('input[type="email"]').fill(`e2e-logistics-${Date.now()}@example.com`);
  await page.locator('input[type="tel"]').fill("0912345678");

  await page.evaluate(() => {
    window.postMessage({
      type: "CVS_STORE_SELECTED",
      storeId: "131386",
      storeName: "E2E 測試門市",
      cvsType: "UNIMARTC2C",
    }, "*");
  });
  await expect(page.locator("body")).toContainText("E2E 測試門市");
  await page.getByRole("button", { name: /^轉帳/ }).click();
  await fillTransferCheckoutFields(page);
  await page.getByRole("button", { name: "確認下單" }).click();
  await expect(page).toHaveURL(/\/order\//);
  const merchantTradeNo = page.url().split("/order/")[1]?.split("?")[0] ?? "";
  expect(merchantTradeNo).not.toBe("");

  await login(page, "e2e-admin@example.com");
  await expect(page).toHaveURL(/\/admin\/orders/);
  await page.getByText(merchantTradeNo).click();
  await page.getByRole("button", { name: "確認收款" }).click();
  await expect(page.getByRole("button", { name: "建立沙盒物流訂單" })).toBeVisible();
  await page.getByRole("button", { name: "建立沙盒物流訂單" }).click();

  await expect(page.locator("body")).toContainText("沙盒物流訂單建立成功");
  await expect(page.locator("body")).toContainText("物流編號");
});

sandboxTest("admin creates a home-delivery logistics order through the ECPay sandbox", async ({ page }) => {
  await expectSandboxConfiguration(page);
  await goToCheckoutWithSeededBracelet(page);
  await fillDomesticHomeCheckout(page, `e2e-home-logistics-${Date.now()}@example.com`);
  await page.locator('input[placeholder^="郵遞區號"]').fill("100");
  await page.locator('input[placeholder^="縣市"]').fill("台北市");
  await page.locator('input[placeholder^="鄉鎮市區"]').fill("中正區");
  await page.locator('input[placeholder^="路名"]').fill("忠孝西路一段49號");
  await page.getByRole("button", { name: /^轉帳/ }).click();
  await fillTransferCheckoutFields(page);
  await page.getByRole("button", { name: "確認下單" }).click();
  await expect(page).toHaveURL(/\/order\//);
  const merchantTradeNo = page.url().split("/order/")[1]?.split("?")[0] ?? "";
  expect(merchantTradeNo).not.toBe("");

  await login(page, "e2e-admin@example.com");
  await expect(page).toHaveURL(/\/admin\/orders/);
  await page.getByText(merchantTradeNo).click();
  await page.getByRole("button", { name: "確認收款" }).click();
  await expect(page.getByRole("button", { name: "建立沙盒物流訂單" })).toBeVisible();
  await page.getByRole("button", { name: "建立沙盒物流訂單" }).click();

  await expect(page.locator("body")).toContainText("沙盒物流訂單建立成功");
  await expect(page.locator("body")).toContainText("物流編號");
});
