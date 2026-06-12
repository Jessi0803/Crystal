import { expect, test } from "@playwright/test";
import {
  fillProfileCustomDepositForm,
  fillPureCustomDepositForm,
  fillTarotCustomDepositForm,
  login,
  submitAtmCustomDepositCheckout,
} from "./helpers";

async function getWristInput(page: import("@playwright/test").Page, path: string) {
  await page.goto(path);
  if (path === "/custom/form-b") {
    await page.getByRole("button", { name: /財富密碼/ }).click();
  }
  return page.locator('input[type="number"]').first();
}

async function expectDepositCheckoutWithoutShipping(page: import("@playwright/test").Page) {
  await expect(page.locator("body")).toContainText("購買人資訊");
  await expect(page.locator("body")).toContainText("付款方式");
  await expect(page.locator("body")).not.toContainText("配送地區");
  await expect(page.locator("body")).not.toContainText("配送方式");
  await expect(page.locator("body")).not.toContainText("收件地址");
  await expect(page.locator("body")).not.toContainText("運費");
}

test("custom service page links to every consultation form", async ({ page }) => {
  await page.goto("/custom");

  for (const path of ["/custom/form", "/custom/form-b", "/custom/form-c", "/custom/form-d"]) {
    await page.goto(path);
    await expect(page.locator("body")).toContainText(/報名表單|付完訂金/);
    await expect(page.locator("body")).toContainText("確認");
  }
});

test("all four custom forms constrain wrist size to 13 through 19 cm", async ({ page }) => {
  for (const path of ["/custom/form", "/custom/form-b", "/custom/form-c", "/custom/form-d"]) {
    const wristInput = await getWristInput(page, path);
    await expect(wristInput).toHaveAttribute("min", "13");
    await expect(wristInput).toHaveAttribute("max", "19");
    await expect(wristInput).toHaveAttribute("step", "0.5");
  }
});

test("pure custom form blocks a legacy wrist size below 13 cm", async ({ page }) => {
  await page.goto("/custom/form");
  await page.locator("textarea").first().fill("E2E 手圍邊界驗證");
  await page.locator('input[type="number"]').fill("12.5");
  await page.getByRole("button", { name: /確認，前往下訂金/ }).click();

  await expect(page.locator("body")).toContainText("手圍尺寸請輸入 13 至 19 cm");
  await expect(page).toHaveURL(/\/custom\/form$/);
});

test("pure custom form stores consultation note and continues to deposit checkout", async ({ page }) => {
  await fillPureCustomDepositForm(page);
  await expect(page.locator("body")).toContainText("客製化商品");
  await expectDepositCheckoutWithoutShipping(page);
  await expect(page.locator("body")).toContainText("訂單摘要");
  await expect(page.locator("body")).toContainText("NT$ 500");
});

async function expectConsultationNoteInAdmin(page: import("@playwright/test").Page, orderNo: string, expectedText: string) {
  await login(page, "e2e-admin@example.com");
  await expect(page).toHaveURL(/\/admin\/orders/);
  await page.getByText(orderNo).click();
  await expect(page.locator("body")).toContainText("客製化諮詢內容");
  await expect(page.locator("body")).toContainText(expectedText);
}

test("tarot custom form creates an ATM deposit order with its consultation note", async ({ page }) => {
  await fillTarotCustomDepositForm(page);
  await expectDepositCheckoutWithoutShipping(page);
  const orderNo = await submitAtmCustomDepositCheckout(page, `e2e-tarot-${Date.now()}@example.com`);

  await expectConsultationNoteInAdmin(page, orderNo, "占卜主題：財富密碼");
  await expect(page.locator("body")).toContainText("E2E 塔羅客戶");
});

test("chakra custom form creates an ATM deposit order with its consultation note", async ({ page }) => {
  await fillProfileCustomDepositForm(
    page,
    "/custom/form-c",
    "脈輪檢測 × 水晶手鍊客製化商品",
    "E2E 脈輪客戶",
    "19",
  );
  await expectDepositCheckoutWithoutShipping(page);
  const orderNo = await submitAtmCustomDepositCheckout(page, `e2e-chakra-${Date.now()}@example.com`);

  await expectConsultationNoteInAdmin(page, orderNo, "【脈輪檢測 × 水晶手鍊諮詢表單】");
  await expect(page.locator("body")).toContainText("E2E 脈輪客戶");
});

test("numerology custom form creates an ATM deposit order with its consultation note", async ({ page }) => {
  await fillProfileCustomDepositForm(
    page,
    "/custom/form-d",
    "生命靈數 × 水晶手鍊客製化商品",
    "E2E 靈數客戶",
    "13",
  );
  await expectDepositCheckoutWithoutShipping(page);
  const orderNo = await submitAtmCustomDepositCheckout(page, `e2e-numerology-${Date.now()}@example.com`);

  await expectConsultationNoteInAdmin(page, orderNo, "【生命靈數 × 水晶手鍊諮詢表單】");
  await expect(page.locator("body")).toContainText("E2E 靈數客戶");
});
