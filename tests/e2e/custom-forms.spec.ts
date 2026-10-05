import { expect, test, type Page } from "@playwright/test";
import { addCustomDepositToCart, addPureCustomDepositToCart, fillProfileCustomOrderForm, fillPureCustomOrderForm, fillTarotCustomOrderForm, loginAsAdminByCookie, proceedToCheckoutFromCart, submitAtmCustomDepositCheckout } from "./helpers";

const customProducts = [
  { path: "/custom/form", id: "custom-deposit-product", name: "客製化商品" },
  { path: "/custom/form-b", id: "tarot-crystal-deposit-product", name: "塔羅 × 水晶手鍊客製化商品" },
  { path: "/custom/form-c", id: "chakra-crystal-deposit-product", name: "脈輪檢測 × 水晶手鍊客製化商品" },
  { path: "/custom/form-d", id: "numerology-crystal-deposit-product", name: "生命靈數 × 水晶手鍊客製化商品" },
] as const;

async function expectConsultationNoteInAdmin(page: Page, orderNo: string, expectedText: string) {
  await loginAsAdminByCookie(page);
  await page.getByText(orderNo).click();
  await expect(page.locator("body")).toContainText("客製化諮詢內容");
  await expect(page.locator("body")).toContainText(expectedText);

  // 客製表單連結：一般連結只能查看，另一顆是放行用的可編輯連結
  await expect(page.locator("body")).toContainText("客製表單連結");
  await expect(page.getByRole("button", { name: "複製", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "複製可編輯", exact: true }).first()).toBeVisible();
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

  await fillPureCustomOrderForm(page, orderNo, { focusChoices: ["感情", "工作"] });
  await expectConsultationNoteInAdmin(page, orderNo, "【純客製水晶手鍊諮詢表單】");
  await expect(page.locator("body")).toContainText("這次最想為自己調整的是：感情、工作");
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

test("關掉客製提醒彈窗後，訂單頁仍找得回表單入口", async ({ page }) => {
  const orderNo = await createCustomDepositOrder(page, customProducts[0], "e2e-custom-persistent");

  await page.goto(`/order/${orderNo}`);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 30_000 });
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  // 彈窗關掉後，常駐區塊仍要在
  await expect(page.getByText("客製需求表單", { exact: true })).toBeVisible();
  await expect(page.getByText("尚未填寫", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "填寫客製需求", exact: true }).click();
  await expect(page.locator('input[type="number"]').first()).toBeVisible({ timeout: 30_000 });
});

test("已填寫的表單只能查看，客人沒有修改入口", async ({ page }) => {
  const orderNo = await createCustomDepositOrder(page, customProducts[0], "e2e-custom-reentry");
  await fillPureCustomOrderForm(page, orderNo, { focusChoices: ["感情"] });

  await page.goto(`/order/${orderNo}`);
  await expect(page.getByText("已送出", { exact: true })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "查看內容", exact: true }).click();

  // 唯讀畫面：看得到自己填過什麼，而不是一張空白表單
  await expect(page.getByRole("heading", { name: "你已經填寫過這份表單" })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("body")).toContainText("Instagram 帳號 / LINE ID：e2e_line_id");
  await expect(page.locator("body")).toContainText("這次最想為自己調整的是：感情");
  await expect(page.locator('input[type="number"]')).toHaveCount(0);

  // 沒有任何修改入口，並且告訴客人要找官方 LINE
  await expect(page.getByRole("button", { name: "修改內容" })).toHaveCount(0);
  await expect(page.locator("body")).toContainText("送出後無法自行修改");
});

test("店家放行（網址帶 edit=1）時才能重新填寫覆蓋", async ({ page }) => {
  const orderNo = await createCustomDepositOrder(page, customProducts[0], "e2e-custom-rewrite");
  await fillPureCustomOrderForm(page, orderNo, { focusChoices: ["感情"] });

  // 從訂單頁取得這一件的表單網址，再加上店家放行的參數
  await page.goto(`/order/${orderNo}`);
  const viewButton = page.getByRole("button", { name: "查看內容", exact: true });
  await expect(viewButton).toBeVisible({ timeout: 30_000 });
  await viewButton.click();

  // 先等唯讀畫面出現，確認已經在表單頁再取網址
  await expect(page.getByRole("heading", { name: "你已經填寫過這份表單" })).toBeVisible({ timeout: 30_000 });
  const formUrl = page.url();

  await page.goto(`${formUrl}&edit=1`);
  await expect(page.locator("body")).toContainText("完全取代", { timeout: 30_000 });
  await expect(page.locator('input[type="number"]').first()).toBeVisible({ timeout: 30_000 });
});

test("一筆訂單多件客製：分別送出後兩份需求都保留", async ({ page }) => {
  await addPureCustomDepositToCart(page, { proceedToCheckout: false });
  await addCustomDepositToCart(page, customProducts[3].id, customProducts[3].name, { proceedToCheckout: false });
  await proceedToCheckoutFromCart(page);
  const orderNo = await submitAtmCustomDepositCheckout(page, `e2e-multi-retain-${Date.now()}@example.com`);

  await fillPureCustomOrderForm(page, orderNo);
  await fillProfileCustomOrderForm(page, orderNo, customProducts[3].name, "E2E 多客製靈數客戶", "14");

  // 第二件寫入時若把整欄蓋掉，第一件就會退回「尚未填寫」
  await page.goto(`/order/${orderNo}`);
  await expect(page.getByText("已送出", { exact: true })).toHaveCount(2);
  await expect(page.getByText("尚未填寫", { exact: true })).toHaveCount(0);
});
