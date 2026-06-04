import { expect, test } from "@playwright/test";
import { addSeededBraceletToCart, login } from "./helpers";

test("guest clicking checkout sees the account gate and can continue as guest", async ({ page }) => {
  await addSeededBraceletToCart(page);
  await page.getByRole("button", { name: "前往結帳" }).click();

  // 未登入：先落在結帳選擇頁
  await expect(page).toHaveURL(/\/checkout\/start/);
  await expect(page.getByRole("heading", { name: "如何結帳" })).toBeVisible();
  await expect(page.getByRole("button", { name: "會員登入" })).toBeVisible();
  await expect(page.getByRole("button", { name: "以訪客身分結帳" })).toBeVisible();

  // 以訪客身分結帳 → 進到結帳表單
  await page.getByRole("button", { name: "以訪客身分結帳" }).click();
  await expect(page).toHaveURL(/\/checkout(\?|$)/);
  await expect(page.getByRole("heading", { name: "訂單摘要" })).toBeVisible();
});

test("account gate links member login to /login with returnTo=/checkout", async ({ page }) => {
  await addSeededBraceletToCart(page);
  await page.getByRole("button", { name: "前往結帳" }).click();
  await expect(page).toHaveURL(/\/checkout\/start/);

  await page.getByRole("button", { name: "會員登入" }).click();
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fcheckout/);
  await expect(page.getByRole("heading", { name: "會員登入" })).toBeVisible();
});

test("logged-in member skips the account gate and goes straight to checkout", async ({ page }) => {
  await login(page, "e2e-user@example.com");
  await expect(page).toHaveURL(/\/products/);

  await addSeededBraceletToCart(page);
  await page.getByRole("button", { name: "前往結帳" }).click();

  // 已登入：選擇頁自動轉址，不停在 /checkout/start、也不出現訪客按鈕
  await expect(page).toHaveURL(/\/checkout(\?|$)/);
  await expect(page.getByRole("heading", { name: "訂單摘要" })).toBeVisible();
  await expect(page.getByRole("button", { name: "以訪客身分結帳" })).toHaveCount(0);
});
