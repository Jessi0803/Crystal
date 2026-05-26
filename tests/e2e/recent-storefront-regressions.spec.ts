import { expect, test } from "@playwright/test";

const customProductPaths = [
  "/products/custom-deposit-product",
  "/products/tarot-crystal-deposit-product",
  "/products/chakra-crystal-deposit-product",
  "/products/numerology-crystal-deposit-product",
] as const;

test("custom service plans and product details use the updated bracelet price notation", async ({ page }) => {
  await page.goto("/custom");
  await expect(page.getByText("手鍊價格：NT$1,500 ± NT$300")).toHaveCount(4);

  for (const path of customProductPaths) {
    await page.goto(path);
    await expect(page.locator("body")).toContainText("NT$1,500 ± NT$300");
    await expect(page.locator("body")).not.toContainText("NT$1,200 ~ 1,800");
  }
});

test("home hero exposes all three product slides, advances automatically and links to products", async ({ page }) => {
  await page.goto("/");

  const hero = page.getByRole("region", { name: "封面精選設計" });
  const slideButtons = hero.getByRole("button", { name: /顯示第 .* 張封面照片/ });
  await expect(slideButtons).toHaveCount(3);
  await expect(slideButtons.nth(0)).toHaveAttribute("aria-current", "true");
  await expect
    .poll(() => slideButtons.nth(1).getAttribute("aria-current"), { timeout: 4_500 })
    .toBe("true");

  await slideButtons.nth(2).click();
  await expect(slideButtons.nth(2)).toHaveAttribute("aria-current", "true");
  await expect(hero.locator('img[alt="D004 淡粉色水晶設計手鍊"]')).toHaveAttribute("aria-hidden", "false");

  await hero.getByRole("link", { name: "查看全部商品" }).click({ position: { x: 20, y: 20 } });
  await expect(page).toHaveURL(/\/products$/);
});
