import { expect, test, type Page } from "@playwright/test";
import { createAtmHomeDeliveryOrder, fillDomesticHomeCheckout, goToCheckoutWithSeededBracelet, login, loginAsAdminByCookie, loginAsUserByCookie, uploadTransferReceipt } from "./helpers";

async function openAdminOrder(page: Page, merchantTradeNo: string) {
  await page.goto("/admin/orders");
  await expect(page.locator("body")).toContainText(merchantTradeNo);
  await page.locator("button").filter({ hasText: merchantTradeNo }).click();
}

async function updateExpandedAdminOrderStatus(page: Page, status: string, expectedText: string) {
  await page.locator(`select:has(option[value="${status}"])`).first().selectOption(status);
  await expect(page.locator("body")).toContainText(expectedText);
}

test("登入會員時購買人姓名不自動帶入，Email 仍帶入", async ({ page }) => {
  // buyerName 會成為綠界的 ReceiverName，超商取貨要核對證件。
  // 自動帶入會員名稱（常是暱稱或 LINE 顯示名稱）會讓顧客直接送出而領不到貨。
  await loginAsUserByCookie(page);
  await goToCheckoutWithSeededBracelet(page);

  const nameInput = page.locator('input[placeholder="請輸入真實姓名"]');
  await expect(nameInput).toBeVisible({ timeout: 30_000 });
  await expect(nameInput).toHaveValue("");
  // Email 的自動帶入要保留：會員中心的訂單比對靠 userId 與 buyerEmail
  await expect(page.locator('input[type="email"]').first()).toHaveValue("e2e-user@example.com");
  await expect(page.getByText("姓名（請填寫證件上的姓名）")).toBeVisible();
  await expect(
    page.getByText("此姓名會作為收件人；為避免影響取件，請填寫與取件證件相符的姓名。")
  ).toBeVisible();
});

test("訪客沒有存取憑證時，訂單頁只打一次 getOrder 就顯示 Email 驗證表單", async ({ page }) => {
  // 回歸：getOrder 回 401 時若沿用 React Query 預設的 retry 與固定輪詢，
  // 一次開頁會連打 4 次以上，正式站的 order-access 額度（8 次 / 15 分鐘）
  // 幾秒內就被打爆變成 429，畫面也一直卡在「查詢訂單中…」。
  //
  // 注意：playwright.config.ts 設了 E2E_RATE_LIMIT_MULTIPLIER=50，
  // 所以 e2e 重現不了 429，這裡改成直接數請求次數——那才是修正真正改掉的行為。
  const email = `e2e-guest-verify-${Date.now()}@example.com`;
  const orderNo = await createAtmHomeDeliveryOrder(page, email);

  // 模擬換一台裝置／清過快取：結帳時存下的 accessToken 不在了
  await page.evaluate(() => localStorage.clear());

  let getOrderCalls = 0;
  page.on("request", req => {
    if (req.url().includes("order.getOrder")) getOrderCalls += 1;
  });

  await page.goto(`/order/${orderNo}`);
  await expect(page.getByText("驗證訪客訂單", { exact: true })).toBeVisible({ timeout: 15_000 });

  // 停在驗證畫面不該繼續輪詢
  await page.waitForTimeout(12_000);
  expect(getOrderCalls, "未授權時不應重試或輪詢").toBeLessThanOrEqual(2);

  // 輸入正確 Email 後要看得到訂單
  await page.getByPlaceholder("訂購 Email").fill(email);
  await page.getByRole("button", { name: "驗證並查看訂單" }).click();
  await expect(page.locator("body")).toContainText(orderNo);
  await expect(page.locator("body")).toContainText("訂單資訊");
});

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

  const merchantTradeNo = await createAtmHomeDeliveryOrder(page, orderEmail);

  await expect(page).toHaveURL(/\/order\//);
  await expect(page.locator("body")).toContainText("等待轉帳確認");
  await expect(page.locator("body")).toContainText("轉帳資訊");
  await expect(page.locator("body")).toContainText(
    "E2E 現貨手鍊（手圍 14cm）（龍蝦扣）（剛好）"
  );
  await expect(page.locator("body")).toContainText("已收到您的匯款末五碼");
  await expect(page.locator("body")).toContainText("54321");

  await loginAsAdminByCookie(page);
  await page.locator("button").filter({ hasText: merchantTradeNo }).click();
  await expect(page.locator("body")).toContainText("E2E 現貨手鍊");
  await expect(page.locator("body")).toContainText("x1 ・ NT$ 1,400");
  await expect(page.locator("body")).toContainText("手圍 14 cm ・ 龍蝦扣 ・ 剛好");
});

test("ATM checkout requires last five and transfer receipt before submit", async ({ page }) => {
  await goToCheckoutWithSeededBracelet(page);
  await fillDomesticHomeCheckout(page, `e2e-atm-receipt-required-${Date.now()}@example.com`);
  await page.getByRole("button", { name: /^轉帳/ }).click();

  const submitButton = page.getByRole("button", { name: "確認下單" });
  await expect(page.locator("body")).toContainText("銀行帳號末五碼");
  await expect(page.locator("body")).toContainText("轉帳成功截圖");
  await expect(submitButton).toBeDisabled();

  await page.getByPlaceholder("請輸入 5 位數字").fill("12345");
  await expect(submitButton).toBeDisabled();

  await page.getByPlaceholder("請輸入 5 位數字").fill("");
  await uploadTransferReceipt(page);
  await expect(submitButton).toBeDisabled();

  await page.getByPlaceholder("請輸入 5 位數字").fill("12345");
  await expect(submitButton).toBeEnabled();
});

test("logged-in member sees a newly created ATM order in member center", async ({ page }) => {
  // 這支在測會員中心看得到訂單，重點不是登入流程
  await loginAsUserByCookie(page);
  await page.goto("/products");

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
