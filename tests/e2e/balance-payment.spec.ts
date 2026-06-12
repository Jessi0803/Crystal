import { expect, test } from "@playwright/test";
import dotenv from "dotenv";
import { readFileSync } from "node:fs";
import mysql, { type RowDataPacket } from "mysql2/promise";
import { createAtmCustomDepositOrder, login, uploadTransferReceipt } from "./helpers";

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

async function createDirectBalancePayment() {
  const connection = await connectTestDb();
  try {
    const suffix = Date.now().toString(36).toUpperCase();
    const orderNo = `E2EBAL${suffix}`.slice(0, 32);
    const balanceOrderNo = `CB${suffix}`.slice(0, 20);

    await connection.execute(
      `INSERT INTO orders (
        merchantTradeNo, paymentStatus, paymentMethod, deliveryRegion, shippingMethod,
        orderStatus, isCustomOrder, totalAmount, buyerName, buyerEmail, buyerPhone,
        shippingAddress, receiverZipCode, confirmedAt, createdAt, updatedAt
      ) VALUES (?, 'confirmed', 'atm', 'domestic', 'home', 'deposit_paid', true, 1200,
        'E2E 尾款測試', ?, '0912345678', '台北市中正區測試路 1 號', '100', NOW(), NOW(), NOW())`,
      [orderNo, `${orderNo.toLowerCase()}@example.com`]
    );
    const [rows] = await connection.execute<RowDataPacket[]>(
      "SELECT id FROM orders WHERE merchantTradeNo = ? LIMIT 1",
      [orderNo]
    );
    const orderId = rows[0]?.id;
    await connection.execute(
      `INSERT INTO orderItems (orderId, productId, productName, quantity, unitPrice, subtotal, isPreorder)
       VALUES (?, 'custom-product-deposit', '客製化商品訂金', 1, 500, 500, false)`,
      [orderId]
    );
    await connection.execute(
      `INSERT INTO orderBalancePayments (
        orderId, merchantTradeNo, amount, shippingFee, paymentFee, totalAmount,
        paymentMethod, paymentStatus, createdAt, updatedAt
      ) VALUES (?, ?, 700, 0, 700, 1400, 'atm', 'pending', NOW(), NOW())`,
      [orderId, balanceOrderNo]
    );

    return balanceOrderNo;
  } finally {
    await connection.end();
  }
}

test("custom deposit order can receive a balance payment link and submit ATM balance transfer code", async ({ page }) => {
  test.setTimeout(90_000);
  const depositOrderNo = await createAtmCustomDepositOrder(page, `e2e-balance-${Date.now()}@example.com`);

  await expect(page.getByRole("heading", { name: "等待轉帳確認" })).toBeVisible();
  await expect(page.locator("body")).toContainText("客製化商品");

  await login(page, "e2e-admin@example.com");
  await expect(page).toHaveURL(/\/admin\/orders/);

  await page.locator("button").filter({ hasText: depositOrderNo }).click();
  await page.getByRole("button", { name: "確認收款" }).click();
  await expect(page.locator("body")).toContainText("產生尾款連結");

  await page.goto(`/order/${depositOrderNo}`);
  await expect(page.getByRole("heading", { name: "訂金付款成功" })).toBeVisible();
  await expect(page.locator("body")).toContainText("已付訂金");

  await page.goto("/admin/orders");
  await page.locator("button").filter({ hasText: depositOrderNo }).click();

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("請輸入尾款金額");
    await dialog.accept("700");
  });
  await page.getByRole("button", { name: "產生尾款連結" }).click();
  await expect(page.locator("body")).toContainText("尾款編號：");

  const pageText = await page.locator("body").innerText();
  const balanceOrderNo = pageText.match(/尾款編號：([A-Z0-9]+)/)?.[1];
  expect(balanceOrderNo).toBeTruthy();

  await page.goto(`/balance/${balanceOrderNo}`);

  await expect(page.getByRole("heading", { name: "請完成客製化尾款" })).toBeVisible();
  await expect(page.locator("body")).toContainText("尾款小計");
  await expect(page.locator("body")).toContainText("加購白水晶碎石");
  await page.getByLabel(/加購白水晶碎石/).check();
  await expect(page.locator("body")).toContainText("NT$ 180");

  await page.getByRole("button", { name: "前往信用卡付款" }).click();
  await expect(page.locator("body")).toContainText("請輸入有效郵遞區號");

  await page.locator('input[placeholder="郵遞區號"]').fill("100");
  await page.locator('input[placeholder="縣市"]').fill("台北市");
  await page.locator('input[placeholder="鄉鎮市區"]').fill("中正區");
  await page.locator('input[placeholder="路名、門牌、樓層"]').fill("測試路 2 號");
  await page.getByRole("button", { name: /^轉帳/ }).click();
  await page.getByRole("button", { name: /確認使用轉帳/ }).click();

  await expect(page.locator("body")).toContainText("轉帳資訊");
  await page.locator('input[placeholder="12345"]').fill("67890");
  await uploadTransferReceipt(page);
  await page.getByRole("button", { name: "確認送出" }).click();

  await expect(page.locator("body")).toContainText("已收到您的匯款末五碼");
  await expect(page.locator("body")).toContainText("67890");

  await page.goto("/admin/orders");
  await page.locator("button").filter({ hasText: depositOrderNo }).click();
  await expect(page.locator("body")).toContainText("67890");
  page.once("dialog", async dialog => {
    expect(dialog.message()).toContain("確認已收到尾款轉帳");
    await dialog.accept();
  });
  await page.getByRole("button", { name: "確認收到尾款" }).click();
  await expect(page.locator("body")).toContainText("尾款已確認收款");
  await expect(page.locator("body")).toContainText("已付款");

  await page.goto(`/balance/${balanceOrderNo}`);
  await expect(page.locator("body")).toContainText("尾款已完成付款", { timeout: 30_000 });
});

test("ATM balance payment requires transfer last five digits and receipt before submission", async ({ page }) => {
  const balanceOrderNo = await createDirectBalancePayment();

  await page.goto(`/balance/${balanceOrderNo}`);
  await expect(page.getByRole("heading", { name: "請完成客製化尾款" })).toBeVisible();

  await page.locator('input[placeholder="郵遞區號"]').fill("100");
  await page.locator('input[placeholder="縣市"]').fill("台北市");
  await page.locator('input[placeholder="鄉鎮市區"]').fill("中正區");
  await page.locator('input[placeholder="路名、門牌、樓層"]').fill("測試路 2 號");
  await page.getByRole("button", { name: /^轉帳/ }).click();
  await page.getByRole("button", { name: /確認使用轉帳/ }).click();
  await expect(page.locator("body")).toContainText("轉帳資訊");

  await page.getByRole("button", { name: "確認送出" }).click();
  await expect(page.locator("body")).toContainText("請輸入正確的 5 位數字");

  await page.locator('input[placeholder="12345"]').fill("67890");
  await page.getByRole("button", { name: "確認送出" }).click();
  await expect(page.locator("body")).toContainText("請上傳轉帳成功截圖");
  await expect(page.locator("body")).not.toContainText("已收到您的匯款末五碼");

  await uploadTransferReceipt(page);
  await page.getByRole("button", { name: "確認送出" }).click();
  await expect(page.locator("body")).toContainText("已收到您的匯款末五碼");
  await expect(page.locator("body")).toContainText("67890");
});
