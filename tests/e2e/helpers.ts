import { expect, type Locator, type Page } from "@playwright/test";
import { SignJWT } from "jose";
import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const";

const E2E_JWT_SECRET = process.env.JWT_SECRET ?? "e2e-local-jwt-secret-min-32-chars";
const E2E_BASE_URL = `http://127.0.0.1:${process.env.E2E_PORT || 3100}`;

async function selectCustomFormChoice(button: Locator) {
  await button.click();
  // 前台改版後選中狀態改用品牌色。各元件一致的標記是「單獨的 border-sf-accent」，
  // 未選中則是 border-sf-line-strong + hover:border-sf-accent/50，
  // 所以要比對完整的 class token，避免把 hover: 的那個當成已選中。
  await expect(button).toHaveClass(/(?:^|\s)border-sf-accent(?:\s|$)/);
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

/**
 * 直接把 session cookie 塞進瀏覽器，不走登入 API。
 *
 * 表單登入會受 member-auth 限流（20 次 / 15 分鐘），全套 e2e 的登入次數遠超過這個上限，
 * 並行執行時會互相擠爆而大量失敗。只是「需要一個已登入身分」的測試改用這個；
 * 真正在測登入行為的測試（auth-admin、member-security、checkout-account-gate）仍用表單登入。
 */
async function setSessionCookie(page: Page, openId: string, name: string) {
  const token = await createE2eSessionToken(openId, name);
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
}

export async function loginAsAdminByCookie(page: Page) {
  await setSessionCookie(page, "e2e-admin-openid", "E2E Admin");
  await page.goto("/admin/orders");
  await expect(page).toHaveURL(/\/admin\/orders/);
}

/** 一般會員身分；不導頁，呼叫端自行決定要去哪一頁 */
export async function loginAsUserByCookie(page: Page) {
  await setSessionCookie(page, "e2e-user-openid", "E2E User");
}

// 手機版有固定購買列（StickyBuyBar，lg:hidden），頁面上會出現兩顆「加入購物袋」，
// 所以加入購物袋一律從商品選項區 #product-options 內點，避免 strict mode 失敗。
export async function addSeededBraceletToCart(page: Page) {
  await page.goto("/products/e2e-bracelet-in-stock");
  await expect(page.getByRole("heading", { name: "E2E 現貨手鍊" })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: /龍蝦扣/ }).click();
  await page.locator("#product-options").getByRole("button", { name: /加入購物袋/ }).click();
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

/**
 * 商品頁價目表的分類分頁。要選的主題不在預設分頁時得先切換。
 * key 去掉空白，因為商品頁寫「前世今生 2」、表單寫「前世今生2」。
 */
const TAROT_TOPIC_TAB: Record<string, string> = {
  戀愛指南: "感情關係", 感情復合: "感情關係", 緣來暗戀: "感情關係",
  旺桃花運: "感情關係", 友情可貴: "感情關係", 雙向之路: "感情關係",
  財富密碼: "財富職涯", 創業衝衝: "財富職涯", 職涯探索: "財富職涯", 面試勝經: "財富職涯",
  進化人生: "人生療癒", 心靈療癒: "人生療癒", 守護神: "人生療癒",
  前世今生3: "前世流年", 前世今生2: "前世流年", 前世今生1: "前世流年",
  流年運勢3: "前世流年", 流年運勢1: "前世流年", 流年運勢2: "前世流年",
};

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
    const tab = TAROT_TOPIC_TAB[options.tarotTopic.replace(/\s+/g, "")];
    if (!tab) throw new Error(`未知的塔羅主題：${options.tarotTopic}`);
    // 第一個分類是預設開啟的，不用點
    if (tab !== "感情關係") {
      await page.getByRole("button", { name: tab, exact: true }).click();
    }
    await page.getByRole("button", { name: new RegExp(options.tarotTopic) }).click();
  }
  await page.locator("#product-options").getByRole("button", { name: "加入購物袋" }).click();
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
  options: {
    wristSize?: string;
    expectedValidationError?: string;
    focusChoices?: string[];
  } = {},
) {
  await openPendingCustomOrderForm(page, orderNo, "客製化商品");
  await expect(page.getByRole("heading", { name: "這次最想為自己調整的是？" })).toBeVisible({ timeout: 30_000 });
  const focusSection = page
    .locator("section")
    .filter({ hasText: "這次最想為自己調整的是？" });
  for (const choice of options.focusChoices ?? ["沒有想法，交給設計師"]) {
    await selectCustomFormChoice(
      focusSection.getByRole("button", { name: choice, exact: true })
    );
  }
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
