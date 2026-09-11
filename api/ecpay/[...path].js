// server/_entry/ecpayHandler.ts
import express from "express";

// server/ecpay.ts
import crypto from "crypto";

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  // 綠界金流
  ecpayMerchantId: process.env.ECPAY_MERCHANT_ID ?? "",
  ecpayHashKey: process.env.ECPAY_HASH_KEY ?? "",
  ecpayHashIV: process.env.ECPAY_HASH_IV ?? "",
  // 綠界物流
  ecpayLogisticsMerchantId: process.env.ECPAY_LOGISTICS_MERCHANT_ID ?? "",
  ecpayLogisticsHashKey: process.env.ECPAY_LOGISTICS_HASH_KEY ?? "",
  ecpayLogisticsHashIV: process.env.ECPAY_LOGISTICS_HASH_IV ?? ""
};

// server/ecpay.ts
var usePaymentSandbox = process.env.ECPAY_SANDBOX === "true";
var paymentBaseURL = usePaymentSandbox ? "https://payment-stage.ecpay.com.tw" : "https://payment.ecpay.com.tw";
var ECPAY_CONFIG = {
  MerchantID: ENV.ecpayMerchantId || "3002607",
  HashKey: ENV.ecpayHashKey || "pwFHCqoQZGmho4w6",
  HashIV: ENV.ecpayHashIV || "EkRm7iFT261dpevs",
  PaymentURL: `${paymentBaseURL}/Cashier/AioCheckOut/V5`,
  QueryURL: `${paymentBaseURL}/Cashier/QueryTradeInfo/V5`
};
function ecpayUrlEncode(str) {
  return encodeURIComponent(str).replace(/%20/g, "+").replace(/%2D/gi, "-").replace(/%5F/gi, "_").replace(/%2E/gi, ".").replace(/%21/gi, "!").replace(/%2A/gi, "*").replace(/%28/gi, "(").replace(/%29/gi, ")");
}
function generateCheckMacValue(params) {
  const sortedKeys = Object.keys(params).sort(
    (a, b) => a.toLowerCase().localeCompare(b.toLowerCase())
  );
  const raw = `HashKey=${ECPAY_CONFIG.HashKey}&` + sortedKeys.map((k) => `${k}=${params[k]}`).join("&") + `&HashIV=${ECPAY_CONFIG.HashIV}`;
  const encoded = ecpayUrlEncode(raw).toLowerCase();
  const hash = crypto.createHash("sha256").update(encoded).digest("hex").toUpperCase();
  return hash;
}
function verifyCheckMacValue(params) {
  const { CheckMacValue, ...rest } = params;
  if (!CheckMacValue) return false;
  const expected = generateCheckMacValue(rest);
  return expected === CheckMacValue;
}

// server/ecpayLogistics.ts
import crypto2 from "crypto";
var useLogisticsSandbox = process.env.ECPAY_LOGISTICS_SANDBOX === "true";
var ECPAY_LOGISTICS_CONFIG = {
  MerchantID: ENV.ecpayLogisticsMerchantId || "2000132",
  HashKey: ENV.ecpayLogisticsHashKey || "5294y06JbISpM5x9",
  HashIV: ENV.ecpayLogisticsHashIV || "v77hoKGq4kWxNNIS",
  // 預設使用正式端點；只有明確設定 ECPAY_LOGISTICS_SANDBOX=true 才用沙盒
  BaseURL: useLogisticsSandbox ? "https://logistics-stage.ecpay.com.tw" : "https://logistics.ecpay.com.tw",
  MapURL: useLogisticsSandbox ? "https://logistics-stage.ecpay.com.tw/Express/map" : "https://logistics.ecpay.com.tw/Express/map",
  CreateURL: useLogisticsSandbox ? "https://logistics-stage.ecpay.com.tw/Express/Create" : "https://logistics.ecpay.com.tw/Express/Create",
  PrintTradeDocumentURL: useLogisticsSandbox ? "https://logistics-stage.ecpay.com.tw/Express/v2/PrintTradeDocument" : "https://logistics.ecpay.com.tw/Express/v2/PrintTradeDocument",
  QueryURL: useLogisticsSandbox ? "https://logistics-stage.ecpay.com.tw/Helper/QueryLogisticsTradeInfo/V2" : "https://logistics.ecpay.com.tw/Helper/QueryLogisticsTradeInfo/V2"
};
function ecpayUrlEncode2(str) {
  return encodeURIComponent(str).replace(/%20/g, "+").replace(/%2D/gi, "-").replace(/%5F/gi, "_").replace(/%2E/gi, ".").replace(/%21/gi, "!").replace(/%2A/gi, "*").replace(/%28/gi, "(").replace(/%29/gi, ")");
}
function generateLogisticsCheckMacValue(params, hashKey = ECPAY_LOGISTICS_CONFIG.HashKey, hashIV = ECPAY_LOGISTICS_CONFIG.HashIV) {
  const sortedKeys = Object.keys(params).sort(
    (a, b) => a.toLowerCase().localeCompare(b.toLowerCase())
  );
  const raw = `HashKey=${hashKey}&` + sortedKeys.map((k) => `${k}=${params[k]}`).join("&") + `&HashIV=${hashIV}`;
  const encoded = ecpayUrlEncode2(raw).toLowerCase();
  return crypto2.createHash("md5").update(encoded).digest("hex").toUpperCase();
}
function verifyLogisticsCheckMacValue(params) {
  const { CheckMacValue, ...rest } = params;
  if (!CheckMacValue) return false;
  const expected = generateLogisticsCheckMacValue(rest);
  return expected === CheckMacValue;
}
function buildCVSMapParams(opts) {
  const params = {
    MerchantID: ECPAY_LOGISTICS_CONFIG.MerchantID,
    MerchantTradeNo: opts.logisticsMerchantTradeNo,
    LogisticsType: "CVS",
    LogisticsSubType: opts.logisticsSubType,
    IsCollection: opts.isCollection ?? "N",
    ServerReplyURL: opts.serverReplyURL,
    ...opts.clientReplyURL ? { ClientReplyURL: opts.clientReplyURL } : {}
  };
  params.CheckMacValue = generateLogisticsCheckMacValue(params);
  return params;
}

// server/orderDb.ts
import { eq as eq2, desc, and as and2, gte, sql as sql2, inArray, or } from "drizzle-orm";

// server/_core/emailNormalize.ts
function normalizeOrderEmail(email) {
  return email.trim().toLowerCase();
}

