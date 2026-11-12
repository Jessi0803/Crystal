import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import { operationAuditEvents, orderECPayPayments, orderItems, orders, productInventory } from "../drizzle/schema";
import { getDb } from "./db";
import { generateCheckMacValue } from "./ecpay";
import { createECPayOrderReplacement } from "./ecpayOrderPayments";
import { handleECPayPaymentNotify } from "./ecpayRoutes";
import { notifyCustomerOrderPlacedSafely } from "./customerOrderNotification";

vi.mock("./customerOrderNotification", () => ({
  notifyCustomerOrderPlacedSafely: vi.fn(),
}));

describe.skipIf(process.env.RUN_ECPAY_RETRY_DB_TESTS !== "true")("ECPay replacement with the test database", () => {
  let db: NonNullable<Awaited<ReturnType<typeof getDb>>>;
  const orderIds: number[] = [];
  const productIds: string[] = [];

  beforeAll(async () => {
    // @ts-expect-error -- plain ESM helper without type declarations
    const { connectToTestDatabase } = await import("../scripts/test-db-helpers.mjs");
    const { connection } = await connectToTestDatabase({ write: true });
    try {
      const [[identity]] = await connection.query("SELECT CURRENT_USER() AS connectionUser");
      if (!identity.connectionUser.startsWith("3DeLUzaGBUJsiKt.")) {
        throw new Error("This suite requires crystal-test");
      }
    } finally {
      await connection.end();
    }
    const instance = await getDb();
    if (!instance) throw new Error("Test database is unavailable");
    db = instance;
  });

  afterAll(async () => {
    if (!db) return;
    try {
      if (orderIds.length) {
        await db.delete(operationAuditEvents).where(inArray(operationAuditEvents.orderId, orderIds));
        await db.delete(orderECPayPayments).where(inArray(orderECPayPayments.orderId, orderIds));
        await db.delete(orderItems).where(inArray(orderItems.orderId, orderIds));
        await db.delete(orders).where(inArray(orders.id, orderIds));
      }
      if (productIds.length) await db.delete(productInventory).where(inArray(productInventory.productId, productIds));
    } finally {
      await db.$client.end();
    }
  });

  async function createPendingOrder() {
    const id = randomBytes(7).toString("hex");
    const productId = `ecpay-retry-test-${id}`;
    const merchantTradeNo = `TST${id}`;
    const [{ id: orderId }] = await db.insert(orders).values({
      merchantTradeNo,
      paymentMethod: "credit",
      totalAmount: 1800,
      buyerName: "金流整合測試",
      buyerEmail: "ecpay-test@example.test",
      buyerPhone: "0912345678",
    }).$returningId();
    orderIds.push(orderId);
    await db.insert(productInventory).values({ productId, productName: "庫存測試", stock: 10 });
    productIds.push(productId);
    await db.insert(orderItems).values({
      orderId,
      productId,
      productName: "庫存測試",
      quantity: 2,
      unitPrice: 900,
      subtotal: 1800,
    });
    return { orderId, merchantTradeNo, productId, totalAmount: 1800 };
  }

  function openReplacement(order: Awaited<ReturnType<typeof createPendingOrder>>) {
    return createECPayOrderReplacement({
      orderId: order.orderId,
      totalAmount: order.totalAmount,
      previousTradeNo: order.merchantTradeNo,
      previousWasNeverSubmitted: false,
    });
  }

  function callback(merchantTradeNo: string, tradeNo: string, rtnCode = "1") {
    const data = { MerchantTradeNo: merchantTradeNo, TradeNo: tradeNo, TradeAmt: "1800", RtnCode: rtnCode };
    return handleECPayPaymentNotify({ ...data, CheckMacValue: generateCheckMacValue(data) });
  }

  it("creates one replacement across simultaneous confirmations from two tabs", async () => {
    const order = await createPendingOrder();
    const results = await Promise.allSettled([openReplacement(order), openReplacement(order)]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(result => result.status === "rejected")).toHaveLength(1);
    const payments = await db.select().from(orderECPayPayments).where(eq(orderECPayPayments.orderId, order.orderId));
    expect(payments).toHaveLength(1);
    expect(payments[0].merchantTradeNo).not.toBe(order.merchantTradeNo);
  });

  it.each(["original", "replacement", "simultaneous"])("settles and deducts once when %s succeeds first", async first => {
    const order = await createPendingOrder();
    const replacement = await openReplacement(order);
    const originalTrade = `G${order.merchantTradeNo}`;
    const replacementTrade = `G${replacement}`;
    const notifyOriginal = () => callback(order.merchantTradeNo, originalTrade);
    const notifyReplacement = () => callback(replacement, replacementTrade);
    vi.mocked(notifyCustomerOrderPlacedSafely).mockClear();

    if (first === "simultaneous") {
      expect(await Promise.all([notifyOriginal(), notifyReplacement()])).toEqual(["1|OK", "1|OK"]);
    } else if (first === "original") {
      expect(await notifyOriginal()).toBe("1|OK");
      expect(await notifyReplacement()).toBe("1|OK");
    } else {
      expect(await notifyReplacement()).toBe("1|OK");
      expect(await notifyOriginal()).toBe("1|OK");
    }
    await Promise.all([notifyOriginal(), notifyReplacement()]);

    const [settled] = await db.select().from(orders).where(eq(orders.id, order.orderId));
    const [inventory] = await db.select().from(productInventory).where(eq(productInventory.productId, order.productId));
    const payments = await db.select().from(orderECPayPayments).where(eq(orderECPayPayments.orderId, order.orderId));
    const alerts = await db.select().from(operationAuditEvents).where(and(
      eq(operationAuditEvents.orderId, order.orderId),
      eq(operationAuditEvents.action, "ecpay.order.duplicate_payment"),
    ));
    expect(settled).toMatchObject({ paymentStatus: "paid", orderStatus: "paid", inventoryDeducted: true });
    if (first === "original") expect(settled.tradeNo).toBe(originalTrade);
    if (first === "replacement") expect(settled.tradeNo).toBe(replacementTrade);
    expect(inventory.stock).toBe(8);
    expect(vi.mocked(notifyCustomerOrderPlacedSafely)).toHaveBeenCalledTimes(1);
    expect(payments.map(payment => payment.status).sort()).toEqual(["duplicate_paid", "paid"]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].details).toMatchObject({
      tradeNo: settled.tradeNo === originalTrade ? replacementTrade : originalTrade,
      settledTradeNo: settled.tradeNo,
      amount: 1800,
    });
  });

  it("keeps the order payable when an older transaction fails after replacement", async () => {
    const order = await createPendingOrder();
    const replacement = await openReplacement(order);
    expect(await callback(order.merchantTradeNo, "", "10100058")).toBe("1|OK");
    expect(await callback(replacement, `G${replacement}`)).toBe("1|OK");
    const [settled] = await db.select().from(orders).where(eq(orders.id, order.orderId));
    expect(settled.paymentStatus).toBe("paid");
  });
});
