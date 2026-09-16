import { expect, test } from "@playwright/test";
import { createAtmHomeDeliveryOrder, login, loginAsAdminByCookie } from "./helpers";

test("admin revenue dashboard shows confirmed order metrics and top products", async ({ page }) => {
  test.setTimeout(60_000);
  const merchantTradeNo = await createAtmHomeDeliveryOrder(page, `e2e-revenue-${Date.now()}@example.com`);

  await login(page, "e2e-admin@example.com");
  await expect(page).toHaveURL(/\/admin\/orders/);
  await page.locator("button").filter({ hasText: merchantTradeNo }).click();
  await page.getByRole("button", { name: "確認收款" }).click();
  await expect(page.locator("body")).toContainText("已確認收款");

  await page.goto("/admin/revenue");

  await expect(page.getByRole("heading", { name: "營收報表" })).toBeVisible();
  await expect(page.locator("body")).toContainText("總訂單數");
  await expect(page.locator("body")).toContainText("月營收趨勢");
  await expect(page.locator("body")).toContainText("熱銷商品排行");
  await expect(page.locator("body")).toContainText("E2E 現貨手鍊");

  const currentMonth = new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
  }).format(new Date()).replace("年", "/").replace("月", "");
  const currentMonthRow = page.getByRole("row").filter({ hasText: currentMonth });
  const currentMonthOrderCount = Number(
    ((await currentMonthRow.getByRole("cell").nth(1).innerText()).match(/\d+/)?.[0]) ?? "0"
  );
  const monthOrderCard = page
    .getByText("本月訂單", { exact: true })
    .locator("xpath=ancestor::div[contains(@class,'border')][1]");
  await expect(monthOrderCard).toContainText(`${currentMonthOrderCount} 筆`);

  const chartBars = page.locator('[aria-label*="營收 NT$"]');
  await expect(chartBars).toHaveCount(6);
  const currentMonthBarHeight = await chartBars.last().evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).height)
  );
  expect(currentMonthBarHeight).toBeGreaterThan(6);

  const reportPeriod = page.locator("select").filter({ has: page.locator('option[value="3"]') });
  await reportPeriod.selectOption("3");
  await expect(reportPeriod).toHaveValue("3");
  await expect(page.locator("body")).toContainText("月營收趨勢");
  await reportPeriod.selectOption("12");
  await expect(reportPeriod).toHaveValue("12");
  await expect(page.locator("body")).toContainText("熱銷商品排行");
});

test("admin chatbot log page can search and expand seeded conversations", async ({ page }) => {
  await login(page, "e2e-admin@example.com");
  await expect(page).toHaveURL(/\/admin\/orders/);

  await page.goto("/admin/chatbot");
  await expect(page.getByRole("heading", { name: "AI 客服紀錄" })).toBeVisible();
  await expect(page.locator("body")).toContainText("問答紀錄");

  await page.locator('input[placeholder^="搜尋顧客問題"]').fill("提升自信");
  await page.getByRole("button", { name: "搜尋" }).click();

  await expect(page.locator("body")).toContainText("我想提升自信");
  await page.getByRole("button", { name: /我想提升自信/ }).first().click();
  await expect(page.locator("body")).toContainText("完整問題");
  await expect(page.locator("body")).toContainText("可以先參考 E2E 現貨手鍊");

  await page.locator('input[placeholder^="搜尋顧客問題"]').fill("e2e-user@example.com");
  await page.getByRole("button", { name: "搜尋" }).click();
  await expect(page.locator("body")).toContainText("我想提升自信，推薦哪款？");
  await page.getByRole("button", { name: "清除" }).click();
  await expect(page.locator("body")).toContainText("我想提升自信，推薦哪款？");
});

test("legacy admin inventory route redirects admins to product management", async ({ page }) => {
  await login(page, "e2e-admin@example.com");
  await expect(page).toHaveURL(/\/admin\/orders/);

  await page.goto("/admin/inventory");

  await expect(page).toHaveURL(/\/admin\/products/);
  await expect(page.getByRole("heading", { name: "商品管理" })).toBeVisible();
});

