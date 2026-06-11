import { expect, test } from "@playwright/test";
import dotenv from "dotenv";
import { readFileSync } from "node:fs";
import mysql from "mysql2/promise";
import { proceedThroughCheckoutGate } from "./helpers";

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

async function ensureTwoItemFreeShippingColumn(connection: mysql.Connection) {
  try {
    await connection.execute("ALTER TABLE products ADD COLUMN twoItemFreeShippingEligible boolean NOT NULL DEFAULT true");
  } catch {
    /* Column already exists. */
  }
}

async function insertTwoItemFreeShippingExcludedProduct(input: { id: string; name: string }) {
  const connection = await connectTestDb();
  try {
    await ensureTwoItemFreeShippingColumn(connection);
    await connection.execute(
      `INSERT INTO products
        (id, name, subtitle, category, categoryLabel, categories, categoryLabels, price, originalPrice,
         priceRange, depositRange, image, tags, description, story, benefits, suitableFor, howToUse,
         disclaimer, crystalType, color, featured, active, isMonthlyLimited, twoItemFreeShippingEligible,
         scheduledPublishAt, sortOrder)
       VALUES (?, ?, 'Playwright 測試用不計免運商品', 'healing', '療癒系列', ?, ?, 680, NULL,
         NULL, NULL, '/images/d-design/d005.jpg', ?, 'E2E 不計免運測試商品', '', ?, ?, ?,
         '測試商品，非正式販售。', '白水晶', '白色', false, true, false, false, NULL, 90)
       ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        price = VALUES(price),
        active = true,
        twoItemFreeShippingEligible = false,
        sortOrder = VALUES(sortOrder)`,
      [
        input.id,
        input.name,
        json(["healing"]),
        json(["療癒系列"]),
        json(["E2E", "不計免運"]),
        json(["不計入兩件免運"]),
        json(["Playwright 測試"]),
        json(["一般商品測試"]),
      ]
    );
    await connection.execute(
      `INSERT INTO productInventory (productId, productName, stock, allowPreorder)
       VALUES (?, ?, -1, false)
       ON DUPLICATE KEY UPDATE productName = VALUES(productName), stock = -1, allowPreorder = false`,
      [input.id, input.name]
    );
  } finally {
    await connection.end();
  }
}

async function deleteTestProduct(productId: string) {
  const connection = await connectTestDb();
  try {
    await connection.execute("DELETE FROM productInventory WHERE productId = ?", [productId]);
    await connection.execute("DELETE FROM products WHERE id = ?", [productId]);
  } finally {
    await connection.end();
  }
}

test("known product detail renders while latest database product query is pending", async ({ page }) => {
  await page.route("**/api/trpc/product.getById**", async route => {
    await new Promise(resolve => setTimeout(resolve, 2_000));
    await route.continue();
  });

  await page.goto("/products/d001-moon-secret");

  await expect(page.getByRole("heading", { name: "月下密語手鍊" })).toBeVisible({ timeout: 1_000 });
});

test("product detail can add seeded product to cart and continue to checkout", async ({ page }) => {
  await page.goto("/products");
  await expect(page.getByText("E2E 現貨手鍊")).toBeVisible();

  await page.getByText("E2E 現貨手鍊").first().click();
  await expect(page).toHaveURL(/\/products\/e2e-bracelet-in-stock/);
  await expect(page.getByRole("heading", { name: "E2E 現貨手鍊" })).toBeVisible();

  await page.getByRole("button", { name: /龍蝦扣/ }).click();
  await expect(page.locator("body")).toContainText(/龍蝦扣\+NT\$200/);

  await page.getByRole("button", { name: /加入購物袋/ }).click();
  await expect(page.getByText("購物袋").first()).toBeVisible();
  await expect(page.getByText("E2E 現貨手鍊").last()).toBeVisible();
  await expect(page.locator("body")).toContainText("龍蝦扣");

  await page.getByRole("button", { name: "前往結帳" }).click();
  await proceedThroughCheckoutGate(page);
  await expect(page.getByRole("heading", { name: "訂單摘要" })).toBeVisible();
  await expect(page.locator("body")).toContainText("E2E 現貨手鍊");
});

test("empty checkout shows empty cart state", async ({ page }) => {
  await page.goto("/checkout");
  await expect(page.locator("body")).toContainText("購物車是空的");
  await page.getByRole("button", { name: "前往選購" }).click();
  await expect(page).toHaveURL(/\/products/);
});

