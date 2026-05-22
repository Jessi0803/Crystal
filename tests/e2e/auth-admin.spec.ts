import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("seeded user can log in and open member center", async ({ page }) => {
  await login(page, "e2e-user@example.com");

  await expect(page).toHaveURL(/\/products/);
  await page.goto("/member");
  await expect(page.locator("body")).toContainText("歡迎回來，E2E User");
  await expect(page.getByRole("button", { name: "登出" })).toBeVisible();
});

test("seeded admin logs into admin orders", async ({ page }) => {
  await login(page, "e2e-admin@example.com");

  await expect(page).toHaveURL(/\/admin\/orders/);
  await expect(page.locator("body")).toContainText("訂單管理後台");
  await expect(page.locator("body")).toContainText(/總營收|已付款|轉帳待確認/);
});

test("non-admin cannot open admin orders", async ({ page }) => {
  await login(page, "e2e-user@example.com");
  await expect(page).toHaveURL(/\/products/);

  await page.goto("/admin/orders");
  await expect(page.locator("body")).toContainText("無存取權限");
});
