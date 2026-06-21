import { expect, test, type APIRequestContext } from "@playwright/test";
import dotenv from "dotenv";
import { readFileSync } from "node:fs";
import mysql, { type RowDataPacket } from "mysql2/promise";
import { generateCheckMacValue } from "../../server/ecpay";

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

async function createPendingPaymentOrder(
  prefix: string,
  method: "credit" | "paypal" = "credit",
  options: { isCustomOrder?: boolean; totalAmount?: number; productName?: string } = {},
) {
  const connection = await connectTestDb();
  try {
    const orderNo = `${prefix}${Date.now().toString(36).toUpperCase()}`.slice(0, 32);
    const totalAmount = options.totalAmount ?? 1880;
    await connection.execute(
      `INSERT INTO orders (
        merchantTradeNo, paymentStatus, paymentMethod, deliveryRegion, shippingMethod,
        orderStatus, isCustomOrder, totalAmount, buyerName, buyerEmail, buyerPhone,
        shippingAddress, receiverZipCode, inventoryDeducted, createdAt, updatedAt
      ) VALUES (?, 'pending', ?, 'domestic', 'home', 'pending_payment', ?, ?,
        'E2E 金流安全測試', ?, '0912345678', '台北市中正區測試路 1 號', '100', false, NOW(), NOW())`,
      [orderNo, method, Boolean(options.isCustomOrder), totalAmount, `${orderNo.toLowerCase()}@example.com`]
    );
    const [rows] = await connection.execute<RowDataPacket[]>(
      "SELECT id FROM orders WHERE merchantTradeNo = ? LIMIT 1",
      [orderNo]
    );
    await connection.execute(
      `INSERT INTO orderItems (orderId, productId, productName, quantity, unitPrice, subtotal, isPreorder)
       VALUES (?, ?, ?, 1, ?, ?, false)`,
      [
        rows[0]?.id,
        options.isCustomOrder ? "custom-product-deposit" : "e2e-bracelet-in-stock",
        options.productName ?? (options.isCustomOrder ? "客製化商品訂金" : "E2E 現貨手鍊"),
        totalAmount,
        totalAmount,
      ]
    );
    return orderNo;
  } finally {
    await connection.end();
  }
}

async function getOrderPaymentState(orderNo: string) {
  const connection = await connectTestDb();
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      "SELECT paymentStatus, orderStatus, inventoryDeducted, tradeNo FROM orders WHERE merchantTradeNo = ? LIMIT 1",
      [orderNo]
    );
    return {
      paymentStatus: rows[0]?.paymentStatus as string,
      orderStatus: rows[0]?.orderStatus as string,
      inventoryDeducted: Boolean(rows[0]?.inventoryDeducted),
      tradeNo: rows[0]?.tradeNo as string | null,
    };
  } finally {
    await connection.end();
  }
}

async function postEcpayNotify(request: APIRequestContext, orderNo: string, checkMacValue: string) {
  return request.post("/api/ecpay/notify", {
    form: {
      MerchantID: "3002607",
      MerchantTradeNo: orderNo,
      RtnCode: "1",
      RtnMsg: "Succeeded",
      TradeNo: `E2ETRADE${Date.now()}`,
      TradeAmt: "1880",
      PaymentDate: "2026/05/29 12:00:00",
      PaymentType: "Credit_CreditCard",
      PaymentTypeChargeFee: "0",
      SimulatePaid: "1",
      CheckMacValue: checkMacValue,
    },
  });
}

test("ECPay payment notify with invalid CheckMacValue does not update order or stock", async ({ request }) => {
  const orderNo = await createPendingPaymentOrder("E2EPAYBAD");

  const response = await postEcpayNotify(request, orderNo, "INVALID_CHECK_MAC_VALUE");

  expect(await response.text()).toBe("0|CheckMacValue Error");
  await expect.poll(() => getOrderPaymentState(orderNo)).toMatchObject({
    paymentStatus: "pending",
    orderStatus: "pending_payment",
    inventoryDeducted: false,
    tradeNo: null,
  });
});

test("repeated valid ECPay payment notify is idempotent for inventory deduction", async ({ request }) => {
  const orderNo = await createPendingPaymentOrder("E2EPAYDUP");
  const payload = {
    MerchantID: "3002607",
    MerchantTradeNo: orderNo,
    RtnCode: "1",
    RtnMsg: "Succeeded",
    TradeNo: `E2ETRADE${Date.now()}`,
    TradeAmt: "1880",
    PaymentDate: "2026/05/29 12:00:00",
    PaymentType: "Credit_CreditCard",
    PaymentTypeChargeFee: "0",
    SimulatePaid: "1",
  };
  const mac = generateCheckMacValue(payload);

  const first = await request.post("/api/ecpay/notify", { form: { ...payload, CheckMacValue: mac } });
  const second = await request.post("/api/ecpay/notify", { form: { ...payload, CheckMacValue: mac } });

  expect(await first.text()).toBe("1|OK");
  expect(await second.text()).toBe("1|OK");
  await expect.poll(() => getOrderPaymentState(orderNo)).toMatchObject({
    paymentStatus: "paid",
    orderStatus: "paid",
    inventoryDeducted: true,
    tradeNo: payload.TradeNo,
  });
});

test("valid ECPay credit-card notify marks a custom deposit order as deposit paid", async ({ request }) => {
  const orderNo = await createPendingPaymentOrder("E2ECDEP", "credit", {
    isCustomOrder: true,
    totalAmount: 500,
  });
  const payload = {
    MerchantID: "3002607",
    MerchantTradeNo: orderNo,
    RtnCode: "1",
    RtnMsg: "Succeeded",
    TradeNo: `E2ETRADE${Date.now()}`,
    TradeAmt: "500",
    PaymentDate: "2026/05/29 12:00:00",
    PaymentType: "Credit_CreditCard",
    PaymentTypeChargeFee: "0",
    SimulatePaid: "1",
  };
  const mac = generateCheckMacValue(payload);

  const response = await request.post("/api/ecpay/notify", { form: { ...payload, CheckMacValue: mac } });

  expect(await response.text()).toBe("1|OK");
  await expect.poll(() => getOrderPaymentState(orderNo)).toMatchObject({
    paymentStatus: "paid",
    orderStatus: "deposit_paid",
    inventoryDeducted: true,
    tradeNo: payload.TradeNo,
  });
});

test("PayPal capture failure does not mark a pending PayPal order as paid", async ({ request }) => {
  const orderNo = await createPendingPaymentOrder("E2EPAYPALBAD", "paypal");

  const response = await request.post("/api/trpc/order.capturePayPal?batch=1", {
    data: {
      "0": {
        json: {
          merchantTradeNo: orderNo,
          paypalOrderId: "E2E-PAYPAL-ORDER",
        },
      },
    },
  });

  expect(response.status()).toBeGreaterThanOrEqual(400);
  await expect.poll(() => getOrderPaymentState(orderNo)).toMatchObject({
    paymentStatus: "pending",
    orderStatus: "pending_payment",
    inventoryDeducted: false,
    tradeNo: null,
  });
});