// server/db.ts
import { eq, and, gt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

// drizzle/schema.ts
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, boolean, index, longtext, decimal } from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
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
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var productInventory = mysqlTable("productInventory", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var inventoryLocks = mysqlTable("inventoryLocks", {
  id: int("id").autoincrement().primaryKey(),
  productId: varchar("productId", { length: 64 }).notNull(),
  quantity: int("quantity").default(1).notNull(),
  // 鎖定的 session token（匿名用戶用）
  sessionToken: varchar("sessionToken", { length: 128 }).notNull(),
  // 鎖定到期時間（預設 10 分鐘後）
  expiresAt: timestamp("expiresAt").notNull(),
  // 關聯的訂單（付款成功後填入）
  orderId: int("orderId"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  // 關聯會員（若為匿名購買則為 null）
  userId: int("userId"),
  // 綠界交易編號（MerchantTradeNo）
  merchantTradeNo: varchar("merchantTradeNo", { length: 32 }).notNull().unique(),
  // 綠界回傳的交易序號
  tradeNo: varchar("tradeNo", { length: 64 }),
  // 付款狀態
  paymentStatus: mysqlEnum("paymentStatus", [
    "pending",
    // 待付款
    "paid",
    // 已付款（刷卡/Apple Pay）
    "transfer_pending",
    // 銀行轉帳待確認
    "confirmed",
    // 老闆已確認收款
    "failed",
    // 付款失敗
    "cancelled"
    // 已取消
  ]).default("pending").notNull(),
  // 付款方式
  paymentMethod: mysqlEnum("paymentMethod", [
    "credit",
    // 信用卡 / Apple Pay
    "atm",
    // 銀行轉帳（私帳）
    "paypal"
    // PayPal（海外）
  ]).default("credit").notNull(),
  // 結帳配送地區（國內超商／綠界；海外僅國際宅配 + PayPal）
  deliveryRegion: varchar("deliveryRegion", { length: 16 }).default("domestic").notNull(),
  // 配送方式
  shippingMethod: mysqlEnum("shippingMethod", [
    "cvs_711",
    // 7-11 超商取貨
    "cvs_family",
    // 全家超商取貨
    "home"
    // 宅配
  ]).notNull().default("home"),
  // 訂單狀態
  orderStatus: mysqlEnum("orderStatus", [
    "pending_payment",
    // 待付款
    "deposit_paid",
    // 已付訂金（客製化）
    "paid",
    // 已付款（待出貨）
    "processing",
    // 處理中（備貨）
    "shipped",
    // 已出貨
    "arrived",
    // 已到店/已送達
    "picked_up",
    // 已取貨
    "not_picked",
    // 未取貨/退件
    "completed",
    // 已完成
    "cancelled"
    // 已取消
  ]).default("pending_payment").notNull(),
  // 是否為預購訂單
  isPreorder: boolean("isPreorder").default(false).notNull(),
  // 是否為客製化訂金訂單
  isCustomOrder: boolean("isCustomOrder").default(false).notNull(),
  // 單筆訂單免運覆寫（例如合併訂單後由後台處理免運）
  freeShippingOverride: boolean("freeShippingOverride").default(false).notNull(),
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
  // 銀行轉帳成功截圖 URL 或 data URL（客人上傳）
  transferReceiptUrl: longtext("transferReceiptUrl"),
  // 顧客諮詢備註（客製化報名表單填寫內容）
  customerNote: text("customerNote"),
  // 老闆備註
  adminNote: text("adminNote"),
  // 綠界回傳的完整通知資料（JSON）
  ecpayNotifyData: json("ecpayNotifyData"),
  // 庫存是否已扣減（防止重複扣減）
  inventoryDeducted: boolean("inventoryDeducted").default(false).notNull(),
  // 付款時間
  paidAt: timestamp("paidAt"),
  // 老闆確認收款時間（銀行轉帳用）
  confirmedAt: timestamp("confirmedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => [
  index("orders_created_at_idx").on(table.createdAt),
  index("orders_order_status_created_at_idx").on(table.orderStatus, table.createdAt),
  index("orders_payment_status_created_at_idx").on(table.paymentStatus, table.createdAt),
  index("orders_paid_at_idx").on(table.paidAt)
]);
var orderMergeGroups = mysqlTable("orderMergeGroups", {
  id: int("id").autoincrement().primaryKey(),
  mergeCode: varchar("mergeCode", { length: 32 }).notNull().unique(),
  mainOrderId: int("mainOrderId").notNull().unique(),
  adminNote: text("adminNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => [
  index("order_merge_groups_main_order_id_idx").on(table.mainOrderId)
]);
var orderMergeMembers = mysqlTable("orderMergeMembers", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(),
  orderId: int("orderId").notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => [
  index("order_merge_members_group_id_idx").on(table.groupId),
  index("order_merge_members_order_id_idx").on(table.orderId)
]);
var orderItems = mysqlTable("orderItems", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: varchar("productId", { length: 64 }).notNull(),
  productName: varchar("productName", { length: 200 }).notNull(),
  productImage: text("productImage"),
  quantity: int("quantity").notNull(),
  unitPrice: int("unitPrice").notNull(),
  subtotal: int("subtotal").notNull(),
  purchaseOptionId: varchar("purchaseOptionId", { length: 64 }),
  // 是否為預購商品
  isPreorder: boolean("isPreorder").default(false).notNull()
}, (table) => [
  index("order_items_order_id_idx").on(table.orderId)
]);
var orderBalancePayments = mysqlTable("orderBalancePayments", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().unique(),
  merchantTradeNo: varchar("merchantTradeNo", { length: 32 }).notNull().unique(),
  amount: int("amount").notNull(),
  shippingFee: int("shippingFee").default(0).notNull(),
  paymentFee: int("paymentFee").default(0).notNull(),
  totalAmount: int("totalAmount").notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["credit", "atm"]).default("credit").notNull(),
  paymentStatus: mysqlEnum("paymentStatus", [
    "pending",
    "transfer_pending",
    "paid",
    "failed",
    "cancelled"
  ]).default("pending").notNull(),
  transferLastFive: varchar("transferLastFive", { length: 5 }),
  transferReceiptUrl: longtext("transferReceiptUrl"),
  tradeNo: varchar("tradeNo", { length: 64 }),
  ecpayNotifyData: json("ecpayNotifyData"),
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => [
  index("order_balance_payments_merchant_trade_no_idx").on(table.merchantTradeNo)
]);
var logisticsOrders = mysqlTable("logisticsOrders", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().unique(),
  // 綠界物流訂單編號
  logisticsMerchantTradeNo: varchar("logisticsMerchantTradeNo", { length: 32 }).notNull().unique(),
  // 綠界回傳的物流交易序號
  allPayLogisticsId: varchar("allPayLogisticsId", { length: 64 }),
  // 物流類型
  logisticsType: mysqlEnum("logisticsType", [
    "CVS",
    // 超商取貨
    "HOME"
    // 宅配
  ]).notNull(),
  // 超商類型（UNIMART=7-11, FAMI=全家）
  logisticsSubType: varchar("logisticsSubType", { length: 20 }),
  // 物流狀態
  logisticsStatus: mysqlEnum("logisticsStatus", [
    "created",
    // 已建立物流訂單
    "in_transit",
    // 運送中
    "arrived",
    // 已到店/已送達
    "picked_up",
    // 已取貨
    "returned",
    // 已退回
    "failed"
    // 物流失敗
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var operationAuditEvents = mysqlTable("operationAuditEvents", {
  id: int("id").autoincrement().primaryKey(),
  source: varchar("source", { length: 32 }).notNull(),
  category: varchar("category", { length: 32 }).notNull(),
  action: varchar("action", { length: 96 }).notNull(),
  outcome: varchar("outcome", { length: 24 }).notNull(),
  severity: varchar("severity", { length: 16 }).notNull().default("info"),
  orderId: int("orderId"),
  merchantTradeNo: varchar("merchantTradeNo", { length: 32 }),
  actorUserId: int("actorUserId"),
  summary: varchar("summary", { length: 255 }).notNull(),
  details: json("details").$type(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => [
  index("operation_audit_created_at_idx").on(table.createdAt),
  index("operation_audit_order_created_at_idx").on(table.orderId, table.createdAt),
  index("operation_audit_merchant_created_at_idx").on(table.merchantTradeNo, table.createdAt),
  index("operation_audit_outcome_created_at_idx").on(table.outcome, table.createdAt)
]);
var chatbotLogs = mysqlTable("chatbotLogs", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 64 }).notNull(),
  userId: int("userId"),
  customerName: varchar("customerName", { length: 100 }),
  customerEmail: varchar("customerEmail", { length: 320 }),
  customerQuestion: text("customerQuestion").notNull(),
  botReply: text("botReply").notNull(),
  relatedProducts: json("relatedProducts"),
  retrievedQuestions: json("retrievedQuestions"),
  pagePath: varchar("pagePath", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => [
  index("chatbot_logs_created_at_idx").on(table.createdAt),
  index("chatbot_logs_session_created_at_idx").on(table.sessionId, table.createdAt),
  index("chatbot_logs_user_created_at_idx").on(table.userId, table.createdAt)
]);
var chatbotKnowledge = mysqlTable("chatbotKnowledge", {
  id: varchar("id", { length: 128 }).primaryKey(),
  sourceType: varchar("sourceType", { length: 32 }).notNull(),
  sourceId: varchar("sourceId", { length: 64 }).notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  embedText: text("embedText").notNull(),
  keywords: json("keywords").$type(),
  category: varchar("category", { length: 64 }).notNull(),
  relatedProductIds: json("relatedProductIds").$type(),
  vector: json("vector").$type(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => [
  index("chatbot_knowledge_source_idx").on(table.sourceType, table.sourceId),
  index("chatbot_knowledge_active_idx").on(table.active)
]);
var siteSettings = mysqlTable("siteSettings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: text("value").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var dbProducts = mysqlTable("products", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  subtitle: varchar("subtitle", { length: 200 }).notNull().default(""),
  category: varchar("category", { length: 64 }).notNull(),
  categoryLabel: varchar("categoryLabel", { length: 64 }).notNull(),
  categories: json("categories").$type(),
  categoryLabels: json("categoryLabels").$type(),
  price: int("price").notNull(),
  originalPrice: int("originalPrice"),
  priceRange: varchar("priceRange", { length: 200 }),
  depositRange: varchar("depositRange", { length: 200 }),
  image: text("image").notNull(),
  images: json("images").$type(),
  tags: json("tags").$type(),
  description: text("description"),
  story: text("story"),
  benefits: json("benefits").$type(),
  suitableFor: json("suitableFor").$type(),
  howToUse: json("howToUse").$type(),
  disclaimer: text("disclaimer"),
  crystalType: text("crystalType"),
  color: varchar("color", { length: 100 }),
  featured: boolean("featured").notNull().default(false),
  active: boolean("active").notNull().default(true),
  isMonthlyLimited: boolean("isMonthlyLimited").notNull().default(false),
  twoItemFreeShippingEligible: boolean("twoItemFreeShippingEligible").notNull().default(true),
  claspOptions: json("claspOptions").$type(),
  showWristSize: boolean("showWristSize").notNull().default(true),
  showFitPreference: boolean("showFitPreference").notNull().default(true),
  wristSizeMin: decimal("wristSizeMin", { precision: 4, scale: 1, mode: "number" }).notNull().default(13),
  wristSizeMax: decimal("wristSizeMax", { precision: 4, scale: 1, mode: "number" }).notNull().default(19),
  wristSizePriceRules: json("wristSizePriceRules").$type(),
  purchaseOptions: json("purchaseOptions").$type(),
  scheduledPublishAt: timestamp("scheduledPublishAt"),
  sortOrder: int("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});

// server/db.ts
var ADMIN_EMAIL_ALLOWLIST = new Set(
  [
    "goodaytarot@gmail.com",
    "baby90522@gmail.com",
    "k0919933386@gmail.com",
    ...process.env.ADMIN_EMAILS?.split(",") ?? []
  ].map((email) => email.trim()).filter(Boolean).map(normalizeOrderEmail)
);
var _pool = null;
function shouldUseTls(databaseUrl) {
  if (process.env.DATABASE_SSL === "true") return true;
  try {
    const url = new URL(databaseUrl);
    return url.hostname.includes("tidbcloud.com");
  } catch {
    return false;
  }
}
function createDb(databaseUrl) {
  if (!shouldUseTls(databaseUrl)) {
    return drizzle(databaseUrl);
  }
  const url = new URL(databaseUrl);
  _pool = mysql.createPool({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, "")),
    waitForConnections: true,
    connectionLimit: Number(process.env.DATABASE_CONNECTION_LIMIT || 10),
    ssl: {
      minVersion: "TLSv1.2",
      rejectUnauthorized: true
    }
  });
  return drizzle(_pool);
}
var _db = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = createDb(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// shared/const.ts
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var CUSTOM_PRODUCT_ID = "custom-deposit-product";
var CUSTOM_TAROT_PRODUCT_ID = "tarot-crystal-deposit-product";
var CUSTOM_CHAKRA_PRODUCT_ID = "chakra-crystal-deposit-product";
var CUSTOM_NUMEROLOGY_PRODUCT_ID = "numerology-crystal-deposit-product";
var CUSTOM_PRODUCT_IDS = [CUSTOM_PRODUCT_ID, CUSTOM_TAROT_PRODUCT_ID, CUSTOM_CHAKRA_PRODUCT_ID, CUSTOM_NUMEROLOGY_PRODUCT_ID];

// server/orderDb.ts
function getAffectedRows(result) {
  const candidate = Array.isArray(result) ? result[0] : result;
  if (!candidate || typeof candidate !== "object") return 0;
  const affectedRows = candidate.affectedRows;
  return typeof affectedRows === "number" ? affectedRows : 0;
}
var balancePaymentLegacySelect = {
  id: orderBalancePayments.id,
  orderId: orderBalancePayments.orderId,
  merchantTradeNo: orderBalancePayments.merchantTradeNo,
  amount: orderBalancePayments.amount,
  shippingFee: orderBalancePayments.shippingFee,
  paymentFee: orderBalancePayments.paymentFee,
  totalAmount: orderBalancePayments.totalAmount,
  paymentMethod: orderBalancePayments.paymentMethod,
  paymentStatus: orderBalancePayments.paymentStatus,
  transferLastFive: orderBalancePayments.transferLastFive,
  transferReceiptUrl: orderBalancePayments.transferReceiptUrl,
  tradeNo: orderBalancePayments.tradeNo,
  ecpayNotifyData: orderBalancePayments.ecpayNotifyData,
  paidAt: orderBalancePayments.paidAt,
  createdAt: orderBalancePayments.createdAt,
  updatedAt: orderBalancePayments.updatedAt
};
function hydrateBalancePayment(row) {
  if (!row) return null;
  return {
    ...row,
    shippingFee: row.shippingFee ?? 0,
    paymentFee: row.paymentFee ?? 0,
    totalAmount: row.totalAmount ?? row.amount
  };
}
var balancePaymentColumnsEnsured = false;
async function ensureBalancePaymentColumns(db) {
  if (balancePaymentColumnsEnsured) return;
  try {
    await db.execute(sql2`ALTER TABLE \`orderBalancePayments\` ADD COLUMN \`transferReceiptUrl\` longtext NULL`);
  } catch {
  }
  balancePaymentColumnsEnsured = true;
}
async function getOrderByMerchantTradeNo(merchantTradeNo) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [order] = await db.select().from(orders).where(eq2(orders.merchantTradeNo, merchantTradeNo)).limit(1);
  return order ?? null;
}
async function getOrderWithItems(merchantTradeNo) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await ensureBalancePaymentColumns(db);
  const [order] = await db.select().from(orders).where(eq2(orders.merchantTradeNo, merchantTradeNo)).limit(1);
  if (!order) return null;
  const items = await db.select().from(orderItems).where(eq2(orderItems.orderId, order.id));
  const [logistics] = await db.select().from(logisticsOrders).where(eq2(logisticsOrders.orderId, order.id)).limit(1);
  const [balancePayment] = await db.select(balancePaymentLegacySelect).from(orderBalancePayments).where(eq2(orderBalancePayments.orderId, order.id)).limit(1);
  return { ...order, items, logistics: logistics ?? null, balancePayment: hydrateBalancePayment(balancePayment) };
}
async function updateOrderPaymentStatus(merchantTradeNo, status, tradeNo, notifyData) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [order] = await db.select({ isCustomOrder: orders.isCustomOrder }).from(orders).where(eq2(orders.merchantTradeNo, merchantTradeNo)).limit(1);
  const result = await db.update(orders).set({
    paymentStatus: status,
    orderStatus: status === "paid" ? order?.isCustomOrder ? "deposit_paid" : "paid" : "cancelled",
    tradeNo,
    ecpayNotifyData: notifyData,
    paidAt: status === "paid" ? /* @__PURE__ */ new Date() : void 0
  }).where(
    and2(
      eq2(orders.merchantTradeNo, merchantTradeNo),
      eq2(orders.paymentStatus, "pending")
    )
  );
  return getAffectedRows(result) > 0;
}
async function updateLogisticsStatus(logisticsMerchantTradeNo, status, extra) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(logisticsOrders).set({
    logisticsStatus: status,
    ...extra
  }).where(eq2(logisticsOrders.logisticsMerchantTradeNo, logisticsMerchantTradeNo));
}
async function getBalancePaymentByMerchantTradeNo(merchantTradeNo) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await ensureBalancePaymentColumns(db);
  const [row] = await db.select(balancePaymentLegacySelect).from(orderBalancePayments).where(eq2(orderBalancePayments.merchantTradeNo, merchantTradeNo)).limit(1);
  return hydrateBalancePayment(row);
}
async function updateBalancePaymentStatus(merchantTradeNo, status, tradeNo, notifyData) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await ensureBalancePaymentColumns(db);
  const [balance] = await db.select(balancePaymentLegacySelect).from(orderBalancePayments).where(eq2(orderBalancePayments.merchantTradeNo, merchantTradeNo)).limit(1);
  if (!balance) return null;
  const result = await db.update(orderBalancePayments).set({
    paymentStatus: status,
    tradeNo,
    ecpayNotifyData: notifyData,
    paidAt: status === "paid" ? /* @__PURE__ */ new Date() : null
  }).where(
    and2(
      eq2(orderBalancePayments.id, balance.id),
      eq2(orderBalancePayments.paymentStatus, "pending")
    )
  );
  if (getAffectedRows(result) === 0) return null;
  if (status === "paid") {
    await db.update(orders).set({ orderStatus: "paid", paymentStatus: "paid", paidAt: /* @__PURE__ */ new Date() }).where(eq2(orders.id, balance.orderId));
  }
  return hydrateBalancePayment(balance);
}

// server/inventoryDb.ts
import { eq as eq3, lt, and as and3, sql as sql3 } from "drizzle-orm";
var ordersColumnsEnsured = false;
async function ensureOrdersColumns() {
  if (ordersColumnsEnsured) return;
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(sql3`ALTER TABLE \`orders\` ADD COLUMN \`inventoryDeducted\` BOOLEAN NOT NULL DEFAULT FALSE`);
  } catch {
  }
  try {
    await db.execute(sql3`ALTER TABLE \`orders\` ADD COLUMN \`transferReceiptUrl\` text NULL`);
  } catch {
  }
  try {
    await db.execute(sql3`ALTER TABLE \`orders\` MODIFY COLUMN \`transferReceiptUrl\` longtext NULL`);
  } catch {
  }
  try {
    await db.execute(sql3`ALTER TABLE \`orders\` ADD COLUMN \`freeShippingOverride\` BOOLEAN NOT NULL DEFAULT FALSE`);
  } catch {
  }
  try {
    await db.execute(sql3`ALTER TABLE \`orderItems\` ADD COLUMN \`purchaseOptionId\` varchar(64) NULL`);
  } catch {
  }
  ordersColumnsEnsured = true;
}
var NON_INVENTORY_PRODUCT_IDS = /* @__PURE__ */ new Set(["shipping", "shipping-fee", "payment-fee", ...CUSTOM_PRODUCT_IDS]);
function shouldSkipInventory(productId) {
  return NON_INVENTORY_PRODUCT_IDS.has(productId);
}
async function adjustPurchaseOptionStock(productId, purchaseOptionId, quantityDelta) {
  if (!purchaseOptionId) return false;
  const db = await getDb();
  if (!db) return false;
  const [product] = await db.select({ purchaseOptions: dbProducts.purchaseOptions }).from(dbProducts).where(eq3(dbProducts.id, productId)).limit(1);
  const options = product?.purchaseOptions;
  const option = options?.find((candidate) => candidate.id === purchaseOptionId);
  if (!options || !option || option.stock == null) return false;
  if (option.stock === -1) return true;
  const nextOptions = options.map(
    (candidate) => candidate.id === purchaseOptionId ? { ...candidate, stock: Math.max(0, (candidate.stock ?? 0) + quantityDelta) } : candidate
  );
  await db.update(dbProducts).set({ purchaseOptions: nextOptions }).where(eq3(dbProducts.id, productId));
  return true;
}
async function deductInventoryAfterPayment(merchantTradeNo) {
  const db = await getDb();
  if (!db) return;
  await ensureOrdersColumns();
  const [order] = await db.select({ id: orders.id, inventoryDeducted: orders.inventoryDeducted }).from(orders).where(eq3(orders.merchantTradeNo, merchantTradeNo)).limit(1);
  if (!order || order.inventoryDeducted) return;
  const items = await db.select({ productId: orderItems.productId, purchaseOptionId: orderItems.purchaseOptionId, quantity: orderItems.quantity }).from(orderItems).where(eq3(orderItems.orderId, order.id));
  for (const item of items) {
    if (shouldSkipInventory(item.productId)) continue;
    const handledByPurchaseOption = await adjustPurchaseOptionStock(item.productId, item.purchaseOptionId, -item.quantity);
    if (handledByPurchaseOption) continue;
    await db.update(productInventory).set({ stock: sql3`GREATEST(0, ${productInventory.stock} - ${item.quantity})` }).where(
      and3(
        eq3(productInventory.productId, item.productId),
        sql3`${productInventory.stock} != -1`
      )
    );
  }
  await db.update(orders).set({ inventoryDeducted: true }).where(eq3(orders.merchantTradeNo, merchantTradeNo));
}
async function deductInventoryAfterBalancePayment(balanceMerchantTradeNo) {
  const db = await getDb();
  if (!db) return;
  await ensureOrdersColumns();
  const [balance] = await db.select({ orderId: orderBalancePayments.orderId }).from(orderBalancePayments).where(eq3(orderBalancePayments.merchantTradeNo, balanceMerchantTradeNo)).limit(1);
  if (!balance) return;
  const [order] = await db.select({ merchantTradeNo: orders.merchantTradeNo }).from(orders).where(eq3(orders.id, balance.orderId)).limit(1);
  if (!order) return;
  await deductInventoryAfterPayment(order.merchantTradeNo);
}

// server/customerOrderNotification.ts
import { eq as eq5 } from "drizzle-orm";

// server/email.ts
import { Resend } from "resend";
var FROM_ADDRESS = "service@goodaytarot.com";
var BRAND_NAME = "\u691B \xB7 Crystal";
var ADMIN_ORDER_NOTIFICATION_EMAIL = process.env.ADMIN_ORDER_NOTIFICATION_EMAIL ?? "goodaytarot@gmail.com";
function getResend() {
  if (!ENV.resendApiKey) throw new Error("RESEND_API_KEY \u672A\u8A2D\u5B9A");
  return new Resend(ENV.resendApiKey);
}
var SHIPPING_LABEL = {
  cvs_711: "7-11 \u8D85\u5546\u53D6\u8CA8",
  cvs_family: "\u5168\u5BB6\u8D85\u5546\u53D6\u8CA8",
  home: "\u5B85\u914D\u5230\u5E9C"
};
var PAYMENT_LABEL = {
  credit: "\u4FE1\u7528\u5361 / Apple Pay",
  credit_card: "\u4FE1\u7528\u5361 / Apple Pay",
  atm: "\u8F49\u5E33",
  bank_transfer: "\u8F49\u5E33",
  paypal: "PayPal"
};
async function sendOrderConfirmEmail(payload) {
  const resend = getResend();
  const {
    to,
    buyerName,
    merchantTradeNo,
    totalAmount,
    shippingMethod,
    paymentMethod,
    cvsStoreName,
    receiverAddress,
    items
  } = payload;
  const itemRows = items.map(
    (item) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0ece7;font-size:13px;color:#333;">${item.productName}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0ece7;font-size:13px;color:#666;text-align:center;">\xD7 ${item.quantity}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0ece7;font-size:13px;color:#333;text-align:right;">NT$ ${item.subtotal.toLocaleString()}</td>
      </tr>`
  ).join("");
  const deliveryInfo = shippingMethod === "home" ? `<p style="margin:4px 0;font-size:13px;color:#555;">\u914D\u9001\u5730\u5740\uFF1A${receiverAddress ?? "\u2014"}</p>` : `<p style="margin:4px 0;font-size:13px;color:#555;">\u53D6\u8CA8\u9580\u5E02\uFF1A${cvsStoreName ?? "\u2014"}</p>`;
  const html = `
<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9f7f4;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f4;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e8e4df;">
        <!-- Header -->
        <tr>
          <td style="padding:32px 40px 24px;border-bottom:1px solid #f0ece7;text-align:center;">
            <p style="margin:0;font-size:11px;letter-spacing:0.2em;color:#999;text-transform:uppercase;">Crystal Energy</p>
            <h1 style="margin:8px 0 0;font-size:22px;font-weight:300;color:#1a1a1a;letter-spacing:0.08em;">${BRAND_NAME}</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 4px;font-size:13px;color:#555;">\u89AA\u611B\u7684 ${buyerName}\uFF0C</p>
            <h2 style="margin:0 0 20px;font-size:18px;font-weight:500;color:#1a1a1a;">\u611F\u8B1D\u60A8\u7684\u8A02\u8CFC\uFF01</h2>

            <!-- \u8A02\u55AE\u8CC7\u8A0A -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f4;padding:16px 20px;margin-bottom:24px;">
              <tr>
                <td style="font-size:11px;letter-spacing:0.1em;color:#999;padding-bottom:10px;">\u8A02\u55AE\u8CC7\u8A0A</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#555;padding:2px 0;">\u8A02\u55AE\u7DE8\u865F\uFF1A<strong style="color:#1a1a1a;">${merchantTradeNo}</strong></td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#555;padding:2px 0;">\u4ED8\u6B3E\u65B9\u5F0F\uFF1A${PAYMENT_LABEL[paymentMethod] ?? paymentMethod}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#555;padding:2px 0;">\u914D\u9001\u65B9\u5F0F\uFF1A${SHIPPING_LABEL[shippingMethod] ?? shippingMethod}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#555;padding:2px 0;">${deliveryInfo}</td>
              </tr>
            </table>

            <!-- \u5546\u54C1\u660E\u7D30 -->
            <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.1em;color:#999;">\u5546\u54C1\u660E\u7D30</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${itemRows}
              <tr>
                <td colspan="2" style="padding:14px 0 0;font-size:13px;font-weight:600;color:#1a1a1a;">\u8A02\u55AE\u7E3D\u8A08</td>
                <td style="padding:14px 0 0;font-size:15px;font-weight:600;color:#1a1a1a;text-align:right;">NT$ ${totalAmount.toLocaleString()}</td>
              </tr>
            </table>

            <p style="margin:24px 0 0;font-size:12px;color:#999;line-height:1.8;">
              \u82E5\u60A8\u6709\u4EFB\u4F55\u554F\u984C\uFF0C\u6B61\u8FCE\u900F\u904E\u5B98\u7DB2\u806F\u7D61\u6211\u5011\u3002<br>
              \u611F\u8B1D\u60A8\u9078\u64C7 ${BRAND_NAME}\uFF0C\u795D\u60A8\u80FD\u91CF\u6EFF\u6EFF \u2728
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #f0ece7;text-align:center;">
            <p style="margin:0;font-size:10px;color:#bbb;letter-spacing:0.1em;">
              \xA9 ${(/* @__PURE__ */ new Date()).getFullYear()} ${BRAND_NAME} \xB7 \u5929\u7136\u6C34\u6676\u80FD\u91CF\u98FE\u54C1
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  return resend.emails.send({
    from: `${BRAND_NAME} <${FROM_ADDRESS}>`,
    to,
    subject: `\u3010${BRAND_NAME}\u3011\u8A02\u55AE\u78BA\u8A8D #${merchantTradeNo}`,
    html
  });
}

// server/lineMessage.ts
import { eq as eq4 } from "drizzle-orm";
function getLineAccessToken() {
  return process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim() || process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN?.trim();
}
function getSiteUrl() {
  return process.env.SITE_URL?.trim().replace(/\/$/, "") || "https://goodaytarot.com";
}
function extractLineUserId(openId) {
  if (!openId?.startsWith("line:")) return null;
  return openId.slice("line:".length);
}
function formatCurrency(amount) {
  return `NT$ ${amount.toLocaleString("zh-TW")}`;
}
async function pushLineTextMessage(to, text2) {
  const token = getLineAccessToken();
  if (!token) {
    console.warn("[LINE Message] LINE_CHANNEL_ACCESS_TOKEN is not configured");
    return { sent: false, reason: "missing_token" };
  }
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      to,
      messages: [{ type: "text", text: text2 }]
    })
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[LINE Message] push failed", { status: res.status, body });
    return { sent: false, reason: "line_api_error" };
  }
  return { sent: true };
}
async function getLineUserIdForOrder(orderId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [order] = await db.select({ userId: orders.userId }).from(orders).where(eq4(orders.id, orderId)).limit(1);
  if (!order?.userId) return null;
  const [user] = await db.select({ openId: users.openId }).from(users).where(eq4(users.id, order.userId)).limit(1);
  return extractLineUserId(user?.openId);
}
async function notifyLineOrderPlaced(orderId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const lineUserId = await getLineUserIdForOrder(orderId);
  if (!lineUserId) return { sent: false, reason: "missing_line_user" };
  const [order] = await db.select().from(orders).where(eq4(orders.id, orderId)).limit(1);
  if (!order) return { sent: false, reason: "missing_order" };
  const items = await db.select().from(orderItems).where(eq4(orderItems.orderId, orderId));
  const productLines = items.filter((item) => !["shipping-fee", "payment-fee"].includes(item.productId)).slice(0, 6).map((item) => `\u30FB${item.productName} x${item.quantity}`).join("\n");
  const paymentLabel = order.paymentMethod === "atm" ? "\u9280\u884C\u8F49\u5E33" : order.paymentMethod === "paypal" ? "PayPal" : "\u4FE1\u7528\u5361";
  const text2 = [
    `${order.buyerName} \u60A8\u597D\uFF0C\u5DF2\u6536\u5230\u60A8\u7684\u8A02\u55AE\u3002`,
    "",
    `\u8A02\u55AE\u7DE8\u865F\uFF1A${order.merchantTradeNo}`,
    `\u4ED8\u6B3E\u65B9\u5F0F\uFF1A${paymentLabel}`,
    `\u8A02\u55AE\u91D1\u984D\uFF1A${formatCurrency(order.totalAmount)}`,
    productLines ? `\u5546\u54C1\uFF1A
${productLines}` : "",
    "",
    `\u67E5\u770B\u8A02\u55AE\uFF1A${getSiteUrl()}/order/${encodeURIComponent(order.merchantTradeNo)}`
  ].filter(Boolean).join("\n");
  return pushLineTextMessage(lineUserId, text2);
}

