import { expect, test } from "@playwright/test";
import { fillPureCustomDepositForm } from "./helpers";

test("custom service page links to every consultation form", async ({ page }) => {
  await page.goto("/custom");

  for (const path of ["/custom/form", "/custom/form-b", "/custom/form-c", "/custom/form-d"]) {
    await page.goto(path);
    await expect(page.locator("body")).toContainText(/報名表單|付完訂金/);
    await expect(page.locator("body")).toContainText("確認");
  }
});

test("pure custom form stores consultation note and continues to deposit checkout", async ({ page }) => {
  await fillPureCustomDepositForm(page);
  await expect(page.locator("body")).toContainText("客製化商品");
  await expect(page.locator("body")).toContainText("購買人資訊");
  await expect(page.locator("body")).toContainText("訂單摘要");
});
