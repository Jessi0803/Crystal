import { expect, test } from "@playwright/test";

function trpcSuccess(data: unknown) {
  return [{ result: { data: { json: data } } }];
}

test("PayPal return page captures a sandbox-style callback and shows paid status", async ({ page }) => {
  const merchantTradeNo = "E2EPAYPALRETURN01";
  let captured = false;

  const order = () => ({
    merchantTradeNo,
    paymentMethod: "paypal",
    paymentStatus: captured ? "paid" : "pending",
    orderStatus: captured ? "paid" : "pending_payment",
    totalAmount: 2351,
    buyerName: "E2E Overseas",
    buyerEmail: "e2e-paypal@example.com",
    buyerPhone: "+1 212 555 0100",
    shippingMethod: "home",
    shippingAddress: "123 Test Street New York NY 10001",
    paidAt: captured ? new Date().toISOString() : null,
    isPreorder: false,
    items: [{
      id: 1,
      productName: "E2E 現貨手鍊",
      quantity: 1,
      subtotal: 1580,
      isPreorder: false,
    }],
  });

  await page.route("**/api/trpc/order.getOrder**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(trpcSuccess(order())),
    });
  });
  await page.route("**/api/trpc/order.capturePayPal**", async (route) => {
    captured = true;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(trpcSuccess({ alreadyPaid: false })),
    });
  });

  await page.goto(`/order/${merchantTradeNo}?paypal_return=1&token=PAYPAL-SANDBOX-TOKEN`);

  await expect.poll(() => captured).toBe(true);
  await expect(page).toHaveURL(new RegExp(`/order/${merchantTradeNo}$`));
  await expect(page.getByRole("heading", { name: "付款成功！" })).toBeVisible();
  await expect(page.locator("body")).toContainText("PayPal");
  await expect(page.locator("body")).toContainText("✅ 已付款");
});
