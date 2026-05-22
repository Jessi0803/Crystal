import { expect, test } from "@playwright/test";

test("registration validates fields and creates a member session", async ({ page }) => {
  await page.goto("/register");

  await page.locator('button[type="submit"]').click();
  await expect(page.locator("body")).toContainText("請輸入姓名");
  await expect(page.locator("body")).toContainText("請輸入 Email");
  await expect(page.locator("body")).toContainText("請輸入密碼");

  const email = `e2e-register-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  await page.locator('input[placeholder="請輸入您的姓名"]').fill("E2E New Member");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[placeholder="至少 8 個字元"]').fill("Test123456");
  await page.locator('input[placeholder="再次輸入密碼"]').fill("Test123456");
  await page.locator('button[type="submit"]').click();

  await expect(page).toHaveURL(/\/member/);
  await expect(page.locator("body")).toContainText("歡迎回來，E2E New Member");
  await expect(page.locator("body")).toContainText(email);
});

test("member can update profile name", async ({ page }) => {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill("e2e-user@example.com");
  await page.locator('input[type="password"]').fill("Test123456");
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/products/);

  const updatedName = `E2E User ${Date.now()}`;
  await page.goto("/member");
  await page.getByRole("button", { name: "帳號設定" }).click();
  await page.locator('input[placeholder="請輸入姓名"]').fill(updatedName);
  await page.getByRole("button", { name: "儲存變更" }).click();

  await expect(page.locator("body")).toContainText(updatedName);
});

test("forgot password shows a neutral success state", async ({ page }) => {
  await page.goto("/forgot-password");

  await page.locator('input[type="email"]').fill("e2e-user@example.com");
  await page.getByRole("button", { name: "發送重設連結" }).click();

  await expect(page.locator("body")).toContainText("重設連結已發送");
  await expect(page.locator("body")).toContainText("若此 Email 已在我們系統中註冊");
});
