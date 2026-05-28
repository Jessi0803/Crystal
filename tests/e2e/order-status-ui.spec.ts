import { expect, test, type Page } from "@playwright/test";

function trpcSuccess(data: unknown) {
  return [{ result: { data: { json: data } } }];
}

async function mockOrder(page: Page, paymentStatus: string, orderStatus: string) {
  await page.route("**/api/trpc/order.getOrder**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(trpcSuccess({
        merchantTradeNo: `E2E-${orderStatus}`,
        paymentMethod: "credit",
        paymentStatus,
        orderStatus,
        totalAmount: 1580,
        buyerName: "E2E Buyer",
        buyerEmail: "order-status@example.com",
        buyerPhone: "0912345678",
        shippingMethod: "home",
        shippingAddress: "台北市中正區忠孝西路一段49號",
        isPreorder: false,
        items: [],
      })),
    });
  });
}

test("order result displays failed payment status", async ({ page }) => {
  await mockOrder(page, "failed", "pending_payment");
  await page.goto("/order/E2E-failed");

  await expect(page.getByRole("heading", { name: "付款失敗" })).toBeVisible();
  await expect(page.locator("body")).toContainText("付款未成功");
  await expect(page.locator("body")).toContainText("❌ 付款失敗");
});

test("completed paid order displays its completed fulfillment status", async ({ page }) => {
  test.fixme(true, "Known issue: paid status currently takes precedence over completed fulfillment status.");
  await mockOrder(page, "paid", "completed");
  await page.goto("/order/E2E-completed");

  await expect(page.getByRole("heading", { name: "訂單已完成" })).toBeVisible();
  await expect(page.locator("body")).toContainText("✅ 已完成");
});
