/**
 * 庫存與庫存鎖定資料庫函式
 */
import { eq, lt, and, sql } from "drizzle-orm";
import { getDb } from "./db";
import {
  productInventory,
  inventoryLocks,
  orders,
  orderItems,
  dbProducts,
  InsertInventoryLock,
  InsertProductInventory,
} from "../drizzle/schema";
import { CUSTOM_PRODUCT_IDS } from "../shared/const";

let ordersColumnsEnsured = false;
export async function ensureOrdersColumns() {
  if (ordersColumnsEnsured) return;
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(sql`ALTER TABLE \`orders\` ADD COLUMN \`inventoryDeducted\` BOOLEAN NOT NULL DEFAULT FALSE`);
  } catch { /* column already exists */ }
  ordersColumnsEnsured = true;
}

const NO_EXPIRY_LOCK_DATE = new Date("2038-01-01T00:00:00.000Z");
const NON_INVENTORY_PRODUCT_IDS = new Set(["shipping", "shipping-fee", "payment-fee", ...CUSTOM_PRODUCT_IDS]);

function shouldSkipInventory(productId: string) {
  return NON_INVENTORY_PRODUCT_IDS.has(productId);
}

async function isMonthlyLimitedProduct(productId: string) {
  const db = await getDb();
  if (!db) return false;
  const [product] = await db
    .select({ isMonthlyLimited: dbProducts.isMonthlyLimited })
    .from(dbProducts)
    .where(eq(dbProducts.id, productId))
    .limit(1);
  return product?.isMonthlyLimited === true;
}

// ─── 庫存查詢 ─────────────────────────────────────────────────────────────────

export async function getProductInventory(productId: string) {
  const db = await getDb();
  if (!db) return null;

  const [inv] = await db
    .select()
    .from(productInventory)
    .where(eq(productInventory.productId, productId))
    .limit(1);

  return inv ?? null;
}

export async function upsertProductInventory(data: InsertProductInventory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getProductInventory(data.productId);
  if (existing) {
    await db
      .update(productInventory)
      .set({ stock: data.stock, allowPreorder: data.allowPreorder, preorderNote: data.preorderNote })
      .where(eq(productInventory.productId, data.productId));
  } else {
    await db.insert(productInventory).values(data);
  }
}

// ─── 庫存鎖定 ─────────────────────────────────────────────────────────────────

/**
 * 嘗試鎖定庫存（預設結帳保留 10 分鐘）
 * 回傳 { success: true } 或 { success: false, reason }
 */
export async function acquireInventoryLock(
  productId: string,
  quantity: number,
  sessionToken: string,
  ttlMs: number | null = 10 * 60 * 1000
): Promise<{ success: boolean; reason?: string }> {
  const db = await getDb();
  if (!db) return { success: false, reason: "Database not available" };

  if (shouldSkipInventory(productId)) {
    return { success: true };
  }

  // 先清除過期鎖定
  await releaseExpiredLocks();

  // 查詢商品庫存設定
  const inv = await getProductInventory(productId);
  const monthlyLimited = await isMonthlyLimitedProduct(productId);

  // 無限庫存（stock = -1）或未設定庫存 → 直接允許
  if (!inv || inv.stock === -1) {
    await createLock(productId, quantity, sessionToken, ttlMs);
    return { success: true };
  }

  if (inv.stock <= 0) {
    if (monthlyLimited) {
      return { success: false, reason: "商品已售完" };
    }
    await createLock(productId, quantity, sessionToken, ttlMs);
    return { success: true };
  }

  // 計算目前有效鎖定數量
  const now = new Date();
  const activeLocks = await db
    .select()
    .from(inventoryLocks)
    .where(
      and(
        eq(inventoryLocks.productId, productId),
        sql`${inventoryLocks.expiresAt} > NOW()`
      )
    );

  const lockedQty = activeLocks.reduce((sum, l) => sum + l.quantity, 0);
  const availableQty = inv.stock - lockedQty;

  if (availableQty < quantity) {
    if (monthlyLimited) {
      return { success: false, reason: "商品庫存不足" };
    }
    // 庫存不足仍允許下單（視為預購）
    await createLock(productId, quantity, sessionToken, ttlMs);
    return { success: true };
  }

  await createLock(productId, quantity, sessionToken, ttlMs);
  return { success: true };
}

async function createLock(productId: string, quantity: number, sessionToken: string, ttlMs: number | null) {
  const db = await getDb();
  if (!db) return;

  const expiresAt = ttlMs == null ? NO_EXPIRY_LOCK_DATE : new Date(Date.now() + ttlMs);

  await db.insert(inventoryLocks).values({
    productId,
    quantity,
    sessionToken,
    expiresAt,
  });
}

