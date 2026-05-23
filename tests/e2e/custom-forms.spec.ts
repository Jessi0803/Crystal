import { expect, test } from "@playwright/test";
import {
  fillProfileCustomDepositForm,
  fillPureCustomDepositForm,
  fillTarotCustomDepositForm,
  login,
  submitAtmCustomDepositCheckout,
} from "./helpers";

test("custom service page links to every consultation form", async ({ page }) => {
  await page.goto("/custom");

  for (const path of ["/custom/form", "/custom/form-b", "/custom/form-c", "/custom/form-d"]) {
    await page.goto(path);
    await expect(page.locator("body")).toContainText(/報名表單|付完訂金/);
    await expect(page.locator("body")).toContainText("確認");
  }
});

test("pure custom form stores consultation note and continues to deposit checkout", async ({ page }) => {
  await fillPureCustomDepositForm(page);
  await expect(page.locator("body")).toContainText("客製化商品");
  await expect(page.locator("body")).toContainText("購買人資訊");
  await expect(page.locator("body")).toContainText("訂單摘要");
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
  const orderNo = await submitAtmCustomDepositCheckout(page, `e2e-tarot-${Date.now()}@example.com`);

  await expectConsultationNoteInAdmin(page, orderNo, "占卜主題：財富密碼");
  await expect(page.locator("body")).toContainText("E2E 塔羅客戶");
});

test("chakra custom form creates an ATM deposit order with its consultation note", async ({ page }) => {
  await fillProfileCustomDepositForm(
    page,
    "/custom/form-c",
    "脈輪檢測 × 水晶手鍊客製化商品",
    "E2E 脈輪客戶"
  );
  const orderNo = await submitAtmCustomDepositCheckout(page, `e2e-chakra-${Date.now()}@example.com`);

  await expectConsultationNoteInAdmin(page, orderNo, "【脈輪檢測 × 水晶手鍊諮詢表單】");
  await expect(page.locator("body")).toContainText("E2E 脈輪客戶");
});

test("numerology custom form creates an ATM deposit order with its consultation note", async ({ page }) => {
  await fillProfileCustomDepositForm(
    page,
    "/custom/form-d",
    "生命靈數 × 水晶手鍊客製化商品",
    "E2E 靈數客戶"
  );
  const orderNo = await submitAtmCustomDepositCheckout(page, `e2e-numerology-${Date.now()}@example.com`);

  await expectConsultationNoteInAdmin(page, orderNo, "【生命靈數 × 水晶手鍊諮詢表單】");
  await expect(page.locator("body")).toContainText("E2E 靈數客戶");
});
