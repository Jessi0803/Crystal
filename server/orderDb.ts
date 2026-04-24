/**
 * 訂單資料庫查詢函式
 */
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { normalizeOrderEmail } from "./_core/emailNormalize";
import { getDb } from "./db";
import {
  orders,
  orderItems,
  logisticsOrders,
  InsertOrder,
  InsertOrderItem,
  InsertLogisticsOrder,
} from "../drizzle/schema";

export async function createOrder(
  orderData: InsertOrder,
  items: InsertOrderItem[]
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(orders).values(orderData);

  const [created] = await db
    .select()
    .from(orders)
    .where(eq(orders.merchantTradeNo, orderData.merchantTradeNo!))
    .limit(1);

  if (!created) throw new Error("Failed to create order");

  const itemsWithOrderId = items.map((item) => ({
    ...item,
    orderId: created.id,
  }));
  await db.insert(orderItems).values(itemsWithOrderId);

  return created.id;
}

export async function getOrderByMerchantTradeNo(merchantTradeNo: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.merchantTradeNo, merchantTradeNo))
    .limit(1);

  return order ?? null;
}

export async function getOrderWithItems(merchantTradeNo: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.merchantTradeNo, merchantTradeNo))
    .limit(1);

  if (!order) return null;

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));

  // 取得物流訂單（如果有）
  const [logistics] = await db
    .select()
    .from(logisticsOrders)
    .where(eq(logisticsOrders.orderId, order.id))
    .limit(1);

  return { ...order, items, logistics: logistics ?? null };
}

/** PayPal Capture 成功後標記已付款 */
export async function markOrderPaidPayPal(
  merchantTradeNo: string,
  paypalCaptureId: string,
  capturePayload: Record<string, unknown>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .update(orders)
    .set({
      paymentStatus: "paid",
      orderStatus: "paid",
      tradeNo: paypalCaptureId,
      ecpayNotifyData: capturePayload,
      paidAt: new Date(),
    })
    .where(
      and(
        eq(orders.merchantTradeNo, merchantTradeNo),
        eq(orders.paymentMethod, "paypal"),
        eq(orders.paymentStatus, "pending")
      )
    );

  return result;
}

export async function updateOrderPaymentStatus(
  merchantTradeNo: string,
  status: "paid" | "failed",
  tradeNo: string,
  notifyData: Record<string, string>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(orders)
    .set({
      paymentStatus: status,
      orderStatus: status === "paid" ? "paid" : "cancelled",
      tradeNo,
      ecpayNotifyData: notifyData,
      paidAt: status === "paid" ? new Date() : undefined,
    })
    .where(eq(orders.merchantTradeNo, merchantTradeNo));
}

export async function updateOrderTransferLastFive(
  merchantTradeNo: string,
  lastFive: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(orders)
    .set({ transferLastFive: lastFive })
    .where(eq(orders.merchantTradeNo, merchantTradeNo));
}

export async function confirmTransferPayment(merchantTradeNo: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(orders)
    .set({
      paymentStatus: "confirmed",
      orderStatus: "paid",
      confirmedAt: new Date(),
      paidAt: new Date(),
    })
    .where(eq(orders.merchantTradeNo, merchantTradeNo));
}

export async function updateOrderStatus(
  merchantTradeNo: string,
  orderStatus: "pending_payment" | "paid" | "processing" | "shipped" | "arrived" | "completed" | "cancelled"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(orders)
    .set({ orderStatus })
    .where(eq(orders.merchantTradeNo, merchantTradeNo));
}

export async function getAllOrders(
  limit = 100,
  offset = 0,
  statusFilter?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let allOrders = await db
    .select()
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(limit)
    .offset(offset);

  // 篩選：transfer_pending 對應 paymentStatus，其他對應 orderStatus
  if (statusFilter && statusFilter !== "all") {
    if (statusFilter === "transfer_pending") {
      allOrders = allOrders.filter((o) => o.paymentStatus === "transfer_pending");
    } else {
      allOrders = allOrders.filter((o) => o.orderStatus === statusFilter);
    }
  }

  const ordersWithItems = await Promise.all(
    allOrders.map(async (order) => {
      const items = await db!
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));

      const [logistics] = await db!
        .select()
        .from(logisticsOrders)
        .where(eq(logisticsOrders.orderId, order.id))
        .limit(1);

      return { ...order, items, logistics: logistics ?? null };
    })
  );

  return ordersWithItems;
}