// server/customerOrderNotification.ts
async function getMerchantTradeNoByOrderId(orderId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [order] = await db.select({ merchantTradeNo: orders.merchantTradeNo }).from(orders).where(eq5(orders.id, orderId)).limit(1);
  return order?.merchantTradeNo ?? null;
}
async function getOrderEmailPayload(orderId) {
  const merchantTradeNo = await getMerchantTradeNoByOrderId(orderId);
  if (!merchantTradeNo) return null;
  const order = await getOrderWithItems(merchantTradeNo);
  if (!order) return null;
  return {
    to: order.buyerEmail,
    buyerName: order.buyerName,
    merchantTradeNo: order.merchantTradeNo,
    totalAmount: order.totalAmount,
    shippingMethod: order.shippingMethod,
    paymentMethod: order.paymentMethod,
    cvsStoreName: order.cvsStoreName,
    receiverAddress: order.shippingAddress,
    items: order.items.map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal
    }))
  };
}
async function notifyCustomerOrderPlacedSafely(orderId) {
  try {
    const lineResult = await notifyLineOrderPlaced(orderId);
    if (lineResult.sent) return;
    if (lineResult.reason === "missing_order") return;
    const emailPayload = await getOrderEmailPayload(orderId);
    if (!emailPayload) return;
    await sendOrderConfirmEmail(emailPayload);
  } catch (error) {
    console.error("[CustomerOrderNotification] order placed failed:", error);
  }
}

