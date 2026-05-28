import { expect, test, type APIRequestContext } from "@playwright/test";
import dotenv from "dotenv";
import { readFileSync } from "node:fs";
import mysql, { type RowDataPacket } from "mysql2/promise";
import { generateLogisticsCheckMacValue } from "../../server/ecpayLogistics";

async function connectTestDb() {
  const env = dotenv.parse(readFileSync(".env.test.local"));
  const url = new URL(env.DATABASE_URL);
  return mysql.createConnection({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, "")),
    ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true },
  });
}

async function createPaidOrderWithLogistics() {
  const connection = await connectTestDb();
  try {
    const orderNo = `E2ELG${Date.now().toString(36).toUpperCase()}`.slice(0, 32);
    const logisticsNo = `L${Date.now().toString(36).toUpperCase()}`.slice(0, 32);
    await connection.execute(
      `INSERT INTO orders (
        merchantTradeNo, paymentStatus, paymentMethod, deliveryRegion, shippingMethod,
        orderStatus, totalAmount, buyerName, buyerEmail, buyerPhone,
        shippingAddress, receiverZipCode, inventoryDeducted, confirmedAt, createdAt, updatedAt
      ) VALUES (?, 'confirmed', 'atm', 'domestic', 'cvs_711', 'shipped', 1880,
        'E2E 物流測試', ?, '0912345678', '測試門市', '100', true, NOW(), NOW(), NOW())`,
      [orderNo, `${orderNo.toLowerCase()}@example.com`]
    );
    const [rows] = await connection.execute<RowDataPacket[]>(
      "SELECT id FROM orders WHERE merchantTradeNo = ? LIMIT 1",
      [orderNo]
    );
    const orderId = rows[0]?.id as number;
    await connection.execute(
      `INSERT INTO orderItems (orderId, productId, productName, quantity, unitPrice, subtotal, isPreorder)
       VALUES (?, 'e2e-bracelet-in-stock', 'E2E 現貨手鍊', 1, 1780, 1780, false)`,
      [orderId]
    );
    await connection.execute(
      `INSERT INTO logisticsOrders (
        orderId, logisticsMerchantTradeNo, allPayLogisticsId, logisticsType, logisticsSubType,
        logisticsStatus, cvsPaymentNo, cvsValidationNo, createdAt, updatedAt
      ) VALUES (?, ?, 'E2ELOGISTICSID', 'CVS', 'UNIMARTC2C', 'in_transit', 'E2EPAYNO', 'E2EVALIDNO', NOW(), NOW())`,
      [orderId, logisticsNo]
    );
    return { orderNo, logisticsNo };
  } finally {
    await connection.end();
  }
}

async function getOrderAndLogisticsStatus(orderNo: string) {
  const connection = await connectTestDb();
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT o.orderStatus, l.logisticsStatus
       FROM orders o
       JOIN logisticsOrders l ON l.orderId = o.id
       WHERE o.merchantTradeNo = ?
       LIMIT 1`,
      [orderNo]
    );
    return {
      orderStatus: rows[0]?.orderStatus as string,
      logisticsStatus: rows[0]?.logisticsStatus as string,
    };
  } finally {
    await connection.end();
  }
}

async function postLogisticsNotify(request: APIRequestContext, logisticsNo: string, rtnCode: string) {
  const env = dotenv.parse(readFileSync(".env.test.local"));
  const payload: Record<string, string> = {
    MerchantID: env.ECPAY_LOGISTICS_MERCHANT_ID ?? "2000933",
    MerchantTradeNo: logisticsNo,
    RtnCode: rtnCode,
    RtnMsg: rtnCode === "300" ? "已到店" : "已取貨",
    AllPayLogisticsID: "E2ELOGISTICSID",
    LogisticsType: "CVS",
    LogisticsSubType: "UNIMARTC2C",
    GoodsAmount: "1880",
    UpdateStatusDate: "2026/05/28 12:00:00",
  };
  payload.CheckMacValue = generateLogisticsCheckMacValue(
    payload,
    env.ECPAY_LOGISTICS_HASH_KEY,
    env.ECPAY_LOGISTICS_HASH_IV
  );

  const response = await request.post("/api/ecpay/logistics-notify", { form: payload });
  expect(await response.text()).toBe("1|OK");
}

test("ECPay logistics notify updates order and storefront result status", async ({ page, request }) => {
  const { orderNo, logisticsNo } = await createPaidOrderWithLogistics();

  await postLogisticsNotify(request, logisticsNo, "300");
  await expect.poll(() => getOrderAndLogisticsStatus(orderNo)).toMatchObject({
    orderStatus: "arrived",
    logisticsStatus: "arrived",
  });
  await page.goto(`/order/${orderNo}`);
  await expect(page.getByRole("heading", { name: "包裹已到店" })).toBeVisible();

  await postLogisticsNotify(request, logisticsNo, "3024");
  await expect.poll(() => getOrderAndLogisticsStatus(orderNo)).toMatchObject({
    orderStatus: "picked_up",
    logisticsStatus: "picked_up",
  });
  await page.goto(`/order/${orderNo}`);
  await expect(page.getByRole("heading", { name: "已取貨" })).toBeVisible();
});
