import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, json, boolean, bigint } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  // Email 會員密碼（bcrypt 雜湊）
  passwordHash: varchar("passwordHash", { length: 256 }),
  // Email 驗證狀態
  emailVerified: boolean("emailVerified").default(false).notNull(),
  // Email 驗證 token（有效期 24 小時）
  verifyToken: varchar("verifyToken", { length: 128 }),
  verifyTokenExpiresAt: timestamp("verifyTokenExpiresAt"),
  // 密碼重設 token（有效期 1 小時）
  resetToken: varchar("resetToken", { length: 128 }),
  resetTokenExpiresAt: timestamp("resetTokenExpiresAt"),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── 商品庫存表 ───────────────────────────────────────────────────────────────
export const productInventory = mysqlTable("productInventory", {
  id: int("id").autoincrement().primaryKey(),
  productId: varchar("productId", { length: 64 }).notNull().unique(),
  productName: varchar("productName", { length: 200 }).notNull(),
  // 實際庫存數量（-1 = 無限庫存）
  stock: int("stock").default(-1).notNull(),
  // 是否允許預購（庫存為0時仍可下單）
  allowPreorder: boolean("allowPreorder").default(false).notNull(),
  // 預購說明文字（如：預計 7-14 天出貨）
  preorderNote: varchar("preorderNote", { length: 200 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProductInventory = typeof productInventory.$inferSelect;
export type InsertProductInventory = typeof productInventory.$inferInsert;

// ─── 庫存鎖定表（結帳保留中，10分鐘後自動釋放）─────────────────────────────
export const inventoryLocks = mysqlTable("inventoryLocks", {
  id: int("id").autoincrement().primaryKey(),
  productId: varchar("productId", { length: 64 }).notNull(),
  quantity: int("quantity").default(1).notNull(),
  // 鎖定的 session token（匿名用戶用）
  sessionToken: varchar("sessionToken", { length: 128 }).notNull(),
  // 鎖定到期時間（預設 10 分鐘後）
  expiresAt: timestamp("expiresAt").notNull(),
  // 關聯的訂單（付款成功後填入）
  orderId: int("orderId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InventoryLock = typeof inventoryLocks.$inferSelect;
export type InsertInventoryLock = typeof inventoryLocks.$inferInsert;

// ─── 訂單主表 ─────────────────────────────────────────────────────────────────
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  // 關聯會員（若為匿名購買則為 null）
  userId: int("userId"),
  // 綠界交易編號（MerchantTradeNo）
  merchantTradeNo: varchar("merchantTradeNo", { length: 32 }).notNull().unique(),
  // 綠界回傳的交易序號
  tradeNo: varchar("tradeNo", { length: 64 }),
  // 付款狀態
  paymentStatus: mysqlEnum("paymentStatus", [
    "pending",       // 待付款
    "paid",          // 已付款（刷卡/Apple Pay）
    "transfer_pending", // 銀行轉帳待確認
    "confirmed",     // 老闆已確認收款
    "failed",        // 付款失敗
    "cancelled",     // 已取消
  ]).default("pending").notNull(),
  // 付款方式
  paymentMethod: mysqlEnum("paymentMethod", [
    "credit",        // 信用卡 / Apple Pay
    "atm",           // 銀行轉帳（私帳）
  ]).default("credit").notNull(),
  // 配送方式
  shippingMethod: mysqlEnum("shippingMethod", [
    "cvs_711",       // 7-11 超商取貨
    "cvs_family",    // 全家超商取貨
    "home",          // 宅配
  ]).notNull().default("home"),
  // 訂單狀態
  orderStatus: mysqlEnum("orderStatus", [
    "pending_payment",  // 待付款
    "paid",             // 已付款（待出貨）
    "processing",       // 處理中（備貨）
    "shipped",          // 已出貨
    "arrived",          // 已到店/已送達
    "completed",        // 已完成（已領取）
    "cancelled",        // 已取消
  ]).default("pending_payment").notNull(),
  // 是否為預購訂單
  isPreorder: boolean("isPreorder").default(false).notNull(),
  // 訂單金額
  totalAmount: int("totalAmount").notNull(),
  // 購買人資訊
  buyerName: varchar("buyerName", { length: 64 }).notNull(),
  buyerEmail: varchar("buyerEmail", { length: 320 }).notNull(),
  buyerPhone: varchar("buyerPhone", { length: 20 }).notNull(),
  // 超商物流資訊
  cvsStoreId: varchar("cvsStoreId", { length: 20 }),
  cvsStoreName: varchar("cvsStoreName", { length: 100 }),
  cvsType: varchar("cvsType", { length: 20 }),
  // 宅配地址
  shippingAddress: text("shippingAddress"),
  receiverZipCode: varchar("receiverZipCode", { length: 10 }),
  // 銀行轉帳末五碼（客人填入）
  transferLastFive: varchar("transferLastFive", { length: 5 }),
  // 老闆備註
  adminNote: text("adminNote"),
  // 綠界回傳的完整通知資料（JSON）
  ecpayNotifyData: json("ecpayNotifyData"),
  // 付款時間
  paidAt: timestamp("paidAt"),
  // 老闆確認收款時間（銀行轉帳用）
  confirmedAt: timestamp("confirmedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

// ─── 訂單商品明細表 ───────────────────────────────────────────────────────────
export const orderItems = mysqlTable("orderItems", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: varchar("productId", { length: 64 }).notNull(),
  productName: varchar("productName", { length: 200 }).notNull(),
  productImage: text("productImage"),
  quantity: int("quantity").notNull(),
  unitPrice: int("unitPrice").notNull(),
  subtotal: int("subtotal").notNull(),
  // 是否為預購商品
  isPreorder: boolean("isPreorder").default(false).notNull(),
});

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

// ─── 物流訂單表 ───────────────────────────────────────────────────────────────
export const logisticsOrders = mysqlTable("logisticsOrders", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().unique(),
  // 綠界物流訂單編號
  logisticsMerchantTradeNo: varchar("logisticsMerchantTradeNo", { length: 32 }).notNull().unique(),
  // 綠界回傳的物流交易序號
  allPayLogisticsId: varchar("allPayLogisticsId", { length: 64 }),
  // 物流類型
  logisticsType: mysqlEnum("logisticsType", [
    "CVS",    // 超商取貨
    "HOME",   // 宅配
  ]).notNull(),
  // 超商類型（UNIMART=7-11, FAMI=全家）
  logisticsSubType: varchar("logisticsSubType", { length: 20 }),
  // 物流狀態
  logisticsStatus: mysqlEnum("logisticsStatus", [
    "created",      // 已建立物流訂單
    "in_transit",   // 運送中
    "arrived",      // 已到店/已送達
    "picked_up",    // 已取貨
    "returned",     // 已退回
    "failed",       // 物流失敗
  ]).default("created").notNull(),
  // 超商交貨便條碼（CVS 用）
  cvsPaymentNo: varchar("cvsPaymentNo", { length: 64 }),
  cvsValidationNo: varchar("cvsValidationNo", { length: 64 }),
  // 宅配追蹤號碼
  bookingNote: varchar("bookingNote", { length: 64 }),
  // 綠界物流回傳原始資料
  ecpayLogisticsData: json("ecpayLogisticsData"),
  // 到店時間
  arrivedAt: timestamp("arrivedAt"),
  // 取貨時間
  pickedUpAt: timestamp("pickedUpAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LogisticsOrder = typeof logisticsOrders.$inferSelect;
export type InsertLogisticsOrder = typeof logisticsOrders.$inferInsert;