test("seeded inventory states are visible", async ({ page }) => {
  await page.goto("/products?category=monthly");
  await expect(page.locator('a[href="/products/e2e-monthly-sold-out"] .sold-out-card')).toHaveText("已售完");

  await page.goto("/products/e2e-bracelet-preorder");
  await expect(page.locator("body")).toContainText(/預購|7-14 天/);
  await expect(page.getByRole("button", { name: /加入購物袋/ })).toBeEnabled();

  await page.goto("/products/e2e-monthly-sold-out");
  await expect(page.locator(".sold-out-card")).toHaveText("已售完");
  await expect(page.locator("body")).toContainText("本月限量商品已售完");
  await expect(page.getByRole("button", { name: "售完" })).toBeDisabled();
});

test("bracelet options and cart controls update line price and quantity", async ({ page }) => {
  await page.goto("/products/e2e-bracelet-in-stock");
  await page.getByRole("combobox").selectOption("13.5");
  await page.getByRole("button", { name: /磁扣/ }).click();
  await page.getByRole("button", { name: /微鬆/ }).click();
  await page.getByRole("button", { name: /加入購物袋/ }).click();

  const drawer = page.locator("div.fixed").filter({ hasText: "SHOPPING BAG" });
  await expect(drawer).toContainText("手圍 13.5 cm");
  await expect(drawer).toContainText("磁扣");
  await expect(drawer).toContainText("微鬆");
  await expect(drawer).toContainText("NT$ 1,384");

  await drawer.getByRole("button", { name: "增加" }).click();
  await expect(drawer).toContainText("購物袋 (2)");
  await expect(drawer).toContainText("NT$ 2,768");

  await drawer.getByRole("button", { name: "移除" }).click();
  await expect(drawer).toContainText("你的購物袋是空的");
});

test("monthly limited bracelet products keep wrist size and clasp through checkout", async ({ page }) => {
  await page.goto("/products/e2e-monthly-in-stock");

  await page.getByRole("combobox").selectOption("16.5");
  await page.getByRole("button", { name: /磁扣/ }).click();
  await page.getByRole("button", { name: /微鬆/ }).click();
  await page.getByRole("button", { name: /加入購物袋/ }).click();

  const drawer = page.locator("div.fixed").filter({ hasText: "SHOPPING BAG" });
  await expect(drawer).toContainText("手圍 16.5 cm");
  await expect(drawer).toContainText("磁扣");
  await expect(drawer).toContainText("微鬆");
  await expect(drawer).toContainText("NT$ 1,180");

  await drawer.getByRole("button", { name: "前往結帳" }).click();
  await proceedThroughCheckoutGate(page);
  await expect(page.getByRole("heading", { name: "訂單摘要" })).toBeVisible();
  await expect(page.locator("body")).toContainText("E2E 月限現貨商品");
  await expect(page.locator("body")).toContainText("手圍 16.5 cm");
  await expect(page.locator("body")).toContainText("磁扣");
  await expect(page.locator("body")).toContainText("微鬆");
});

test("non-bracelet category products also keep clasp through checkout", async ({ page }) => {
  await page.goto("/products/d003-venus");

  await expect(page.getByRole("heading", { name: "維納斯 Venus" })).toBeVisible();
  await page.getByRole("button", { name: /磁扣/ }).click();
  await page.getByRole("button", { name: /加入購物袋/ }).click();

  const drawer = page.locator("div.fixed").filter({ hasText: "SHOPPING BAG" });
  await expect(drawer).toContainText("維納斯 Venus");
  await expect(drawer).toContainText("磁扣");
  await expect(drawer).toContainText("NT$ 1,150");

  await drawer.getByRole("button", { name: "前往結帳" }).click();
  await proceedThroughCheckoutGate(page);
  await expect(page.getByRole("heading", { name: "訂單摘要" })).toBeVisible();
  await expect(page.locator("body")).toContainText("維納斯 Venus");
  await expect(page.locator("body")).toContainText("磁扣");
});

