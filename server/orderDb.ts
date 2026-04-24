/**
 * 訂單資料庫查詢函式
 */
import { eq, desc, and, gte, sql, inArray, SQL, or } from "drizzle-orm";
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

type DbInstance = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type OrderRow = typeof orders.$inferSelect;
type OrderItemRow = typeof orderItems.$inferSelect;
type LogisticsRow = typeof logisticsOrders.$inferSelect;

export type OrderWithItemsAndLogistics = OrderRow & {
  items: OrderItemRow[];
  logistics: LogisticsRow | null;
};

export type AdminOrderListItem = Pick<
  OrderRow,
  | "id"
  | "merchantTradeNo"
  | "paymentStatus"
  | "paymentMethod"
  | "shippingMethod"
  | "orderStatus"
  | "isPreorder"
  | "totalAmount"
  | "buyerName"
  | "createdAt"
> & {
  itemCount: number;
  hasLogistics: boolean;
};

export type AdminOrdersPage = {
  items: AdminOrderListItem[];
  total: number;
  page: number;
  pageSize: number;
};

/** 批次載入商品明細與物流，避免 N+1 查詢（管理後台 list、會員訂單） */
async function attachItemsAndLogisticsForOrders(
  db: DbInstance,
  orderRows: OrderRow[]
): Promise<OrderWithItemsAndLogistics[]> {
  if (orderRows.length === 0) return [];

  const orderIds = orderRows.map((o) => o.id);
  const allItems = await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds));
  const allLogistics = await db.select().from(logisticsOrders).where(inArray(logisticsOrders.orderId, orderIds));

  const itemsByOrder = new Map<number, OrderItemRow[]>();
  for (const item of allItems) {
    const arr = itemsByOrder.get(item.orderId) ?? [];
    arr.push(item);
    itemsByOrder.set(item.orderId, arr);
  }

  const logisticsByOrder = new Map<number, LogisticsRow>();
  for (const log of allLogistics) {
    logisticsByOrder.set(log.orderId, log);
  }

  return orderRows.map((order) => ({
    ...order,
    items: itemsByOrder.get(order.id) ?? [],
    logistics: logisticsByOrder.get(order.id) ?? null,
  }));
}

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

  let statusWhere: SQL | undefined;
  if (statusFilter && statusFilter !== "all") {
    statusWhere =
      statusFilter === "transfer_pending"
        ? eq(orders.paymentStatus, "transfer_pending")
        : eq(orders.orderStatus, statusFilter as OrderRow["orderStatus"]);
  }

  const allOrders = statusWhere
    ? await db
        .select()
        .from(orders)
        .where(statusWhere)
        .orderBy(desc(orders.createdAt))
        .limit(limit)
        .offset(offset)
    : await db
        .select()
        .from(orders)
        .orderBy(desc(orders.createdAt))
        .limit(limit)
        .offset(offset);

  return attachItemsAndLogisticsForOrders(db, allOrders);
}

function buildOrderStatusWhere(statusFilter?: string): SQL | undefined {
  if (!statusFilter || statusFilter === "all") return undefined;

  return statusFilter === "transfer_pending"
    ? eq(orders.paymentStatus, "transfer_pending")
    : eq(orders.orderStatus, statusFilter as OrderRow["orderStatus"]);
}

export async function getAdminOrderSummaries(
  limit = 100,
  offset = 0,
  statusFilter?: string
): Promise<AdminOrdersPage> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const statusWhere = buildOrderStatusWhere(statusFilter);

  const summarySelect = {
    id: orders.id,
    merchantTradeNo: orders.merchantTradeNo,
    paymentStatus: orders.paymentStatus,
    paymentMethod: orders.paymentMethod,
    shippingMethod: orders.shippingMethod,
    orderStatus: orders.orderStatus,
    isPreorder: orders.isPreorder,
    totalAmount: orders.totalAmount,
    buyerName: orders.buyerName,
    createdAt: orders.createdAt,
  };

  const orderRows = statusWhere
    ? await db
        .select(summarySelect)
        .from(orders)
        .where(statusWhere)
        .orderBy(desc(orders.createdAt))
        .limit(limit)
        .offset(offset)
    : await db
        .select(summarySelect)
        .from(orders)
        .orderBy(desc(orders.createdAt))
        .limit(limit)
        .offset(offset);

  const [totalRow] = statusWhere
    ? await db
        .select({ count: sql<number>`CAST(COUNT(*) AS SIGNED)` })
        .from(orders)
        .where(statusWhere)
    : await db
        .select({ count: sql<number>`CAST(COUNT(*) AS SIGNED)` })
        .from(orders);

  const total = Number(totalRow?.count ?? 0);
  const page = Math.floor(offset / limit) + 1;

  if (orderRows.length === 0) {
    return {
      items: [],
      total,
      page,
      pageSize: limit,
    };
  }

  const orderIds = orderRows.map((order) => order.id);
  const itemCounts = await db
    .select({
      orderId: orderItems.orderId,
      itemCount: sql<number>`CAST(COUNT(*) AS SIGNED)`,
    })
    .from(orderItems)
    .where(inArray(orderItems.orderId, orderIds))
    .groupBy(orderItems.orderId);

  const logisticsRows = await db
    .select({ orderId: logisticsOrders.orderId })
    .from(logisticsOrders)
    .where(inArray(logisticsOrders.orderId, orderIds));

  const itemCountByOrderId = new Map(itemCounts.map((row) => [row.orderId, Number(row.itemCount ?? 0)]));
  const logisticsOrderIds = new Set(logisticsRows.map((row) => row.orderId));

  return {
    items: orderRows.map((order) => ({
      ...order,
      itemCount: itemCountByOrderId.get(order.id) ?? 0,
      hasLogistics: logisticsOrderIds.has(order.id),
    })),
    total,
    page,
    pageSize: limit,
  };
}

