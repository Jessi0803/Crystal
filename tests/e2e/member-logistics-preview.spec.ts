import { expect, test, type Page } from "@playwright/test";

function trpcSuccess(data: unknown) {
  return [{ result: { data: { json: data } } }];
}

async function mockMemberLogistics(page: Page) {
  await page.route(/\/api\/trpc\/auth\.me/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(trpcSuccess({
        id: 9001,
        openId: "e2e-logistics-member",
        name: "林小花",
        email: "member-logistics@example.com",
        emailVerified: true,
        loginMethod: "email",
        role: "user",
      })),
    });
  });

  await page.route(/\/api\/trpc\/member\.myOrders/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(trpcSuccess([
        {
          id: 7001,
          merchantTradeNo: "LF20261005001",
          buyerEmail: "member-logistics@example.com",
          createdAt: "2026-10-02T10:20:00.000Z",
          paymentStatus: "paid",
          paymentMethod: "credit",
          orderStatus: "arrived",
          shippingMethod: "cvs_711",
          cvsStoreName: "台北信義門市",
          totalAmount: 1880,
          isCustomOrder: false,
          items: [
            {
              id: 71,
              productId: "moon-bracelet",
              productName: "月下密語手鍊",
              quantity: 1,
              unitPrice: 1880,
              subtotal: 1880,
              productImage: null,
            },
          ],
          logistics: {
            logisticsStatus: "arrived",
            logisticsSubType: "UNIMARTC2C",
            logisticsMerchantTradeNo: "L202610020001",
            allPayLogisticsId: "311234567890",
            cvsPaymentNo: "TW25824611",
            cvsValidationNo: "9",
            createdAt: "2026-10-02T10:25:00.000Z",
            updatedAt: "2026-10-05T06:30:00.000Z",
            arrivedAt: "2026-10-05T06:30:00.000Z",
            pickedUpAt: null,
            events: [
              { normalizedStatus: "created", occurredAt: "2026-10-02T10:25:00.000Z" },
              { normalizedStatus: "in_transit", occurredAt: "2026-10-03T00:42:00.000Z" },
              { normalizedStatus: "arrived", occurredAt: "2026-10-05T06:30:00.000Z" },
            ],
          },
        },
      ])),
    });
  });
}

test("會員中心顯示簡化的 7-11 物流進度", async ({ page }, testInfo) => {
  await mockMemberLogistics(page);
  await page.goto("/member");
  await expect(page.getByText("訂單 #LF20261005001")).toBeVisible();
  await page.getByText("訂單 #LF20261005001").click();

  const timeline = page.getByTestId("member-logistics-timeline");
  await expect(timeline).toBeVisible();
  await expect(timeline).toContainText("7-ELEVEN 交貨便");
  await expect(timeline).toContainText("已到店，等待取貨");
  await expect(timeline).toContainText("TW258246119");
  await expect(timeline).toContainText("配送中");
  await expect(timeline).toContainText("已取貨");

  await page.screenshot({
    path: `test-results/member-logistics-preview-${testInfo.project.name}.png`,
    fullPage: true,
  });
});
