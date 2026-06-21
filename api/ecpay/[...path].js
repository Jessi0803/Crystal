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
function formatECPayDate(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
function parseLogisticsResponse(text2) {
  const result = {};
  const [firstPart = "", ...restParts] = text2.split("|");
  let rtnCode = "";
  if (firstPart && !firstPart.includes("=")) {
    rtnCode = firstPart.trim();
  } else if (firstPart) {
    restParts.unshift(firstPart);
  }
  const rest = restParts.join("|");
  const pairs = rest.includes("&") ? rest.split("&") : restParts;
  for (const pair of pairs) {
    const [k, ...v] = pair.split("=");
    if (k) result[k.trim()] = v.join("=").trim();
  }
  return { rtnCode: rtnCode || result["RtnCode"] || "", result };
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
async function createCVSLogisticsOrder(opts) {
  const params = {
    MerchantID: ECPAY_LOGISTICS_CONFIG.MerchantID,
    MerchantTradeNo: opts.logisticsMerchantTradeNo,
    MerchantTradeDate: formatECPayDate(/* @__PURE__ */ new Date()),
    LogisticsType: "CVS",
    LogisticsSubType: opts.logisticsSubType,
    GoodsAmount: String(opts.goodsAmount),
    GoodsName: opts.goodsName,
    SenderName: opts.senderName,
    SenderCellPhone: opts.senderPhone,
    SenderZipCode: opts.senderZipCode || process.env.SENDER_ZIPCODE || "330",
    ReceiverName: opts.receiverName,
    ReceiverCellPhone: opts.receiverPhone,
    ReceiverStoreID: opts.receiverStoreID,
    IsCollection: opts.isCollection ?? "N",
    ServerReplyURL: opts.serverReplyURL
  };
  if (opts.isCollection === "Y" && opts.collectionAmount) {
    params.CollectionAmount = String(opts.collectionAmount);
  }
  params.CheckMacValue = generateLogisticsCheckMacValue(params);
  const formBody = new URLSearchParams(params).toString();
  const response = await fetch(ECPAY_LOGISTICS_CONFIG.CreateURL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formBody
  });
  const text2 = await response.text();
  console.log("[ECPay Logistics] Create CVS response:", text2);
  const { rtnCode, result } = parseLogisticsResponse(text2);
  const success = rtnCode === "1" || result["RtnCode"] === "300" || rtnCode === "300";
  return {
    success,
    allPayLogisticsId: result["AllPayLogisticsID"] ?? "",
    cvsPaymentNo: result["CVSPaymentNo"] ?? "",
    cvsValidationNo: result["CVSValidationNo"] ?? "",
    rtnMsg: result["RtnMsg"] ?? text2,
    raw: result
  };
}
async function createHomeLogisticsOrder(opts) {
  const params = {
    MerchantID: ECPAY_LOGISTICS_CONFIG.MerchantID,
    MerchantTradeNo: opts.logisticsMerchantTradeNo,
    MerchantTradeDate: formatECPayDate(/* @__PURE__ */ new Date()),
    LogisticsType: "HOME",
    LogisticsSubType: "TCAT",
    GoodsAmount: String(opts.goodsAmount),
    GoodsName: opts.goodsName,
    SenderName: opts.senderName,
    SenderPhone: opts.senderPhone,
    SenderZipCode: opts.senderZipCode || process.env.SENDER_ZIPCODE || "330",
    SenderAddress: opts.senderAddress,
    ReceiverName: opts.receiverName,
    ReceiverPhone: opts.receiverPhone,
    ReceiverZipCode: opts.receiverZipCode ?? "",
    ReceiverAddress: opts.receiverAddress,
    Temperature: opts.temperature ?? "0001",
    Specification: "0001",
    // 60cm
    ScheduledPickupTime: opts.schedulePickupTime ?? "1",
    ScheduledDeliveryTime: "1",
    ServerReplyURL: opts.serverReplyURL
  };
  params.CheckMacValue = generateLogisticsCheckMacValue(params);
  const formBody = new URLSearchParams(params).toString();
  const response = await fetch(ECPAY_LOGISTICS_CONFIG.CreateURL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formBody
  });
  const text2 = await response.text();
  console.log("[ECPay Logistics] Create HOME response:", text2);
  const { rtnCode, result } = parseLogisticsResponse(text2);
  const success = rtnCode === "1";
  return {
    success,
    allPayLogisticsId: result["AllPayLogisticsID"] ?? "",
    bookingNote: result["BookingNote"] ?? "",
    rtnMsg: result["RtnMsg"] ?? text2,
    raw: result
  };
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
var orderItems = mysqlTable("orderItems", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: varchar("productId", { length: 64 }).notNull(),
  productName: varchar("productName", { length: 200 }).notNull(),
  productImage: text("productImage"),
  quantity: int("quantity").notNull(),
  unitPrice: int("unitPrice").notNull(),
  subtotal: int("subtotal").notNull(),
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
  showFitPreference: boolean("showFitPreference").notNull().default(true),
  wristSizeMin: decimal("wristSizeMin", { precision: 4, scale: 1, mode: "number" }).notNull().default(13),
  wristSizeMax: decimal("wristSizeMax", { precision: 4, scale: 1, mode: "number" }).notNull().default(19),
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
var balancePaymentLegacySelect = {
  id: orderBalancePayments.id,
  orderId: orderBalancePayments.orderId,
  merchantTradeNo: orderBalancePayments.merchantTradeNo,
  amount: orderBalancePayments.amount,
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
    shippingFee: 0,
    paymentFee: 0,
    totalAmount: row.amount
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
  await db.update(orders).set({
    paymentStatus: status,
    orderStatus: status === "paid" ? order?.isCustomOrder ? "deposit_paid" : "paid" : "cancelled",
    tradeNo,
    ecpayNotifyData: notifyData,
    paidAt: status === "paid" ? /* @__PURE__ */ new Date() : void 0
  }).where(eq2(orders.merchantTradeNo, merchantTradeNo));
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
  await db.update(orderBalancePayments).set({
    paymentStatus: status,
    tradeNo,
    ecpayNotifyData: notifyData,
    paidAt: status === "paid" ? /* @__PURE__ */ new Date() : null
  }).where(eq2(orderBalancePayments.id, balance.id));
  if (status === "paid") {
    await db.update(orders).set({ orderStatus: "paid" }).where(eq2(orders.id, balance.orderId));
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
  ordersColumnsEnsured = true;
}
var NON_INVENTORY_PRODUCT_IDS = /* @__PURE__ */ new Set(["shipping", "shipping-fee", "payment-fee", ...CUSTOM_PRODUCT_IDS]);
function shouldSkipInventory(productId) {
  return NON_INVENTORY_PRODUCT_IDS.has(productId);
}
async function deductInventoryAfterPayment(merchantTradeNo) {
  const db = await getDb();
  if (!db) return;
  await ensureOrdersColumns();
  const [order] = await db.select({ id: orders.id, inventoryDeducted: orders.inventoryDeducted }).from(orders).where(eq3(orders.merchantTradeNo, merchantTradeNo)).limit(1);
  if (!order || order.inventoryDeducted) return;
  const items = await db.select({ productId: orderItems.productId, quantity: orderItems.quantity }).from(orderItems).where(eq3(orderItems.orderId, order.id));
  for (const item of items) {
    if (shouldSkipInventory(item.productId)) continue;
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
function escapeHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
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
async function sendOrderShippedEmail(payload) {
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
        <td style="padding:10px 0;border-bottom:1px solid #f0ece7;font-size:13px;color:#333;">${escapeHtml(item.productName)}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0ece7;font-size:13px;color:#666;text-align:center;">\xD7 ${item.quantity}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0ece7;font-size:13px;color:#333;text-align:right;">NT$ ${item.subtotal.toLocaleString()}</td>
      </tr>`
  ).join("");
  const deliveryInfo = shippingMethod === "home" ? `<p style="margin:4px 0;font-size:13px;color:#555;">\u914D\u9001\u5730\u5740\uFF1A${escapeHtml(receiverAddress ?? "\u2014")}</p>` : `<p style="margin:4px 0;font-size:13px;color:#555;">\u53D6\u8CA8\u9580\u5E02\uFF1A${escapeHtml(cvsStoreName ?? "\u2014")}</p>`;
  const html = `
<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9f7f4;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f4;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e8e4df;">
        <tr>
          <td style="padding:32px 40px 24px;border-bottom:1px solid #f0ece7;text-align:center;">
            <p style="margin:0;font-size:11px;letter-spacing:0.2em;color:#999;text-transform:uppercase;">Crystal Energy</p>
            <h1 style="margin:8px 0 0;font-size:22px;font-weight:300;color:#1a1a1a;letter-spacing:0.08em;">${BRAND_NAME}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 4px;font-size:13px;color:#555;">\u89AA\u611B\u7684 ${escapeHtml(buyerName)}\uFF0C</p>
            <h2 style="margin:0 0 16px;font-size:18px;font-weight:500;color:#1a1a1a;">\u60A8\u7684\u8A02\u55AE\u5DF2\u51FA\u8CA8</h2>
            <p style="margin:0 0 24px;font-size:13px;color:#666;line-height:1.8;">
              \u60A8\u7684\u6C34\u6676\u5546\u54C1\u5DF2\u5B8C\u6210\u51FA\u8CA8\u5B89\u6392\uFF0C\u8ACB\u7559\u610F\u914D\u9001\u901A\u77E5\u8207\u53D6\u8CA8\u8A0A\u606F\u3002
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f4;padding:16px 20px;margin-bottom:24px;">
              <tr><td style="font-size:11px;letter-spacing:0.1em;color:#999;padding-bottom:10px;">\u8A02\u55AE\u8CC7\u8A0A</td></tr>
              <tr><td style="font-size:13px;color:#555;padding:2px 0;">\u8A02\u55AE\u7DE8\u865F\uFF1A<strong style="color:#1a1a1a;">${escapeHtml(merchantTradeNo)}</strong></td></tr>
              <tr><td style="font-size:13px;color:#555;padding:2px 0;">\u4ED8\u6B3E\u65B9\u5F0F\uFF1A${escapeHtml(PAYMENT_LABEL[paymentMethod] ?? paymentMethod)}</td></tr>
              <tr><td style="font-size:13px;color:#555;padding:2px 0;">\u914D\u9001\u65B9\u5F0F\uFF1A${escapeHtml(SHIPPING_LABEL[shippingMethod] ?? shippingMethod)}</td></tr>
              <tr><td style="font-size:13px;color:#555;padding:2px 0;">${deliveryInfo}</td></tr>
            </table>

            <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.1em;color:#999;">\u5546\u54C1\u660E\u7D30</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${itemRows}
              <tr>
                <td colspan="2" style="padding:14px 0 0;font-size:13px;font-weight:600;color:#1a1a1a;">\u8A02\u55AE\u7E3D\u8A08</td>
                <td style="padding:14px 0 0;font-size:15px;font-weight:600;color:#1a1a1a;text-align:right;">NT$ ${totalAmount.toLocaleString()}</td>
              </tr>
            </table>

            <p style="margin:24px 0 0;font-size:12px;color:#999;line-height:1.8;">
              \u82E5\u914D\u9001\u8CC7\u8A0A\u6709\u4EFB\u4F55\u554F\u984C\uFF0C\u6B61\u8FCE\u900F\u904E\u5B98\u7DB2\u6216 LINE \u806F\u7E6B\u6211\u5011\u3002
            </p>
          </td>
        </tr>
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
    subject: `\u3010${BRAND_NAME}\u3011\u60A8\u7684\u8A02\u55AE\u5DF2\u51FA\u8CA8 #${merchantTradeNo}`,
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
async function notifyLineOrderShipped(orderId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const lineUserId = await getLineUserIdForOrder(orderId);
  if (!lineUserId) return { sent: false, reason: "missing_line_user" };
  const [order] = await db.select().from(orders).where(eq4(orders.id, orderId)).limit(1);
  if (!order) return { sent: false, reason: "missing_order" };
  const [logistics] = await db.select().from(logisticsOrders).where(eq4(logisticsOrders.orderId, orderId)).limit(1);
  const shippingLabel = order.shippingMethod === "home" ? "\u9ED1\u8C93\u5B85\u6025\u4FBF" : order.shippingMethod === "cvs_711" ? "7-11 \u5E97\u5230\u5E97" : "\u5168\u5BB6\u5E97\u5230\u5E97";
  const trackingNo = logistics?.bookingNote || logistics?.allPayLogisticsId || logistics?.logisticsMerchantTradeNo;
  const text2 = [
    `${order.buyerName} \u60A8\u597D\uFF0C\u60A8\u7684\u8A02\u55AE\u5DF2\u51FA\u8CA8\u3002`,
    "",
    `\u8A02\u55AE\u7DE8\u865F\uFF1A${order.merchantTradeNo}`,
    `\u914D\u9001\u65B9\u5F0F\uFF1A${shippingLabel}`,
    trackingNo ? `\u7269\u6D41\u7DE8\u865F\uFF1A${trackingNo}` : "",
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
async function notifyCustomerOrderShippedSafely(orderId) {
  try {
    const lineResult = await notifyLineOrderShipped(orderId);
    if (lineResult.sent) return;
    if (lineResult.reason === "missing_order") return;
    const emailPayload = await getOrderEmailPayload(orderId);
    if (!emailPayload) return;
    await sendOrderShippedEmail(emailPayload);
  } catch (error) {
    console.error("[CustomerOrderNotification] order shipped failed:", error);
  }
}

// server/ecpayRoutes.ts
import { eq as eq6 } from "drizzle-orm";
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
  console.log("[ECPay Notify]", notifyData);
  const isValid = verifyCheckMacValue(notifyData);
  if (!isValid) {
    console.error("[ECPay Notify] CheckMacValue verification failed");
    return "0|CheckMacValue Error";
  }
  const merchantTradeNo = notifyData.MerchantTradeNo;
  const rtnCode = notifyData.RtnCode;
  const tradeNo = notifyData.TradeNo ?? "";
  const status = rtnCode === "1" ? "paid" : "failed";
  const order = await getOrderByMerchantTradeNo(merchantTradeNo);
  if (order) {
    const shouldNotifyOrderPlaced = status === "paid" && order.paymentStatus !== "paid" && order.paymentStatus !== "confirmed";
    await updateOrderPaymentStatus(merchantTradeNo, status, tradeNo, notifyData);
    if (status === "paid") {
      await deductInventoryAfterPayment(merchantTradeNo);
      if (shouldNotifyOrderPlaced) {
        await notifyCustomerOrderPlacedSafely(order.id);
      }
    }
    console.log(`[ECPay Notify] Order ${merchantTradeNo} \u2192 ${status}`);
    return "1|OK";
  }
  const balancePayment = await getBalancePaymentByMerchantTradeNo(merchantTradeNo);
  if (balancePayment) {
    await updateBalancePaymentStatus(merchantTradeNo, status, tradeNo, notifyData);
    if (status === "paid") {
      await deductInventoryAfterBalancePayment(merchantTradeNo);
    }
    console.log(`[ECPay Notify] Balance ${merchantTradeNo} \u2192 ${status}`);
    return "1|OK";
  }
  console.error("[ECPay Notify] Order not found:", merchantTradeNo);
  return "0|Order Not Found";
}
function registerECPayRoutes(app2) {
  app2.post("/api/ecpay/notify", async (req, res) => {
    try {
      const notifyData = req.body;
      res.send(await handleECPayPaymentNotify(notifyData));
    } catch (err) {
      console.error("[ECPay Notify] Error:", err);
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
      console.log("[ECPay CVS Map Reply]", data);
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
      console.log("[ECPay Logistics Notify]", data);
      const isValid = verifyLogisticsCheckMacValue(data);
      if (!isValid) {
        console.error("[ECPay Logistics Notify] CheckMacValue verification failed");
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
      if (newStatus === "arrived" || newStatus === "picked_up" || newStatus === "returned") {
        const db = await getDb();
        if (db) {
          const [logistics] = await db.select({ orderId: logisticsOrders.orderId }).from(logisticsOrders).where(eq6(logisticsOrders.logisticsMerchantTradeNo, logisticsMerchantTradeNo)).limit(1);
          if (logistics) {
            const orderStatus = newStatus === "arrived" ? "arrived" : newStatus === "picked_up" ? "picked_up" : "not_picked";
            await db.update(orders).set({ orderStatus }).where(eq6(orders.id, logistics.orderId));
          }
        }
      }
      console.log(`[ECPay Logistics Notify] ${logisticsMerchantTradeNo} \u2192 ${newStatus}`);
      res.send("1|OK");
    } catch (err) {
      console.error("[ECPay Logistics Notify] Error:", err);
      res.send("0|Server Error");
    }
  });
  app2.post("/api/ecpay/create-logistics", async (req, res) => {
    try {
      const { orderId } = req.body;
      const db = await getDb();
      if (!db) {
        res.status(500).json({ error: "DB unavailable" });
        return;
      }
      const [order] = await db.select().from(orders).where(eq6(orders.id, orderId)).limit(1);
      if (!order) {
        res.status(404).json({ error: "Order not found" });
        return;
      }
      const [logistics] = await db.select().from(logisticsOrders).where(eq6(logisticsOrders.orderId, orderId)).limit(1);
      if (!logistics) {
        res.status(404).json({ error: "Logistics order not found" });
        return;
      }
      const forwardedProto2 = req.headers["x-forwarded-proto"];
      const protocol2 = forwardedProto2 ? forwardedProto2.split(",")[0].trim() : req.protocol;
      const origin = `${protocol2}://${req.get("host")}`;
      const serverReplyURL = `${origin}/api/ecpay/logistics-notify`;
      let result;
      if (order.shippingMethod === "home") {
        result = await createHomeLogisticsOrder({
          logisticsMerchantTradeNo: logistics.logisticsMerchantTradeNo,
          goodsName: "\u691BCrystal\u80FD\u91CF\u6C34\u6676",
          goodsAmount: order.totalAmount,
          senderName: process.env.OWNER_NAME || "\u691BCrystal",
          senderPhone: process.env.SENDER_PHONE || "0903288876",
          senderZipCode: process.env.SENDER_ZIPCODE || "110",
          senderAddress: "\u53F0\u5317\u5E02\u4FE1\u7FA9\u5340",
          receiverName: order.buyerName,
          receiverPhone: order.buyerPhone,
          receiverAddress: order.shippingAddress || "",
          serverReplyURL
        });
      } else {
        const logisticsSubType = order.shippingMethod === "cvs_711" ? "UNIMARTC2C" : "FAMIC2C";
        result = await createCVSLogisticsOrder({
          logisticsMerchantTradeNo: logistics.logisticsMerchantTradeNo,
          goodsName: "\u691BCrystal\u80FD\u91CF\u6C34\u6676",
          goodsAmount: order.totalAmount,
          senderName: process.env.OWNER_NAME || "\u691BCrystal",
          senderPhone: process.env.SENDER_PHONE || "0903288876",
          senderZipCode: process.env.SENDER_ZIPCODE || "110",
          receiverName: order.buyerName,
          receiverPhone: order.buyerPhone,
          receiverStoreID: order.cvsStoreId || "",
          logisticsSubType,
          serverReplyURL
        });
      }
      if (result.success) {
        await db.update(logisticsOrders).set({
          allPayLogisticsId: result.allPayLogisticsId,
          cvsPaymentNo: result.cvsPaymentNo,
          cvsValidationNo: result.cvsValidationNo,
          bookingNote: result.bookingNote,
          logisticsStatus: "in_transit",
          ecpayLogisticsData: result.raw
        }).where(eq6(logisticsOrders.orderId, orderId));
        await db.update(orders).set({ orderStatus: "shipped" }).where(eq6(orders.id, orderId));
        await notifyCustomerOrderShippedSafely(orderId);
      }
      res.json(result);
    } catch (err) {
      console.error("[ECPay Create Logistics] Error:", err);
      res.status(500).json({ error: String(err) });
    }
  });
}

// server/_entry/ecpayHandler.ts
var app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
registerECPayRoutes(app);
app.use((req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", path: req.url } });
});
app.use(
  (err, _req, res, _next) => {
    const message = err instanceof Error ? err.stack || err.message : String(err);
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
    const message = err instanceof Error ? err.stack || err.message : String(err);
    console.error("[api/ecpay] handler threw:", err);
    writeJson(res, 500, { error: { code: "HANDLER_THREW", message } });
  }
}
export {
  handler as default
};
