import { expect, type Locator, type Page } from "@playwright/test";
import { SignJWT } from "jose";
import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const";

const E2E_JWT_SECRET = process.env.JWT_SECRET ?? "e2e-local-jwt-secret-min-32-chars";
const E2E_BASE_URL = `http://127.0.0.1:${process.env.E2E_PORT || 3100}`;

async function selectCustomFormChoice(button: Locator) {
  await button.click();
  await expect(button).toHaveClass(/border-\[oklch\(0\.1_0_0\)\]/);
}

async function submitCustomOrderForm(page: Page, orderNo: string) {
  const responsePromise = page.waitForResponse(
    response => response.url().includes("submitCustomConsultation"),
    { timeout: 5_000 }
  ).then(response => ({ kind: "response" as const, response }));
  const toast = page.locator("[data-sonner-toast]").last();
  const toastPromise = toast
    .waitFor({ state: "visible", timeout: 5_000 })
    .then(() => ({ kind: "toast" as const }));
  await page.getByRole("button", { name: "送出客製需求" }).click();
  const outcome = await Promise.race([responsePromise, toastPromise]);
  if (outcome.kind === "response") {
    const { response } = outcome;
    expect(
      response.ok(),
      `submitCustomConsultation failed (${response.status()}): ${await response.text()}`
    ).toBeTruthy();
  } else {
    expect(await toast.textContent(), "custom form validation failed").toBeFalsy();
  }
  await expect(page).toHaveURL(new RegExp(`/order/${orderNo}$`));
}

export async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill("Test123456");
  await page.locator('button[type="submit"]').click();
}

async function createE2eSessionToken(openId: string, name: string) {
  const expiresAt = Math.floor((Date.now() + ONE_YEAR_MS) / 1000);
  return new SignJWT({ openId, appId: "", name })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expiresAt)
    .sign(new TextEncoder().encode(E2E_JWT_SECRET));
}

export async function loginAsAdminByCookie(page: Page) {
  const token = await createE2eSessionToken("e2e-admin-openid", "E2E Admin");
  await page.context().addCookies([
    {
      name: COOKIE_NAME,
      value: token,
      url: E2E_BASE_URL,
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
      expires: Math.floor((Date.now() + ONE_YEAR_MS) / 1000),
    },
  ]);
  await page.goto("/admin/orders");
  await expect(page).toHaveURL(/\/admin\/orders/);
}

export async function addSeededBraceletToCart(page: Page) {
  await page.goto("/products/e2e-bracelet-in-stock");
  await expect(page.getByRole("heading", { name: "E2E 現貨手鍊" })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: /龍蝦扣/ }).click();
  await page.getByRole("button", { name: /加入購物袋/ }).click();
  await expect(page.locator("body")).toContainText("龍蝦扣");
}

// 結帳選擇頁（/checkout/start）：未登入顯示「以訪客身分結帳」；已登入會自動轉到 /checkout
export async function proceedThroughCheckoutGate(page: Page) {
  const guestButton = page.getByRole("button", { name: "以訪客身分結帳" });
  await Promise.race([
    guestButton.waitFor({ state: "visible" }),
    page.waitForURL(/\/checkout(\?|$)/),
  ]).catch(() => {});
  if (await guestButton.isVisible().catch(() => false)) {
    await guestButton.click();
  }
  await expect(page).toHaveURL(/\/checkout(\?|$)/);
}

export async function goToCheckoutWithSeededBracelet(page: Page) {
  await addSeededBraceletToCart(page);
  await page.getByRole("button", { name: "前往結帳" }).click();
  await proceedThroughCheckoutGate(page);
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

export async function uploadTransferReceipt(page: Page) {
  await page.locator('input[type="file"][accept="image/*"]').setInputFiles({
    name: "transfer-receipt.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lZn+7QAAAABJRU5ErkJggg==",
      "base64",
    ),
  });
  await expect(page.locator("body")).toContainText("已選擇截圖");
}

export async function fillTransferCheckoutFields(page: Page, lastFive = "54321") {
  await page.getByPlaceholder("請輸入 5 位數字").fill(lastFive);
  await uploadTransferReceipt(page);
}

