import { expect, test, type Page } from "@playwright/test";
import dotenv from "dotenv";
import { readFileSync } from "node:fs";
import mysql, { type RowDataPacket } from "mysql2/promise";
import { login } from "./helpers";

async function createDirectAtmOrder(prefix: string) {
  const env = dotenv.parse(readFileSync(".env.test.local"));
  const url = new URL(env.DATABASE_URL);
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, "")),
    ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true },
  });

  try {
    const orderNo = `${prefix}${Date.now().toString(36).toUpperCase()}`.slice(0, 32);
    await connection.execute(
      `INSERT INTO orders (
        merchantTradeNo, paymentStatus, paymentMethod, deliveryRegion, shippingMethod,
        orderStatus, totalAmount, buyerName, buyerEmail, buyerPhone,
        shippingAddress, receiverZipCode, createdAt, updatedAt
      ) VALUES (?, 'transfer_pending', 'atm', 'domestic', 'home', 'pending_payment', 1880,
        'E2E 測試收件人', ?, '0912345678', '台北市中正區測試路 1 號', '100', NOW(), NOW())`,
      [orderNo, `${orderNo.toLowerCase()}@example.com`]
    );
    const [rows] = await connection.execute<RowDataPacket[]>(
      "SELECT id FROM orders WHERE merchantTradeNo = ? LIMIT 1",
      [orderNo]
    );
    const orderId = rows[0]?.id;
    await connection.execute(
      `INSERT INTO orderItems (orderId, productId, productName, quantity, unitPrice, subtotal, isPreorder)
       VALUES (?, 'e2e-bracelet-in-stock', 'E2E 現貨手鍊', 1, 1780, 1780, false)`,
      [orderId]
    );
    return orderNo;
  } finally {
    await connection.end();
  }
}

async function updateStatus(
  page: Page,
  orderNo: string,
  tabName: string,
  status: string,
  customerLabel: string,
) {
  await page.goto("/admin/orders");
  await page.getByRole("button", { name: tabName }).click();
  await expect(page.locator("body")).toContainText(orderNo);
  await page.locator("button").filter({ hasText: orderNo }).click();
  await page
    .locator("select")
    .filter({ has: page.locator('option[value="processing"]') })
    .selectOption(status);
  await expect(page.locator("body")).toContainText("訂單狀態已更新");

  await page.goto(`/order/${orderNo}`);
  await expect(page.locator("body")).toContainText(customerLabel);
}

async function confirmTransferPayment(page: Page, orderNo: string) {
  await page.goto("/admin/orders");
  await page.getByRole("button", { name: "轉帳待確認" }).click();
  await expect(page.locator("body")).toContainText(orderNo);
  await page.locator("button").filter({ hasText: orderNo }).click();
  await page.getByRole("button", { name: "確認收款" }).click();
  await expect(page.locator("body")).toContainText("已確認收款");
}

test("admin can progress an ATM test order through safe pickup statuses", async ({ page }) => {
  test.setTimeout(120_000);
  const orderNo = await createDirectAtmOrder("E2ESTA");

  await login(page, "e2e-admin@example.com");
  await expect(page).toHaveURL(/\/admin\/orders/);
  await confirmTransferPayment(page, orderNo);
  await updateStatus(page, orderNo, "已付款", "processing", "備貨中");
  await updateStatus(page, orderNo, "備貨中", "arrived", "已到店");
  await updateStatus(page, orderNo, "已到店", "picked_up", "已取貨");
  await updateStatus(page, orderNo, "已取貨", "completed", "訂單已完成");
  await page.goto("/admin/orders");
  await page.getByRole("button", { name: "已完成" }).click();
  await expect(page.locator("body")).toContainText(orderNo);
});

test("admin order filters and page size include a newly created pending transfer order", async ({ page }) => {
  const orderNo = await createDirectAtmOrder("E2EFIL");

  await login(page, "e2e-admin@example.com");
  await expect(page).toHaveURL(/\/admin\/orders/);
  await page.goto("/admin/orders");
  await page.getByRole("button", { name: "轉帳待確認" }).click();
  await expect(page.locator("body")).toContainText(orderNo);

  const pageSize = page.locator("select").filter({ has: page.locator('option[value="100"]') });
  await pageSize.selectOption("100");
  await expect(pageSize).toHaveValue("100");

  await page.getByRole("button", { name: "全部" }).click();
  await expect(page.locator("body")).toContainText(orderNo);
});

test("admin can mark a delivery test order as shipped and then not picked up", async ({ page }) => {
  test.setTimeout(120_000);
  const orderNo = await createDirectAtmOrder("E2ESHP");

  await login(page, "e2e-admin@example.com");
  await expect(page).toHaveURL(/\/admin\/orders/);
  await confirmTransferPayment(page, orderNo);
  await updateStatus(page, orderNo, "已付款", "processing", "備貨中");
  await updateStatus(page, orderNo, "備貨中", "shipped", "已出貨");
  await updateStatus(page, orderNo, "已出貨", "not_picked", "未取貨");
});
