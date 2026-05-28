import { expect, test, type Page } from "@playwright/test";
import dotenv from "dotenv";
import { readFileSync } from "node:fs";
import mysql, { type RowDataPacket } from "mysql2/promise";
import { fillDomesticHomeCheckout, login } from "./helpers";

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

async function getInventoryDeducted(orderNo: string) {
  const connection = await connectTestDb();
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      "SELECT inventoryDeducted FROM orders WHERE merchantTradeNo = ? LIMIT 1",
      [orderNo]
    );
    return Boolean(rows[0]?.inventoryDeducted);
  } finally {
    await connection.end();
  }
}

async function createUniqueStockProduct(page: Page, productName: string, stock: number) {
  await login(page, "e2e-admin@example.com");
  await expect(page).toHaveURL(/\/admin\/orders/);
  await page.goto("/admin/products");
  await expect(page.locator("body")).toContainText("商品管理");
  await page.getByRole("button", { name: "新增商品" }).click();
  await page.locator('input[placeholder="或貼上圖片網址"]').fill("/images/d-design/d001.jpg");
  await page.locator('input[placeholder="例：紫水晶手鍊"]').fill(productName);
  await page.locator('input[placeholder="1200"]').fill("777");
  await page.locator('input[placeholder="紫水晶, 愛情"]').fill("E2E, 庫存");
  await page.locator('input[type="number"]').last().fill(String(stock));
  await page.locator("textarea").first().fill("E2E 庫存訂單測試");
  await page.locator("textarea").last().fill("白水晶");
  await page.getByRole("button", { name: "新增商品" }).last().click();
  await page.locator('input[placeholder="搜尋商品名稱或分類"]').fill(productName);
  await expect(page.getByRole("button", { name: `編輯 ${productName} 庫存` })).toHaveText(String(stock));
}

async function addProductAndCreateAtmOrder(page: Page, productName: string, email: string) {
  await page.goto("/products");
  await page.getByText(productName).first().click();
  await expect(page.getByRole("heading", { name: productName })).toBeVisible();
  await page.getByRole("button", { name: /加入購物袋/ }).click();
  await page.getByRole("button", { name: "前往結帳" }).click();
  await fillDomesticHomeCheckout(page, email);
  await page.getByRole("button", { name: /^轉帳/ }).click();
  await page.getByRole("button", { name: "確認下單" }).click();
  await expect(page).toHaveURL(/\/order\//);

  return page.url().split("/order/")[1]?.split("?")[0] ?? "";
}

test("ATM order deducts test stock and admin cancellation restores it", async ({ page }) => {
  test.setTimeout(60_000);
  const productName = `E2E 庫存恢復手鍊 ${Date.now()}`;
  await createUniqueStockProduct(page, productName, 3);

  const orderNo = await addProductAndCreateAtmOrder(
    page,
    productName,
    `e2e-stock-${Date.now()}@example.com`,
  );
  expect(orderNo).not.toBe("");

  await page.goto("/admin/products");
  await page.locator('input[placeholder="搜尋商品名稱或分類"]').fill(productName);
  await expect(page.getByRole("button", { name: `編輯 ${productName} 庫存` })).toHaveText("2");
  await expect.poll(() => getInventoryDeducted(orderNo)).toBe(true);

  await page.goto("/admin/orders");
  await page.getByText(orderNo).click();
  await page
    .locator("select")
    .filter({ has: page.locator('option[value="cancelled"]') })
    .selectOption("cancelled");
  await expect(page.locator("body")).toContainText("訂單狀態已更新");

  await page.goto("/admin/products");
  await page.locator('input[placeholder="搜尋商品名稱或分類"]').fill(productName);
  await expect(page.getByRole("button", { name: `編輯 ${productName} 庫存` })).toHaveText("3");
  await expect.poll(() => getInventoryDeducted(orderNo)).toBe(false);

  await page.goto(`/order/${orderNo}`);
  await expect(page.getByRole("heading", { name: "訂單已取消" })).toBeVisible();
});

test("ATM preorder order is displayed as preorder after it is stored", async ({ page }) => {
  await page.goto("/products/e2e-bracelet-preorder");
  await expect(page.locator("body")).toContainText("預購");
  await page.getByRole("button", { name: /彈力繩/ }).click();
  await page.getByRole("button", { name: /加入購物袋/ }).click();
  await page.getByRole("button", { name: "前往結帳" }).click();
  await fillDomesticHomeCheckout(page, `e2e-preorder-${Date.now()}@example.com`);
  await page.getByRole("button", { name: /^轉帳/ }).click();
  await page.getByRole("button", { name: "確認下單" }).click();

  await expect(page).toHaveURL(/\/order\//);
  const orderNo = page.url().split("/order/")[1]?.split("?")[0] ?? "";
  expect(orderNo).not.toBe("");
  await expect(page.locator("body")).toContainText("預購商品");
  await expect(page.locator("body")).toContainText("（預購）");

  await login(page, "e2e-admin@example.com");
  await expect(page).toHaveURL(/\/admin\/orders/);
  await page.getByRole("button", { name: "轉帳待確認" }).click();
  await page.getByText(orderNo).click();
  await expect(page.locator("body")).toContainText("預購");
});

test("zero-stock preorder and sold-out monthly fixtures produce distinct storefront outcomes", async ({ page }) => {
  await login(page, "e2e-admin@example.com");
  await expect(page).toHaveURL(/\/admin\/orders/);
  await page.goto("/admin/products");
  await page.locator('input[placeholder="搜尋商品名稱或分類"]').fill("E2E 預購手鍊");
  await expect(page.getByRole("button", { name: "編輯 E2E 預購手鍊 庫存" })).toHaveText("0");

  await page.goto("/products/e2e-bracelet-preorder");
  await expect(page.getByRole("button", { name: /加入購物袋/ })).toBeEnabled();
  await expect(page.locator("body")).toContainText("預購");

  await page.goto("/products/e2e-monthly-sold-out");
  await expect(page.getByRole("button", { name: "售完" })).toBeDisabled();
  await expect(page.locator("body")).toContainText("本月限量商品已售完");
});