test("adjustable bracelets offer only 13 to 19 cm and retain a boundary size in checkout", async ({ page }) => {
  await page.goto("/products/e2e-bracelet-in-stock");

  const sizeSelect = page.getByRole("combobox");
  await expect(sizeSelect).toBeVisible();
  const sizes = await sizeSelect.locator("option").evaluateAll((options) =>
    options.map((option) => (option as HTMLOptionElement).value)
  );
  expect(sizes).toEqual(["13", "13.5", "14", "14.5", "15", "15.5", "16", "16.5", "17", "17.5", "18", "18.5", "19"]);

  await sizeSelect.selectOption("19");
  await page.getByRole("button", { name: /彈力繩/ }).click();
  await page.getByRole("button", { name: /加入購物袋/ }).click();

  const drawer = page.locator("div.fixed").filter({ hasText: "SHOPPING BAG" });
  await expect(drawer).toContainText("手圍 19 cm");
  await drawer.getByRole("button", { name: "前往結帳" }).click();
  await proceedThroughCheckoutGate(page);
  await expect(page.getByRole("heading", { name: "訂單摘要" })).toBeVisible();
  await expect(page.locator("body")).toContainText("手圍 19 cm");
});

test("domestic shipping switches from home fee to convenience-store fee", async ({ page }) => {
  await page.goto("/products/e2e-bracelet-in-stock");
  await page.getByRole("button", { name: /彈力繩/ }).click();
  await page.getByRole("button", { name: /加入購物袋/ }).click();
  await page.getByRole("button", { name: "前往結帳" }).click();
  await proceedThroughCheckoutGate(page);

  await expect(page.getByRole("heading", { name: "訂單摘要" })).toBeVisible();
  await expect(page.locator("body")).toContainText("NT$ 100");
  await expect(page.locator("body")).toContainText("NT$ 1,364");

  await page.locator("button").filter({ hasText: "先付款再取貨" }).click();
  await expect(page.locator("body")).toContainText("NT$ 60");
  await expect(page.locator("body")).toContainText("NT$ 1,324");
});

test("two bracelets receive domestic free shipping in checkout summary", async ({ page }) => {
  await page.goto("/products/e2e-bracelet-in-stock");
  await page.getByRole("button", { name: /彈力繩/ }).click();
  await page.getByRole("button", { name: "增加" }).click();
  await page.getByRole("button", { name: /加入購物袋/ }).click();

  const drawer = page.locator("div.fixed").filter({ hasText: "SHOPPING BAG" });
  await expect(drawer).toContainText("購物袋 (2)");
  await page.getByRole("button", { name: "前往結帳" }).click();
  await proceedThroughCheckoutGate(page);

  await expect(page.locator("body")).toContainText("× 2");
  await expect(page.locator("body")).toContainText("免收");
  await expect(page.locator("body")).toContainText("NT$ 2,528");
});

test("excluded products do not count toward two-item free shipping in cart or checkout", async ({ page }, testInfo) => {
  testInfo.setTimeout(60_000);
  const productId = `e2e-no-free-shipping-${testInfo.project.name}-${Date.now()}`.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  const productName = "E2E 不計免運商品";
  await insertTwoItemFreeShippingExcludedProduct({ id: productId, name: productName });

  try {
    await page.addInitScript(({ excludedId, excludedName }) => {
      sessionStorage.setItem("cart_items", JSON.stringify([
        {
          id: "e2e-bracelet-in-stock-default-elastic-default-1264",
          product: {
            id: "e2e-bracelet-in-stock",
            name: "E2E 現貨手鍊",
            categoryLabel: "療癒系列、愛情桃花",
            image: "/images/d-design/d001.jpg",
            price: 1200,
            twoItemFreeShippingEligible: true,
          },
          quantity: 1,
          unitPrice: 1264,
          claspType: "elastic",
        },
        {
          id: `${excludedId}-default-elastic-default-680`,
          product: {
            id: excludedId,
            name: excludedName,
            categoryLabel: "療癒系列",
            image: "/images/d-design/d005.jpg",
            price: 680,
            twoItemFreeShippingEligible: true,
          },
          quantity: 1,
          unitPrice: 680,
          claspType: "elastic",
        },
      ]));
    }, { excludedId: productId, excludedName: productName });

    await page.goto("/");
    await page.getByRole("button", { name: "購物車", exact: true }).click();

    const drawer = page.locator("div.fixed").filter({ hasText: "SHOPPING BAG" });
    await expect(drawer).toContainText("購物袋 (2)");
    await expect(drawer).toContainText(productName);
    await expect(drawer).toContainText("購買 2 件商品享國內免運，目前還差 1 件");

    await drawer.getByRole("button", { name: "前往結帳" }).click();
    await proceedThroughCheckoutGate(page);

    await expect(page.getByRole("heading", { name: "訂單摘要" })).toBeVisible();
    await expect(page.locator("body")).toContainText("NT$ 100");
    await expect(page.locator("body")).not.toContainText("免收");
  } finally {
    await deleteTestProduct(productId);
  }
});