/**
 * 釋放過期的庫存鎖定
 */
export async function releaseExpiredLocks() {
  const db = await getDb();
  if (!db) return;

  const now = new Date();
  await db
    .delete(inventoryLocks)
    .where(lt(inventoryLocks.expiresAt, now));
}

/**
 * 釋放特定 session 的鎖定（付款成功或取消時）
 */
export async function releaseSessionLocks(sessionToken: string) {
  const db = await getDb();
  if (!db) return;

  await db
    .delete(inventoryLocks)
    .where(eq(inventoryLocks.sessionToken, sessionToken));
}

/**
 * 庫存扣減：已扣減過（inventoryDeducted=true）則跳過，防止重複
 */
export async function deductInventoryAfterPayment(merchantTradeNo: string) {
  const db = await getDb();
  if (!db) return;

  await ensureOrdersColumns();

  const [order] = await db
    .select({ id: orders.id, inventoryDeducted: orders.inventoryDeducted })
    .from(orders)
    .where(eq(orders.merchantTradeNo, merchantTradeNo))
    .limit(1);
  if (!order || order.inventoryDeducted) return;

  const items = await db
    .select({ productId: orderItems.productId, quantity: orderItems.quantity })
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));

  for (const item of items) {
    if (shouldSkipInventory(item.productId)) continue;
    await db
      .update(productInventory)
      .set({ stock: sql`GREATEST(0, ${productInventory.stock} - ${item.quantity})` })
      .where(
        and(
          eq(productInventory.productId, item.productId),
          sql`${productInventory.stock} != -1`
        )
      );
  }

  await db
    .update(orders)
    .set({ inventoryDeducted: true })
    .where(eq(orders.merchantTradeNo, merchantTradeNo));
}

/**
 * 庫存還原：只有曾扣減過才加回
 */
export async function restoreInventoryOnCancel(merchantTradeNo: string) {
  const db = await getDb();
  if (!db) return;

  await ensureOrdersColumns();

  const [order] = await db
    .select({ id: orders.id, inventoryDeducted: orders.inventoryDeducted })
    .from(orders)
    .where(eq(orders.merchantTradeNo, merchantTradeNo))
    .limit(1);
  if (!order || !order.inventoryDeducted) return;

  const items = await db
    .select({ productId: orderItems.productId, quantity: orderItems.quantity })
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));

  for (const item of items) {
    if (shouldSkipInventory(item.productId)) continue;
    await db
      .update(productInventory)
      .set({ stock: sql`${productInventory.stock} + ${item.quantity}` })
      .where(
        and(
          eq(productInventory.productId, item.productId),
          sql`${productInventory.stock} != -1`
        )
      );
  }
}

/**
 * 依訂單商品鎖定庫存；ttlMs 為 null 時代表長期保留，直到確認收款或取消訂單。
 */
export async function acquireInventoryLocksForOrder(
  merchantTradeNo: string,
  ttlMs: number | null
): Promise<{ success: boolean; reason?: string }> {
  const db = await getDb();
  if (!db) return { success: false, reason: "Database not available" };

  const [order] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.merchantTradeNo, merchantTradeNo))
    .limit(1);
  if (!order) return { success: false, reason: "找不到訂單" };

  const items = await db
    .select({ productId: orderItems.productId, quantity: orderItems.quantity })
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));

  await releaseSessionLocks(merchantTradeNo);

  for (const item of items) {
    if (shouldSkipInventory(item.productId)) continue;
    const result = await acquireInventoryLock(item.productId, item.quantity, merchantTradeNo, ttlMs);
    if (!result.success) {
      await releaseSessionLocks(merchantTradeNo);
      return result;
    }
  }

  return { success: true };
}

/**
 * 查詢商品目前可購買狀態
 */
export async function getProductAvailability(productId: string) {
  const db = await getDb();
  if (!db) return { available: true, stock: -1, isPreorder: false, preorderNote: null, isMonthlyLimited: false };

  const inv = await getProductInventory(productId);
  const monthlyLimited = await isMonthlyLimitedProduct(productId);
  if (!inv || inv.stock === -1) {
    return { available: true, stock: -1, isPreorder: false, preorderNote: null, isMonthlyLimited: monthlyLimited };
  }

  if (monthlyLimited && inv.stock <= 0) {
    return {
      available: false,
      stock: inv.stock,
      isPreorder: false,
      preorderNote: null,
      isMonthlyLimited: true,
    };
  }

  return {
    available: true,
    stock: inv.stock,
    isPreorder: inv.stock <= 0,
    preorderNote: inv.preorderNote ?? null,
    isMonthlyLimited: monthlyLimited,
  };
}
