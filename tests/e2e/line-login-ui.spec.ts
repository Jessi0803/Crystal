import { expect, test } from "@playwright/test";

test("login forwards a safe return path to the LINE OAuth entrypoint", async ({ page }) => {
  let oauthRequestUrl = "";
  await page.route("**/api/trpc/line-oauth-start**", async (route) => {
    oauthRequestUrl = route.request().url();
    await route.fulfill({ contentType: "text/html", body: "<p>LINE OAuth test entry</p>" });
  });

  await page.goto("/login?returnTo=%2Fmember");
  await page.getByRole("button", { name: "使用 LINE 登入" }).click();

  await expect(page.locator("body")).toContainText("LINE OAuth test entry");
  expect(new URL(oauthRequestUrl).searchParams.get("returnTo")).toBe("/member");
});

test("registration opens the LINE OAuth entrypoint without sending member data", async ({ page }) => {
  let oauthRequestUrl = "";
  await page.route("**/api/trpc/line-oauth-start**", async (route) => {
    oauthRequestUrl = route.request().url();
    await route.fulfill({ contentType: "text/html", body: "<p>LINE register test entry</p>" });
  });

  await page.goto("/register");
  await page.getByRole("button", { name: "使用 LINE 註冊／登入" }).click();

  await expect(page.locator("body")).toContainText("LINE register test entry");
  expect(new URL(oauthRequestUrl).search).toBe("");
});

test("LINE welcome modal clears its query and can be dismissed", async ({ page }) => {
  await page.goto("/?line_welcome=1");

  await expect(page.getByRole("heading", { name: "LINE 登入成功！" })).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("link", { name: "加入官方 LINE" })).toHaveAttribute(
    "href",
    "https://line.me/R/ti/p/@011tymeh",
  );
  await page.getByRole("button", { name: "稍後再說" }).click();
  await expect(page.getByRole("heading", { name: "LINE 登入成功！" })).not.toBeVisible();
});
