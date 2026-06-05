import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("admin can create a product and edit its inline stock", async ({ page }) => {
  const productName = `E2E 後台新增商品 ${Date.now()}`;

  await login(page, "e2e-admin@example.com");
  await expect(page).toHaveURL(/\/admin\/orders/);

  await page.goto("/admin/products");
  await expect(page.locator("body")).toContainText("商品管理");
  await page.getByRole("button", { name: "新增商品" }).click();

  await page.locator('input[placeholder="或貼上圖片網址"]').fill("/images/d-design/d001.jpg");
  await page.getByRole("button", { name: "加入" }).click();
  await expect(page.locator('img[src="/images/d-design/d001.jpg"]')).toBeVisible();
  await page.locator('input[placeholder="例：紫水晶手鍊"]').fill(productName);
  await page.locator('input[placeholder="1200"]').fill("777");
  await page.locator('input[placeholder="紫水晶, 愛情"]').fill("E2E, 後台");
  await page.locator('input[type="number"]').last().fill("3");
  await page.locator("textarea").first().fill("E2E 後台新增商品測試功效");
  await page.locator("textarea").last().fill("白水晶");
  await page.getByRole("button", { name: "新增商品" }).last().click();

  await expect(page.locator("body")).toContainText(productName);

  await page.locator('input[placeholder="搜尋商品名稱或分類"]').fill(productName);
  await expect(page.locator("body")).toContainText(productName);
  await expect(page.locator("body")).toContainText("NT$ 777");

  await page.getByRole("button", { name: `編輯 ${productName} 庫存` }).click();
  await page.locator('input[type="number"]').fill("4");
  await page.getByRole("button", { name: "儲存庫存" }).click();

  await expect(page.getByRole("button", { name: `編輯 ${productName} 庫存` })).toHaveText("4");
});

test("admin can choose which clasp options a product shows", async ({ page }) => {
  const productName = `E2E 扣具選項商品 ${Date.now()}`;

  await login(page, "e2e-admin@example.com");
  await expect(page).toHaveURL(/\/admin\/orders/);

  await page.goto("/admin/products");
  await expect(page.locator("body")).toContainText("商品管理");
  await page.getByRole("button", { name: "新增商品" }).click();

  await page.locator('input[placeholder="或貼上圖片網址"]').fill("/images/d-design/d003.jpg");
  await page.getByRole("button", { name: "加入" }).click();
  await expect(page.locator('img[src="/images/d-design/d003.jpg"]')).toBeVisible();
  await page.locator('input[placeholder="例：紫水晶手鍊"]').fill(productName);
  await page.locator('input[placeholder="1200"]').fill("888");
  await page.locator('input[placeholder="紫水晶, 愛情"]').fill("E2E, 扣具");
  await page.locator('input[type="number"]').last().fill("2");
  await page.locator("textarea").first().fill("後台扣具選項測試");
  await page.locator("textarea").last().fill("白水晶");
  await page.getByLabel(/彈力繩/).uncheck();
  await page.getByLabel(/龍蝦扣/).uncheck();
  await page.getByRole("button", { name: "新增商品" }).last().click();
  await expect(page.locator("body")).toContainText(productName);

  await page.goto("/products");
  const productLink = page.locator('a[href^="/products/"]').filter({ hasText: productName }).first();
  await expect(productLink).toBeVisible();
  await productLink.click();

  await expect(page.getByRole("heading", { name: productName })).toBeVisible();
  await expect(page.getByRole("button", { name: /磁扣/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /龍蝦扣/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /彈力繩/ })).toHaveCount(0);

  await page.getByRole("button", { name: /加入購物袋/ }).click();
  const drawer = page.locator("div.fixed").filter({ hasText: "SHOPPING BAG" });
  await expect(drawer).toContainText("磁扣");
  await expect(drawer).toContainText("NT$ 1,088");
});
