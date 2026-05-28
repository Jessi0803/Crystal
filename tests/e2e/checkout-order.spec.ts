import { expect, test, type Page } from "@playwright/test";
import { createAtmHomeDeliveryOrder, fillDomesticHomeCheckout, goToCheckoutWithSeededBracelet, login } from "./helpers";

async function openAdminOrder(page: Page, merchantTradeNo: string) {
  await page.goto("/admin/orders");
  await expect(page.locator("body")).toContainText(merchantTradeNo);
  await page.locator("button").filter({ hasText: merchantTradeNo }).click();
}

async function updateExpandedAdminOrderStatus(page: Page, status: string, expectedText: string) {
  await page.locator(`select:has(option[value="${status}"])`).first().selectOption(status);
  await expect(page.locator("body")).toContainText(expectedText);
}

test("checkout validates required domestic home delivery fields", async ({ page }) => {
  await goToCheckoutWithSeededBracelet(page);

  await page.getByRole("button", { name: /前往付款|確認下單/ }).click();

  await expect(page.locator("body")).toContainText("請輸入姓名");
  await expect(page.locator("body")).toContainText("請輸入有效的 Email");
  await expect(page.locator("body")).toContainText("請輸入有效的手機號碼");
  await expect(page.locator("body")).toContainText("請輸入有效郵遞區號");
  await expect(page.locator("body")).toContainText("請輸入縣市");
  await expect(page.locator("body")).toContainText("請輸入鄉鎮市區");
  await expect(page.locator("body")).toContainText("請輸入詳細地址");
});

test("checkout blocks convenience-store delivery until a store is selected", async ({ page }) => {
  await goToCheckoutWithSeededBracelet(page);

  await page.locator("button").filter({ hasText: "先付款再取貨" }).click();
  await page.locator('input[placeholder="請輸入真實姓名"]').fill("E2E 超商測試");
  await page.locator('input[type="email"]').fill("e2e-cvs@example.com");
  await page.locator('input[type="tel"]').fill("0912345678");
  await page.getByRole("button", { name: /前往付款|確認下單/ }).click();

  await expect(page.locator("body")).toContainText("請選擇超商門市");
});

test("ATM home-delivery checkout creates an order and accepts transfer last five", async ({ page }) => {
  const orderEmail = `e2e-atm-${Date.now()}@example.com`;

  await createAtmHomeDeliveryOrder(page, orderEmail);

  await expect(page).toHaveURL(/\/order\//);
  await expect(page.locator("body")).toContainText("等待轉帳確認");
  await expect(page.locator("body")).toContainText("轉帳資訊");
  await expect(page.locator("body")).toContainText("E2E 現貨手鍊");

  await page.locator('input[placeholder="12345"]').fill("54321");
  await page.getByRole("button", { name: "確認送出" }).click();
  await expect(page.locator("body")).toContainText("已收到您的匯款末五碼");
  await expect(page.locator("body")).toContainText("54321");
});

test("logged-in member sees a newly created ATM order in member center", async ({ page }) => {
  await login(page, "e2e-user@example.com");
  await expect(page).toHaveURL(/\/products/);

  const merchantTradeNo = await createAtmHomeDeliveryOrder(page, "e2e-user@example.com");
  expect(merchantTradeNo.length).toBeGreaterThan(0);

  await page.goto("/member");
  await expect(page.locator("body")).toContainText(`訂單 #${merchantTradeNo}`);
  await expect(page.locator("body")).toContainText("待付款");

  await page.getByText(`訂單 #${merchantTradeNo}`).click();
  await expect(page.locator("body")).toContainText("轉帳待確認");
  await expect(page.locator("body")).toContainText("E2E 現貨手鍊");
});

test("member center reflects admin payment confirmation, processing and cancellation changes", async ({ browser }) => {
  test.setTimeout(120_000);
  const memberContext = await browser.newContext();
  const adminContext = await browser.newContext();
  const memberPage = await memberContext.newPage();
  const adminPage = await adminContext.newPage();

  try {
    await login(memberPage, "e2e-user@example.com");
    await expect(memberPage).toHaveURL(/\/products/);
    const merchantTradeNo = await createAtmHomeDeliveryOrder(memberPage, "e2e-user@example.com");

    await memberPage.goto("/member");
    await expect(memberPage.locator("body")).toContainText(`訂單 #${merchantTradeNo}`);
    await expect(memberPage.locator("body")).toContainText("待付款");

    await login(adminPage, "e2e-admin@example.com");
    await expect(adminPage).toHaveURL(/\/admin\/orders/);
    await openAdminOrder(adminPage, merchantTradeNo);
    await adminPage.getByRole("button", { name: "確認收款" }).click();
    await expect(adminPage.locator("body")).toContainText("已確認收款");

    await memberPage.goto("/member");
    await expect(memberPage.locator("body")).toContainText(`訂單 #${merchantTradeNo}`);
    await expect(memberPage.locator("body")).toContainText("已付款（待出貨）");
    await memberPage.getByText(`訂單 #${merchantTradeNo}`).click();
    await expect(memberPage.locator("body")).toContainText("已確認收款");

    await openAdminOrder(adminPage, merchantTradeNo);
    await updateExpandedAdminOrderStatus(adminPage, "processing", "備貨中");
    await memberPage.reload();
    await expect(memberPage.locator("body")).toContainText("備貨中");

    await openAdminOrder(adminPage, merchantTradeNo);
    await updateExpandedAdminOrderStatus(adminPage, "cancelled", "已取消");
    await memberPage.reload();
    await expect(memberPage.locator("body")).toContainText("已取消");
  } finally {
    await memberContext.close();
    await adminContext.close();
  }
});