export async function getAdminOrderDetail(orderId: number): Promise<OrderWithItemsAndLogistics | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) return null;

  const [items, logistics] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, order.id)),
    db.select().from(logisticsOrders).where(eq(logisticsOrders.orderId, order.id)).limit(1),
  ]);

  return {
    ...order,
    items,
    logistics: logistics[0] ?? null,
  };
}

export async function getOrderStats() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  /** 單次聚合，避免載入整張 orders 表（訂單多時後台／營收頁會極慢） */
  const [row] = await db
    .select({
      totalOrders: sql<number>`CAST(COUNT(*) AS SIGNED)`,
      pendingPayment: sql<number>`CAST(COALESCE(SUM(CASE WHEN ${orders.orderStatus} = 'pending_payment' THEN 1 ELSE 0 END), 0) AS SIGNED)`,
      transferPending: sql<number>`CAST(COALESCE(SUM(CASE WHEN ${orders.paymentStatus} = 'transfer_pending' THEN 1 ELSE 0 END), 0) AS SIGNED)`,
      toShip: sql<number>`CAST(COALESCE(SUM(CASE WHEN ${orders.orderStatus} IN ('paid', 'processing') THEN 1 ELSE 0 END), 0) AS SIGNED)`,
      paid: sql<number>`CAST(COALESCE(SUM(CASE WHEN ${orders.orderStatus} = 'paid' THEN 1 ELSE 0 END), 0) AS SIGNED)`,
      shipped: sql<number>`CAST(COALESCE(SUM(CASE WHEN ${orders.orderStatus} = 'shipped' THEN 1 ELSE 0 END), 0) AS SIGNED)`,
      completed: sql<number>`CAST(COALESCE(SUM(CASE WHEN ${orders.orderStatus} = 'completed' THEN 1 ELSE 0 END), 0) AS SIGNED)`,
      totalRevenue: sql<number>`CAST(COALESCE(SUM(CASE WHEN ${orders.orderStatus} IN ('paid', 'processing', 'shipped', 'arrived', 'completed') THEN ${orders.totalAmount} ELSE 0 END), 0) AS SIGNED)`,
      monthRevenue: sql<number>`CAST(COALESCE(SUM(CASE WHEN ${orders.orderStatus} IN ('paid', 'processing', 'shipped', 'arrived', 'completed') AND ${orders.paidAt} IS NOT NULL AND ${orders.paidAt} >= ${monthStart} THEN ${orders.totalAmount} ELSE 0 END), 0) AS SIGNED)`,
    })
    .from(orders);

  const n = (v: unknown) => Number(v ?? 0);

  return {
    totalOrders: n(row?.totalOrders),
    pendingPayment: n(row?.pendingPayment),
    transferPending: n(row?.transferPending),
    toShip: n(row?.toShip),
    paid: n(row?.paid),
    shipped: n(row?.shipped),
    completed: n(row?.completed),
    totalRevenue: n(row?.totalRevenue),
    monthRevenue: n(row?.monthRevenue),
  };
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

  return attachItemsAndLogisticsForOrders(db, memberOrders);
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

  return attachItemsAndLogisticsForOrders(db, memberOrders);
}

/** 依 userId 與 buyerEmail 合併查詢會員歷史訂單，避免舊匿名訂單漏掉 */
export async function getOrdersForMember(opts: { userId?: number | null; email?: string | null }) {
  const db = await getDb();
  if (!db) return [];

  const conditions: SQL[] = [];

  if (opts.userId != null) {
    conditions.push(eq(orders.userId, opts.userId));
  }

  if (opts.email) {
    const key = normalizeOrderEmail(opts.email);
    conditions.push(sql`LOWER(TRIM(${orders.buyerEmail})) = ${key}`);
  }

  if (conditions.length === 0) return [];

  const whereClause = conditions.length === 1 ? conditions[0] : or(...conditions)!;

  const memberOrders = await db
    .select()
    .from(orders)
    .where(whereClause)
    .orderBy(desc(orders.createdAt))
    .limit(100);

  return attachItemsAndLogisticsForOrders(db, memberOrders);
}
