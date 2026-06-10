import { expect, test } from "@playwright/test";
import { proceedThroughCheckoutGate } from "./helpers";

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
