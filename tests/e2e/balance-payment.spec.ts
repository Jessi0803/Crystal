import { expect, test } from "@playwright/test";
import { createAtmCustomDepositOrder, login } from "./helpers";

test("custom deposit order can receive a balance payment link and submit ATM balance transfer code", async ({ page }) => {
  const depositOrderNo = await createAtmCustomDepositOrder(page, `e2e-balance-${Date.now()}@example.com`);

  await login(page, "e2e-admin@example.com");
  await expect(page).toHaveURL(/\/admin\/orders/);

  await page.locator("button").filter({ hasText: depositOrderNo }).click();
  await page.getByRole("button", { name: "確認收款" }).click();
  await expect(page.locator("body")).toContainText("產生尾款連結");

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("請輸入尾款金額");
    await dialog.accept("700");
  });
  await page.getByRole("button", { name: "產生尾款連結" }).click();
  await expect(page.locator("body")).toContainText("尾款編號：");

  const pageText = await page.locator("body").innerText();
  const balanceOrderNo = pageText.match(/尾款編號：([A-Z0-9]+)/)?.[1];
  expect(balanceOrderNo).toBeTruthy();

  await page.goto(`/balance/${balanceOrderNo}`);

  await expect(page.getByRole("heading", { name: "請完成客製化尾款" })).toBeVisible();
  await expect(page.locator("body")).toContainText("尾款小計");

  await page.getByRole("button", { name: "前往信用卡付款" }).click();
  await expect(page.locator("body")).toContainText("請輸入有效郵遞區號");

  await page.locator('input[placeholder="郵遞區號"]').fill("100");
  await page.locator('input[placeholder="縣市"]').fill("台北市");
  await page.locator('input[placeholder="鄉鎮市區"]').fill("中正區");
  await page.locator('input[placeholder="路名、門牌、樓層"]').fill("測試路 2 號");
  await page.getByRole("button", { name: /^轉帳/ }).click();
  await page.getByRole("button", { name: /確認使用轉帳/ }).click();

  await expect(page.locator("body")).toContainText("轉帳資訊");
  await page.locator('input[placeholder="12345"]').fill("67890");
  await page.getByRole("button", { name: "確認送出" }).click();

  await expect(page.locator("body")).toContainText("已收到您的匯款末五碼");
  await expect(page.locator("body")).toContainText("67890");
});
