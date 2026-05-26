import { expect, test, type Page } from "@playwright/test";
import { resolve } from "node:path";
import { login } from "./helpers";

const productSearch = 'input[placeholder="搜尋商品名稱或分類"]';

async function openProductsAdmin(page: Page) {
  await login(page, "e2e-admin@example.com");
  await expect(page).toHaveURL(/\/admin\/orders/);
  await page.goto("/admin/products");
  await expect(page.getByRole("heading", { name: "商品管理" })).toBeVisible();
}

async function createProduct(page: Page, name: string) {
  await page.getByRole("button", { name: "新增商品" }).click();
  await page.locator('input[placeholder="或貼上圖片網址"]').fill("/images/d-design/d001.jpg");
  await page.locator('input[placeholder="例：紫水晶手鍊"]').fill(name);
  await page.locator('input[placeholder="1200"]').fill("888");
  await page.locator('input[placeholder="紫水晶, 愛情"]').fill("E2E, 後台流程");
  await page.locator('input[type="number"]').last().fill("2");
  await page.locator("textarea").first().fill("後台商品流程測試使用");
  await page.locator("textarea").last().fill("白水晶");
  await page.getByRole("button", { name: "新增商品" }).last().click();

  await page.locator(productSearch).fill(name);
  await expect(page.locator("body")).toContainText(name);
}

async function findProduct(page: Page, name: string) {
  await page.goto("/admin/products");
  await page.locator(productSearch).fill(name);
  await expect(page.locator("body")).toContainText(name);
}

async function removeProduct(page: Page, name: string) {
  await findProduct(page, name);
  page.once("dialog", async dialog => {
    expect(dialog.message()).toContain(name);
    await dialog.accept();
  });
  await page.getByRole("button", { name: "刪除" }).last().click();
  await expect(page.locator("body")).toContainText("商品已刪除");
}

test("admin can edit, unpublish, republish and remove a test product", async ({ page }) => {
  test.setTimeout(60_000);
  const name = `E2E 商品流程 ${Date.now()}`;
  const editedName = `${name} 已編輯`;

  await openProductsAdmin(page);
  await createProduct(page, name);

  await page.getByRole("button", { name: "編輯" }).last().click();
  await page.locator('input[placeholder="例：紫水晶手鍊"]').fill(editedName);
  await page.locator('input[placeholder="1200"]').fill("999");
  await page.getByText("每月限量", { exact: true }).click();
  await page.getByRole("button", { name: "儲存變更" }).click();

  await page.locator(productSearch).fill(editedName);
  await expect(page.locator("body")).toContainText(editedName);
  await expect(page.locator("body")).toContainText("NT$ 999");
  await expect(page.locator("body")).toContainText("月限");

  await page.goto("/products");
  await expect(page.locator("body")).toContainText(editedName);

  await findProduct(page, editedName);
  await page.getByRole("button", { name: "下架" }).last().click();
  await expect(page.locator("body")).toContainText("商品已下架");
  await page.goto("/products");
  await expect(page.locator("body")).not.toContainText(editedName);

  await findProduct(page, editedName);
  await page.getByRole("button", { name: "上架" }).last().click();
  await expect(page.locator("body")).toContainText("商品已上架");
  await page.goto("/products");
  await expect(page.locator("body")).toContainText(editedName);

  await removeProduct(page, editedName);
  await page.goto("/products");
  await expect(page.locator("body")).not.toContainText(editedName);
});

test("admin can schedule a test product and keep it hidden before release", async ({ page }) => {
  test.setTimeout(60_000);
  const name = `E2E 預約商品 ${Date.now()}`;

  await openProductsAdmin(page);
  await createProduct(page, name);
  await page.getByRole("button", { name: "編輯" }).last().click();

  const futureDateTime = await page.evaluate(() => {
    const releaseAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const pad = (value: number) => String(value).padStart(2, "0");
    return [
      releaseAt.getFullYear(),
      "-",
      pad(releaseAt.getMonth() + 1),
      "-",
      pad(releaseAt.getDate()),
      "T",
      pad(releaseAt.getHours()),
      ":",
      pad(releaseAt.getMinutes()),
    ].join("");
  });
  await page.locator('input[type="datetime-local"]').fill(futureDateTime);
  await page.getByRole("button", { name: "儲存變更" }).click();

  await page.locator(productSearch).fill(name);
  await expect(page.locator("body")).toContainText("預約");
  await page.goto("/products");
  await expect(page.locator("body")).not.toContainText(name);

  await removeProduct(page, name);
});