// server/ecpayRoutes.ts
import { eq as eq7 } from "drizzle-orm";

// server/auditDb.ts
import { and as and4, desc as desc2, eq as eq6, gte as gte2, sql as sql4 } from "drizzle-orm";
var ensurePromise = null;
async function ensureAuditTable() {
  const db = await getDb();
  if (!db) return null;
  if (!ensurePromise) {
    ensurePromise = db.execute(sql4`
      CREATE TABLE IF NOT EXISTS \`operationAuditEvents\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`source\` varchar(32) NOT NULL,
        \`category\` varchar(32) NOT NULL,
        \`action\` varchar(96) NOT NULL,
        \`outcome\` varchar(24) NOT NULL,
        \`severity\` varchar(16) NOT NULL DEFAULT 'info',
        \`orderId\` int NULL,
        \`merchantTradeNo\` varchar(32) NULL,
        \`actorUserId\` int NULL,
        \`summary\` varchar(255) NOT NULL,
        \`details\` json NULL,
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        INDEX \`operation_audit_created_at_idx\` (\`createdAt\`),
        INDEX \`operation_audit_order_created_at_idx\` (\`orderId\`, \`createdAt\`),
        INDEX \`operation_audit_merchant_created_at_idx\` (\`merchantTradeNo\`, \`createdAt\`),
        INDEX \`operation_audit_outcome_created_at_idx\` (\`outcome\`, \`createdAt\`)
      )
    `).then(() => void 0).catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }
  await ensurePromise;
  return db;
}
var SENSITIVE_KEY = /(password|secret|hash|token|receipt|image|base64|checkmac|authorization|cookie)/i;
function sanitizeValue(value, depth) {
  if (depth > 3) return "[truncated]";
  if (value === null || value === void 0 || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return value.length > 300 ? `${value.slice(0, 300)}\u2026` : value;
  if (Array.isArray(value)) return value.slice(0, 30).map((item) => sanitizeValue(item, depth + 1));
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).slice(0, 50).map(([key, nested]) => [key, SENSITIVE_KEY.test(key) ? "[redacted]" : sanitizeValue(nested, depth + 1)])
    );
  }
  return String(value);
}
function sanitizeAuditDetails(value) {
  const sanitized = sanitizeValue(value, 0);
  return sanitized && typeof sanitized === "object" && !Array.isArray(sanitized) ? sanitized : null;
}
async function recordAuditEvent(event) {
  const db = await ensureAuditTable();
  if (!db) return false;
  await db.insert(operationAuditEvents).values({
    source: event.source,
    category: event.category.slice(0, 32),
    action: event.action.slice(0, 96),
    outcome: event.outcome,
    severity: event.severity ?? (event.outcome === "failed" ? "error" : event.outcome === "rejected" ? "warning" : "info"),
    orderId: event.orderId ?? null,
    merchantTradeNo: event.merchantTradeNo?.slice(0, 32) ?? null,
    actorUserId: event.actorUserId ?? null,
    summary: event.summary.slice(0, 255),
    details: sanitizeAuditDetails(event.details)
  });
  return true;
}
async function recordAuditEventSafely(event) {
  if (process.env.NODE_ENV === "test" && process.env.ENABLE_AUDIT_IN_TESTS !== "true") return false;
  try {
    return await recordAuditEvent(event);
  } catch (error) {
    console.error("[Audit] Failed to persist event", {
      action: event.action,
      outcome: event.outcome,
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}

// server/ecpayRoutes.ts
function mapECPayLogisticsStatus(data) {
  const rtnCode = data.RtnCode ?? "";
  const logisticsSubType = data.LogisticsSubType || data.LogisticsType || "";
  if (["3002", "3003", "3004", "7013"].includes(rtnCode)) return "failed";
  if (logisticsSubType.includes("UNIMART")) {
    if (rtnCode === "2073" || rtnCode === "2063") return "arrived";
    if (rtnCode === "2067") return "picked_up";
    if (rtnCode === "2074") return "returned";
    if (rtnCode === "2098") return "arrived";
  }
  if (logisticsSubType.includes("FAMI")) {
    if (rtnCode === "3018") return "arrived";
    if (rtnCode === "3022") return "picked_up";
    if (rtnCode === "3020") return "returned";
  }
  if (rtnCode === "3018") return "arrived";
  if (rtnCode === "2073" || rtnCode === "2063") return "arrived";
  if (rtnCode === "3022" || rtnCode === "2067") return "picked_up";
  if (rtnCode === "3020" || rtnCode === "2074" || rtnCode === "3028") return "returned";
  return "in_transit";
}
function safeReturnPath(p) {
  if (typeof p !== "string") return "/checkout";
  const path = p.split(/[?#]/)[0];
  if (!path.startsWith("/") || path.startsWith("//")) return "/checkout";
  if (path.includes(":")) return "/checkout";
  return path;
}
async function handleECPayPaymentNotify(notifyData) {
  const merchantTradeNo = notifyData.MerchantTradeNo || null;
  const callbackDetails = {
    rtnCode: notifyData.RtnCode ?? null,
    tradeNo: notifyData.TradeNo ?? null,
    tradeAmount: notifyData.TradeAmt ?? null,
    paymentType: notifyData.PaymentType ?? null
  };
  console.log("[ECPay Notify]", { merchantTradeNo, ...callbackDetails });
  const isValid = verifyCheckMacValue(notifyData);
  if (!isValid) {
    console.error("[ECPay Notify] CheckMacValue verification failed");
    await recordAuditEventSafely({
      source: "ecpay",
      category: "payment",
      action: "ecpay.payment.callback",
      outcome: "rejected",
      severity: "warning",
      merchantTradeNo,
      summary: "\u7DA0\u754C\u4ED8\u6B3E\u56DE\u547C\u7C3D\u7AE0\u9A57\u8B49\u5931\u6557",
      details: callbackDetails
    });
    return "0|CheckMacValue Error";
  }
  if (!merchantTradeNo) {
    await recordAuditEventSafely({
      source: "ecpay",
      category: "payment",
      action: "ecpay.payment.callback",
      outcome: "rejected",
      severity: "warning",
      summary: "\u7DA0\u754C\u4ED8\u6B3E\u56DE\u547C\u7F3A\u5C11\u4EA4\u6613\u7DE8\u865F",
      details: callbackDetails
    });
    return "0|Order Not Found";
  }
  const rtnCode = notifyData.RtnCode;
  const tradeNo = notifyData.TradeNo ?? "";
  const status = rtnCode === "1" ? "paid" : "failed";
  const order = await getOrderByMerchantTradeNo(merchantTradeNo);
  if (order) {
    if (!matchesECPayAmount(notifyData.TradeAmt, order.totalAmount)) {
      console.error(`[ECPay Notify] TradeAmt mismatch for ${merchantTradeNo}`);
      await recordAuditEventSafely({
        source: "ecpay",
        category: "payment",
        action: "ecpay.order.callback",
        outcome: "rejected",
        severity: "error",
        orderId: order.id,
        merchantTradeNo,
        summary: "\u7DA0\u754C\u8A02\u55AE\u56DE\u547C\u91D1\u984D\u8207\u8A02\u55AE\u4E0D\u7B26",
        details: { ...callbackDetails, expectedAmount: order.totalAmount }
      });
      return "0|TradeAmt Error";
    }
    const claimed = await updateOrderPaymentStatus(merchantTradeNo, status, tradeNo, notifyData);
    if (claimed && status === "paid") {
      await deductInventoryAfterPayment(merchantTradeNo);
      await notifyCustomerOrderPlacedSafely(order.id);
    }
    console.log(`[ECPay Notify] Order ${merchantTradeNo} \u2192 ${status}`);
    await recordAuditEventSafely({
      source: "ecpay",
      category: "payment",
      action: "ecpay.order.callback",
      outcome: claimed ? status === "paid" ? "success" : "failed" : "duplicate",
      severity: status === "paid" ? "info" : "warning",
      orderId: order.id,
      merchantTradeNo,
      summary: claimed ? status === "paid" ? "\u7DA0\u754C\u8A02\u55AE\u4ED8\u6B3E\u6210\u529F" : "\u7DA0\u754C\u56DE\u5831\u8A02\u55AE\u4ED8\u6B3E\u5931\u6557" : "\u5DF2\u8655\u7406\u904E\u7684\u7DA0\u754C\u8A02\u55AE\u56DE\u547C\u5DF2\u5FFD\u7565",
      details: callbackDetails
    });
    return "1|OK";
  }
  const balancePayment = await getBalancePaymentByMerchantTradeNo(merchantTradeNo);
  if (balancePayment) {
    if (!matchesECPayAmount(notifyData.TradeAmt, balancePayment.totalAmount)) {
      console.error(`[ECPay Notify] Balance TradeAmt mismatch for ${merchantTradeNo}`);
      await recordAuditEventSafely({
        source: "ecpay",
        category: "balance",
        action: "ecpay.balance.callback",
        outcome: "rejected",
        severity: "error",
        orderId: balancePayment.orderId,
        merchantTradeNo,
        summary: "\u7DA0\u754C\u5C3E\u6B3E\u56DE\u547C\u91D1\u984D\u8207\u5C3E\u6B3E\u55AE\u4E0D\u7B26",
        details: { ...callbackDetails, expectedAmount: balancePayment.totalAmount }
      });
      return "0|TradeAmt Error";
    }
    const claimed = await updateBalancePaymentStatus(merchantTradeNo, status, tradeNo, notifyData);
    if (claimed && status === "paid") {
      await deductInventoryAfterBalancePayment(merchantTradeNo);
    }
    console.log(`[ECPay Notify] Balance ${merchantTradeNo} \u2192 ${status}`);
    await recordAuditEventSafely({
      source: "ecpay",
      category: "balance",
      action: "ecpay.balance.callback",
      outcome: claimed ? status === "paid" ? "success" : "failed" : "duplicate",
      severity: status === "paid" ? "info" : "warning",
      orderId: balancePayment.orderId,
      merchantTradeNo,
      summary: claimed ? status === "paid" ? "\u7DA0\u754C\u5C3E\u6B3E\u4ED8\u6B3E\u6210\u529F" : "\u7DA0\u754C\u56DE\u5831\u5C3E\u6B3E\u4ED8\u6B3E\u5931\u6557" : "\u5DF2\u8655\u7406\u904E\u7684\u7DA0\u754C\u5C3E\u6B3E\u56DE\u547C\u5DF2\u5FFD\u7565",
      details: callbackDetails
    });
    return "1|OK";
  }
  console.error("[ECPay Notify] Order not found:", merchantTradeNo);
  await recordAuditEventSafely({
    source: "ecpay",
    category: "payment",
    action: "ecpay.payment.callback",
    outcome: "rejected",
    severity: "warning",
    merchantTradeNo,
    summary: "\u7DA0\u754C\u4ED8\u6B3E\u56DE\u547C\u627E\u4E0D\u5230\u5C0D\u61C9\u8A02\u55AE\u6216\u5C3E\u6B3E",
    details: callbackDetails
  });
  return "0|Order Not Found";
}
function matchesECPayAmount(rawAmount, expectedAmount) {
  return typeof rawAmount === "string" && /^\d+$/.test(rawAmount) && Number(rawAmount) === expectedAmount;
}
function registerECPayRoutes(app2) {
  app2.post("/api/ecpay/notify", async (req, res) => {
    try {
      const notifyData = req.body;
      res.send(await handleECPayPaymentNotify(notifyData));
    } catch (err) {
      console.error("[ECPay Notify] Error:", err);
      const notifyData = req.body;
      await recordAuditEventSafely({
        source: "ecpay",
        category: "payment",
        action: "ecpay.payment.callback",
        outcome: "failed",
        severity: "error",
        merchantTradeNo: notifyData?.MerchantTradeNo,
        summary: "\u8655\u7406\u7DA0\u754C\u4ED8\u6B3E\u56DE\u547C\u6642\u767C\u751F\u7CFB\u7D71\u932F\u8AA4",
        details: { error: err instanceof Error ? err.message : String(err) }
      });
      res.send("0|Server Error");
    }
  });
  app2.post("/api/ecpay/order-result", (req, res) => {
    try {
      const data = req.body;
      const merchantTradeNo = data?.MerchantTradeNo ?? "";
      console.log("[ECPay OrderResult]", { merchantTradeNo, RtnCode: data?.RtnCode });
      if (!merchantTradeNo) {
        res.redirect(302, "/");
        return;
      }
      res.redirect(302, `/order/${encodeURIComponent(merchantTradeNo)}`);
    } catch (err) {
      console.error("[ECPay OrderResult] Error:", err);
      res.redirect(302, "/");
    }
  });
  app2.post("/api/ecpay/balance-result", (req, res) => {
    try {
      const data = req.body;
      const merchantTradeNo = data?.MerchantTradeNo ?? "";
      console.log("[ECPay BalanceResult]", { merchantTradeNo, RtnCode: data?.RtnCode });
      if (!merchantTradeNo) {
        res.redirect(302, "/");
        return;
      }
      res.redirect(302, `/balance/${encodeURIComponent(merchantTradeNo)}`);
    } catch (err) {
      console.error("[ECPay BalanceResult] Error:", err);
      res.redirect(302, "/");
    }
  });
  app2.get("/api/ecpay/cvs-map", (req, res) => {
    const { tradeNo, subType, clientReturn } = req.query;
    if (!tradeNo || !subType) {
      res.status(400).send("Missing tradeNo or subType");
      return;
    }
    const normalizedSubType = subType === "UNIMART" ? "UNIMARTC2C" : subType === "FAMI" ? "FAMIC2C" : subType;
    const forwardedProto1 = req.headers["x-forwarded-proto"];
    const protocol1 = forwardedProto1 ? forwardedProto1.split(",")[0].trim() : req.protocol;
    const origin = `${protocol1}://${req.get("host")}`;
    const returnPath = safeReturnPath(clientReturn);
    const serverReplyURL = `${origin}/api/ecpay/cvs-map-reply?to=${encodeURIComponent(returnPath)}`;
    const clientReplyURL = `${origin}${returnPath}`;
    const params = buildCVSMapParams({
      logisticsMerchantTradeNo: tradeNo,
      logisticsSubType: normalizedSubType,
      serverReplyURL,
      clientReplyURL
    });
    const inputs = Object.entries(params).map(([k, v]) => `<input type="hidden" name="${k}" value="${v}" />`).join("\n");
    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>\u9078\u64C7\u9580\u5E02</title></head>
<body>
<form id="f" method="POST" action="${ECPAY_LOGISTICS_CONFIG.MapURL}">
${inputs}
</form>
<script>document.getElementById('f').submit();</script>
</body>
</html>`;
    res.send(html);
  });
  app2.post("/api/ecpay/cvs-map-reply", async (req, res) => {
    try {
      const data = req.body;
      console.log("[ECPay CVS Map Reply]", {
        logisticsSubType: data.LogisticsSubType,
        hasStoreId: Boolean(data.CVSStoreID)
      });
      const storeId = data.CVSStoreID || "";
      const storeName = data.CVSStoreName || "";
      const cvsType = data.LogisticsSubType || "";
      const returnPath = safeReturnPath(req.query.to);
      const qs = new URLSearchParams({
        cvsStoreId: storeId,
        cvsStoreName: storeName,
        cvsType
      }).toString();
      res.redirect(302, `${returnPath}?${qs}`);
    } catch (err) {
      console.error("[ECPay CVS Map Reply] Error:", err);
      res.status(500).send("Error");
    }
  });
  app2.post("/api/ecpay/logistics-notify", async (req, res) => {
    try {
      const data = req.body;
      console.log("[ECPay Logistics Notify]", {
        merchantTradeNo: data.MerchantTradeNo,
        rtnCode: data.RtnCode,
        logisticsType: data.LogisticsSubType ?? data.LogisticsType
      });
      const isValid = verifyLogisticsCheckMacValue(data);
      if (!isValid) {
        console.error("[ECPay Logistics Notify] CheckMacValue verification failed");
        await recordAuditEventSafely({
          source: "logistics",
          category: "logistics",
          action: "ecpay.logistics.callback",
          outcome: "rejected",
          severity: "warning",
          merchantTradeNo: data.MerchantTradeNo,
          summary: "\u7DA0\u754C\u7269\u6D41\u56DE\u547C\u7C3D\u7AE0\u9A57\u8B49\u5931\u6557",
          details: { rtnCode: data.RtnCode ?? null, logisticsType: data.LogisticsSubType ?? data.LogisticsType ?? null }
        });
        res.send("0|CheckMacValue Error");
        return;
      }
      const logisticsMerchantTradeNo = data.MerchantTradeNo;
      const newStatus = mapECPayLogisticsStatus(data);
      await updateLogisticsStatus(logisticsMerchantTradeNo, newStatus, {
        cvsPaymentNo: data.CVSPaymentNo,
        cvsValidationNo: data.CVSValidationNo,
        bookingNote: data.BookingNote,
        arrivedAt: newStatus === "arrived" ? /* @__PURE__ */ new Date() : void 0,
        pickedUpAt: newStatus === "picked_up" ? /* @__PURE__ */ new Date() : void 0,
        ecpayLogisticsData: data
      });
      const db = await getDb();
      const [logistics] = db ? await db.select({ orderId: logisticsOrders.orderId }).from(logisticsOrders).where(eq7(logisticsOrders.logisticsMerchantTradeNo, logisticsMerchantTradeNo)).limit(1) : [];
      if (newStatus === "arrived" || newStatus === "picked_up" || newStatus === "returned") {
        if (db && logistics) {
          const orderStatus = newStatus === "arrived" ? "arrived" : newStatus === "picked_up" ? "picked_up" : "not_picked";
          await db.update(orders).set({ orderStatus }).where(eq7(orders.id, logistics.orderId));
        }
      }
      console.log(`[ECPay Logistics Notify] ${logisticsMerchantTradeNo} \u2192 ${newStatus}`);
      await recordAuditEventSafely({
        source: "logistics",
        category: "logistics",
        action: "ecpay.logistics.callback",
        outcome: newStatus === "failed" ? "failed" : "success",
        severity: newStatus === "failed" ? "warning" : "info",
        orderId: logistics?.orderId ?? null,
        merchantTradeNo: logisticsMerchantTradeNo,
        summary: `\u7DA0\u754C\u7269\u6D41\u72C0\u614B\u66F4\u65B0\u70BA ${newStatus}`,
        details: { rtnCode: data.RtnCode ?? null, logisticsType: data.LogisticsSubType ?? data.LogisticsType ?? null }
      });
      res.send("1|OK");
    } catch (err) {
      console.error("[ECPay Logistics Notify] Error:", err);
      const data = req.body;
      await recordAuditEventSafely({
        source: "logistics",
        category: "logistics",
        action: "ecpay.logistics.callback",
        outcome: "failed",
        severity: "error",
        merchantTradeNo: data?.MerchantTradeNo,
        summary: "\u8655\u7406\u7DA0\u754C\u7269\u6D41\u56DE\u547C\u6642\u767C\u751F\u7CFB\u7D71\u932F\u8AA4",
        details: { error: err instanceof Error ? err.message : String(err) }
      });
      res.send("0|Server Error");
    }
  });
}

// server/_core/httpSecurity.ts
function setSecurityHeaders(_req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
}
function publicServerError(err) {
  if (process.env.NODE_ENV === "development") {
    return err instanceof Error ? err.stack || err.message : String(err);
  }
  return "Internal Server Error";
}

// server/_entry/ecpayHandler.ts
var app = express();
app.use(setSecurityHeaders);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
registerECPayRoutes(app);
app.use((req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", path: req.url } });
});
app.use(
  (err, _req, res, _next) => {
    const message = publicServerError(err);
    console.error("[api/ecpay] express error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: { code: "ECPAY_EXPRESS_ERROR", message } });
    }
  }
);
function writeJson(res, status, body) {
  if (res.headersSent) return;
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}
function handler(req, res) {
  try {
    return app(
      req,
      res
    );
  } catch (err) {
    const message = publicServerError(err);
    console.error("[api/ecpay] handler threw:", err);
    writeJson(res, 500, { error: { code: "HANDLER_THREW", message } });
  }
}
export {
  handler as default
};
