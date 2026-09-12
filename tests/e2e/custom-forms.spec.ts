import { expect, test, type Page } from "@playwright/test";
import {
  addCustomDepositToCart,
  addPureCustomDepositToCart,
  fillProfileCustomOrderForm,
  fillPureCustomOrderForm,
  fillTarotCustomOrderForm,
  login,
  proceedToCheckoutFromCart,
  submitAtmCustomDepositCheckout,
} from "./helpers";

const customProducts = [
  { path: "/custom/form", id: "custom-deposit-product", name: "客製化商品" },
  { path: "/custom/form-b", id: "tarot-crystal-deposit-product", name: "塔羅 × 水晶手鍊客製化商品" },
  { path: "/custom/form-c", id: "chakra-crystal-deposit-product", name: "脈輪檢測 × 水晶手鍊客製化商品" },
  { path: "/custom/form-d", id: "numerology-crystal-deposit-product", name: "生命靈數 × 水晶手鍊客製化商品" },
] as const;

async function expectConsultationNoteInAdmin(page: Page, orderNo: string, expectedText: string) {
  await login(page, "e2e-admin@example.com");
  await expect(page).toHaveURL(/\/admin\/orders/);
  await page.getByText(orderNo).click();
  await expect(page.locator("body")).toContainText("客製化諮詢內容");
  await expect(page.locator("body")).toContainText(expectedText);
}

async function createCustomDepositOrder(
  page: Page,
  product: (typeof customProducts)[number],
  emailPrefix: string,
  tarotTopic?: string,
) {
  await addCustomDepositToCart(page, product.id, product.name, { tarotTopic });
  return submitAtmCustomDepositCheckout(page, `${emailPrefix}-${Date.now()}@example.com`);
}

test("custom forms require a matching paid deposit order", async ({ page }) => {
  for (const product of customProducts) {
    await page.goto(product.path);
    await expect(page.getByRole("heading", { name: "請先完成訂金付款" })).toBeVisible();
    await expect(page.locator('input[type="number"]')).toHaveCount(0);
  }
});

test("pure custom flow pays first, submits the form, and exposes it to admin", async ({ page }) => {
  const orderNo = await createCustomDepositOrder(page, customProducts[0], "e2e-pure-custom");
  await expect(page.getByRole("heading", { name: "接下來，告訴我們你的故事。" })).toBeVisible();

  await fillPureCustomOrderForm(page, orderNo);
  await expectConsultationNoteInAdmin(page, orderNo, "【純客製水晶手鍊諮詢表單】");
  await expect(page.locator("body")).toContainText("Instagram 帳號 / LINE ID：e2e_line_id");
});

test("paid custom form still rejects a wrist size below 13 cm", async ({ page }) => {
  const orderNo = await createCustomDepositOrder(page, customProducts[0], "e2e-invalid-wrist");
  await fillPureCustomOrderForm(page, orderNo, {
    wristSize: "12.5",
    expectedValidationError: "手圍尺寸請輸入 13 至 19 cm",
  });
});

test("tarot custom flow keeps the pre-payment topic and submits its post-payment form", async ({ page }) => {
  const orderNo = await createCustomDepositOrder(page, customProducts[1], "e2e-tarot", "財富密碼");
  await fillTarotCustomOrderForm(page, orderNo);

  await expectConsultationNoteInAdmin(page, orderNo, "占卜主題：財富密碼");
  await expect(page.locator("body")).toContainText("E2E 塔羅客戶");
});

test("chakra custom flow submits its post-payment form", async ({ page }) => {
  const orderNo = await createCustomDepositOrder(page, customProducts[2], "e2e-chakra");
  await fillProfileCustomOrderForm(page, orderNo, customProducts[2].name, "E2E 脈輪客戶", "19");

  await expectConsultationNoteInAdmin(page, orderNo, "【脈輪檢測 × 水晶手鍊諮詢表單】");
  await expect(page.locator("body")).toContainText("E2E 脈輪客戶");
});

test("numerology custom flow submits its post-payment form", async ({ page }) => {
  const orderNo = await createCustomDepositOrder(page, customProducts[3], "e2e-numerology");
  await fillProfileCustomOrderForm(page, orderNo, customProducts[3].name, "E2E 靈數客戶", "13");

  await expectConsultationNoteInAdmin(page, orderNo, "【生命靈數 × 水晶手鍊諮詢表單】");
  await expect(page.locator("body")).toContainText("E2E 靈數客戶");
});

test("multiple custom products in one order require and retain one form per item", async ({ page }) => {
  await addPureCustomDepositToCart(page, { proceedToCheckout: false });
  await addCustomDepositToCart(page, customProducts[3].id, customProducts[3].name, { proceedToCheckout: false });
  await proceedToCheckoutFromCart(page);
  const orderNo = await submitAtmCustomDepositCheckout(page, `e2e-multi-custom-${Date.now()}@example.com`);

  await fillPureCustomOrderForm(page, orderNo);
  await fillProfileCustomOrderForm(page, orderNo, customProducts[3].name, "E2E 多客製靈數客戶", "14");

  await expectConsultationNoteInAdmin(page, orderNo, "【純客製水晶手鍊諮詢表單】");
  await expect(page.locator("body")).toContainText("【生命靈數 × 水晶手鍊諮詢表單】");
  await expect(page.locator("body")).toContainText("E2E 多客製靈數客戶");
});