export async function proceedToCheckoutFromCart(page: Page) {
  await page.getByRole("link", { name: "前往結帳" }).click();
  await proceedThroughCheckoutGate(page);
  await expect(page.getByRole("heading", { name: "訂單摘要" })).toBeVisible();
}

export async function createAtmHomeDeliveryOrder(page: Page, email: string) {
  await goToCheckoutWithSeededBracelet(page);
  await fillDomesticHomeCheckout(page, email);
  await page.getByRole("button", { name: /^轉帳/ }).click();
  await fillTransferCheckoutFields(page);
  await page.getByRole("button", { name: "確認下單" }).click();
  await expect(page).toHaveURL(/\/order\//);
  return page.url().split("/order/")[1]?.split("?")[0] ?? "";
}

export async function addCustomDepositToCart(
  page: Page,
  productId: string,
  productName: string,
  options: { proceedToCheckout?: boolean; tarotTopic?: string } = {},
) {
  const { proceedToCheckout = true } = options;
  await page.goto(`/products/${productId}`);
  await expect(page.getByRole("heading", { name: productName })).toBeVisible({ timeout: 30_000 });
  if (options.tarotTopic) {
    if (options.tarotTopic === "財富密碼") {
      await page.getByRole("button", { name: "財富職涯", exact: true }).click();
    }
    await page.getByRole("button", { name: new RegExp(options.tarotTopic) }).click();
  }
  await page.getByRole("button", { name: "加入購物袋" }).click();
  await expect(page.getByRole("heading", { name: /購物袋/ })).toBeVisible();
  await expect(page.locator("body")).toContainText(productName);
  if (proceedToCheckout) {
    await proceedToCheckoutFromCart(page);
  }
}

export async function addPureCustomDepositToCart(page: Page, options: { proceedToCheckout?: boolean } = {}) {
  await addCustomDepositToCart(page, "custom-deposit-product", "客製化商品", options);
}

export async function openPendingCustomOrderForm(page: Page, orderNo: string, productName: string) {
  await page.goto(`/order/${orderNo}`);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 30_000 });
  await dialog.getByRole("button").filter({ hasText: productName }).first().click();
  const wristInput = page.locator('input[type="number"]').first();
  await expect(wristInput).toBeVisible({ timeout: 30_000 });
  await expect(wristInput).toHaveAttribute("min", "13");
  await expect(wristInput).toHaveAttribute("max", "19");
  await expect(wristInput).toHaveAttribute("step", "0.5");
  await expect(page.locator("body")).not.toContainText("想一併選擇其他客製化嗎？");
}

export async function fillPureCustomOrderForm(
  page: Page,
  orderNo: string,
  options: { wristSize?: string; expectedValidationError?: string } = {},
) {
  await openPendingCustomOrderForm(page, orderNo, "客製化商品");
  await expect(page.getByRole("heading", { name: "這次最想為自己調整的是？" })).toBeVisible({ timeout: 30_000 });
  await selectCustomFormChoice(page
    .locator("section")
    .filter({ hasText: "這次最想為自己調整的是？" })
    .getByRole("button", { name: "沒有想法，交給設計師", exact: true })
  );
  await selectCustomFormChoice(page
    .locator("section")
    .filter({ hasText: "希望整體設計？" })
    .getByRole("button", { name: "沒有想法，交給設計師", exact: true })
  );
  await page.locator('input[type="number"]').fill(options.wristSize ?? "13");
  await selectCustomFormChoice(page.getByRole("button", { name: /剛好/ }));
  await selectCustomFormChoice(page.getByRole("button", { name: "都可以" }));
  await selectCustomFormChoice(
    page.getByText("銀管", { exact: true }).locator("..").getByRole("button", { name: "不要", exact: true })
  );
  await selectCustomFormChoice(
    page.getByText("珠框", { exact: true }).locator("..").getByRole("button", { name: "不要", exact: true })
  );
  await selectCustomFormChoice(page.getByRole("button", { name: /彈力繩/ }));
  await selectCustomFormChoice(page.getByRole("button", { name: "不要吊飾", exact: true }));
  await page.getByLabel("Instagram 帳號 / LINE ID").fill("e2e_line_id");
  if (options.expectedValidationError) {
    await page.getByRole("button", { name: "送出客製需求" }).click();
    await expect(page.locator("[data-sonner-toast]")).toContainText(options.expectedValidationError);
    await expect(page).toHaveURL(/\/custom\/form\?/);
    return;
  }
  await submitCustomOrderForm(page, orderNo);
}

