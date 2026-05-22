import { expect, test } from "@playwright/test";

test("category tabs filter seeded products", async ({ page }) => {
  await page.goto("/products");
  await expect(page.getByText("E2E 現貨手鍊").first()).toBeVisible();

  await page.getByRole("button", { name: "財運事業" }).click();
  await expect(page.locator("body")).toContainText("E2E 預購手鍊");
  await expect(page.locator("body")).not.toContainText("E2E 現貨手鍊");

  await page.getByRole("button", { name: "能量防護" }).click();
  await expect(page.locator("body")).toContainText("E2E 月限售完商品");

  await page.getByRole("button", { name: "全部商品" }).click();
  await expect(page.locator("body")).toContainText("E2E 現貨手鍊");
  await expect(page.locator("body")).toContainText("E2E 預購手鍊");
});

test("empty category shows fallback and can return to all products", async ({ page }) => {
  await page.goto("/products?category=energy-perfume");
  await expect(page.locator("body")).toContainText("商品即將推出");

  await page.getByRole("button", { name: "查看全部商品" }).click();
  await expect(page.locator("body")).toContainText("E2E 現貨手鍊");
});

test("sort selector changes the visible product order", async ({ page }) => {
  await page.goto("/products");

  await expect(page.locator("body")).toContainText("E2E 現貨手鍊");
  await expect(page.locator("body")).toContainText("E2E 預購手鍊");

  await page.locator("select").selectOption("price-asc");
  const lowToHigh = (await page.locator(".product-card-name").allInnerTexts()).map((text) => text.trim());
  const inStockIndexAsc = lowToHigh.findIndex((text) => text.includes("E2E 現貨手鍊"));
  const preorderIndexAsc = lowToHigh.findIndex((text) => text.includes("E2E 預購手鍊"));
  expect(inStockIndexAsc).toBeGreaterThanOrEqual(0);
  expect(preorderIndexAsc).toBeGreaterThanOrEqual(0);
  expect(inStockIndexAsc).toBeLessThan(preorderIndexAsc);

  await page.locator("select").selectOption("price-desc");
  const highToLow = (await page.locator(".product-card-name").allInnerTexts()).map((text) => text.trim());
  const inStockIndexDesc = highToLow.findIndex((text) => text.includes("E2E 現貨手鍊"));
  const preorderIndexDesc = highToLow.findIndex((text) => text.includes("E2E 預購手鍊"));
  expect(inStockIndexDesc).toBeGreaterThanOrEqual(0);
  expect(preorderIndexDesc).toBeGreaterThanOrEqual(0);
  expect(preorderIndexDesc).toBeLessThan(inStockIndexDesc);
});
