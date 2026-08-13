import { expect, test, type Page } from "@playwright/test";
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

async function expectStoredCartToBeEmpty(page: Page) {
  const storedCart = await page.evaluate(() => sessionStorage.getItem("cart_items"));
  expect(storedCart ? JSON.parse(storedCart) : []).toEqual([]);
}

async function ensureTwoItemFreeShippingColumn(connection: mysql.Connection) {
  try {
    await connection.execute("ALTER TABLE products ADD COLUMN twoItemFreeShippingEligible boolean NOT NULL DEFAULT true");
  } catch {
    /* Column already exists. */
  }
}

async function ensureCustomDepositProducts() {
  const products = [
    {
      id: "custom-deposit-product",
      name: "客製化商品",
      subtitle: "客製化服務訂金下單專用",
      price: 500,
      priceRange: "NT$1,500 ± NT$300",
      image: "/images/custom3.jpg",
      tags: [],
      crystalType: "可提供想要的功效、色系、款式，或是也可以跟我討論",
      color: "訂金",
      sortOrder: 11,
    },
    {
      id: "tarot-crystal-deposit-product",
      name: "塔羅 × 水晶手鍊客製化商品",
      subtitle: "塔羅 × 水晶手鍊客製化服務訂金下單專用",
      price: 1399,
      priceRange: "手鍊 NT$1,500 ± NT$300｜塔羅依價目表 9 折",
      image: "/images/custom-tarot2.jpg",
      tags: ["塔羅"],
      crystalType: "提供塔羅解析，透過解析分析出缺失的能量",
      color: "訂金",
      sortOrder: 12,
    },
    {
      id: "chakra-crystal-deposit-product",
      name: "脈輪檢測 × 水晶手鍊客製化商品",
      subtitle: "脈輪檢測 × 水晶手鍊客製化服務訂金下單專用",
      price: 1000,
      priceRange: "手鍊 NT$1,500 ± NT$300｜脈輪檢測 NT$500",
      image: "/images/custom-chakra2.jpg",
      tags: ["脈輪"],
      crystalType: "以靈擺與塔羅測出您的七脈輪能量狀況",
      color: "訂金",
      sortOrder: 13,
    },
    {
      id: "numerology-crystal-deposit-product",
      name: "生命靈數 × 水晶手鍊客製化商品",
      subtitle: "生命靈數 × 水晶手鍊客製化服務訂金下單專用",
      price: 1000,
      priceRange: "手鍊 NT$1,500 ± NT$300｜生命靈數解析 NT$500",
      image: "/images/custom-numerology3.jpg",
      tags: ["生命靈數"],
      crystalType: "透過西元出生年月日找出天賦數、生命數、先天數、星座數",
      color: "訂金",
      sortOrder: 14,
    },
  ];

  const connection = await connectTestDb();
  try {
    for (const product of products) {
      await connection.execute(
        `INSERT INTO products
          (id, name, subtitle, category, categoryLabel, categories, categoryLabels, price, originalPrice,
           priceRange, depositRange, image, tags, description, story, benefits, suitableFor, howToUse,
           disclaimer, crystalType, color, featured, active, isMonthlyLimited, scheduledPublishAt, sortOrder)
         VALUES (?, ?, ?, 'custom', '客製化', ?, ?, ?, NULL,
           ?, NULL, ?, ?, '客製化服務訂金。', '', ?, ?, ?,
           '此商品為客製化服務訂金，實際尾款金額由老闆確認後另行通知。', ?, ?, false, true, false, NULL, ?)
         ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          subtitle = VALUES(subtitle),
          category = 'custom',
          categoryLabel = '客製化',
          categories = VALUES(categories),
          categoryLabels = VALUES(categoryLabels),
          price = VALUES(price),
          priceRange = VALUES(priceRange),
          image = VALUES(image),
          tags = VALUES(tags),
          description = VALUES(description),
          benefits = VALUES(benefits),
          suitableFor = VALUES(suitableFor),
          howToUse = VALUES(howToUse),
          disclaimer = VALUES(disclaimer),
          crystalType = VALUES(crystalType),
          color = VALUES(color),
          active = true,
          isMonthlyLimited = false,
          sortOrder = VALUES(sortOrder)`,
        [
          product.id,
          product.name,
          product.subtitle,
          json(["custom"]),
          json(["客製化"]),
          product.price,
          product.priceRange,
          product.image,
          json(product.tags),
          json(["填寫表單"]),
          json(["已決定預約客製化服務的顧客"]),
          json(["此商品為訂金專用", "填寫客製表單", "支付訂金"]),
          product.crystalType,
          product.color,
          product.sortOrder,
        ]
      );
    }
  } finally {
    await connection.end();
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

test("product grid quick action sends adjustable bracelets to detail before cart", async ({ page }) => {
  await page.goto("/products");
  const card = page.locator('a[href="/products/d001-moon-secret"]').first();
  await expect(card).toContainText("月下密語手鍊");

  await card.scrollIntoViewIfNeeded();
  await card.getByRole("button", { name: "選擇規格" }).click({ force: true });

  await expect(page).toHaveURL(/\/products\/d001-moon-secret/);
  await expect(page.getByRole("heading", { name: "月下密語手鍊" })).toBeVisible();
  await expectStoredCartToBeEmpty(page);
});

test("home featured quick action sends adjustable bracelets to detail before cart", async ({ page }) => {
  await page.goto("/");
  const featuredCard = page.locator('a[href="/products/d001-moon-secret"]').first();
  await expect(featuredCard).toContainText("月下密語手鍊");

  await featuredCard.scrollIntoViewIfNeeded();
  await featuredCard.getByRole("button", { name: "選擇規格" }).click({ force: true });

  await expect(page).toHaveURL(/\/products\/d001-moon-secret/);
  await expect(page.getByRole("heading", { name: "月下密語手鍊" })).toBeVisible();
  await expectStoredCartToBeEmpty(page);
});

test("quiz result quick action sends adjustable bracelets to detail before cart", async ({ page }) => {
  await page.goto("/quiz");
  await page.getByRole("button", { name: /開始測驗/ }).click();
  await page.getByRole("button", { name: /情緒不穩定/ }).click();
  await page.getByRole("button", { name: /下一題/ }).click();
  await page.getByRole("button", { name: /更深的平靜/ }).click();
  await page.getByRole("button", { name: /下一題/ }).click();
  await page.getByRole("button", { name: /紫色/ }).click();
  await page.getByRole("button", { name: /查看結果/ }).click();

  await expect(page.getByRole("button", { name: /選擇規格/ })).toBeVisible();
  await page.getByRole("button", { name: /選擇規格/ }).click();

  await expect(page).toHaveURL(/\/products\/d005-moon-clear-heart/);
  await expect(page.getByRole("heading", { name: "月映淨心手鍊" })).toBeVisible();
  await expectStoredCartToBeEmpty(page);
});

test("product grid quick action sends custom deposits to detail before cart", async ({ page }) => {
  await ensureCustomDepositProducts();
  const customProducts = [
    { id: "custom-deposit-product", name: "客製化商品" },
    { id: "tarot-crystal-deposit-product", name: "塔羅 × 水晶手鍊客製化商品" },
    { id: "chakra-crystal-deposit-product", name: "脈輪檢測 × 水晶手鍊客製化商品" },
    { id: "numerology-crystal-deposit-product", name: "生命靈數 × 水晶手鍊客製化商品" },
  ];

  for (const product of customProducts) {
    await page.goto("/products");
    const card = page.locator(`a[href="/products/${product.id}"]`).first();
    await expect(card).toContainText(product.name);

    await card.scrollIntoViewIfNeeded();
    await card.getByRole("button", { name: "填寫表單" }).click({ force: true });

    await expect(page).toHaveURL(new RegExp(`/products/${product.id}$`));
    await expect(page.getByRole("heading", { name: product.name })).toBeVisible();
    await expect(page.getByRole("button", { name: "填寫諮詢表單並下訂" })).toBeVisible();
    await expectStoredCartToBeEmpty(page);
  }
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

test("moon clear heart wrist size rules update price and cart line", async ({ page }) => {
  await page.goto("/products/d005-moon-clear-heart");
  await expect(page.getByRole("heading", { name: "月映淨心手鍊" })).toBeVisible();

  const wristSelect = page.getByRole("combobox").first();
  await expect(page.locator("body")).toContainText("NT$ 1,580");

  await wristSelect.selectOption("13.5");
  await expect(page.locator("body")).toContainText("NT$ 1,480");

  await wristSelect.selectOption("18");
  await expect(page.locator("body")).toContainText("NT$ 1,680");
  await page.getByRole("button", { name: /彈力繩/ }).click();
  await page.getByRole("button", { name: /加入購物袋/ }).click();

  const drawer = page.locator("div.fixed").filter({ hasText: "SHOPPING BAG" });
  await expect(drawer).toContainText("手圍 18 cm");
  await expect(drawer).toContainText("NT$ 1,680");
});

test("morning whisper uses wrist size price rules without discounting them", async ({ page }) => {
  await page.goto("/products/d004-morning-whisper");
  await expect(page.getByRole("heading", { name: "晨光輕語手鍊" })).toBeVisible();

  const wristSelect = page.getByRole("combobox").first();
  await expect(page.locator("body")).toContainText("NT$ 1,800");

  await wristSelect.selectOption("13.5");
  await expect(page.locator("body")).toContainText("NT$ 1,700");

  await wristSelect.selectOption("18");
  await expect(page.locator("body")).toContainText("NT$ 1,900");
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
  await expect(page.locator("body")).toContainText("NT$ 130");
  await expect(page.locator("body")).toContainText("NT$ 1,394");

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
    await expect(page.locator("body")).toContainText("NT$ 130");
    await expect(page.locator("body")).not.toContainText("免收");
  } finally {
    await deleteTestProduct(productId);
  }
});