export async function createAtmCustomDepositOrder(page: Page, email: string) {
  await addPureCustomDepositToCart(page);
  return submitAtmCustomDepositCheckout(page, email);
}

export async function submitAtmCustomDepositCheckout(page: Page, email: string) {
  await page.locator('input[placeholder="請輸入真實姓名"]').fill("E2E 客製化測試");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="tel"]').fill("0912345678");
  await page.getByRole("button", { name: /^轉帳/ }).click();
  await fillTransferCheckoutFields(page);
  await page.getByRole("button", { name: "確認下單" }).click();
  await expect(page).toHaveURL(/\/order\//);
  return page.url().split("/order/")[1]?.split("?")[0] ?? "";
}

export async function fillProfileCustomOrderForm(
  page: Page,
  orderNo: string,
  productName: string,
  customerName: string,
  wristSize = "15.5",
) {
  await openPendingCustomOrderForm(page, orderNo, productName);
  await page.locator('input[placeholder="請填寫真實姓名"]').fill(customerName);
  await page.locator('input[placeholder="例如：1995/08/22"]').fill("1994/06/18");
  await selectCustomFormChoice(page
    .locator("section")
    .filter({ hasText: "這次最想為自己調整的是？" })
    .getByRole("button", { name: "沒有想法，交給設計師", exact: true }));
  await selectCustomFormChoice(page
    .locator("section")
    .filter({ hasText: "希望整體設計？" })
    .getByRole("button", { name: "沒有想法，交給設計師", exact: true }));
  await page.locator('input[type="number"]').fill(wristSize);
  await selectCustomFormChoice(page.getByRole("button", { name: /剛好/ }));
  await selectCustomFormChoice(page.getByRole("button", { name: "都可以" }));
  await selectCustomFormChoice(
    page.getByText("銀管", { exact: true }).locator("..").getByRole("button", { name: "不要", exact: true })
  );
  await selectCustomFormChoice(
    page.getByText("珠框", { exact: true }).locator("..").getByRole("button", { name: "不要", exact: true })
  );
  await selectCustomFormChoice(page.getByRole("button", { name: /彈力繩/ }));
  await selectCustomFormChoice(page.getByRole("button", { name: "不要吊飾" }));
  await page.getByLabel("Instagram 帳號 / LINE ID").fill("e2e_profile_line");
  await submitCustomOrderForm(page, orderNo);
}

export async function fillTarotCustomOrderForm(page: Page, orderNo: string) {
  await openPendingCustomOrderForm(page, orderNo, "塔羅 × 水晶手鍊客製化商品");
  await page.locator('input[placeholder="請填寫真實姓名"]').fill("E2E 塔羅客戶");
  await page.locator('input[placeholder="例如：1995/08/22"]').fill("1993/03/15");
  await selectCustomFormChoice(page
    .locator("section")
    .filter({ hasText: "這次最想為自己調整的是？" })
    .getByRole("button", { name: "沒有想法，交給設計師", exact: true }));
  await selectCustomFormChoice(page
    .locator("section")
    .filter({ hasText: "希望整體設計？" })
    .getByRole("button", { name: "沒有想法，交給設計師", exact: true }));
  await page.locator('input[type="number"]').fill("19");
  await selectCustomFormChoice(page.getByRole("button", { name: /微鬆/ }));
  await selectCustomFormChoice(page.getByRole("button", { name: "都可以" }));
  await selectCustomFormChoice(
    page.getByText("銀管", { exact: true }).locator("..").getByRole("button", { name: "不要", exact: true })
  );
  await selectCustomFormChoice(
    page.getByText("珠框", { exact: true }).locator("..").getByRole("button", { name: "不要", exact: true })
  );
  await selectCustomFormChoice(page.getByRole("button", { name: /彈力繩/ }));
  await selectCustomFormChoice(page.getByRole("button", { name: "不要吊飾" }));
  await page.getByLabel("Instagram 帳號 / LINE ID").fill("e2e_tarot_line");
  await submitCustomOrderForm(page, orderNo);
}
