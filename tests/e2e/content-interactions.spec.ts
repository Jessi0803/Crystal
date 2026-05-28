import { expect, test } from "@playwright/test";

test("knowledge page filters articles, expands guidance and links to the quiz", async ({ page }) => {
  await page.goto("/knowledge");
  await page.getByRole("button", { name: "選購指南", exact: true }).click();

  await expect(page.locator("body")).toContainText("如何辨別天然水晶與人工玻璃？");
  await expect(page.locator("body")).toContainText("第一次買水晶，從哪裡開始？");
  await expect(page.locator("body")).not.toContainText("水晶需要多久淨化一次？");

  await page.getByRole("button", { name: /第一次買水晶，從哪裡開始/ }).click();
  await expect(page.locator("body")).toContainText("建議初學者從白水晶或粉水晶開始");

  await page.getByRole("button", { name: /立即測驗/ }).click();
  await expect(page).toHaveURL(/\/quiz$/);
});

test("shopping guide anchors render payment content and its chatbot command opens the advisor", async ({ page }) => {
  await page.goto("/shopping-guide#payment");

  await expect(page.locator("#payment")).toContainText("付款方式");
  await expect(page.locator("#payment")).toContainText("Paypal");
  await page.getByRole("button", { name: /問問24小時椛小助人工智能服務/ }).click();
  await expect(page.locator('input[placeholder="問問椛小助…"]')).toBeVisible();

  await page.getByRole("button", { name: /聯絡我們/ }).click();
  await expect(page).toHaveURL(/\/contact$/);
});
