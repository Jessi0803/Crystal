/**
 * 庫存與庫存鎖定資料庫函式
 */
import { eq, lt, and, sql } from "drizzle-orm";
import { getDb } from "./db";
import {
  productInventory,
  inventoryLocks,
  InsertInventoryLock,
  InsertProductInventory,
} from "../drizzle/schema";

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
 * 嘗試鎖定庫存（結帳保留 10 分鐘）
 * 回傳 { success: true } 或 { success: false, reason }
 */
export async function acquireInventoryLock(
  productId: string,
  quantity: number,
  sessionToken: string
): Promise<{ success: boolean; reason?: string }> {
  const db = await getDb();
  if (!db) return { success: false, reason: "Database not available" };

  // 先清除過期鎖定
  await releaseExpiredLocks();

  // 查詢商品庫存設定
  const inv = await getProductInventory(productId);

  // 無限庫存（stock = -1）或未設定庫存 → 直接允許
  if (!inv || inv.stock === -1) {
    await createLock(productId, quantity, sessionToken);
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
    // 允許預購
    if (inv.allowPreorder) {
      await createLock(productId, quantity, sessionToken);
      return { success: true };
    }
    return { success: false, reason: "庫存不足，此商品目前已被其他客人保留中" };
  }

  await createLock(productId, quantity, sessionToken);
  return { success: true };
}

async function createLock(productId: string, quantity: number, sessionToken: string) {
  const db = await getDb();
  if (!db) return;

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 分鐘後

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
 * 查詢商品目前可購買狀態
 */
export async function getProductAvailability(productId: string) {
  const db = await getDb();
  if (!db) return { available: true, stock: -1, isPreorder: false, preorderNote: null };

  const inv = await getProductInventory(productId);
  if (!inv || inv.stock === -1) {
    return { available: true, stock: -1, isPreorder: false, preorderNote: null };
  }

  await releaseExpiredLocks();

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

  return {
    available: availableQty > 0 || inv.allowPreorder,
    stock: availableQty,
    isPreorder: availableQty <= 0 && inv.allowPreorder,
    preorderNote: inv.preorderNote ?? null,
  };
}
