import { expect, test } from "@playwright/test";

function trpcSuccess(data: unknown) {
  return [{ result: { data: { json: data } } }];
}

test("storefront chatbot shows an answer and links recommended products", async ({ page }) => {
  await page.route("**/api/trpc/chatbot.chat**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(trpcSuccess({
        reply: "若想提升自信，可以從太陽石與黃水晶的明亮能量開始。",
        relatedProducts: [{
          id: "e2e-bracelet-in-stock",
          name: "E2E 現貨手鍊",
          price: 1580,
          image: "/images/d-design/d001.jpg",
          href: "/products/e2e-bracelet-in-stock",
        }],
      })),
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "開啟水晶顧問" }).click();
  await page.getByRole("button", { name: "我想提升自信，推薦哪款？" }).click();

  await expect(page.locator("body")).toContainText("若想提升自信，可以從太陽石與黃水晶的明亮能量開始。");
  const recommendedProduct = page.locator('a[href="/products/e2e-bracelet-in-stock"]').last();
  await expect(recommendedProduct).toContainText("E2E 現貨手鍊");
  await recommendedProduct.click();
  await expect(page).toHaveURL(/\/products\/e2e-bracelet-in-stock/);
  await expect(page.getByRole("heading", { name: "E2E 現貨手鍊" })).toBeVisible();
});

test("storefront chatbot shows a support fallback when its request fails", async ({ page }) => {
  await page.route("**/api/trpc/chatbot.chat**", async (route) => {
    await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "開啟水晶顧問" }).click();
  await page.locator('input[placeholder="問問椛小助…"]').fill("請推薦適合工作的手鍊");
  await page.keyboard.press("Enter");

  await expect(page.locator("body")).toContainText("椛小助正在淨化充電中，暫時無法回覆");
  await expect(page.locator("body")).toContainText("官方 LINE");
});
