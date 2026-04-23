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
var isProduction = ENV.isProduction;
var ECPAY_CONFIG = {
  MerchantID: ENV.ecpayMerchantId || "3002607",
  HashKey: ENV.ecpayHashKey || "pwFHCqoQZGmho4w6",
  HashIV: ENV.ecpayHashIV || "EkRm7iFT261dpevs",
  // 永遠使用正式端點（憑證是正式帳號）
  PaymentURL: "https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5",
  QueryURL: "https://payment.ecpay.com.tw/Cashier/QueryTradeInfo/V5"
};
function ecpayUrlEncode(str) {
  return encodeURIComponent(str).replace(/%20/g, "+").replace(/%2D/gi, "-").replace(/%5F/gi, "_").replace(/%2E/gi, ".").replace(/%21/gi, "!").replace(/%2A/gi, "*").replace(/%28/gi, "(").replace(/%29/gi, ")");
}
function generateCheckMacValue(params) {
  const sortedKeys = Object.keys(params).sort(
    (a, b) => a.toLowerCase().localeCompare(b.toLowerCase())
  );
  const raw = `HashKey=${ECPAY_CONFIG.HashKey}&` + sortedKeys.map((k) => `${k}=${params[k]}`).join("&") + `&HashIV=${ECPAY_CONFIG.HashIV}`;
  console.log("[ECPay] Raw string for CheckMacValue:", raw);
  const encoded = ecpayUrlEncode(raw).toLowerCase();
  console.log("[ECPay] Encoded string:", encoded);
  const hash = crypto.createHash("sha256").update(encoded).digest("hex").toUpperCase();
  console.log("[ECPay] CheckMacValue:", hash);
  return hash;
}
function verifyCheckMacValue(params) {
  const { CheckMacValue, ...rest } = params;
  if (!CheckMacValue) return false;
  const expected = generateCheckMacValue(rest);
  console.log("[ECPay Verify] Expected:", expected, "Got:", CheckMacValue);
  return expected === CheckMacValue;
}

// server/ecpayLogistics.ts
import crypto2 from "crypto";
var isProduction2 = ENV.isProduction;
var useLogisticsSandbox = process.env.ECPAY_LOGISTICS_SANDBOX === "true";
var ECPAY_LOGISTICS_CONFIG = {
  MerchantID: ENV.ecpayLogisticsMerchantId || "2000132",
  HashKey: ENV.ecpayLogisticsHashKey || "5294y06JbISpM5x9",
  HashIV: ENV.ecpayLogisticsHashIV || "v77hoKGq4kWxNNIS",
  // 預設使用正式端點；只有明確設定 ECPAY_LOGISTICS_SANDBOX=true 才用沙盒
  BaseURL: useLogisticsSandbox ? "https://logistics-stage.ecpay.com.tw" : "https://logistics.ecpay.com.tw",
  MapURL: useLogisticsSandbox ? "https://logistics-stage.ecpay.com.tw/Express/map" : "https://logistics.ecpay.com.tw/Express/map",
  CreateURL: useLogisticsSandbox ? "https://logistics-stage.ecpay.com.tw/Express/Create" : "https://logistics.ecpay.com.tw/Express/Create",
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
  const result = {};
  const parts = text2.split("|");
  const firstPart = parts[0]?.trim();
  let rtnCode;
  if (firstPart && !firstPart.includes("=")) {
    rtnCode = firstPart;
    parts.slice(1).forEach((pair) => {
      const [k, ...v] = pair.split("=");
      if (k) result[k.trim()] = v.join("=").trim();
    });
  } else {
    parts.forEach((pair) => {
      const [k, ...v] = pair.split("=");
      if (k) result[k.trim()] = v.join("=").trim();
    });
    rtnCode = result["RtnCode"] ?? "";
  }
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
    SenderZipCode: opts.senderZipCode ?? process.env.SENDER_ZIPCODE ?? "",
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
  console.log("[ECPay Logistics] MerchantID:", ECPAY_LOGISTICS_CONFIG.MerchantID);
  console.log("[ECPay Logistics] HashKey:", ECPAY_LOGISTICS_CONFIG.HashKey);
  console.log("[ECPay Logistics] HashIV:", ECPAY_LOGISTICS_CONFIG.HashIV);
  console.log("[ECPay Logistics] CreateURL:", ECPAY_LOGISTICS_CONFIG.CreateURL);
  console.log("[ECPay Logistics] Params before CheckMacValue:", JSON.stringify(params, null, 2));
  const sortedKeys = Object.keys(params).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  const rawStr = `HashKey=${ECPAY_LOGISTICS_CONFIG.HashKey}&` + sortedKeys.map((k) => `${k}=${params[k]}`).join("&") + `&HashIV=${ECPAY_LOGISTICS_CONFIG.HashIV}`;
  console.log("[ECPay Logistics] Raw string for CheckMacValue:", rawStr);
  params.CheckMacValue = generateLogisticsCheckMacValue(params);
  console.log("[ECPay Logistics] CheckMacValue:", params.CheckMacValue);
  const formBody = new URLSearchParams(params).toString();
  console.log("[ECPay Logistics] FormBody:", formBody);
  const response = await fetch(ECPAY_LOGISTICS_CONFIG.CreateURL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formBody
  });
  const text2 = await response.text();
  console.log("[ECPay Logistics] Create HOME response:", text2);
  const result = {};
  text2.split("|").forEach((pair) => {
    const [k, ...v] = pair.split("=");
    if (k) result[k.trim()] = v.join("=").trim();
  });
  const rtnCode = result["RtnCode"] ?? "";
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
import { eq as eq2, desc, and as and2, gte, sql as sql2 } from "drizzle-orm";

