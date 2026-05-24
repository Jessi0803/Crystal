import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("login rejects an incorrect password without creating a session", async ({ page }) => {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill("e2e-user@example.com");
  await page.locator('input[type="password"]').fill("WrongPassword123");
  await page.locator('button[type="submit"]').click();

  await expect(page.locator("body")).toContainText("Email 或密碼錯誤");
  await expect(page).toHaveURL(/\/login/);

  await page.goto("/member");
  await expect(page).toHaveURL(/\/login/);
});

test("member logout clears access to the member center", async ({ page }) => {
  await login(page, "e2e-user@example.com");
  await expect(page).toHaveURL(/\/products/);
  await page.goto("/member");
  await expect(page.getByRole("button", { name: "登出" })).toBeVisible();
  await page.getByRole("button", { name: "登出" }).click();

  await expect(page).toHaveURL(/\/$/);
  await page.goto("/member");
  await expect(page).toHaveURL(/\/login/);
});

test("regular members cannot access protected admin workspaces", async ({ page }) => {
  await login(page, "e2e-user@example.com");
  await expect(page).toHaveURL(/\/products/);

  for (const path of ["/admin/products", "/admin/revenue", "/admin/chatbot"]) {
    await page.goto(path);
    await expect(page.locator("body")).toContainText("此頁面僅限管理員存取");
  }
});

test("invalid reset and verification links are rejected without sending email", async ({ page }) => {
  await page.goto("/reset-password");
  await expect(page.locator("body")).toContainText("無效的重設連結");

  await page.goto("/reset-password?token=e2e-invalid-reset-token");
  await page.locator('input[placeholder="至少 8 個字元"]').fill("NewPassword123");
  await page.locator('input[placeholder="再次輸入新密碼"]').fill("NewPassword123");
  await page.getByRole("button", { name: "確認重設密碼" }).click();
  await expect(page.locator("body")).toContainText("重設連結已失效或不存在");

  await page.goto("/verify-email?token=e2e-invalid-verification-token");
  await expect(page.locator("body")).toContainText("驗證失敗");
  await expect(page.locator("body")).toContainText("驗證連結已失效或不存在");
});
