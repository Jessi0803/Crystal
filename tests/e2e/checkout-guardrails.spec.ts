import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import dotenv from "dotenv";
import { readFileSync } from "node:fs";
import mysql, { type RowDataPacket } from "mysql2/promise";
import { fillDomesticHomeCheckout, goToCheckoutWithSeededBracelet } from "./helpers";

async function connectTestDb() {
  const env = dotenv.parse(readFileSync(".env.test.local"));
  const url = new URL(env.DATABASE_URL);
  return mysql.createConnection({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, "")),
    ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true },
  });
}

async function countOrdersForEmail(email: string) {
  const connection = await connectTestDb();
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      "SELECT COUNT(*) AS count FROM orders WHERE buyerEmail = ?",
      [email]
    );
    return Number(rows[0]?.count ?? 0);
  } finally {
    await connection.end();
  }
}

function createAndPayPayload(email: string, items: unknown[]) {
  return {
    "0": {
      json: {
        buyerName: "E2E Guardrail",
        buyerEmail: email,
        buyerPhone: "0912345678",
        checkoutRegion: "domestic",
        paymentMethod: "atm",
        shippingMethod: "home",
        shippingAddress: "台北市中正區測試路 1 號",
        receiverZipCode: "100",
        items,
        origin: "http://localhost:3100",
      },
    },
  };
}

async function postCreateAndPay(request: APIRequestContext, email: string, items: unknown[]) {
  return request.post("/api/trpc/order.createAndPay?batch=1", {
    data: createAndPayPayload(email, items),
  });
}

async function fillCheckoutForAtm(page: Page, email: string) {
  await goToCheckoutWithSeededBracelet(page);
  await fillDomesticHomeCheckout(page, email);
  await page.getByRole("button", { name: /^轉帳/ }).click();
}

test("overseas checkout shows shipping fees and validates address before PayPal submission", async ({ page }) => {
  let createOrderRequested = false;
  page.on("request", (request) => {
    if (request.url().includes("/api/trpc/order.createAndPay")) createOrderRequested = true;
  });

  await goToCheckoutWithSeededBracelet(page);
  await page.getByRole("button").filter({ hasText: "國際宅配＋PayPal 付款" }).click();

  await expect(page.locator("body")).toContainText("海外訂單僅提供國際宅配與 PayPal 付款");
  await expect(page.getByRole("button", { name: /前往 PayPal 付款/ })).toBeVisible();

  await page.locator("select").first().selectOption("US");
  await expect(page.locator("body")).toContainText("NT$ 771");
  await page.locator('input[placeholder="請輸入真實姓名"]').fill("E2E Overseas");
  await page.locator('input[type="email"]').fill(`e2e-overseas-${Date.now()}@example.com`);
  await page.locator('input[type="tel"]').fill("+1 212 555 0100");
  await page.locator('input[placeholder="Street number, street name"]').fill("測試路 1 號");
  await page.locator('input[placeholder="City"]').fill("New York");
  await page.locator("select").nth(1).selectOption("NY");
  await page.locator('input[placeholder="ZIP Code"]').fill("123");
  await page.getByRole("button", { name: /前往 PayPal 付款/ }).click();

  await expect(page.locator("body")).toContainText("Please use English only");
  await expect(page.locator("body")).toContainText("ZIP code must be 5 digits");
  await expect(page).toHaveURL(/\/checkout/);
  expect(createOrderRequested).toBe(false);
});

test("server rejects an ATM checkout request tampered to contain a sold-out monthly product", async ({ page }) => {
  let tamperedRequestSent = false;
  await page.route("**/api/trpc/order.createAndPay**", async (route) => {
    const body = route.request().postData() ?? "";
    const tamperedBody = body
      .replaceAll("e2e-bracelet-in-stock", "e2e-monthly-sold-out")
      .replaceAll("E2E 現貨手鍊", "E2E 月限售完商品");
    expect(tamperedBody).not.toBe(body);
    tamperedRequestSent = true;
    await route.continue({ postData: tamperedBody });
  });

  await goToCheckoutWithSeededBracelet(page);
  await fillDomesticHomeCheckout(page, `e2e-soldout-guard-${Date.now()}@example.com`);
  await page.getByRole("button", { name: /^轉帳/ }).click();
  await page.getByRole("button", { name: "確認下單" }).click();

  await expect(page.locator("body")).toContainText("已售完，無法預購");
  await expect(page).toHaveURL(/\/checkout/);
  expect(tamperedRequestSent).toBe(true);
});

test("server rejects direct empty checkout API calls without creating an order", async ({ request }) => {
  const email = `e2e-empty-cart-${Date.now()}@example.com`;
  const before = await countOrdersForEmail(email);

  const response = await postCreateAndPay(request, email, []);

  expect(response.status()).toBe(400);
  const text = await response.text();
  expect(text).toContain("too_small");
  await expect.poll(() => countOrdersForEmail(email)).toBe(before);
});

test("server rejects direct sold-out monthly checkout API calls without creating an order", async ({ request }) => {
  const email = `e2e-direct-soldout-${Date.now()}@example.com`;
  const before = await countOrdersForEmail(email);

  const response = await postCreateAndPay(request, email, [{
    id: "e2e-monthly-sold-out",
    baseProductId: "e2e-monthly-sold-out",
    name: "E2E 月限售完商品",
    price: 1680,
    quantity: 1,
    image: "/images/d-design/d001.jpg",
  }]);

  expect(response.status()).toBe(400);
  const text = await response.text();
  expect(text).toContain("已售完");
  await expect.poll(() => countOrdersForEmail(email)).toBe(before);
});

test("double-clicking ATM checkout submits only one create order request", async ({ page }) => {
  const email = `e2e-double-submit-${Date.now()}@example.com`;
  let createRequests = 0;
  page.on("request", (request) => {
    if (request.url().includes("/api/trpc/order.createAndPay")) createRequests += 1;
  });

  await fillCheckoutForAtm(page, email);
  const submitButton = page.getByRole("button", { name: "確認下單" });
  await submitButton.dblclick();

  await expect(page).toHaveURL(/\/order\//);
  expect(createRequests).toBe(1);
  await expect.poll(() => countOrdersForEmail(email)).toBe(1);
});
