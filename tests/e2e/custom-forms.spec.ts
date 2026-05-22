import { expect, test } from "@playwright/test";

test("custom service page links to every consultation form", async ({ page }) => {
  await page.goto("/custom");

  for (const path of ["/custom/form", "/custom/form-b", "/custom/form-c", "/custom/form-d"]) {
    await page.goto(path);
    await expect(page.locator("body")).toContainText(/報名表單|付完訂金/);
    await expect(page.locator("body")).toContainText("確認");
  }
});

test("pure custom form stores consultation note and continues to deposit checkout", async ({ page }) => {
  await page.goto("/custom/form");

  await page.locator("textarea").first().fill("E2E 測試：希望提升專注力與穩定情緒");
  await page.locator('input[type="number"]').fill("15.5");
  await page.getByRole("button", { name: /剛好/ }).click();
  await page.getByRole("button", { name: "都可以" }).click();
  await page.locator("section").filter({ hasText: "銀管" }).getByRole("button", { name: "不要" }).first().click();
  await page.locator("section").filter({ hasText: "珠框" }).getByRole("button", { name: "不要" }).last().click();
  await page.getByRole("button", { name: /彈力繩/ }).click();
  await page.locator("section").filter({ hasText: "要加吊飾嗎" }).getByRole("button", { name: "不要" }).click();
  await page.locator('input[placeholder="例如：@your_ig_handle"]').fill("@e2e_test");

  await page.getByRole("button", { name: /確認，前往下訂金/ }).click();

  await expect(page).toHaveURL(/\/checkout/);
  await expect(page.locator("body")).toContainText("客製化商品");
  await expect(page.locator("body")).toContainText("購買人資訊");
  await expect(page.locator("body")).toContainText("訂單摘要");
});
