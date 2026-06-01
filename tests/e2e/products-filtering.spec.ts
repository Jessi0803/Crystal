import { expect, test } from "@playwright/test";

test("category tabs filter seeded products", async ({ page }) => {
  await page.goto("/products");
  await expect(page.getByText("月下密語手鍊").first()).toBeVisible();

  await page.getByRole("button", { name: "財運事業" }).click();
  await expect(page.locator("body")).toContainText("蜜光之境手鍊");
  await expect(page.locator("body")).not.toContainText("月下密語手鍊");

  await page.getByRole("button", { name: "愛情桃花" }).click();
  await expect(page.locator("body")).toContainText("月映淨心手鍊");

  await page.getByRole("button", { name: "全部商品" }).click();
  await expect(page.locator("body")).toContainText("月下密語手鍊");
  await expect(page.locator("body")).toContainText("蜜光之境手鍊");
});

test("empty category shows fallback and can return to all products", async ({ page }) => {
  await page.goto("/products?category=energy-perfume");
  await expect(page.locator("body")).toContainText("商品即將推出");

  await page.getByRole("button", { name: "查看全部商品" }).click();
  await expect(page.locator("body")).toContainText("月下密語手鍊");
});

test("sort selector changes the visible product order", async ({ page }) => {
  await page.goto("/products");

  await expect(page.locator("body")).toContainText("維納斯 Venus");
  await expect(page.locator("body")).toContainText("晨光輕語手鍊");

  await page.locator("select").selectOption("price-asc");
  const lowToHigh = (await page.locator(".product-card-name").allInnerTexts()).map((text) => text.trim());
  const venusIndexAsc = lowToHigh.findIndex((text) => text.includes("維納斯 Venus"));
  const morningIndexAsc = lowToHigh.findIndex((text) => text.includes("晨光輕語手鍊"));
  expect(venusIndexAsc).toBeGreaterThanOrEqual(0);
  expect(morningIndexAsc).toBeGreaterThanOrEqual(0);
  expect(venusIndexAsc).toBeLessThan(morningIndexAsc);

  await page.locator("select").selectOption("price-desc");
  const highToLow = (await page.locator(".product-card-name").allInnerTexts()).map((text) => text.trim());
  const venusIndexDesc = highToLow.findIndex((text) => text.includes("維納斯 Venus"));
  const morningIndexDesc = highToLow.findIndex((text) => text.includes("晨光輕語手鍊"));
  expect(venusIndexDesc).toBeGreaterThanOrEqual(0);
  expect(morningIndexDesc).toBeGreaterThanOrEqual(0);
  expect(morningIndexDesc).toBeLessThan(venusIndexDesc);
});
