import { expect, test, type Page } from "@playwright/test";
import { createAtmHomeDeliveryOrder, login } from "./helpers";

async function updateStatus(
  page: Page,
  orderNo: string,
  tabName: string,
  status: string,
  customerLabel: string,
) {
  await page.goto("/admin/orders");
  await page.getByRole("button", { name: tabName }).click();
  await expect(page.locator("body")).toContainText(orderNo);
  await page.locator("button").filter({ hasText: orderNo }).click();
  await page
    .locator("select")
    .filter({ has: page.locator('option[value="processing"]') })
    .selectOption(status);
  await expect(page.locator("body")).toContainText("訂單狀態已更新");

  await page.goto(`/order/${orderNo}`);
  await expect(page.locator("body")).toContainText(customerLabel);
}

test("admin can progress an ATM test order through safe pickup statuses", async ({ page }) => {
  test.setTimeout(60_000);
  const orderNo = await createAtmHomeDeliveryOrder(page, `e2e-order-status-${Date.now()}@example.com`);

  await login(page, "e2e-admin@example.com");
  await expect(page).toHaveURL(/\/admin\/orders/);
  await updateStatus(page, orderNo, "轉帳待確認", "processing", "備貨中");
  await updateStatus(page, orderNo, "備貨中", "arrived", "已到店");
  await updateStatus(page, orderNo, "已到店", "picked_up", "已取貨");
});

test("admin order filters and page size include a newly created pending transfer order", async ({ page }) => {
  const orderNo = await createAtmHomeDeliveryOrder(page, `e2e-order-filter-${Date.now()}@example.com`);

  await login(page, "e2e-admin@example.com");
  await expect(page).toHaveURL(/\/admin\/orders/);
  await page.goto("/admin/orders");
  await page.getByRole("button", { name: "轉帳待確認" }).click();
  await expect(page.locator("body")).toContainText(orderNo);

  const pageSize = page.locator("select").filter({ has: page.locator('option[value="100"]') });
  await pageSize.selectOption("100");
  await expect(pageSize).toHaveValue("100");

  await page.getByRole("button", { name: "全部" }).click();
  await expect(page.locator("body")).toContainText(orderNo);
});

test("admin can mark a delivery test order as shipped and then not picked up", async ({ page }) => {
  test.setTimeout(60_000);
  const orderNo = await createAtmHomeDeliveryOrder(page, `e2e-shipping-status-${Date.now()}@example.com`);

  await login(page, "e2e-admin@example.com");
  await expect(page).toHaveURL(/\/admin\/orders/);
  await updateStatus(page, orderNo, "轉帳待確認", "processing", "備貨中");
  await updateStatus(page, orderNo, "備貨中", "shipped", "已出貨");
  await updateStatus(page, orderNo, "已出貨", "not_picked", "未取貨");
});