test("mobile admin can tap edit and schedule a test product", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chrome", "This regression targets the mobile product-row layout.");
  test.setTimeout(60_000);
  const name = `E2E 手機編輯商品 ${Date.now()}`;
  const editedName = `${name} 已排程`;

  await openProductsAdmin(page);
  await createProduct(page, name);
  await page.getByRole("button", { name: "編輯" }).last().click();
  await expect(page.getByRole("heading", { name: "編輯商品" })).toBeVisible();

  await page.locator('input[placeholder="例：紫水晶手鍊"]').fill(editedName);
  const futureDateTime = await page.evaluate(() => {
    const releaseAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${releaseAt.getFullYear()}-${pad(releaseAt.getMonth() + 1)}-${pad(releaseAt.getDate())}T${pad(releaseAt.getHours())}:${pad(releaseAt.getMinutes())}`;
  });
  await page.locator('input[type="datetime-local"]').fill(futureDateTime);
  await page.getByRole("button", { name: "儲存變更" }).click();

  await page.locator(productSearch).fill(editedName);
  await expect(page.locator("body")).toContainText(editedName);
  await expect(page.locator("body")).toContainText("預約");

  await removeProduct(page, editedName);
});

test("admin can upload a product image and blocks files larger than 10 MB", async ({ page }) => {
  test.setTimeout(60_000);
  const name = `E2E 圖片商品 ${Date.now()}`;

  await openProductsAdmin(page);
  await page.getByRole("button", { name: "新增商品" }).click();
  const imageInput = page.locator('input[type="file"]');
  await imageInput.setInputFiles({
    name: "too-large.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
  });
  await expect(page.locator("body")).toContainText("圖片請小於 10MB");

  await imageInput.setInputFiles(resolve("client/public/logo.png"));
  await expect(page.locator('img[src^="data:image/"]')).toBeVisible();
  await page.locator('input[placeholder="例：紫水晶手鍊"]').fill(name);
  await page.locator('input[placeholder="1200"]').fill("888");
  await page.locator('input[placeholder="紫水晶, 愛情"]').fill("E2E, 圖片");
  await page.locator('input[type="number"]').last().fill("1");
  await page.locator("textarea").first().fill("後台圖片上傳測試使用");
  await page.locator("textarea").last().fill("白水晶");
  await page.getByRole("button", { name: "新增商品" }).last().click();

  await page.locator(productSearch).fill(name);
  await expect(page.locator("body")).toContainText(name);
  await removeProduct(page, name);
});

test("scheduled product is automatically published after its release time", async ({ page }) => {
  test.setTimeout(90_000);
  const name = `E2E 到期上架 ${Date.now()}`;

  await openProductsAdmin(page);
  await createProduct(page, name);
  await page.getByRole("button", { name: "編輯" }).last().click();

  const schedule = await page.evaluate(() => {
    const releaseAt = new Date(Date.now() + 12_000);
    const pad = (value: number) => String(value).padStart(2, "0");
    return {
      value: `${releaseAt.getFullYear()}-${pad(releaseAt.getMonth() + 1)}-${pad(releaseAt.getDate())}T${pad(releaseAt.getHours())}:${pad(releaseAt.getMinutes())}:${pad(releaseAt.getSeconds())}`,
      timestamp: releaseAt.getTime(),
    };
  });
  await page.locator('input[type="datetime-local"]').fill(schedule.value);
  await page.getByRole("button", { name: "儲存變更" }).click();
  await page.goto("/products");
  await expect(page.locator("body")).not.toContainText(name);

  const waitMs = Math.max(schedule.timestamp - Date.now() + 1500, 0);
  await page.waitForTimeout(waitMs);
  await page.reload();
  await expect(page.locator("body")).toContainText(name);

  await removeProduct(page, name);
});