export async function getOrderStats() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const allOrders = await db.select().from(orders);

  const stats = {
    totalOrders: allOrders.length,
    pendingPayment: allOrders.filter((o) => o.orderStatus === "pending_payment").length,
    transferPending: allOrders.filter((o) => o.paymentStatus === "transfer_pending").length,
    paid: allOrders.filter((o) => o.orderStatus === "paid").length,
    shipped: allOrders.filter((o) => o.orderStatus === "shipped").length,
    completed: allOrders.filter((o) => o.orderStatus === "completed").length,
    totalRevenue: allOrders
      .filter((o) => ["paid", "processing", "shipped", "arrived", "completed"].includes(o.orderStatus))
      .reduce((sum, o) => sum + o.totalAmount, 0),
    monthRevenue: 0,
  };

  // 本月營收
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  stats.monthRevenue = allOrders
    .filter(
      (o) =>
        ["paid", "processing", "shipped", "arrived", "completed"].includes(o.orderStatus) &&
        o.paidAt &&
        o.paidAt >= monthStart
    )
    .reduce((sum, o) => sum + o.totalAmount, 0);

  return stats;
}

export async function getMonthlyRevenue(months = 6) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result: { month: string; revenue: number; orderCount: number }[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

    const monthOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          gte(orders.paidAt, start),
          sql`${orders.paidAt} <= ${end}`
        )
      );

    const paidOrders = monthOrders.filter((o) =>
      ["paid", "processing", "shipped", "arrived", "completed"].includes(o.orderStatus)
    );

    result.push({
      month: `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}`,
      revenue: paidOrders.reduce((sum, o) => sum + o.totalAmount, 0),
      orderCount: paidOrders.length,
    });
  }

  return result;
}

export async function getTopProducts(limit = 10) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 取得所有已付款訂單的商品明細
  const paidOrders = await db
    .select({ id: orders.id })
    .from(orders)
    .where(
      sql`${orders.orderStatus} IN ('paid', 'processing', 'shipped', 'arrived', 'completed')`
    );

  if (paidOrders.length === 0) return [];

  const orderIds = paidOrders.map((o) => o.id);

  const allItems = await db
    .select()
    .from(orderItems)
    .where(sql`${orderItems.orderId} IN (${sql.join(orderIds.map((id) => sql`${id}`), sql`, `)})`);

  // 統計各商品銷售量
  const productMap = new Map<string, { productId: string; productName: string; totalQty: number; totalRevenue: number }>();

  for (const item of allItems) {
    const existing = productMap.get(item.productId);
    if (existing) {
      existing.totalQty += item.quantity;
      existing.totalRevenue += item.subtotal;
    } else {
      productMap.set(item.productId, {
        productId: item.productId,
        productName: item.productName,
        totalQty: item.quantity,
        totalRevenue: item.subtotal,
      });
    }
  }

  return Array.from(productMap.values())
    .sort((a, b) => b.totalQty - a.totalQty)
    .slice(0, limit);
}

// ─── 物流訂單 ─────────────────────────────────────────────────────────────────

export async function createLogisticsOrder(data: InsertLogisticsOrder) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(logisticsOrders).values(data);

  const [created] = await db
    .select()
    .from(logisticsOrders)
    .where(eq(logisticsOrders.logisticsMerchantTradeNo, data.logisticsMerchantTradeNo))
    .limit(1);

  return created;
}

export async function updateLogisticsStatus(
  logisticsMerchantTradeNo: string,
  status: "created" | "in_transit" | "arrived" | "picked_up" | "returned" | "failed",
  extra?: { cvsPaymentNo?: string; cvsValidationNo?: string; bookingNote?: string; arrivedAt?: Date; pickedUpAt?: Date }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(logisticsOrders)
    .set({
      logisticsStatus: status,
      ...extra,
    })
    .where(eq(logisticsOrders.logisticsMerchantTradeNo, logisticsMerchantTradeNo));
}

/** 依 userId 查詢該會員的所有訂單（含商品明細） */
export async function getOrdersByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const memberOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt))
    .limit(50);

  const ordersWithItems = await Promise.all(
    memberOrders.map(async (order) => {
      const items = await db!
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));

      const [logistics] = await db!
        .select()
        .from(logisticsOrders)
        .where(eq(logisticsOrders.orderId, order.id))
        .limit(1);

      return { ...order, items, logistics: logistics ?? null };
    })
  );

  return ordersWithItems;
}

/** 依 buyerEmail 查詢該會員的所有訂單（含商品明細） */
export async function getOrdersByEmail(email: string) {
  const db = await getDb();
  if (!db) return [];

  const key = normalizeOrderEmail(email);
  const memberOrders = await db
    .select()
    .from(orders)
    .where(sql`LOWER(TRIM(${orders.buyerEmail})) = ${key}`)
    .orderBy(desc(orders.createdAt))
    .limit(50);

  const ordersWithItems = await Promise.all(
    memberOrders.map(async (order) => {
      const items = await db!
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));

      const [logistics] = await db!
        .select()
        .from(logisticsOrders)
        .where(eq(logisticsOrders.orderId, order.id))
        .limit(1);

      return { ...order, items, logistics: logistics ?? null };
    })
  );

  return ordersWithItems;
}