// server/_core/emailNormalize.ts
function normalizeOrderEmail(email) {
  return email.trim().toLowerCase();
}

// server/db.ts
import { eq, and, gt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, boolean } from "drizzle-orm/mysql-core";
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
    "atm"
    // 銀行轉帳（私帳）
  ]).default("credit").notNull(),
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
    "paid",
    // 已付款（待出貨）
    "processing",
    // 處理中（備貨）
    "shipped",
    // 已出貨
    "arrived",
    // 已到店/已送達
    "completed",
    // 已完成（已領取）
    "cancelled"
    // 已取消
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
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
});
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

// server/db.ts
var ADMIN_EMAIL_ALLOWLIST = new Set(
  [
    "goodaytarot@gmail.com",
    ...process.env.ADMIN_EMAILS?.split(",") ?? []
  ].map((email) => email.trim()).filter(Boolean).map(normalizeOrderEmail)
);
var _db = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// server/orderDb.ts
async function getOrderByMerchantTradeNo(merchantTradeNo) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [order] = await db.select().from(orders).where(eq2(orders.merchantTradeNo, merchantTradeNo)).limit(1);
  return order ?? null;
}
async function updateOrderPaymentStatus(merchantTradeNo, status, tradeNo, notifyData) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(orders).set({
    paymentStatus: status,
    orderStatus: status === "paid" ? "paid" : "cancelled",
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

// server/ecpayRoutes.ts
import { eq as eq3 } from "drizzle-orm";
function registerECPayRoutes(app2) {
  app2.post("/api/ecpay/notify", async (req, res) => {
    try {
      const notifyData = req.body;
      console.log("[ECPay Notify]", notifyData);
      const isValid = verifyCheckMacValue(notifyData);
      if (!isValid) {
        console.error("[ECPay Notify] CheckMacValue verification failed");
        res.send("0|CheckMacValue Error");
        return;
      }
      const merchantTradeNo = notifyData.MerchantTradeNo;
      const rtnCode = notifyData.RtnCode;
      const tradeNo = notifyData.TradeNo ?? "";
      const order = await getOrderByMerchantTradeNo(merchantTradeNo);
      if (!order) {
        console.error("[ECPay Notify] Order not found:", merchantTradeNo);
        res.send("0|Order Not Found");
        return;
      }
      const status = rtnCode === "1" ? "paid" : "failed";
      await updateOrderPaymentStatus(merchantTradeNo, status, tradeNo, notifyData);
      console.log(`[ECPay Notify] Order ${merchantTradeNo} \u2192 ${status}`);
      res.send("1|OK");
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
    const serverReplyURL = `${origin}/api/ecpay/cvs-map-reply`;
    const clientReplyURL = clientReturn || `${origin}/checkout`;
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
      const storeIdJson = JSON.stringify(storeId);
      const storeNameJson = JSON.stringify(storeName);
      const cvsTypeJson = JSON.stringify(cvsType);
      const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>\u9078\u5E97\u5B8C\u6210</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { font-family: -apple-system, sans-serif; text-align: center; padding: 40px 20px; background: #fafafa; }
  .card { background: white; border-radius: 12px; padding: 32px 24px; max-width: 320px; margin: 0 auto; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
  .icon { font-size: 48px; margin-bottom: 16px; }
  h2 { font-size: 18px; color: #1a1a1a; margin: 0 0 8px; }
  p { font-size: 14px; color: #666; margin: 0 0 24px; }
  .store-name { font-size: 16px; font-weight: 600; color: #1a1a1a; background: #f5f5f5; padding: 12px; border-radius: 8px; margin-bottom: 24px; }
  button { background: #1a1a1a; color: white; border: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; cursor: pointer; width: 100%; }
  button:active { opacity: 0.8; }
</style>
</head>
<body>
<div class="card">
  <div class="icon">\u2705</div>
  <h2>\u9078\u5E97\u5B8C\u6210</h2>
  <div class="store-name">${storeName}</div>
  <p>\u9580\u5E02\u8CC7\u8A0A\u5DF2\u50B3\u56DE\u7D50\u5E33\u9801\u9762</p>
  <button onclick="closeWindow()">\u95DC\u9589\u6B64\u8996\u7A97</button>
</div>
<script>
  function sendMessage() {
    try {
      if (window.opener) {
        window.opener.postMessage({
          type: 'CVS_STORE_SELECTED',
          storeId: ${storeIdJson},
          storeName: ${storeNameJson},
          cvsType: ${cvsTypeJson}
        }, '*');
      }
    } catch(e) { console.error(e); }
  }
  function closeWindow() {
    sendMessage();
    try { window.close(); } catch(e) {}
    // \u5099\u7528\uFF1A\u5982\u679C close \u88AB\u963B\u64CB\uFF0C\u5617\u8A66\u5C0E\u56DE\u7D50\u5E33\u9801
    setTimeout(function() {
      if (!window.closed) {
        try { window.location.href = window.opener ? 'about:blank' : '/checkout'; } catch(e) {}
      }
    }, 300);
  }
  // \u81EA\u52D5\u767C\u9001 postMessage \u4E26\u5617\u8A66\u95DC\u9589
  sendMessage();
  setTimeout(function() {
    try { window.close(); } catch(e) {}
  }, 800);
</script>
</body>
</html>`;
      res.send(html);
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
      const rtnCode = data.RtnCode;
      let newStatus = "in_transit";
      if (rtnCode === "300" || rtnCode === "3018") newStatus = "arrived";
      else if (rtnCode === "3024") newStatus = "picked_up";
      else if (rtnCode === "3022" || rtnCode === "3028") newStatus = "returned";
      else if (["3002", "3003", "3004"].includes(rtnCode)) newStatus = "failed";
      await updateLogisticsStatus(logisticsMerchantTradeNo, newStatus);
      if (newStatus === "arrived" || newStatus === "picked_up") {
        const db = await getDb();
        if (db) {
          const [logistics] = await db.select({ orderId: logisticsOrders.orderId }).from(logisticsOrders).where(eq3(logisticsOrders.logisticsMerchantTradeNo, logisticsMerchantTradeNo)).limit(1);
          if (logistics) {
            const orderStatus = newStatus === "arrived" ? "arrived" : "completed";
            await db.update(orders).set({ orderStatus }).where(eq3(orders.id, logistics.orderId));
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
      const [order] = await db.select().from(orders).where(eq3(orders.id, orderId)).limit(1);
      if (!order) {
        res.status(404).json({ error: "Order not found" });
        return;
      }
      const [logistics] = await db.select().from(logisticsOrders).where(eq3(logisticsOrders.orderId, orderId)).limit(1);
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
          senderPhone: "0900000000",
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
          senderPhone: "0900000000",
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
        }).where(eq3(logisticsOrders.orderId, orderId));
        await db.update(orders).set({ orderStatus: "shipped" }).where(eq3(orders.id, orderId));
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
