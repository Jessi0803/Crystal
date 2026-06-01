import { expect, test, type Page } from "@playwright/test";

function trpcSuccess(data: unknown) {
  return [{ result: { data: { json: data } } }];
}

async function mockOrder(page: Page, paymentStatus: string, orderStatus: string) {
  await page.unroute(/\/api\/trpc\/order\.getOrder/).catch(() => undefined);
  await page.route(/\/api\/trpc\/order\.getOrder/, async (route) => {
    await route.fulfill({
      status: 200,
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
  await mockOrder(page, "paid", "completed");
  await page.goto("/order/E2E-completed");

  await expect(page.getByRole("heading", { name: "訂單已完成" })).toBeVisible();
  await expect(page.locator("body")).toContainText("✅ 已完成");
});

test("paid shipped, arrived, and picked up orders prioritize fulfillment status over payment success", async ({ page }) => {
  await mockOrder(page, "paid", "shipped");
  await page.goto("/order/E2E-shipped");
  await expect(page.getByRole("heading", { name: "已出貨" })).toBeVisible();
  await expect(page.locator("body")).toContainText("🚚 已出貨");

  await mockOrder(page, "paid", "arrived");
  await page.goto("/order/E2E-arrived");
  await expect(page.getByRole("heading", { name: "包裹已到店" })).toBeVisible();
  await expect(page.locator("body")).toContainText("📦 已到店");

  await mockOrder(page, "paid", "picked_up");
  await page.goto("/order/E2E-picked_up");
  await expect(page.getByRole("heading", { name: "已取貨" })).toBeVisible();
  await expect(page.locator("body")).toContainText("✅ 已取貨");
});
