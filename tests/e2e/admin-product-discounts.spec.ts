import { expect, test } from "@playwright/test";
import dotenv from "dotenv";
import { readFileSync } from "node:fs";
import mysql from "mysql2/promise";
import { login } from "./helpers";

const productSearch = 'input[placeholder="搜尋商品名稱或分類"]';

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

function json(value: unknown) {
  return JSON.stringify(value ?? []);
}

async function insertDiscountProduct(input: {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  categories: string[];
  categoryLabels: string[];
  price: number;
  image: string;
  sortOrder: number;
}) {
  const connection = await connectTestDb();
  try {
    await connection.execute(
      `INSERT INTO products
        (id, name, subtitle, category, categoryLabel, categories, categoryLabels, price, originalPrice,
         priceRange, depositRange, image, tags, description, story, benefits, suitableFor, howToUse,
         disclaimer, crystalType, color, featured, active, isMonthlyLimited, scheduledPublishAt, sortOrder)
       VALUES (?, ?, 'E2E 批次折扣測試', ?, ?, ?, ?, ?, NULL,
         NULL, NULL, ?, ?, 'E2E 批次折扣測試商品', '', ?, ?, ?,
         '測試商品，非正式販售。', '白水晶', '測試', false, true, false, NULL, ?)
       ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        category = VALUES(category),
        categoryLabel = VALUES(categoryLabel),
        categories = VALUES(categories),
        categoryLabels = VALUES(categoryLabels),
        price = VALUES(price),
        originalPrice = NULL,
        active = true,
        sortOrder = VALUES(sortOrder)`,
      [
        input.id,
        input.name,
        input.category,
        input.categoryLabel,
        json(input.categories),
        json(input.categoryLabels),
        input.price,
        input.image,
        json(["E2E", "批次折扣"]),
        json(["批次折扣測試"]),
        json(["Playwright 測試"]),
        json(input.category === "custom" ? ["填寫表單", "支付訂金"] : ["一般商品測試"]),
        input.sortOrder,
      ]
    );

    if (input.category !== "custom") {
      await connection.execute(
        `INSERT INTO productInventory (productId, productName, stock, allowPreorder)
         VALUES (?, ?, -1, false)
         ON DUPLICATE KEY UPDATE productName = VALUES(productName), stock = -1, allowPreorder = false`,
        [input.id, input.name]
      );
    }
  } finally {
    await connection.end();
  }
}

async function deleteDiscountProducts(ids: string[]) {
  const connection = await connectTestDb();
  try {
    await connection.query("DELETE FROM productInventory WHERE productId IN (?)", [ids]);
    await connection.query("DELETE FROM products WHERE id IN (?)", [ids]);
  } finally {
    await connection.end();
  }
}

test("admin can bulk discount selected regular and custom products", async ({ page }) => {
  test.setTimeout(60_000);
  const suffix = Date.now();
  const regularProduct = {
    id: `e2e-bulk-regular-${suffix}`,
    name: `E2E 批次折扣一般 ${suffix}`,
    category: "healing",
    categoryLabel: "療癒系列",
    categories: ["healing"],
    categoryLabels: ["療癒系列"],
    price: 1000,
    image: "/images/d-design/d001.jpg",
    sortOrder: 901,
  };
  const customProduct = {
    id: `e2e-bulk-custom-${suffix}`,
    name: `E2E 批次折扣客製 ${suffix}`,
    category: "custom",
    categoryLabel: "客製化",
    categories: ["custom"],
    categoryLabels: ["客製化"],
    price: 500,
    image: "/images/custom3.jpg",
    sortOrder: 902,
  };
  const productIds = [regularProduct.id, customProduct.id];

  await insertDiscountProduct(regularProduct);
  await insertDiscountProduct(customProduct);

  try {
    await login(page, "e2e-admin@example.com");
    await expect(page).toHaveURL(/\/admin\/orders/);

    await page.goto("/admin/products");
    await expect(page.getByRole("heading", { name: "商品管理" })).toBeVisible();
    await page.locator(productSearch).fill(String(suffix));
    await expect(page.locator("body")).toContainText(regularProduct.name);
    await expect(page.locator("body")).toContainText(customProduct.name);
    await expect(page.getByLabel(`選取 ${regularProduct.name}`)).toHaveCount(0);

    await page.getByRole("button", { name: "開始選取商品" }).click();
    await expect(page.getByLabel(`選取 ${regularProduct.name}`)).toBeVisible();
    await expect(page.getByLabel(`選取 ${customProduct.name}`)).toBeVisible();

    await page.getByRole("button", { name: "全選目前列表" }).click();
    await expect(page.getByLabel(`選取 ${regularProduct.name}`)).toBeChecked();
    await expect(page.getByLabel(`選取 ${customProduct.name}`)).toBeChecked();
    await expect(page.locator("body")).toContainText("已選 2 件");

    await page.locator("label").filter({ hasText: "折扣" }).locator("input").fill("9");
    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain("2 件商品");
      await dialog.accept();
    });
    await page.getByRole("button", { name: "套用折扣" }).click();
    await expect(page.locator("body")).toContainText("已套用折扣到 2 件商品");

    await page.goto("/products");
    const regularCard = page.locator(`a[href="/products/${regularProduct.id}"]`);
    const customCard = page.locator(`a[href="/products/${customProduct.id}"]`);
    await expect(regularCard).toContainText("9 折");
    await expect(customCard).toContainText("9 折");
    await expect(regularCard).toContainText("NT$ 900");
    await expect(customCard).toContainText("NT$ 450");

    await page.goto("/admin/products");
    await page.locator(productSearch).fill(String(suffix));
    await page.getByRole("button", { name: "開始選取商品" }).click();
    await page.getByRole("button", { name: "全選目前列表" }).click();
    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain("2 件商品");
      await dialog.accept();
    });
    await page.getByRole("button", { name: "清除折扣" }).click();
    await expect(page.locator("body")).toContainText("已清除 2 件商品折扣");
  } finally {
    await deleteDiscountProducts(productIds);
  }
});