test("admin shell keeps navigation consistent and exposes monitoring as its own page", async ({ page }) => {
  await loginAsAdminByCookie(page);
  await expect(page).toHaveURL(/\/admin\/orders/);

  const navigation = page.locator('nav[aria-label="後台功能導覽"]:visible');
  await expect(navigation.getByRole("link", { name: "訂單管理" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "商品與庫存" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "操作監控" })).toBeVisible();

  await navigation.getByRole("link", { name: "操作監控" }).click();
  await expect(page).toHaveURL(/\/admin\/monitoring/);
  await expect(page.getByRole("heading", { name: "操作監控" })).toBeVisible();
  await expect(page.getByRole("combobox")).toHaveCount(3);
  await expect(page.locator("body")).toContainText("付款回呼與管理員操作紀錄");
});

test("admin navigation uses a drawer on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAsAdminByCookie(page);
  await expect(page).toHaveURL(/\/admin\/orders/);

  await expect(page.getByRole("button", { name: "開啟後台選單" })).toBeVisible();
  await page.getByRole("button", { name: "開啟後台選單" }).click();
  const navigation = page.locator('nav[aria-label="後台功能導覽"]:visible');
  await expect(navigation.getByRole("link", { name: "營收報表" })).toBeVisible();
  await navigation.getByRole("link", { name: "營收報表" }).click();
  await expect(page).toHaveURL(/\/admin\/revenue/);
  await expect(page.getByRole("heading", { name: "營收報表" })).toBeVisible();
});

test("member detail opens as a mobile workspace and returns to the list", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAsAdminByCookie(page);
  await page.goto("/admin/members");

  const search = page.getByPlaceholder("搜尋姓名、Email 或會員 ID");
  const memberList = search.locator("xpath=ancestor::section");
  const firstMember = memberList.locator("button").filter({ hasText: "@" }).first();
  await expect(firstMember).toBeVisible();
  await firstMember.click();

  const detail = page.getByRole("dialog", { name: "會員詳細資料" });
  await expect(detail).toBeVisible();
  await expect(detail.getByRole("button", { name: "會員資料" })).toBeVisible();
  await detail.getByRole("button", { name: /購買紀錄/ }).click();
  await expect(detail.getByRole("heading", { name: "購買紀錄" })).toBeVisible();

  await detail.getByRole("button", { name: "返回清單" }).click();
  await expect(detail).toBeHidden();
  await expect(firstMember).toBeFocused();
});

test("admin revenue removes a paid test order after it is cancelled", async ({ page }) => {
  test.setTimeout(90_000);
  const merchantTradeNo = await createAtmHomeDeliveryOrder(page, `e2e-revenue-cancel-${Date.now()}@example.com`);
  const orderInfo = page.getByRole("heading", { name: "訂單資訊" }).locator("xpath=parent::div");
  await expect(orderInfo).toContainText("訂單金額");
  const orderPageText = await orderInfo.innerText();
  const amountText = orderPageText.match(/訂單金額\s*NT\$\s*([\d,]+)/)?.[1] ?? "";
  const orderAmount = Number(amountText.replaceAll(",", ""));
  expect(orderAmount).toBeGreaterThan(0);

  await login(page, "e2e-admin@example.com");
  await page.locator("button").filter({ hasText: merchantTradeNo }).click();
  await page.getByRole("button", { name: "確認收款" }).click();
  await expect(page.locator("body")).toContainText("已確認收款");

  const totalRevenueCard = page.getByText("累計總營收", { exact: true }).locator("xpath=ancestor::div[contains(@class,'border')][1]");
  const readTotal = async () => {
    const totalText = (await totalRevenueCard.innerText()).match(/NT\$\s*([\d,]+)/)?.[1] ?? "";
    return Number(totalText.replaceAll(",", ""));
  };
  await page.goto("/admin/revenue");
  await expect(page.getByRole("heading", { name: "營收報表" })).toBeVisible();
  const beforeCancellation = await readTotal();

  await page.goto("/admin/orders");
  await page.getByRole("button", { name: "全部" }).click();
  await page.locator("button").filter({ hasText: merchantTradeNo }).click();
  await page.locator("select").filter({ has: page.locator('option[value="cancelled"]') }).selectOption("cancelled");
  await expect(page.locator("body")).toContainText("訂單狀態已更新");

  await page.goto("/admin/revenue");
  await expect.poll(readTotal).toBe(beforeCancellation - orderAmount);
});
