var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// drizzle/schema.ts
var schema_exports = {};
__export(schema_exports, {
  inventoryLocks: () => inventoryLocks,
  logisticsOrders: () => logisticsOrders,
  orderItems: () => orderItems,
  orders: () => orders,
  productInventory: () => productInventory,
  users: () => users
});
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, boolean } from "drizzle-orm/mysql-core";
var users, productInventory, inventoryLocks, orders, orderItems, logisticsOrders;
var init_schema = __esm({
  "drizzle/schema.ts"() {
    "use strict";
    users = mysqlTable("users", {
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
    productInventory = mysqlTable("productInventory", {
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
    inventoryLocks = mysqlTable("inventoryLocks", {
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
    orders = mysqlTable("orders", {
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
    orderItems = mysqlTable("orderItems", {
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
    logisticsOrders = mysqlTable("logisticsOrders", {
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
  }
});

// server/_entry/trpcHandler.ts
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";

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

// server/_core/notification.ts
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  /** 診斷用：確認環境變數是否正確注入（不回傳實際値） */
  envCheck: publicProcedure.query(() => ({
    hasResendApiKey: !!ENV.resendApiKey && ENV.resendApiKey.length > 0,
    resendApiKeyPrefix: ENV.resendApiKey ? ENV.resendApiKey.substring(0, 8) + "..." : "(empty)",
    nodeEnv: process.env.NODE_ENV ?? "(not set)",
    // 綠界金流
    hasEcpayMerchantId: !!process.env.ECPAY_MERCHANT_ID,
    ecpayMerchantId: process.env.ECPAY_MERCHANT_ID || "(empty)",
    hasEcpayHashKey: !!process.env.ECPAY_HASH_KEY,
    ecpayHashKeyPrefix: process.env.ECPAY_HASH_KEY ? process.env.ECPAY_HASH_KEY.substring(0, 6) + "..." : "(empty)",
    // 綠界物流
    hasEcpayLogisticsMerchantId: !!process.env.ECPAY_LOGISTICS_MERCHANT_ID,
    ecpayLogisticsMerchantId: process.env.ECPAY_LOGISTICS_MERCHANT_ID || "(empty)",
    hasEcpayLogisticsHashKey: !!process.env.ECPAY_LOGISTICS_HASH_KEY,
    ecpayLogisticsHashKeyPrefix: process.env.ECPAY_LOGISTICS_HASH_KEY ? process.env.ECPAY_LOGISTICS_HASH_KEY.substring(0, 6) + "..." : "(empty)",
    hasEcpayLogisticsHashIV: !!process.env.ECPAY_LOGISTICS_HASH_IV
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers/order.ts
import { z as z2 } from "zod";

// server/ecpay.ts
import crypto from "crypto";
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
  const hash2 = crypto.createHash("sha256").update(encoded).digest("hex").toUpperCase();
  console.log("[ECPay] CheckMacValue:", hash2);
  return hash2;
}
function generateMerchantTradeNo() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CA${ts}${rand}`.substring(0, 20);
}
function formatECPayDate(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
function buildCreditPaymentParams(opts) {
  const params = {
    MerchantID: ECPAY_CONFIG.MerchantID,
    MerchantTradeNo: opts.merchantTradeNo,
    MerchantTradeDate: formatECPayDate(/* @__PURE__ */ new Date()),
    PaymentType: "aio",
    TotalAmount: String(opts.totalAmount),
    TradeDesc: opts.tradeDesc,
    // 不預先 encode！
    ItemName: opts.itemName,
    ReturnURL: opts.returnURL,
    OrderResultURL: opts.orderResultURL,
    ClientBackURL: opts.clientBackURL,
    ChoosePayment: "Credit",
    EncryptType: "1"
  };
  params.CheckMacValue = generateCheckMacValue(params);
  return params;
}

// server/orderDb.ts
import { eq as eq2, desc, and as and2, gte, sql } from "drizzle-orm";

// server/db.ts
init_schema();
import { eq, and, gt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
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
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getUserByEmail(email) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createEmailUser(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const openId = `email:${data.email}`;
  await db.insert(users).values({
    openId,
    email: data.email,
    passwordHash: data.passwordHash,
    name: data.name,
    loginMethod: "email",
    lastSignedIn: /* @__PURE__ */ new Date()
  });
  return getUserByEmail(data.email);
}
async function setResetToken(email, token, expiresAt) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ resetToken: token, resetTokenExpiresAt: expiresAt }).where(eq(users.email, email));
}
async function getUserByResetToken(token) {
  const db = await getDb();
  if (!db) return void 0;
  const now = /* @__PURE__ */ new Date();
  const result = await db.select().from(users).where(and(eq(users.resetToken, token), gt(users.resetTokenExpiresAt, now))).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function updatePasswordAndClearToken(userId, passwordHash) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ passwordHash, resetToken: null, resetTokenExpiresAt: null, updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.id, userId));
}
async function setVerifyToken(email, token, expiresAt) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ verifyToken: token, verifyTokenExpiresAt: expiresAt }).where(eq(users.email, email));
}
async function getUserByVerifyToken(token) {
  const db = await getDb();
  if (!db) return void 0;
  const now = /* @__PURE__ */ new Date();
  const result = await db.select().from(users).where(and(eq(users.verifyToken, token), gt(users.verifyTokenExpiresAt, now))).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function markEmailVerified(userId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ emailVerified: true, verifyToken: null, verifyTokenExpiresAt: null, updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.id, userId));
}

// server/orderDb.ts
init_schema();
async function createOrder(orderData, items) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(orders).values(orderData);
  const [created] = await db.select().from(orders).where(eq2(orders.merchantTradeNo, orderData.merchantTradeNo)).limit(1);
  if (!created) throw new Error("Failed to create order");
  const itemsWithOrderId = items.map((item) => ({
    ...item,
    orderId: created.id
  }));
  await db.insert(orderItems).values(itemsWithOrderId);
  return created.id;
}
async function getOrderWithItems(merchantTradeNo) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [order] = await db.select().from(orders).where(eq2(orders.merchantTradeNo, merchantTradeNo)).limit(1);
  if (!order) return null;
  const items = await db.select().from(orderItems).where(eq2(orderItems.orderId, order.id));
  const [logistics] = await db.select().from(logisticsOrders).where(eq2(logisticsOrders.orderId, order.id)).limit(1);
  return { ...order, items, logistics: logistics ?? null };
}
async function updateOrderTransferLastFive(merchantTradeNo, lastFive) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(orders).set({ transferLastFive: lastFive }).where(eq2(orders.merchantTradeNo, merchantTradeNo));
}
async function confirmTransferPayment(merchantTradeNo) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(orders).set({
    paymentStatus: "confirmed",
    orderStatus: "paid",
    confirmedAt: /* @__PURE__ */ new Date(),
    paidAt: /* @__PURE__ */ new Date()
  }).where(eq2(orders.merchantTradeNo, merchantTradeNo));
}
async function updateOrderStatus(merchantTradeNo, orderStatus) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(orders).set({ orderStatus }).where(eq2(orders.merchantTradeNo, merchantTradeNo));
}
async function getAllOrders(limit = 100, offset = 0, statusFilter) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  let allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(limit).offset(offset);
  if (statusFilter && statusFilter !== "all") {
    if (statusFilter === "transfer_pending") {
      allOrders = allOrders.filter((o) => o.paymentStatus === "transfer_pending");
    } else {
      allOrders = allOrders.filter((o) => o.orderStatus === statusFilter);
    }
  }
  const ordersWithItems = await Promise.all(
    allOrders.map(async (order) => {
      const items = await db.select().from(orderItems).where(eq2(orderItems.orderId, order.id));
      const [logistics] = await db.select().from(logisticsOrders).where(eq2(logisticsOrders.orderId, order.id)).limit(1);
      return { ...order, items, logistics: logistics ?? null };
    })
  );
  return ordersWithItems;
}
async function getOrderStats() {
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
    totalRevenue: allOrders.filter((o) => ["paid", "processing", "shipped", "arrived", "completed"].includes(o.orderStatus)).reduce((sum, o) => sum + o.totalAmount, 0),
    monthRevenue: 0
  };
  const now = /* @__PURE__ */ new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  stats.monthRevenue = allOrders.filter(
    (o) => ["paid", "processing", "shipped", "arrived", "completed"].includes(o.orderStatus) && o.paidAt && o.paidAt >= monthStart
  ).reduce((sum, o) => sum + o.totalAmount, 0);
  return stats;
}
async function getMonthlyRevenue(months = 6) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = [];
  const now = /* @__PURE__ */ new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const monthOrders = await db.select().from(orders).where(
      and2(
        gte(orders.paidAt, start),
        sql`${orders.paidAt} <= ${end}`
      )
    );
    const paidOrders = monthOrders.filter(
      (o) => ["paid", "processing", "shipped", "arrived", "completed"].includes(o.orderStatus)
    );
    result.push({
      month: `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}`,
      revenue: paidOrders.reduce((sum, o) => sum + o.totalAmount, 0),
      orderCount: paidOrders.length
    });
  }
  return result;
}
async function getTopProducts(limit = 10) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const paidOrders = await db.select({ id: orders.id }).from(orders).where(
    sql`${orders.orderStatus} IN ('paid', 'processing', 'shipped', 'arrived', 'completed')`
  );
  if (paidOrders.length === 0) return [];
  const orderIds = paidOrders.map((o) => o.id);
  const allItems = await db.select().from(orderItems).where(sql`${orderItems.orderId} IN (${sql.join(orderIds.map((id) => sql`${id}`), sql`, `)})`);
  const productMap = /* @__PURE__ */ new Map();
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
        totalRevenue: item.subtotal
      });
    }
  }
  return Array.from(productMap.values()).sort((a, b) => b.totalQty - a.totalQty).slice(0, limit);
}
async function createLogisticsOrder(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(logisticsOrders).values(data);
  const [created] = await db.select().from(logisticsOrders).where(eq2(logisticsOrders.logisticsMerchantTradeNo, data.logisticsMerchantTradeNo)).limit(1);
  return created;
}
async function getOrdersByEmail(email) {
  const db = await getDb();
  if (!db) return [];
  const memberOrders = await db.select().from(orders).where(eq2(orders.buyerEmail, email)).orderBy(desc(orders.createdAt)).limit(50);
  const ordersWithItems = await Promise.all(
    memberOrders.map(async (order) => {
      const items = await db.select().from(orderItems).where(eq2(orderItems.orderId, order.id));
      const [logistics] = await db.select().from(logisticsOrders).where(eq2(logisticsOrders.orderId, order.id)).limit(1);
      return { ...order, items, logistics: logistics ?? null };
    })
  );
  return ordersWithItems;
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
function formatECPayDate2(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
async function createCVSLogisticsOrder(opts) {
  const params = {
    MerchantID: ECPAY_LOGISTICS_CONFIG.MerchantID,
    MerchantTradeNo: opts.logisticsMerchantTradeNo,
    MerchantTradeDate: formatECPayDate2(/* @__PURE__ */ new Date()),
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
    MerchantTradeDate: formatECPayDate2(/* @__PURE__ */ new Date()),
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
function buildPrintTradeDocURL(opts) {
  const params = {
    MerchantID: ECPAY_LOGISTICS_CONFIG.MerchantID,
    AllPayLogisticsID: opts.allPayLogisticsId,
    LogisticsType: opts.logisticsType ?? "HOME"
  };
  params.CheckMacValue = generateLogisticsCheckMacValue(params);
  const query = new URLSearchParams(params).toString();
  return `${ECPAY_LOGISTICS_CONFIG.BaseURL}/Express/PrintTradeDoc?${query}`;
}

// server/routers/order.ts
init_schema();
import { eq as eq3 } from "drizzle-orm";
var CartItemSchema = z2.object({
  id: z2.string(),
  name: z2.string(),
  price: z2.number(),
  quantity: z2.number(),
  image: z2.string().optional(),
  isPreorder: z2.boolean().optional()
});
var orderRouter = router({
  /**
   * 建立訂單並取得付款資訊
   * - credit：回傳綠界付款表單參數
   * - atm：回傳銀行帳號資訊
   */
  createAndPay: publicProcedure.input(
    z2.object({
      buyerName: z2.string().min(1),
      buyerEmail: z2.string().email(),
      buyerPhone: z2.string().min(8),
      paymentMethod: z2.enum(["credit", "atm"]),
      shippingMethod: z2.enum(["cvs_711", "cvs_family", "home"]),
      // 超商取貨資訊
      cvsStoreId: z2.string().optional(),
      cvsStoreName: z2.string().optional(),
      cvsType: z2.string().optional(),
      // 宅配地址
      shippingAddress: z2.string().optional(),
      receiverZipCode: z2.string().optional(),
      items: z2.array(CartItemSchema).min(1),
      origin: z2.string(),
      // 庫存鎖定 session token
      sessionToken: z2.string().optional()
    })
  ).mutation(async ({ input }) => {
    const merchantTradeNo = generateMerchantTradeNo();
    const totalAmount = input.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const itemName = input.items.map((i) => `${i.name} x${i.quantity}`).join("#");
    const isPreorder = input.items.some((i) => i.isPreorder);
    const orderId = await createOrder(
      {
        merchantTradeNo,
        paymentStatus: input.paymentMethod === "atm" ? "transfer_pending" : "pending",
        paymentMethod: input.paymentMethod,
        shippingMethod: input.shippingMethod,
        orderStatus: "pending_payment",
        isPreorder,
        totalAmount,
        buyerName: input.buyerName,
        buyerEmail: input.buyerEmail,
        buyerPhone: input.buyerPhone,
        cvsStoreId: input.cvsStoreId,
        cvsStoreName: input.cvsStoreName,
        cvsType: input.cvsType,
        shippingAddress: input.shippingAddress,
        receiverZipCode: input.receiverZipCode
      },
      input.items.map((item) => ({
        orderId: 0,
        productId: item.id,
        productName: item.name,
        productImage: item.image ?? "",
        quantity: item.quantity,
        unitPrice: item.price,
        subtotal: item.price * item.quantity,
        isPreorder: item.isPreorder ?? false
      }))
    );
    if (input.paymentMethod === "atm") {
      return {
        paymentMethod: "atm",
        merchantTradeNo,
        bankInfo: {
          bankName: process.env.BANK_NAME ?? "",
          accountName: process.env.BANK_ACCOUNT_NAME ?? "",
          accountNumber: process.env.BANK_ACCOUNT_NUMBER ?? ""
        }
      };
    }
    const returnURL = `${input.origin}/api/ecpay/notify`;
    const orderResultURL = `${input.origin}/api/ecpay/order-result`;
    const clientBackURL = `${input.origin}/products`;
    const paymentParams = buildCreditPaymentParams({
      merchantTradeNo,
      tradeDesc: "\u691BCrystal\u80FD\u91CF\u6C34\u6676",
      itemName,
      totalAmount,
      returnURL,
      orderResultURL,
      clientBackURL
    });
    return {
      paymentMethod: "credit",
      merchantTradeNo,
      paymentURL: ECPAY_CONFIG.PaymentURL,
      paymentParams
    };
  }),
  /**
   * 查詢訂單（含商品明細）
   */
  getOrder: publicProcedure.input(z2.object({ merchantTradeNo: z2.string() })).query(async ({ input }) => {
    const order = await getOrderWithItems(input.merchantTradeNo);
    if (!order) return null;
    return order;
  }),
  /**
   * 客人填入銀行轉帳末五碼
   */
  submitTransferCode: publicProcedure.input(z2.object({
    merchantTradeNo: z2.string(),
    lastFive: z2.string().length(5).regex(/^\d+$/)
  })).mutation(async ({ input }) => {
    await updateOrderTransferLastFive(input.merchantTradeNo, input.lastFive);
    return { success: true };
  }),
  /**
   * 老闆確認銀行轉帳收款（管理後台）
   */
  confirmTransfer: adminProcedure.input(z2.object({ orderId: z2.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [order] = await db.select({ merchantTradeNo: orders.merchantTradeNo }).from(orders).where(eq3(orders.id, input.orderId)).limit(1);
    if (!order) throw new Error("Order not found");
    await confirmTransferPayment(order.merchantTradeNo);
    return { success: true };
  }),
  /**
   * 手動更新訂單狀態（管理後台）
   */
  updateOrderStatus: adminProcedure.input(z2.object({
    orderId: z2.number(),
    status: z2.enum(["pending_payment", "paid", "processing", "shipped", "arrived", "completed", "cancelled"])
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [order] = await db.select({ merchantTradeNo: orders.merchantTradeNo }).from(orders).where(eq3(orders.id, input.orderId)).limit(1);
    if (!order) throw new Error("Order not found");
    await updateOrderStatus(order.merchantTradeNo, input.status);
    return { success: true };
  }),
  /**
   * 建立物流訂單（管理後台）
   */
  createLogistics: adminProcedure.input(z2.object({ orderId: z2.number() })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [order] = await db.select().from(orders).where(eq3(orders.id, input.orderId)).limit(1);
    if (!order) throw new Error("Order not found");
    const logisticsMerchantTradeNo = `L${Date.now()}`;
    const logisticsType = order.shippingMethod === "home" ? "HOME" : "CVS";
    const logisticsSubType = order.shippingMethod === "cvs_711" ? "UNIMARTC2C" : order.shippingMethod === "cvs_family" ? "FAMIC2C" : "TCAT";
    const normalizeReceiverName = (name) => {
      const trimmed = name.trim();
      const hasChinese = /[\u4e00-\u9fff]/.test(trimmed);
      if (hasChinese) {
        if (trimmed.length < 2) return trimmed + "\u5148\u751F";
        if (trimmed.length > 5) return trimmed.slice(0, 5);
        return trimmed;
      } else {
        if (trimmed.length < 4) return trimmed.padEnd(4, " ");
        if (trimmed.length > 10) return trimmed.slice(0, 10);
        return trimmed;
      }
    };
    const normalizedReceiverName = normalizeReceiverName(order.buyerName);
    await createLogisticsOrder({
      orderId: input.orderId,
      logisticsMerchantTradeNo,
      logisticsType,
      logisticsSubType,
      logisticsStatus: "created"
    });
    const host = process.env.NODE_ENV === "production" ? "https://www.goodaytarot.com" : `http://localhost:${process.env.PORT || 3e3}`;
    const serverReplyURL = `${host}/api/ecpay/logistics-notify`;
    let ecpayResult;
    try {
      if (order.shippingMethod === "home") {
        ecpayResult = await createHomeLogisticsOrder({
          logisticsMerchantTradeNo,
          goodsName: "\u691BCrystal\u80FD\u91CF\u6C34\u6676",
          goodsAmount: order.totalAmount,
          senderName: process.env.SENDER_NAME || "\u9673\u67D4\u85AB",
          senderPhone: process.env.SENDER_PHONE || "0916915813",
          senderAddress: process.env.SENDER_ADDRESS || "\u6843\u5712\u5E02\u9F9C\u5C71\u5340\u5357\u4E0A\u8DEF290\u5DF725\u865F",
          receiverName: normalizedReceiverName,
          receiverPhone: order.buyerPhone,
          receiverZipCode: order.receiverZipCode || "",
          receiverAddress: order.shippingAddress || "",
          serverReplyURL
        });
      } else {
        ecpayResult = await createCVSLogisticsOrder({
          logisticsMerchantTradeNo,
          goodsName: "\u691BCrystal\u80FD\u91CF\u6C34\u6676",
          goodsAmount: order.totalAmount,
          senderName: process.env.SENDER_NAME || "\u9673\u67D4\u85AB",
          senderPhone: process.env.SENDER_PHONE || "0916915813",
          receiverName: normalizedReceiverName,
          receiverPhone: order.buyerPhone,
          receiverStoreID: order.cvsStoreId || "",
          logisticsSubType,
          serverReplyURL
        });
      }
      console.log("[createLogistics] ECPay result:", ecpayResult);
      if (ecpayResult.success) {
        await db.update(logisticsOrders).set({
          allPayLogisticsId: ecpayResult.allPayLogisticsId || null,
          cvsPaymentNo: ecpayResult.cvsPaymentNo || null,
          cvsValidationNo: ecpayResult.cvsValidationNo || null,
          bookingNote: ecpayResult.bookingNote || null,
          logisticsStatus: "in_transit",
          ecpayLogisticsData: ecpayResult.raw
        }).where(eq3(logisticsOrders.logisticsMerchantTradeNo, logisticsMerchantTradeNo));
        await updateOrderStatus(order.merchantTradeNo, "shipped");
        return {
          success: true,
          logisticsId: logisticsMerchantTradeNo,
          allPayLogisticsId: ecpayResult.allPayLogisticsId,
          cvsPaymentNo: ecpayResult.cvsPaymentNo || null
        };
      } else {
        await db.delete(logisticsOrders).where(eq3(logisticsOrders.logisticsMerchantTradeNo, logisticsMerchantTradeNo));
        throw new Error(`\u7DA0\u754C\u7269\u6D41\u5EFA\u7ACB\u5931\u6557\uFF1A${ecpayResult.rtnMsg}`);
      }
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("\u7DA0\u754C\u7269\u6D41")) throw err;
      console.error("[createLogistics] Error calling ECPay:", err);
      try {
        await db.delete(logisticsOrders).where(eq3(logisticsOrders.logisticsMerchantTradeNo, logisticsMerchantTradeNo));
      } catch (_) {
      }
      throw new Error(`\u547C\u53EB\u7DA0\u754C\u7269\u6D41 API \u5931\u6557\uFF1A${String(err)}`);
    }
  }),
  /**
   * 取得宅配託運單列印 URL（管理後台）
   */
  getPrintURL: adminProcedure.input(z2.object({ orderId: z2.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [logistics] = await db.select().from(logisticsOrders).where(eq3(logisticsOrders.orderId, input.orderId)).limit(1);
    if (!logistics) throw new Error("Logistics order not found");
    if (logistics.logisticsType !== "HOME") throw new Error("Only HOME logistics supports print");
    if (!logistics.allPayLogisticsId) throw new Error("AllPayLogisticsID not available yet");
    const printURL = buildPrintTradeDocURL({
      allPayLogisticsId: logistics.allPayLogisticsId
    });
    return { printURL };
  }),
  /**
   * 取得所有訂單（管理後台）
   */
  listOrders: adminProcedure.input(
    z2.object({
      status: z2.enum(["all", "pending_payment", "paid", "processing", "shipped", "arrived", "completed", "cancelled", "transfer_pending"]).optional().default("all"),
      limit: z2.number().min(1).max(500).optional().default(100),
      offset: z2.number().min(0).optional().default(0)
    })
  ).query(async ({ input }) => {
    return getAllOrders(input.limit, input.offset, input.status);
  }),
  /**
   * 訂單統計（管理後台 Dashboard）
   */
  getStats: adminProcedure.query(async () => {
    return getOrderStats();
  }),
  /**
   * 月營收報表
   */
  getMonthlyRevenue: adminProcedure.input(z2.object({ months: z2.number().min(1).max(24).optional().default(6) })).query(async ({ input }) => {
    return getMonthlyRevenue(input.months);
  }),
  /**
   * 熱銷商品排行
   */
  getTopProducts: adminProcedure.input(z2.object({ limit: z2.number().min(1).max(20).optional().default(10) })).query(async ({ input }) => {
    return getTopProducts(input.limit);
  })
});

// server/routers/chatbot.ts
import { z as z3 } from "zod";

// server/_core/llm.ts
var ensureArray = (value) => Array.isArray(value) ? value : [value];
var normalizeContentPart = (part) => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }
  if (part.type === "text") {
    return part;
  }
  if (part.type === "image_url") {
    return part;
  }
  if (part.type === "file_url") {
    return part;
  }
  throw new Error("Unsupported message content part");
};
var normalizeMessage = (message) => {
  const { role, name, tool_call_id } = message;
  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content).map((part) => typeof part === "string" ? part : JSON.stringify(part)).join("\n");
    return {
      role,
      name,
      tool_call_id,
      content
    };
  }
  const contentParts = ensureArray(message.content).map(normalizeContentPart);
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text
    };
  }
  return {
    role,
    name,
    content: contentParts
  };
};
var normalizeToolChoice = (toolChoice, tools) => {
  if (!toolChoice) return void 0;
  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }
  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }
    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }
    return {
      type: "function",
      function: { name: tools[0].function.name }
    };
  }
  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name }
    };
  }
  return toolChoice;
};
var resolveApiUrl = () => ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0 ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions` : "https://forge.manus.im/v1/chat/completions";
var assertApiKey = () => {
  if (!ENV.forgeApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
};
var normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema
}) => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (explicitFormat.type === "json_schema" && !explicitFormat.json_schema?.schema) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }
  const schema = outputSchema || output_schema;
  if (!schema) return void 0;
  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }
  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...typeof schema.strict === "boolean" ? { strict: schema.strict } : {}
    }
  };
};
async function invokeLLM(params) {
  assertApiKey();
  const {
    model,
    messages,
    tools,
    toolChoice,
    tool_choice,
    maxTokens,
    max_tokens,
    outputSchema,
    output_schema,
    responseFormat,
    response_format
  } = params;
  const payload = {
    model: model ?? "gemini-2.5-flash",
    messages: messages.map(normalizeMessage)
  };
  if (tools && tools.length > 0) {
    payload.tools = tools;
  }
  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }
  const resolvedMaxTokens = maxTokens ?? max_tokens;
  if (resolvedMaxTokens) {
    payload.max_tokens = resolvedMaxTokens;
  }
  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema
  });
  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }
  const response = await fetch(resolveApiUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.forgeApiKey}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} \u2013 ${errorText}`
    );
  }
  return await response.json();
}

// server/crystalKnowledge.ts
var knowledgeChunks = [
  // ─── 功效類 ───
  {
    id: "k001",
    title: "\u7C89\u6C34\u6676\u7684\u611B\u60C5\u80FD\u91CF",
    content: "\u7C89\u6C34\u6676\u88AB\u7A31\u70BA\u300C\u611B\u60C5\u4E4B\u77F3\u300D\uFF0C\u5C0D\u61C9\u5FC3\u8F2A\uFF08\u7B2C\u56DB\u8108\u8F2A\uFF09\uFF0C\u80FD\u8F15\u67D4\u5730\u6253\u958B\u5FC3\u8F2A\uFF0C\u8B93\u4EBA\u6563\u767C\u6EAB\u6696\u3001\u6709\u5438\u5F15\u529B\u7684\u80FD\u91CF\u5834\u3002\u9069\u5408\u55AE\u8EAB\u6E34\u671B\u5438\u5F15\u6B63\u7DE3\u8005\u3001\u60F3\u63D0\u5347\u500B\u4EBA\u9B45\u529B\u8207\u4EBA\u7DE3\u8005\u3001\u611F\u60C5\u53D7\u50B7\u9700\u8981\u7642\u7652\u5FC3\u9748\u8005\u3002\u5EFA\u8B70\u6234\u5728\u5DE6\u624B\uFF08\u63A5\u6536\u80FD\u91CF\uFF09\uFF0C\u8B93\u7C89\u6C34\u6676\u7684\u983B\u7387\u8207\u5FC3\u8F2A\u5171\u9CF4\u3002",
    keywords: ["\u7C89\u6C34\u6676", "\u611B\u60C5", "\u6843\u82B1", "\u6B63\u7DE3", "\u5FC3\u8F2A", "\u9B45\u529B", "\u4EBA\u7DE3", "\u611F\u60C5"],
    category: "\u529F\u6548",
    relatedProductIds: ["rose-quartz-bracelet"]
  },
  {
    id: "k002",
    title: "\u9EC3\u6C34\u6676\u7684\u8CA1\u904B\u80FD\u91CF",
    content: "\u9EC3\u6C34\u6676\u53C8\u7A31\u300C\u5546\u4EBA\u4E4B\u77F3\u300D\uFF0C\u5C0D\u61C9\u592A\u967D\u795E\u7D93\u53E2\uFF08\u7B2C\u4E09\u8108\u8F2A\uFF09\uFF0C\u80FD\u6D3B\u5316\u81EA\u4FE1\u8207\u884C\u52D5\u529B\uFF0C\u5438\u5F15\u8CA1\u5BCC\u8207\u8C50\u76DB\u80FD\u91CF\u3002\u9069\u5408\u5E0C\u671B\u63D0\u5347\u8CA1\u904B\u8207\u4E8B\u696D\u904B\u8005\u3001\u5275\u696D\u8005\u3001\u696D\u52D9\u4EBA\u54E1\u3001\u6295\u8CC7\u8005\u3002\u5EFA\u8B70\u6234\u5728\u53F3\u624B\uFF08\u8F38\u51FA\u80FD\u91CF\uFF09\uFF0C\u5C07\u8CA1\u5BCC\u80FD\u91CF\u5411\u5916\u6563\u767C\u3002\u4E5F\u53EF\u653E\u7F6E\u65BC\u8FA6\u516C\u684C\u6216\u8CA1\u4F4D\u589E\u5F37\u7A7A\u9593\u8CA1\u904B\u3002",
    keywords: ["\u9EC3\u6C34\u6676", "\u8CA1\u904B", "\u62DB\u8CA1", "\u4E8B\u696D", "\u8C50\u76DB", "\u5546\u4EBA", "\u592A\u967D\u795E\u7D93\u53E2", "\u91D1\u9322"],
    category: "\u529F\u6548",
    relatedProductIds: ["citrine-bracelet"]
  },
  {
    id: "k003",
    title: "\u9ED1\u66DC\u77F3\u7684\u9632\u8B77\u80FD\u91CF",
    content: "\u9ED1\u66DC\u77F3\u662F\u6700\u5F37\u5927\u7684\u4FDD\u8B77\u77F3\u4E4B\u4E00\uFF0C\u80FD\u5F37\u529B\u5438\u6536\u4E26\u8F49\u5316\u5468\u570D\u7684\u8CA0\u9762\u80FD\u91CF\uFF0C\u5EFA\u7ACB\u500B\u4EBA\u80FD\u91CF\u9632\u8B77\u5834\u3002\u9069\u5408\u5BB9\u6613\u88AB\u4ED6\u4EBA\u60C5\u7DD2\u5F71\u97FF\u8005\u3001\u5DE5\u4F5C\u74B0\u5883\u8907\u96DC\u9700\u8981\u4FDD\u8B77\u80FD\u91CF\u8005\u3001\u5E0C\u671B\u9060\u96E2\u5C0F\u4EBA\u8005\u3002\u9ED1\u66DC\u77F3\u5438\u6536\u80FD\u91CF\u8F03\u5F37\uFF0C\u5EFA\u8B70\u6BCF\u9031\u6DE8\u5316\u4E00\u6B21\uFF08\u6708\u5149\u3001\u7159\u71FB\u6216\u6D41\u6C34\u6DE8\u5316\uFF09\uFF0C\u7761\u524D\u5EFA\u8B70\u53D6\u4E0B\u3002",
    keywords: ["\u9ED1\u66DC\u77F3", "\u9632\u8B77", "\u4FDD\u8B77", "\u5C0F\u4EBA", "\u8CA0\u80FD\u91CF", "\u6DE8\u5316", "\u63A5\u5730\u6C23"],
    category: "\u529F\u6548",
    relatedProductIds: ["obsidian-bracelet"]
  },
  {
    id: "k004",
    title: "\u7D2B\u6C34\u6676\u7684\u7642\u7652\u80FD\u91CF",
    content: "\u7D2B\u6C34\u6676\u88AB\u7A31\u70BA\u300C\u9748\u6027\u4E4B\u77F3\u300D\uFF0C\u5C0D\u61C9\u9802\u8F2A\u8207\u7B2C\u4E09\u773C\uFF0C\u80FD\u5B89\u64AB\u7126\u616E\u60C5\u7DD2\uFF0C\u5E36\u4F86\u6DF1\u5C64\u5FC3\u9748\u5E73\u975C\uFF0C\u6539\u5584\u7761\u7720\u54C1\u8CEA\u3002\u9069\u5408\u5BB9\u6613\u7126\u616E\u3001\u58D3\u529B\u5927\u7684\u4E0A\u73ED\u65CF\u3001\u7761\u7720\u54C1\u8CEA\u4E0D\u4F73\u8005\u3001\u5E0C\u671B\u63D0\u5347\u76F4\u89BA\u529B\u8005\u3002\u5EFA\u8B70\u6234\u5728\u5DE6\u624B\uFF0C\u7761\u524D\u63E1\u4F4F\u624B\u934A\u505A5\u6B21\u6DF1\u547C\u5438\uFF0C\u91CB\u653E\u7576\u65E5\u58D3\u529B\u3002",
    keywords: ["\u7D2B\u6C34\u6676", "\u7642\u7652", "\u7126\u616E", "\u7761\u7720", "\u9748\u6027", "\u975C\u5FC3", "\u51A5\u60F3", "\u58D3\u529B", "\u60C5\u7DD2"],
    category: "\u529F\u6548",
    relatedProductIds: ["amethyst-bracelet"]
  },
  {
    id: "k005",
    title: "\u9226\u6676\u7684\u5F37\u529B\u62DB\u8CA1\u529F\u6548",
    content: "\u9226\u6676\uFF08\u91D1\u9AEE\u6676\uFF09\u662F\u6C34\u6676\u754C\u516C\u8A8D\u6700\u5F37\u7684\u62DB\u8CA1\u77F3\uFF0C\u5167\u542B\u91D1\u8272\u91DD\u72C0\u9226\u7926\u7269\uFF0C\u80FD\u91CF\u5F37\u70C8\uFF0C\u80FD\u5FEB\u901F\u63D0\u5347\u8CA1\u904B\u3001\u4E8B\u696D\u904B\u8207\u500B\u4EBA\u9B44\u529B\u3002\u9069\u5408\u9700\u8981\u5FEB\u901F\u6539\u8B8A\u8CA1\u52D9\u72C0\u6CC1\u3001\u63D0\u5347\u9818\u5C0E\u529B\u7684\u4EBA\u3002\u9226\u6676\u80FD\u91CF\u8F03\u5F37\uFF0C\u521D\u6B21\u4F7F\u7528\u5EFA\u8B70\u5148\u9032\u884C\u80FD\u91CF\u9069\u61C9\uFF0C\u6234\u5728\u53F3\u624B\u6548\u679C\u6700\u4F73\u3002",
    keywords: ["\u9226\u6676", "\u91D1\u9AEE\u6676", "\u62DB\u8CA1", "\u8CA1\u904B", "\u4E8B\u696D", "\u9818\u5C0E\u529B", "\u9B44\u529B"],
    category: "\u529F\u6548"
  },
  {
    id: "k006",
    title: "\u6708\u5149\u77F3\u7684\u5973\u6027\u80FD\u91CF",
    content: "\u6708\u5149\u77F3\u5C0D\u61C9\u6708\u4EAE\u80FD\u91CF\uFF0C\u80FD\u5E73\u8861\u5973\u6027\u8377\u723E\u8499\u3001\u589E\u5F37\u76F4\u89BA\u529B\u8207\u611F\u53D7\u529B\uFF0C\u5E36\u4F86\u6EAB\u67D4\u7684\u7642\u7652\u80FD\u91CF\u3002\u7279\u5225\u9069\u5408\u5973\u6027\u914D\u6234\uFF0C\u80FD\u5E6B\u52A9\u8212\u7DE9\u7D93\u671F\u4E0D\u9069\u3001\u63D0\u5347\u9B45\u529B\u8207\u795E\u79D8\u611F\u3002\u6708\u5149\u77F3\u4E5F\u6709\u52A9\u65BC\u6539\u5584\u7761\u7720\uFF0C\u9069\u5408\u7761\u524D\u914D\u6234\u6216\u653E\u7F6E\u65BC\u6795\u908A\u3002",
    keywords: ["\u6708\u5149\u77F3", "\u5973\u6027", "\u6708\u4EAE", "\u76F4\u89BA", "\u8377\u723E\u8499", "\u7642\u7652", "\u9B45\u529B", "\u7761\u7720"],
    category: "\u529F\u6548"
  },
  {
    id: "k007",
    title: "\u8349\u8393\u6676\u7684\u611B\u60C5\u80FD\u91CF",
    content: "\u8349\u8393\u6676\u662F\u7C89\u6C34\u6676\u7684\u5347\u7D1A\u7248\uFF0C\u5167\u542B\u8D64\u9435\u7926\u5305\u88F9\u9AD4\uFF0C\u5448\u73FE\u8349\u8393\u7D05\u8272\uFF0C\u80FD\u91CF\u6BD4\u7C89\u6C34\u6676\u66F4\u7A4D\u6975\u4E3B\u52D5\u3002\u9069\u5408\u60F3\u8981\u4E3B\u52D5\u8FFD\u6C42\u611B\u60C5\u3001\u63D0\u5347\u81EA\u4FE1\u8207\u9B45\u529B\u8005\u3002\u8349\u8393\u6676\u5C0D\u61C9\u5FC3\u8F2A\uFF0C\u80FD\u5E6B\u52A9\u91CB\u653E\u904E\u53BB\u611F\u60C5\u50B7\u75DB\uFF0C\u4EE5\u66F4\u7A4D\u6975\u7684\u614B\u5EA6\u8FCE\u63A5\u65B0\u7DE3\u5206\u3002",
    keywords: ["\u8349\u8393\u6676", "\u611B\u60C5", "\u6843\u82B1", "\u81EA\u4FE1", "\u9B45\u529B", "\u5FC3\u8F2A", "\u611F\u60C5"],
    category: "\u529F\u6548"
  },
  // ─── 淨化類 ───
  {
    id: "k010",
    title: "\u6C34\u6676\u6DE8\u5316\u65B9\u6CD5\u5927\u5168",
    content: "\u5E38\u898B\u6DE8\u5316\u65B9\u6CD5\uFF1A\u2460\u6708\u5149\u6DE8\u5316\uFF1A\u6EFF\u6708\u524D\u5F8C\u5C07\u6C34\u6676\u653E\u5728\u7A97\u53F0\u6216\u5BA4\u5916\uFF0C\u63A5\u53D7\u6708\u5149\u7167\u5C04\u4E00\u591C\uFF0C\u9069\u5408\u6240\u6709\u6C34\u6676\u3002\u2461\u767D\u6C34\u6676\u7C07\u6DE8\u5316\uFF1A\u5C07\u6C34\u6676\u653E\u5728\u767D\u6C34\u6676\u7C07\u4E0A24\u5C0F\u6642\uFF0C\u767D\u6C34\u6676\u80FD\u81EA\u52D5\u6DE8\u5316\u4E26\u5145\u80FD\u3002\u2462\u7159\u71FB\u6DE8\u5316\uFF1A\u7528\u9F20\u5C3E\u8349\u6216\u8056\u6728\u7684\u7159\u9727\u7E5E\u904E\u6C34\u6676\uFF0C\u9069\u5408\u6240\u6709\u6C34\u6676\u3002\u2463\u6D41\u6C34\u6DE8\u5316\uFF1A\u5728\u6D41\u52D5\u7684\u6E05\u6C34\u4E0B\u6C96\u6D17\uFF0C\u4F46\u4E0D\u9069\u5408\u9ED1\u66DC\u77F3\u3001\u7C89\u6C34\u6676\u3001\u6708\u5149\u77F3\u7B49\u8F03\u8EDF\u7684\u6C34\u6676\u3002\u2464\u97F3\u7F3D\u6DE8\u5316\uFF1A\u7528\u980C\u7F3D\u7684\u8072\u97F3\u632F\u52D5\u6DE8\u5316\uFF0C\u9069\u5408\u6240\u6709\u6C34\u6676\u3002",
    keywords: ["\u6DE8\u5316", "\u6D88\u78C1", "\u6708\u5149", "\u767D\u6C34\u6676", "\u7159\u71FB", "\u6D41\u6C34", "\u97F3\u7F3D", "\u980C\u7F3D", "\u9F20\u5C3E\u8349"],
    category: "\u6DE8\u5316"
  },
  {
    id: "k011",
    title: "\u6C34\u6676\u6DE8\u5316\u983B\u7387\u5EFA\u8B70",
    content: "\u5EFA\u8B70\u6BCF\u6708\u81F3\u5C11\u6DE8\u5316\u4E00\u6B21\uFF0C\u82E5\u983B\u7E41\u914D\u6234\u6216\u611F\u89BA\u80FD\u91CF\u6C89\u91CD\uFF0C\u53EF\u6BCF\u9031\u6DE8\u5316\u3002\u9ED1\u66DC\u77F3\u56E0\u5438\u6536\u80FD\u91CF\u8F03\u5F37\uFF0C\u5EFA\u8B70\u6BCF\u9031\u6DE8\u5316\u4E00\u6B21\u3002\u65B0\u8CFC\u5165\u7684\u6C34\u6676\u5EFA\u8B70\u5148\u6DE8\u5316\u518D\u4F7F\u7528\uFF0C\u6E05\u9664\u4E4B\u524D\u7684\u80FD\u91CF\u8A18\u61B6\u3002\u6DE8\u5316\u5F8C\u53EF\u5728\u967D\u5149\u4E0B\u5145\u80FD\uFF08\u6CE8\u610F\uFF1A\u7D2B\u6C34\u6676\u3001\u73AB\u7470\u77F3\u82F1\u7B49\u6709\u8272\u6C34\u6676\u4E0D\u5B9C\u9577\u6642\u9593\u65E5\u66EC\uFF0C\u6703\u892A\u8272\uFF09\u3002",
    keywords: ["\u6DE8\u5316", "\u6D88\u78C1", "\u983B\u7387", "\u591A\u4E45", "\u5E7E\u6B21", "\u65B0\u6C34\u6676"],
    category: "\u6DE8\u5316"
  },
  // ─── 配戴類 ───
  {
    id: "k020",
    title: "\u6C34\u6676\u624B\u934A\u5DE6\u53F3\u624B\u914D\u6234\u8AAA\u660E",
    content: "\u50B3\u7D71\u80FD\u91CF\u5B78\u8AAA\uFF1A\u5DE6\u624B\u70BA\u63A5\u6536\u80FD\u91CF\u7684\u624B\uFF0C\u9069\u5408\u6234\u9700\u8981\u5438\u6536\u80FD\u91CF\u7684\u6C34\u6676\uFF0C\u5982\u7C89\u6C34\u6676\uFF08\u5438\u5F15\u611B\u60C5\uFF09\u3001\u7D2B\u6C34\u6676\uFF08\u5438\u6536\u7642\u7652\u80FD\u91CF\uFF09\u3001\u6708\u5149\u77F3\u3002\u53F3\u624B\u70BA\u8F38\u51FA\u80FD\u91CF\u7684\u624B\uFF0C\u9069\u5408\u6234\u9700\u8981\u5411\u5916\u6563\u767C\u7684\u6C34\u6676\uFF0C\u5982\u9EC3\u6C34\u6676\uFF08\u6563\u767C\u8CA1\u5BCC\u80FD\u91CF\uFF09\u3001\u9ED1\u66DC\u77F3\uFF08\u5411\u5916\u6392\u9664\u8CA0\u80FD\u91CF\uFF09\u3002\u6700\u91CD\u8981\u7684\u662F\u8046\u807D\u81EA\u5DF1\u7684\u611F\u89BA\uFF0C\u54EA\u96BB\u624B\u6234\u8D77\u4F86\u66F4\u8212\u670D\u5C31\u6234\u54EA\u96BB\u3002",
    keywords: ["\u5DE6\u624B", "\u53F3\u624B", "\u914D\u6234", "\u6234\u6CD5", "\u54EA\u96BB\u624B", "\u80FD\u91CF"],
    category: "\u914D\u6234"
  },
  {
    id: "k021",
    title: "\u6C34\u6676\u624B\u934A\u7684\u65E5\u5E38\u4FDD\u990A",
    content: "\u6C34\u6676\u624B\u934A\u7684\u65E5\u5E38\u4FDD\u990A\u6CE8\u610F\u4E8B\u9805\uFF1A\u2460\u907F\u514D\u63A5\u89F8\u5316\u5B78\u7269\u8CEA\uFF08\u9999\u6C34\u3001\u4E73\u6DB2\u3001\u6E05\u6F54\u5291\uFF09\uFF0C\u6703\u640D\u50B7\u6C34\u6676\u8868\u9762\u3002\u2461\u904B\u52D5\u3001\u6E38\u6CF3\u3001\u6D17\u6FA1\u6642\u5EFA\u8B70\u53D6\u4E0B\u3002\u2462\u7761\u524D\u5EFA\u8B70\u53D6\u4E0B\uFF0C\u7279\u5225\u662F\u9ED1\u66DC\u77F3\uFF08\u80FD\u91CF\u8F03\u5F37\uFF0C\u53EF\u80FD\u5F71\u97FF\u5922\u5883\uFF09\u3002\u2463\u907F\u514D\u78B0\u649E\uFF0C\u5929\u7136\u6C34\u6676\u8F03\u8106\uFF0C\u5BB9\u6613\u7F3A\u89D2\u3002\u2464\u5B9A\u671F\u6DE8\u5316\u5145\u80FD\uFF0C\u4FDD\u6301\u6700\u4F73\u80FD\u91CF\u72C0\u614B\u3002",
    keywords: ["\u4FDD\u990A", "\u6CE8\u610F\u4E8B\u9805", "\u65E5\u5E38", "\u6D17\u6FA1", "\u904B\u52D5", "\u7761\u89BA", "\u5316\u5B78"],
    category: "\u914D\u6234"
  },
  // ─── 選購類 ───
  {
    id: "k030",
    title: "\u5982\u4F55\u8FA8\u5225\u5929\u7136\u6C34\u6676\u8207\u4EBA\u5DE5\u73BB\u7483",
    content: "\u8FA8\u5225\u5929\u7136\u6C34\u6676\u7684\u65B9\u6CD5\uFF1A\u2460\u6EAB\u5EA6\u6E2C\u8A66\uFF1A\u5929\u7136\u6C34\u6676\u5C0E\u71B1\u6027\u597D\uFF0C\u624B\u63E1\u6642\u6709\u6DBC\u611F\uFF0C\u4EBA\u5DE5\u73BB\u7483\u5247\u8207\u5BA4\u6EAB\u76F8\u8FD1\u3002\u2461\u5167\u542B\u7269\uFF1A\u5929\u7136\u6C34\u6676\u901A\u5E38\u6709\u7D30\u5FAE\u7684\u51B0\u88C2\u7D0B\u3001\u96F2\u9727\u611F\u6216\u7926\u7269\u5305\u88F9\u9AD4\uFF0C\u4EBA\u5DE5\u73BB\u7483\u904E\u65BC\u5B8C\u7F8E\u900F\u660E\u3002\u2462\u91CD\u91CF\uFF1A\u5929\u7136\u6C34\u6676\u6BD4\u540C\u9AD4\u7A4D\u73BB\u7483\u91CD\u3002\u2463\u786C\u5EA6\uFF1A\u5929\u7136\u6C34\u6676\uFF08\u83AB\u6C0F\u786C\u5EA67\uFF09\u80FD\u5283\u50B7\u73BB\u7483\uFF0C\u4F46\u73BB\u7483\u7121\u6CD5\u5283\u50B7\u6C34\u6676\u3002\u5EFA\u8B70\u5411\u6709\u4FE1\u8B7D\u7684\u5E97\u5BB6\u8CFC\u8CB7\uFF0C\u4E26\u7D22\u53D6\u7522\u54C1\u8AAA\u660E\u3002",
    keywords: ["\u8FA8\u5225", "\u771F\u5047", "\u5929\u7136", "\u4EBA\u5DE5", "\u73BB\u7483", "\u9451\u5225", "\u9078\u8CFC"],
    category: "\u9078\u8CFC"
  },
  {
    id: "k031",
    title: "\u65B0\u624B\u5982\u4F55\u6311\u9078\u7B2C\u4E00\u9846\u6C34\u6676",
    content: "\u65B0\u624B\u6311\u9078\u6C34\u6676\u7684\u5EFA\u8B70\uFF1A\u2460\u5148\u78BA\u8A8D\u81EA\u5DF1\u7684\u9700\u6C42\uFF08\u611B\u60C5\u3001\u8CA1\u904B\u3001\u4FDD\u8B77\u3001\u7642\u7652\uFF09\uFF0C\u518D\u9078\u5C0D\u61C9\u7684\u6C34\u6676\u3002\u2461\u76F8\u4FE1\u76F4\u89BA\uFF0C\u5C0D\u54EA\u9846\u6C34\u6676\u611F\u5230\u5438\u5F15\u5C31\u9078\u54EA\u9846\uFF0C\u9019\u901A\u5E38\u4EE3\u8868\u4F60\u7684\u80FD\u91CF\u8207\u5B83\u5171\u9CF4\u3002\u2462\u5F9E\u624B\u934A\u958B\u59CB\uFF0C\u65B9\u4FBF\u914D\u6234\u4E14\u80FD\u91CF\u63A5\u89F8\u6700\u76F4\u63A5\u3002\u2463\u4E0D\u9700\u8981\u4E00\u6B21\u8CB7\u5F88\u591A\uFF0C\u5148\u5F9E\u4E00\u9846\u958B\u59CB\uFF0C\u611F\u53D7\u5B83\u7684\u80FD\u91CF\u3002\u2464\u8CFC\u8CB7\u524D\u5148\u4E86\u89E3\u8A72\u6C34\u6676\u7684\u6DE8\u5316\u65B9\u5F0F\uFF0C\u78BA\u4FDD\u80FD\u6B63\u78BA\u4FDD\u990A\u3002",
    keywords: ["\u65B0\u624B", "\u7B2C\u4E00\u9846", "\u6311\u9078", "\u9078\u64C7", "\u63A8\u85A6", "\u5165\u9580"],
    category: "\u9078\u8CFC"
  },
  // ─── 常見問題 ───
  {
    id: "k040",
    title: "\u6C34\u6676\u80FD\u91CF\u6709\u79D1\u5B78\u4F9D\u64DA\u55CE",
    content: "\u76EE\u524D\u6C34\u6676\u80FD\u91CF\u7684\u8AAA\u6CD5\u5C1A\u7121\u56B4\u683C\u79D1\u5B78\u5BE6\u8B49\u3002\u7136\u800C\uFF0C\u8A31\u591A\u4EBA\u53CD\u6620\u914D\u6234\u6C34\u6676\u5F8C\u5FC3\u614B\u66F4\u7A4D\u6975\u3001\u66F4\u6709\u610F\u8B58\u5730\u95DC\u6CE8\u81EA\u5DF1\u7684\u60C5\u7DD2\u72C0\u614B\u3002\u9019\u53EF\u80FD\u8207\u300C\u610F\u5716\u8A2D\u5B9A\u300D\u7684\u5FC3\u7406\u6548\u61C9\u6709\u95DC\u2014\u2014\u7576\u4F60\u6709\u610F\u8B58\u5730\u70BA\u81EA\u5DF1\u8A2D\u5B9A\u76EE\u6A19\uFF0C\u884C\u70BA\u81EA\u7136\u6703\u671D\u90A3\u500B\u65B9\u5411\u6539\u8B8A\u3002\u691B\u02D9Crystal \u7684\u6C34\u6676\u662F\u5FC3\u7406\u8207\u80FD\u91CF\u652F\u6301\u5DE5\u5177\uFF0C\u975E\u91AB\u7642\u7528\u54C1\uFF0C\u4E0D\u5177\u4EFB\u4F55\u91AB\u7642\u7642\u6548\u3002",
    keywords: ["\u79D1\u5B78", "\u4F9D\u64DA", "\u6709\u6548", "\u771F\u7684\u55CE", "\u8FF7\u4FE1", "\u5FC3\u7406", "\u6548\u679C"],
    category: "\u5E38\u898B\u554F\u984C"
  },
  {
    id: "k041",
    title: "\u6C34\u6676\u53EF\u4EE5\u501F\u5225\u4EBA\u6234\u55CE",
    content: "\u4E0D\u5EFA\u8B70\u5C07\u81EA\u5DF1\u7684\u6C34\u6676\u501F\u7D66\u4ED6\u4EBA\u914D\u6234\uFF0C\u56E0\u70BA\u6C34\u6676\u6703\u8A18\u9304\u914D\u6234\u8005\u7684\u80FD\u91CF\u983B\u7387\u3002\u5982\u679C\u4ED6\u4EBA\u914D\u6234\u4E86\u4F60\u7684\u6C34\u6676\uFF0C\u5EFA\u8B70\u4E4B\u5F8C\u9032\u884C\u4E00\u6B21\u5B8C\u6574\u7684\u6DE8\u5316\uFF0C\u6E05\u9664\u6DF7\u5165\u7684\u80FD\u91CF\u8A18\u61B6\uFF0C\u518D\u91CD\u65B0\u8A2D\u5B9A\u610F\u5716\u3002\u540C\u6A23\u5730\uFF0C\u8CFC\u8CB7\u4E8C\u624B\u6C34\u6676\u6642\uFF0C\u4E5F\u52D9\u5FC5\u5148\u9032\u884C\u5FB9\u5E95\u6DE8\u5316\u3002",
    keywords: ["\u501F", "\u5206\u4EAB", "\u4ED6\u4EBA", "\u4E8C\u624B", "\u80FD\u91CF\u8A18\u61B6"],
    category: "\u5E38\u898B\u554F\u984C"
  },
  {
    id: "k042",
    title: "\u6C34\u6676\u53EF\u4EE5\u540C\u6642\u6234\u5E7E\u9846",
    content: "\u53EF\u4EE5\u540C\u6642\u914D\u6234\u591A\u9846\u6C34\u6676\uFF0C\u4F46\u5EFA\u8B70\u4E0D\u8D85\u904E3\u9846\uFF0C\u907F\u514D\u80FD\u91CF\u904E\u65BC\u8907\u96DC\u3002\u9078\u64C7\u80FD\u91CF\u76F8\u5BB9\u7684\u6C34\u6676\u642D\u914D\uFF0C\u4F8B\u5982\uFF1A\u7C89\u6C34\u6676\uFF08\u611B\u60C5\uFF09+ \u6708\u5149\u77F3\uFF08\u5973\u6027\u80FD\u91CF\uFF09\u76F8\u5BB9\uFF1B\u9EC3\u6C34\u6676\uFF08\u8CA1\u904B\uFF09+ \u9226\u6676\uFF08\u62DB\u8CA1\uFF09\u76F8\u5BB9\uFF1B\u9ED1\u66DC\u77F3\uFF08\u4FDD\u8B77\uFF09\u53EF\u8207\u5927\u591A\u6578\u6C34\u6676\u642D\u914D\u3002\u907F\u514D\u5C07\u80FD\u91CF\u65B9\u5411\u76F8\u53CD\u7684\u6C34\u6676\u540C\u6642\u914D\u6234\uFF0C\u4F8B\u5982\u540C\u6642\u6234\u591A\u9846\u9AD8\u80FD\u91CF\u62DB\u8CA1\u77F3\u53EF\u80FD\u8B93\u80FD\u91CF\u904E\u65BC\u8E81\u52D5\u3002",
    keywords: ["\u5E7E\u9846", "\u540C\u6642", "\u642D\u914D", "\u7D44\u5408", "\u591A\u9846"],
    category: "\u5E38\u898B\u554F\u984C"
  },
  {
    id: "k043",
    title: "\u6C34\u6676\u65B7\u88C2\u6216\u7834\u640D\u7684\u610F\u7FA9",
    content: "\u6C34\u6676\u65B7\u88C2\u6216\u7834\u640D\u5728\u80FD\u91CF\u5B78\u4E0A\u6709\u5E7E\u7A2E\u89E3\u8B80\uFF1A\u2460\u6C34\u6676\u5DF2\u5B8C\u6210\u5B83\u7684\u4F7F\u547D\uFF0C\u5E6B\u4F60\u5438\u6536\u4E86\u8DB3\u5920\u7684\u8CA0\u80FD\u91CF\uFF1B\u2461\u53EF\u80FD\u662F\u63D0\u9192\u4F60\u9700\u8981\u66F4\u983B\u7E41\u5730\u6DE8\u5316\uFF1B\u2462\u4E5F\u53EF\u80FD\u53EA\u662F\u7269\u7406\u78B0\u649E\u9020\u6210\u7684\u640D\u58DE\u3002\u7121\u8AD6\u5982\u4F55\uFF0C\u65B7\u88C2\u7684\u6C34\u6676\u5EFA\u8B70\u57CB\u5165\u571F\u4E2D\u6216\u653E\u6D41\uFF0C\u611F\u8B1D\u5B83\u7684\u670D\u52D9\uFF0C\u518D\u8CFC\u5165\u65B0\u7684\u6C34\u6676\u3002",
    keywords: ["\u65B7\u88C2", "\u7834\u640D", "\u788E\u6389", "\u88C2\u958B", "\u610F\u7FA9", "\u600E\u9EBC\u8FA6"],
    category: "\u5E38\u898B\u554F\u984C"
  },
  // ─── 客製化方案 ───
  {
    id: "k050",
    title: "\u5BA2\u88FD\u5316\u6C34\u6676\u624B\u934A\u670D\u52D9\u8AAA\u660E",
    content: "\u691B\u02D9Crystal \u63D0\u4F9B\u56DB\u7A2E\u5BA2\u88FD\u5316\u6C34\u6676\u624B\u934A\u65B9\u6848\uFF1AA.\u7D14\u5BA2\u88FD\u6C34\u6676\u624B\u934A\uFF08\u8CBB\u75281500$\xB1300$\uFF09\uFF1A\u53EF\u63D0\u4F9B\u60F3\u8981\u7684\u529F\u6548\u3001\u8272\u7CFB\u3001\u6B3E\u5F0F\uFF0C\u6216\u8207\u8001\u5E2B\u8A0E\u8AD6\u5982\u611B\u60C5\u3001\u6E9D\u901A\u80FD\u529B\u3001\u8CA1\u904B\u3001\u75BE\u75C5\u7B49\u9700\u6C42\uFF0C\u63D0\u4F9B\u521D\u7248\u514D\u8CBB\u4FEE\u65391\u6B21\u3002B.\u5854\u7F85\xD7\u6C34\u6676\u624B\u934A\uFF08\u8CBB\u75281500$\xB1300$\uFF0C\u52A0\u8CFC\u5854\u7F85\u5360\u535C\u62539\u6298\uFF09\uFF1A\u63D0\u4F9B\u5854\u7F85\u89E3\u6790\uFF0C\u900F\u904E\u89E3\u6790\u5206\u6790\u7F3A\u5931\u7684\u80FD\u91CF\uFF0C\u5229\u7528\u6C34\u6676\u80FD\u91CF\u88DC\u8DB3\uFF0C\u4E5F\u53EF\u8A31\u9858\u60F3\u984D\u5916\u52A0\u5F37\u7684\u80FD\u91CF\u3002C.\u8108\u8F2A\u6AA2\u6E2C\xD7\u6C34\u6676\u624B\u934A\uFF08\u8CBB\u75281500$\xB1300$\uFF0C\u52A0\u8CFC\u8108\u8F2A\u6AA2\u6E2C500$\uFF09\uFF1A\u4EE5\u9748\u64FA\u8207\u5854\u7F85\u6E2C\u51FA\u4E03\u8108\u8F2A\u80FD\u91CF\u72C0\u6CC1\uFF0C\u63D0\u4F9B\u5C08\u5C6C\u8108\u8F2A\u6AA2\u6E2C\u5831\u544A\uFF0C\u5229\u7528\u6C34\u6676\u80FD\u91CF\u88DC\u8DB3\u8108\u8F2A\u80FD\u91CF\u7F3A\u5931\u3002D.\u751F\u547D\u9748\u6578\xD7\u6C34\u6676\u624B\u934A\uFF08\u8CBB\u75281500$\xB1300$\uFF0C\u52A0\u8CFC\u751F\u547D\u9748\u6578\u6AA2\u6E2C500$\uFF09\uFF1A\u900F\u904E\u897F\u5143\u51FA\u751F\u5E74\u6708\u65E5\u627E\u51FA\u5929\u8CE6\u6578\u3001\u751F\u547D\u6578\u3001\u5148\u5929\u6578\u3001\u661F\u5EA7\u6578\uFF0C\u627E\u51FA\u7F3A\u6578\u4E26\u900F\u904E\u751F\u547D\u6578\u8207\u7F3A\u6578\u505A\u80FD\u91CF\u642D\u914D\u3002",
    keywords: ["\u5BA2\u88FD\u5316", "\u5BA2\u88FD", "\u8A02\u88FD", "\u5854\u7F85", "\u8108\u8F2A", "\u751F\u547D\u9748\u6578", "\u65B9\u6848", "\u8CBB\u7528", "\u50F9\u683C"],
    category: "\u5BA2\u88FD\u5316"
  },
  {
    id: "k051",
    title: "\u5982\u4F55\u806F\u7E6B\u5BA2\u88FD\u5316\u670D\u52D9",
    content: "\u60F3\u8981\u5BA2\u88FD\u5316\u6C34\u6676\u624B\u934A\uFF0C\u8ACB\u900F\u904E LINE \u5BA2\u670D\u806F\u7E6B\u6211\u5011\uFF0C\u8001\u5E2B\u6703\u8207\u60A8\u8A73\u7D30\u8A0E\u8AD6\u60A8\u7684\u9700\u6C42\u3001\u80FD\u91CF\u72C0\u6CC1\u8207\u9069\u5408\u7684\u6C34\u6676\u642D\u914D\u3002\u5BA2\u88FD\u5316\u624B\u934A\u88FD\u4F5C\u6642\u9593\u7D047-14\u500B\u5DE5\u4F5C\u5929\uFF0C\u6BCF\u4EF6\u90FD\u662F\u624B\u5DE5\u88FD\u4F5C\uFF0C\u7368\u4E00\u7121\u4E8C\u3002\u6B61\u8FCE\u52A0\u5165 LINE \u5B98\u65B9\u5E33\u865F\u8AEE\u8A62\uFF0C\u6216\u5728\u7DB2\u7AD9\u300C\u5BA2\u88FD\u5316\u65B9\u6848\u300D\u9801\u9762\u4E86\u89E3\u8A73\u60C5\u3002",
    keywords: ["\u806F\u7E6B", "LINE", "\u8AEE\u8A62", "\u5BA2\u670D", "\u8A02\u8CFC", "\u5982\u4F55", "\u600E\u9EBC"],
    category: "\u5BA2\u88FD\u5316"
  }
];
function searchKnowledge(query, topK = 3) {
  const queryTokens = tokenize(query);
  const scored = knowledgeChunks.map((chunk) => {
    const chunkTokens = tokenize(
      chunk.title + " " + chunk.content + " " + chunk.keywords.join(" ")
    );
    let score = 0;
    for (const qt of queryTokens) {
      for (const ct of chunkTokens) {
        if (ct.includes(qt) || qt.includes(ct)) {
          score += qt.length >= 2 ? 2 : 1;
        }
      }
      if (chunk.keywords.some((kw) => kw.includes(qt) || qt.includes(kw))) {
        score += 3;
      }
    }
    return { chunk, score };
  });
  return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, topK).map((s) => s.chunk);
}
function tokenize(text2) {
  const tokens = [];
  for (let len = 4; len >= 2; len--) {
    for (let i = 0; i <= text2.length - len; i++) {
      const token = text2.slice(i, i + len);
      if (/[\u4e00-\u9fff]/.test(token)) {
        tokens.push(token);
      }
    }
  }
  const englishWords = text2.match(/[a-zA-Z]+/g) || [];
  tokens.push(...englishWords.map((w) => w.toLowerCase()));
  return Array.from(new Set(tokens));
}

// client/src/lib/data.ts
var products = [
  {
    id: "d001-moon-secret",
    name: "\u6708\u4E0B\u5BC6\u8A9E\u624B\u934A",
    subtitle: "\u6DE8\u5316\u58D3\u529B\uFF0C\u559A\u9192\u5167\u5728\u5E73\u975C\u8207\u9B45\u529B",
    category: "healing",
    categoryLabel: "D \u8A2D\u8A08\u6B3E",
    price: 1480,
    originalPrice: 1880,
    image: "/images/d-design/d001.jpg",
    tags: ["D\u8A2D\u8A08\u6B3E", "\u6DE8\u5316", "\u5E73\u8861"],
    description: "\u6C34\u6676\uFF1A\u767D\u5E7D\u9748\u3001\u85CD\u6708\u5149\u3001\u7070\u6708\u5149\u3001\u85CD\u91DD\u3001\u73CD\u73E0",
    story: "",
    benefits: [
      "\u6DE8\u5316\u8CA0\u80FD\u91CF\u8207\u904E\u53BB\u4E0D\u597D\u7684\u8A18\u61B6",
      "\u5E73\u8861\u8EAB\u5FC3\u9748\u4E26\u91CB\u653E\u58D3\u529B\u7126\u616E",
      "\u589E\u5F37\u76F4\u89BA\u8207\u9748\u611F\uFF0C\u63D0\u5347\u5275\u9020\u529B",
      "\u63D0\u5347\u81EA\u4FE1\u8207\u52C7\u6C23\uFF0C\u52A0\u5F37\u8868\u9054\u529B",
      "\u62DB\u4EBA\u7DE3\u4E26\u4FDD\u8B77\u514D\u53D7\u5916\u5728\u8CA0\u80FD\u91CF\u4FB5\u64FE"
    ],
    suitableFor: ["\u8FD1\u671F\u58D3\u529B\u8F03\u5927\u8005", "\u5E0C\u671B\u7A69\u5B9A\u60C5\u7DD2\u8207\u63D0\u5347\u9B45\u529B\u8005", "\u60F3\u589E\u5F37\u6E9D\u901A\u8868\u9054\u8207\u9748\u611F\u8005"],
    howToUse: [
      "\u624B\u570D\uFF1A12\u300112.5\u300113\u300113.5\u300114\u300114.5\u300115\u300115.5\u300116\u300116.5\u300117\u300117.5\u300118\u300118.5\u300119",
      "\u624B\u570D\u5C0F\u65BC13.5\uFF0D1480$\uFF0C\u624B\u570D14-17\uFF0D1580$\uFF0C\u624B\u570D\u5927\u65BC18\uFF0D1680$",
      "\u6A19\u6E96\u70BA\u5F48\u529B\u7E69\u7248\u672C\uFF1B\u82E5\u6539\u9F8D\u8766\u6263\u6216\u78C1\u6263\u9700\u52A0\u6536 200 \u5143"
    ],
    disclaimer: "\u672C\u5546\u54C1\u70BA\u5929\u7136\u7926\u77F3\u98FE\u54C1\uFF0C\u5177\u6709\u500B\u4EBA\u80FD\u91CF\u652F\u6301\u4F5C\u7528\uFF0C\u975E\u91AB\u7642\u7528\u54C1\uFF0C\u4E0D\u5177\u4EFB\u4F55\u91AB\u7642\u7642\u6548\u3002\u6548\u679C\u56E0\u500B\u4EBA\u80FD\u91CF\u72C0\u614B\u800C\u7570\u3002",
    inStock: true,
    featured: false,
    crystalType: "\u767D\u5E7D\u9748\u3001\u85CD\u6708\u5149\u3001\u7070\u6708\u5149\u3001\u85CD\u91DD\u3001\u73CD\u73E0",
    color: "\u6708\u5149\u767D\u85CD"
  },
  {
    id: "d002-honey-realm",
    name: "\u871C\u5149\u4E4B\u5883\u624B\u934A",
    subtitle: "\u8CA1\u5BCC\u3001\u4EBA\u7DE3\u8207\u4FDD\u8B77\u80FD\u91CF\u4E00\u6B21\u5230\u4F4D",
    category: "wealth",
    categoryLabel: "D \u8A2D\u8A08\u6B3E",
    price: 1580,
    originalPrice: 1880,
    image: "/images/d-design/d002.jpg",
    tags: ["D\u8A2D\u8A08\u6B3E", "\u62DB\u8CA1", "\u4EBA\u7DE3"],
    description: "\u7D50\u5408\u9285\u9AEE\u6676\u3001\u9EC3\u6C34\u6676\u3001\u8349\u8393\u6676\u3001\u8461\u8404\u77F3\u3001\u592A\u967D\u77F3\u7B49\u591A\u7A2E\u6676\u77F3\uFF0C\u6253\u9020\u8C50\u76DB\u4E14\u7A69\u5B9A\u7684\u80FD\u91CF\u5834\u3002",
    story: "\u871C\u5149\u4E4B\u5883\u662F\u4E00\u6B3E\u8907\u65B9\u8A2D\u8A08\uFF0C\u517C\u9867\u884C\u52D5\u529B\u3001\u8CA1\u5BCC\u904B\u8207\u60C5\u7DD2\u5E73\u8861\u3002\u9069\u5408\u60F3\u52A0\u901F\u57F7\u884C\u76EE\u6A19\uFF0C\u540C\u6642\u7DAD\u6301\u5167\u5728\u7A69\u5B9A\u8207\u4EBA\u969B\u548C\u8AE7\u8005\u3002\u5546\u54C1\u6703\u56E0\u624B\u570D\u4E0D\u540C\u800C\u6709\u4E9B\u5FAE\u8B8A\u5316\uFF1B\u82E5\u9700\u6539\u9F8D\u8766\u6263\u6216\u78C1\u6263\uFF0C\u9700\u52A0\u6536 200 \u5143\u5DE5\u672C\u8CBB\u3002",
    benefits: [
      "\u62DB\u8CA1\u805A\u80FD\u4E26\u63D0\u5347\u884C\u52D5\u529B",
      "\u5438\u5F15\u611B\u60C5\u8207\u597D\u4EBA\u7DE3",
      "\u6DE8\u5316\u4E26\u653E\u5927\u500B\u4EBA\u80FD\u91CF",
      "\u5F37\u5316\u4FDD\u8B77\u529B\u8207\u7A69\u5B9A\u6C23\u5834",
      "\u5E36\u4F86\u7642\u7652\u3001\u6D3B\u529B\u8207\u5167\u5728\u7A69\u5B9A"
    ],
    suitableFor: ["\u5E0C\u671B\u540C\u6642\u63D0\u5347\u8CA1\u904B\u8207\u4EBA\u7DE3\u8005", "\u6B63\u5728\u885D\u523A\u5DE5\u4F5C\u76EE\u6A19\u8005", "\u9700\u8981\u7A69\u5B9A\u60C5\u7DD2\u8207\u9632\u8B77\u529B\u8005"],
    howToUse: [
      "\u624B\u570D\u53EF\u9078 12-19 \u516C\u5206\uFF0C\u8ACB\u4F9D\u6DE8\u624B\u570D\u4E0B\u55AE",
      "\u6A19\u6E96\u70BA\u5F48\u529B\u7E69\u7248\u672C\uFF1B\u82E5\u6539\u9F8D\u8766\u6263\u6216\u78C1\u6263\u9700\u52A0\u6536 200 \u5143",
      "\u53EF\u65BC\u5DE5\u4F5C\u65E5\u914D\u6234\uFF0C\u589E\u5F37\u5C08\u6CE8\u8207\u57F7\u884C\u7BC0\u594F"
    ],
    disclaimer: "\u672C\u5546\u54C1\u70BA\u5929\u7136\u7926\u77F3\u98FE\u54C1\uFF0C\u5177\u6709\u500B\u4EBA\u80FD\u91CF\u652F\u6301\u4F5C\u7528\uFF0C\u975E\u91AB\u7642\u7528\u54C1\uFF0C\u4E0D\u5177\u4EFB\u4F55\u91AB\u7642\u7642\u6548\u3002\u6548\u679C\u56E0\u500B\u4EBA\u80FD\u91CF\u72C0\u614B\u800C\u7570\u3002",
    inStock: true,
    featured: false,
    crystalType: "\u9285\u9AEE\u6676\u3001\u9EC3\u6C34\u6676\u3001\u8349\u8393\u6676\u3001\u767D\u6C34\u6676\u3001\u9ED1\u66DC\u77F3\u3001\u73CD\u73E0\u3001\u8461\u8404\u77F3\u3001\u592A\u967D\u77F3\u3001\u7C89\u6676",
    color: "\u871C\u91D1\u6696\u7C89"
  },
  {
    id: "d003-venus",
    name: "\u7DAD\u7D0D\u65AF Venus \u624B\u934A",
    subtitle: "\u559A\u9192\u81EA\u4FE1\u8207\u5438\u5F15\u529B\u7684\u65E5\u5E38\u914D\u6234\u6B3E",
    category: "love",
    categoryLabel: "D \u8A2D\u8A08\u6B3E",
    price: 950,
    image: "/images/d-design/d003.jpg",
    tags: ["D\u8A2D\u8A08\u6B3E", "\u81EA\u4FE1", "\u9B45\u529B"],
    description: "\u4EE5\u592A\u967D\u77F3\u3001\u9226\u6676\u3001\u85CD\u6708\u5149\u3001\u767D\u6C34\u6676\u8207\u73CD\u73E0\u642D\u914D\uFF0C\u5916\u89C0\u4FD0\u843D\u4E14\u9069\u5408\u65E5\u5E38\u3002",
    story: "\u7DAD\u7D0D\u65AF Venus \u8A2D\u8A08\u805A\u7126\u5728\u81EA\u4FE1\u3001\u884C\u52D5\u8207\u67D4\u548C\u9B45\u529B\u3002\u9069\u5408\u60F3\u63D0\u5347\u6C23\u5834\u3001\u7A69\u5B9A\u60C5\u7DD2\uFF0C\u4E26\u7DAD\u6301\u6E05\u6670\u5224\u65B7\u8207\u76F4\u89BA\u7684\u4EBA\u3002",
    benefits: [
      "\u63D0\u5347\u81EA\u4FE1\u8207\u884C\u52D5\u529B",
      "\u62DB\u8CA1\u805A\u80FD\u4E26\u653E\u5927\u6B63\u5411\u80FD\u91CF",
      "\u7A69\u5B9A\u60C5\u7DD2\u8207\u63D0\u5347\u76F4\u89BA\u529B",
      "\u67D4\u5316\u6C23\u8CEA\u4E26\u5E36\u4F86\u5167\u5728\u5E73\u8861"
    ],
    suitableFor: ["\u60F3\u5EFA\u7ACB\u81EA\u4FE1\u8207\u6C23\u5834\u8005", "\u9700\u8981\u517C\u9867\u4E8B\u696D\u8207\u60C5\u7DD2\u5E73\u8861\u8005", "\u504F\u597D\u8F15\u91CF\u65E5\u5E38\u914D\u6234\u8005"],
    howToUse: [
      "\u5EFA\u8B70\u767D\u5929\u914D\u6234\uFF0C\u5F37\u5316\u884C\u52D5\u8207\u8868\u9054\u72C0\u614B",
      "\u6BCF\u6708\u6DE8\u5316\u4E00\u6B21\uFF0C\u4FDD\u6301\u6676\u77F3\u6E05\u6670\u983B\u7387",
      "\u907F\u514D\u9577\u6642\u9593\u63A5\u89F8\u5316\u5B78\u6E05\u6F54\u8207\u9999\u6C34"
    ],
    disclaimer: "\u672C\u5546\u54C1\u70BA\u5929\u7136\u7926\u77F3\u98FE\u54C1\uFF0C\u5177\u6709\u500B\u4EBA\u80FD\u91CF\u652F\u6301\u4F5C\u7528\uFF0C\u975E\u91AB\u7642\u7528\u54C1\uFF0C\u4E0D\u5177\u4EFB\u4F55\u91AB\u7642\u7642\u6548\u3002\u6548\u679C\u56E0\u500B\u4EBA\u80FD\u91CF\u72C0\u614B\u800C\u7570\u3002",
    inStock: true,
    featured: false,
    crystalType: "\u592A\u967D\u77F3\u3001\u9226\u6676\u3001\u85CD\u6708\u5149\u3001\u767D\u6C34\u6676\u3001\u73CD\u73E0",
    color: "\u91D1\u767D\u6708\u5149"
  },
  {
    id: "d004-morning-whisper",
    name: "\u6668\u5149\u8F15\u8A9E\u624B\u934A",
    subtitle: "\u5728\u6EAB\u67D4\u4E2D\u5EFA\u7ACB\u4FDD\u8B77\u8207\u611B\u7684\u5E73\u8861",
    category: "love",
    categoryLabel: "D \u8A2D\u8A08\u6B3E",
    price: 1800,
    originalPrice: 2100,
    image: "/images/d-design/d004.jpg",
    tags: ["D\u8A2D\u8A08\u6B3E", "\u4EBA\u7DE3", "\u5E73\u8861"],
    description: "\u7531\u767D\u5E7D\u9748\u3001\u7D05\u5154\u6BDB\u3001\u85CD\u6708\u5149\u3001\u767D\u5154\u6BDB\u3001\u7C89\u78A7\u74BD\u7B49\u6676\u77F3\u69CB\u6210\uFF0C\u5C64\u6B21\u67D4\u548C\u4E14\u6C23\u5834\u98FD\u6EFF\u3002",
    story: "\u6668\u5149\u8F15\u8A9E\u9069\u5408\u5728\u95DC\u4FC2\u8207\u81EA\u6211\u4E4B\u9593\u5C0B\u627E\u5E73\u8861\u7684\u4EBA\u3002\u5B83\u5C07\u6DE8\u5316\u3001\u9632\u8B77\u8207\u67D4\u548C\u611B\u80FD\u91CF\u878D\u5408\u5728\u540C\u4E00\u689D\u624B\u934A\u4E2D\u3002\u5546\u54C1\u6703\u56E0\u624B\u570D\u4E0D\u540C\u800C\u6709\u4E9B\u5FAE\u8B8A\u5316\uFF1B\u82E5\u9700\u6539\u9F8D\u8766\u6263\u6216\u78C1\u6263\uFF0C\u9700\u52A0\u6536 200 \u5143\u5DE5\u672C\u8CBB\u3002",
    benefits: [
      "\u6DE8\u5316\u8CA0\u80FD\u91CF\u4E26\u7A69\u5B9A\u6C23\u5834",
      "\u63D0\u5347\u611B\u60C5\u904B\u8207\u597D\u4EBA\u7DE3",
      "\u67D4\u5316\u60C5\u7DD2\u3001\u589E\u52A0\u5B89\u5168\u611F",
      "\u589E\u5F37\u76F4\u89BA\u8207\u611F\u53D7\u529B"
    ],
    suitableFor: ["\u5E0C\u671B\u7A69\u5B9A\u95DC\u4FC2\u80FD\u91CF\u8005", "\u5BB9\u6613\u53D7\u5916\u754C\u60C5\u7DD2\u5F71\u97FF\u8005", "\u60F3\u63D0\u5347\u4EBA\u7DE3\u8207\u6EAB\u67D4\u9B45\u529B\u8005"],
    howToUse: [
      "\u624B\u570D\u53EF\u9078 12-19 \u516C\u5206\uFF0C\u8ACB\u4F9D\u6DE8\u624B\u570D\u4E0B\u55AE",
      "\u6A19\u6E96\u70BA\u5F48\u529B\u7E69\u7248\u672C\uFF1B\u82E5\u6539\u9F8D\u8766\u6263\u6216\u78C1\u6263\u9700\u52A0\u6536 200 \u5143",
      "\u5EFA\u8B70\u7761\u524D\u53D6\u4E0B\u4E26\u653E\u7F6E\u65BC\u767D\u6C34\u6676\u65C1\u6DE8\u5316"
    ],
    disclaimer: "\u672C\u5546\u54C1\u70BA\u5929\u7136\u7926\u77F3\u98FE\u54C1\uFF0C\u5177\u6709\u500B\u4EBA\u80FD\u91CF\u652F\u6301\u4F5C\u7528\uFF0C\u975E\u91AB\u7642\u7528\u54C1\uFF0C\u4E0D\u5177\u4EFB\u4F55\u91AB\u7642\u7642\u6548\u3002\u6548\u679C\u56E0\u500B\u4EBA\u80FD\u91CF\u72C0\u614B\u800C\u7570\u3002",
    inStock: true,
    featured: false,
    crystalType: "\u767D\u5E7D\u9748\u3001\u7D05\u5154\u6BDB\u3001\u85CD\u6708\u5149\u3001\u767D\u5154\u6BDB\u3001\u767D\u6C34\u6676\u3001\u7C89\u78A7\u74BD\u3001\u73CD\u73E0\u3001\u767D\u6708\u5149",
    color: "\u6668\u5149\u7C89\u767D"
  },
  {
    id: "d005-moon-clear-heart",
    name: "\u6708\u6620\u6DE8\u5FC3\u624B\u934A",
    subtitle: "\u67D4\u548C\u6DE8\u5316\uFF0C\u56DE\u5230\u7A69\u5B9A\u4E14\u88AB\u611B\u7684\u72C0\u614B",
    category: "healing",
    categoryLabel: "D \u8A2D\u8A08\u6B3E",
    price: 1500,
    originalPrice: 1800,
    image: "/images/d-design/d005.jpg",
    tags: ["D\u8A2D\u8A08\u6B3E", "\u6DE8\u5316", "\u611B\u60C5"],
    description: "\u4EE5\u7C89\u6676\u3001\u767D\u6708\u5149\u3001\u85CD\u6708\u5149\u8207\u767D\u6C34\u6676\u70BA\u4E3B\u8EF8\uFF0C\u642D\u914D\u73CD\u73E0\u5448\u73FE\u6EAB\u67D4\u5B89\u5B9A\u7684\u6708\u5149\u7CFB\u8A2D\u8A08\u3002",
    story: "\u6708\u6620\u6DE8\u5FC3\u8457\u91CD\u5728\u60C5\u7DD2\u5B89\u64AB\u8207\u95DC\u4FC2\u80FD\u91CF\u4FEE\u5FA9\u3002\u9069\u5408\u5728\u9AD8\u654F\u611F\u6216\u75B2\u618A\u6642\u671F\u914D\u6234\uFF0C\u63D0\u9192\u81EA\u5DF1\u56DE\u5230\u7A69\u5B9A\u7BC0\u594F\u3002\u5546\u54C1\u6703\u56E0\u624B\u570D\u4E0D\u540C\u800C\u6709\u4E9B\u5FAE\u8B8A\u5316\uFF1B\u82E5\u9700\u6539\u9F8D\u8766\u6263\u6216\u78C1\u6263\uFF0C\u9700\u52A0\u6536 200 \u5143\u5DE5\u672C\u8CBB\u3002",
    benefits: [
      "\u5438\u5F15\u611B\u60C5\u8207\u597D\u4EBA\u7DE3",
      "\u67D4\u5316\u5FC3\u6027\u8207\u5B89\u64AB\u60C5\u7DD2",
      "\u6DE8\u5316\u4E26\u653E\u5927\u6B63\u5411\u80FD\u91CF",
      "\u63D0\u5347\u76F4\u89BA\u8207\u5167\u5728\u611F\u53D7\u529B",
      "\u5E36\u4F86\u6EAB\u67D4\u4E14\u7A69\u5B9A\u7684\u5B89\u5168\u611F"
    ],
    suitableFor: ["\u60F3\u7A69\u5B9A\u5167\u5728\u7BC0\u594F\u8005", "\u5E0C\u671B\u4FEE\u5FA9\u60C5\u7DD2\u8207\u95DC\u4FC2\u8005", "\u504F\u597D\u67D4\u548C\u6708\u5149\u7CFB\u8A2D\u8A08\u8005"],
    howToUse: [
      "\u624B\u570D\u53EF\u9078 12-19 \u516C\u5206\uFF0C\u8ACB\u4F9D\u6DE8\u624B\u570D\u4E0B\u55AE",
      "\u6A19\u6E96\u70BA\u5F48\u529B\u7E69\u7248\u672C\uFF1B\u82E5\u6539\u9F8D\u8766\u6263\u6216\u78C1\u6263\u9700\u52A0\u6536 200 \u5143",
      "\u53EF\u642D\u914D\u6708\u5149\u6DE8\u5316\uFF0C\u6BCF\u6708\u4E00\u6B21"
    ],
    disclaimer: "\u672C\u5546\u54C1\u70BA\u5929\u7136\u7926\u77F3\u98FE\u54C1\uFF0C\u5177\u6709\u500B\u4EBA\u80FD\u91CF\u652F\u6301\u4F5C\u7528\uFF0C\u975E\u91AB\u7642\u7528\u54C1\uFF0C\u4E0D\u5177\u4EFB\u4F55\u91AB\u7642\u7642\u6548\u3002\u6548\u679C\u56E0\u500B\u4EBA\u80FD\u91CF\u72C0\u614B\u800C\u7570\u3002",
    inStock: true,
    featured: false,
    crystalType: "\u7C89\u6676\u3001\u767D\u6708\u5149\u3001\u73CD\u73E0\u3001\u767D\u6C34\u6676\u3001\u85CD\u6708\u5149",
    color: "\u7C89\u767D\u6708\u5149"
  },
  {
    id: "test-credit-5",
    name: "[\u6E2C\u8A66\u7528] \u4FE1\u7528\u5361\u6E2C\u8A66\u5546\u54C1 5\u5143",
    subtitle: "\u4FE1\u7528\u5361\u6700\u4F4E\u91D1\u984D\u6E2C\u8A66\uFF0C\u8ACB\u52FF\u771F\u5BE6\u8CFC\u8CB7",
    category: "test",
    categoryLabel: "\u6E2C\u8A66",
    price: 5,
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663525376407/HsiMZrubGHyjhN4cohRHuH/product-rose-quartz-Cyp9uT5H6cB8cyt34mmWeU.webp",
    tags: ["\u6E2C\u8A66"],
    description: "\u6E2C\u8A66\u7528\u5546\u54C1\uFF0C\u50C5\u4F9B\u6E2C\u8A66\u4FE1\u7528\u5361\u91D1\u6D41\u6D41\u7A0B\u7528\u3002",
    story: "\u6E2C\u8A66\u7528\u5546\u54C1\u3002",
    benefits: ["\u6E2C\u8A66\u7528"],
    suitableFor: ["\u6E2C\u8A66\u7528"],
    howToUse: ["\u6E2C\u8A66\u7528"],
    disclaimer: "\u6E2C\u8A66\u7528\u5546\u54C1\uFF0C\u8ACB\u52FF\u771F\u5BE6\u4E0B\u55AE\u3002",
    inStock: true,
    featured: false,
    crystalType: "\u6E2C\u8A66",
    color: "\u6E2C\u8A66"
  },
  {
    id: "test-atm-16",
    name: "[\u6E2C\u8A66\u7528] ATM\u6E2C\u8A66\u5546\u54C1 16\u5143",
    subtitle: "ATM\u6700\u4F4E\u91D1\u984D\u6E2C\u8A66\uFF0C\u8ACB\u52FF\u771F\u5BE6\u8CFC\u8CB7",
    category: "test",
    categoryLabel: "\u6E2C\u8A66",
    price: 16,
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663525376407/HsiMZrubGHyjhN4cohRHuH/product-rose-quartz-Cyp9uT5H6cB8cyt34mmWeU.webp",
    tags: ["\u6E2C\u8A66"],
    description: "\u6E2C\u8A66\u7528\u5546\u54C1\uFF0C\u50C5\u4F9B\u6E2C\u8A66 ATM \u8F49\u5E33\u91D1\u6D41\u6D41\u7A0B\u7528\u3002",
    story: "\u6E2C\u8A66\u7528\u5546\u54C1\u3002",
    benefits: ["\u6E2C\u8A66\u7528"],
    suitableFor: ["\u6E2C\u8A66\u7528"],
    howToUse: ["\u6E2C\u8A66\u7528"],
    disclaimer: "\u6E2C\u8A66\u7528\u5546\u54C1\uFF0C\u8ACB\u52FF\u771F\u5BE6\u4E0B\u55AE\u3002",
    inStock: true,
    featured: false,
    crystalType: "\u6E2C\u8A66",
    color: "\u6E2C\u8A66"
  },
  {
    id: "test-cvs-31",
    name: "[\u6E2C\u8A66\u7528] \u8D85\u5546\u4EE3\u78BC\u6E2C\u8A66\u5546\u54C1 31\u5143",
    subtitle: "\u8D85\u5546\u4EE3\u78BC\u6700\u4F4E\u91D1\u984D\u6E2C\u8A66\uFF0C\u8ACB\u52FF\u771F\u5BE6\u8CFC\u8CB7",
    category: "test",
    categoryLabel: "\u6E2C\u8A66",
    price: 31,
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663525376407/HsiMZrubGHyjhN4cohRHuH/product-rose-quartz-Cyp9uT5H6cB8cyt34mmWeU.webp",
    tags: ["\u6E2C\u8A66"],
    description: "\u6E2C\u8A66\u7528\u5546\u54C1\uFF0C\u50C5\u4F9B\u6E2C\u8A66\u8D85\u5546\u4EE3\u78BC\u91D1\u6D41\u6D41\u7A0B\u7528\u3002",
    story: "\u6E2C\u8A66\u7528\u5546\u54C1\u3002",
    benefits: ["\u6E2C\u8A66\u7528"],
    suitableFor: ["\u6E2C\u8A66\u7528"],
    howToUse: ["\u6E2C\u8A66\u7528"],
    disclaimer: "\u6E2C\u8A66\u7528\u5546\u54C1\uFF0C\u8ACB\u52FF\u771F\u5BE6\u4E0B\u55AE\u3002",
    inStock: true,
    featured: false,
    crystalType: "\u6E2C\u8A66",
    color: "\u6E2C\u8A66"
  }
];

// server/routers/chatbot.ts
var SYSTEM_PROMPT = `\u4F60\u662F\u300C\u691B\u02D9Crystal\u300D\u6C34\u6676\u5E97\u7684 AI \u9867\u554F\u52A9\u7406\uFF0C\u540D\u53EB\u300C\u691B\u5C0F\u52A9\u300D\u3002

\u4F60\u7684\u89D2\u8272\uFF1A
- \u4EE5\u6EAB\u67D4\u3001\u5C08\u696D\u3001\u6709\u89AA\u548C\u529B\u7684\u53E3\u543B\u56DE\u7B54\u554F\u984C
- \u6839\u64DA\u63D0\u4F9B\u7684\u77E5\u8B58\u5EAB\u5167\u5BB9\u56DE\u7B54\uFF0C\u4E0D\u8981\u7DE8\u9020\u4E0D\u5728\u77E5\u8B58\u5EAB\u4E2D\u7684\u8CC7\u8A0A
- \u5982\u679C\u77E5\u8B58\u5EAB\u4E2D\u6C92\u6709\u76F8\u95DC\u8CC7\u8A0A\uFF0C\u8AA0\u5BE6\u544A\u77E5\u4E26\u5EFA\u8B70\u806F\u7E6B LINE \u5BA2\u670D
- \u9069\u6642\u63A8\u85A6\u76F8\u95DC\u5546\u54C1\uFF0C\u4F46\u4E0D\u8981\u904E\u5EA6\u63A8\u92B7
- \u4F7F\u7528\u7E41\u9AD4\u4E2D\u6587\u56DE\u7B54
- \u56DE\u7B54\u7C21\u6F54\u6709\u529B\uFF0C\u4E0D\u8D85\u904E200\u5B57\uFF0C\u91CD\u9EDE\u6E05\u6670

\u56DE\u7B54\u683C\u5F0F\uFF1A
- \u76F4\u63A5\u56DE\u7B54\u554F\u984C\uFF0C\u4E0D\u9700\u8981\u81EA\u6211\u4ECB\u7D39
- \u5982\u6709\u76F8\u95DC\u5546\u54C1\uFF0C\u5728\u56DE\u7B54\u672B\u5C3E\u81EA\u7136\u5730\u63D0\u53CA
- \u4F7F\u7528\u9069\u7576\u7684\u63DB\u884C\u8B93\u56DE\u7B54\u6613\u8B80`;
var chatbotRouter = router({
  chat: publicProcedure.input(
    z3.object({
      message: z3.string().min(1).max(500),
      history: z3.array(
        z3.object({
          role: z3.enum(["user", "assistant"]),
          content: z3.string()
        })
      ).max(10).default([])
    })
  ).mutation(async ({ input }) => {
    const relevantChunks = searchKnowledge(input.message, 3);
    const relatedProductIds = new Set(
      relevantChunks.flatMap((c) => c.relatedProductIds ?? [])
    );
    const relatedProducts = products.filter(
      (p) => relatedProductIds.has(p.id)
    );
    let ragContext = "";
    if (relevantChunks.length > 0) {
      ragContext = "\n\n\u3010\u76F8\u95DC\u77E5\u8B58\u5EAB\u8CC7\u6599\u3011\n" + relevantChunks.map((c) => `## ${c.title}
${c.content}`).join("\n\n");
    }
    if (relatedProducts.length > 0) {
      ragContext += "\n\n\u3010\u53EF\u63A8\u85A6\u7684\u76F8\u95DC\u5546\u54C1\u3011\n" + relatedProducts.map(
        (p) => `- ${p.name}\uFF08NT$${p.price}\uFF09\uFF1A${p.subtitle} \u5546\u54C1\u9023\u7D50\uFF1A/products/${p.id}`
      ).join("\n");
    }
    const messages = [
      {
        role: "system",
        content: SYSTEM_PROMPT + ragContext
      },
      // 加入最近的對話歷史（最多5輪）
      ...input.history.slice(-10).map((h) => ({
        role: h.role,
        content: h.content
      })),
      {
        role: "user",
        content: input.message
      }
    ];
    const result = await invokeLLM({ model: "gpt-4o-mini", messages, max_tokens: 1e3 });
    const reply = result.choices[0]?.message?.content ?? "\u62B1\u6B49\uFF0C\u6211\u73FE\u5728\u7121\u6CD5\u56DE\u7B54\uFF0C\u8ACB\u7A0D\u5F8C\u518D\u8A66\u3002";
    return {
      reply: typeof reply === "string" ? reply : JSON.stringify(reply),
      relatedProducts: relatedProducts.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        image: p.image,
        href: `/products/${p.id}`
      })),
      retrievedChunks: relevantChunks.map((c) => c.title)
      // 用於 debug
    };
  })
});

// server/routers/inventory.ts
import { z as z4 } from "zod";

// server/inventoryDb.ts
import { eq as eq4, lt, and as and3, sql as sql2 } from "drizzle-orm";
init_schema();
async function getProductInventory(productId) {
  const db = await getDb();
  if (!db) return null;
  const [inv] = await db.select().from(productInventory).where(eq4(productInventory.productId, productId)).limit(1);
  return inv ?? null;
}
async function upsertProductInventory(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getProductInventory(data.productId);
  if (existing) {
    await db.update(productInventory).set({ stock: data.stock, allowPreorder: data.allowPreorder, preorderNote: data.preorderNote }).where(eq4(productInventory.productId, data.productId));
  } else {
    await db.insert(productInventory).values(data);
  }
}
async function acquireInventoryLock(productId, quantity, sessionToken) {
  const db = await getDb();
  if (!db) return { success: false, reason: "Database not available" };
  await releaseExpiredLocks();
  const inv = await getProductInventory(productId);
  if (!inv || inv.stock === -1) {
    await createLock(productId, quantity, sessionToken);
    return { success: true };
  }
  const now = /* @__PURE__ */ new Date();
  const activeLocks = await db.select().from(inventoryLocks).where(
    and3(
      eq4(inventoryLocks.productId, productId),
      sql2`${inventoryLocks.expiresAt} > NOW()`
    )
  );
  const lockedQty = activeLocks.reduce((sum, l) => sum + l.quantity, 0);
  const availableQty = inv.stock - lockedQty;
  if (availableQty < quantity) {
    if (inv.allowPreorder) {
      await createLock(productId, quantity, sessionToken);
      return { success: true };
    }
    return { success: false, reason: "\u5EAB\u5B58\u4E0D\u8DB3\uFF0C\u6B64\u5546\u54C1\u76EE\u524D\u5DF2\u88AB\u5176\u4ED6\u5BA2\u4EBA\u4FDD\u7559\u4E2D" };
  }
  await createLock(productId, quantity, sessionToken);
  return { success: true };
}
async function createLock(productId, quantity, sessionToken) {
  const db = await getDb();
  if (!db) return;
  const expiresAt = new Date(Date.now() + 10 * 60 * 1e3);
  await db.insert(inventoryLocks).values({
    productId,
    quantity,
    sessionToken,
    expiresAt
  });
}
async function releaseExpiredLocks() {
  const db = await getDb();
  if (!db) return;
  const now = /* @__PURE__ */ new Date();
  await db.delete(inventoryLocks).where(lt(inventoryLocks.expiresAt, now));
}
async function releaseSessionLocks(sessionToken) {
  const db = await getDb();
  if (!db) return;
  await db.delete(inventoryLocks).where(eq4(inventoryLocks.sessionToken, sessionToken));
}
async function getProductAvailability(productId) {
  const db = await getDb();
  if (!db) return { available: true, stock: -1, isPreorder: false, preorderNote: null };
  const inv = await getProductInventory(productId);
  if (!inv || inv.stock === -1) {
    return { available: true, stock: -1, isPreorder: false, preorderNote: null };
  }
  await releaseExpiredLocks();
  const now = /* @__PURE__ */ new Date();
  const activeLocks = await db.select().from(inventoryLocks).where(
    and3(
      eq4(inventoryLocks.productId, productId),
      sql2`${inventoryLocks.expiresAt} > NOW()`
    )
  );
  const lockedQty = activeLocks.reduce((sum, l) => sum + l.quantity, 0);
  const availableQty = inv.stock - lockedQty;
  return {
    available: availableQty > 0 || inv.allowPreorder,
    stock: availableQty,
    isPreorder: availableQty <= 0 && inv.allowPreorder,
    preorderNote: inv.preorderNote ?? null
  };
}

// server/routers/inventory.ts
var inventoryRouter = router({
  /**
   * 查詢商品可購買狀態（公開）
   */
  getAvailability: publicProcedure.input(z4.object({ productId: z4.string() })).query(async ({ input }) => {
    return getProductAvailability(input.productId);
  }),
  /**
   * 批次查詢多個商品的庫存狀態
   */
  getBatchAvailability: publicProcedure.input(z4.object({ productIds: z4.array(z4.string()) })).query(async ({ input }) => {
    const results = await Promise.all(
      input.productIds.map(async (id) => ({
        productId: id,
        ...await getProductAvailability(id)
      }))
    );
    return results;
  }),
  /**
   * 嘗試鎖定庫存（進入結帳時呼叫，保留 10 分鐘）
   */
  acquireLock: publicProcedure.input(
    z4.object({
      items: z4.array(
        z4.object({
          productId: z4.string(),
          quantity: z4.number().min(1)
        })
      ),
      sessionToken: z4.string()
    })
  ).mutation(async ({ input }) => {
    const results = [];
    for (const item of input.items) {
      const result = await acquireInventoryLock(
        item.productId,
        item.quantity,
        input.sessionToken
      );
      results.push({ productId: item.productId, ...result });
      if (!result.success) {
        await releaseSessionLocks(input.sessionToken);
        return { success: false, failedItem: item.productId, reason: result.reason };
      }
    }
    return { success: true };
  }),
  /**
   * 釋放庫存鎖定（取消結帳時呼叫）
   */
  releaseLock: publicProcedure.input(z4.object({ sessionToken: z4.string() })).mutation(async ({ input }) => {
    await releaseSessionLocks(input.sessionToken);
    return { success: true };
  }),
  /**
   * 管理員設定商品庫存
   */
  setInventory: adminProcedure.input(
    z4.object({
      productId: z4.string(),
      productName: z4.string(),
      stock: z4.number().min(-1),
      // -1 = 無限庫存
      allowPreorder: z4.boolean().optional().default(false),
      preorderNote: z4.string().optional()
    })
  ).mutation(async ({ input }) => {
    await upsertProductInventory({
      productId: input.productId,
      productName: input.productName,
      stock: input.stock,
      allowPreorder: input.allowPreorder,
      preorderNote: input.preorderNote
    });
    return { success: true };
  }),
  /**
   * 管理員取得商品庫存設定
   */
  getInventory: adminProcedure.input(z4.object({ productId: z4.string() })).query(async ({ input }) => {
    return getProductInventory(input.productId);
  })
});

// server/routers/member.ts
import { TRPCError as TRPCError3 } from "@trpc/server";
import * as bcrypt from "bcryptjs";
import { z as z5 } from "zod";

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString2 = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString2(openId)) {
        console.warn("[Auth] Session payload missing openId");
        return null;
      }
      return {
        openId,
        appId: typeof appId === "string" ? appId : "",
        name: typeof name === "string" ? name : ""
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var sdk = new SDKServer();

// server/routers/member.ts
import * as crypto3 from "crypto";

// server/email.ts
import { Resend } from "resend";
var FROM_ADDRESS = "service@goodaytarot.com";
var BRAND_NAME = "\u691B \xB7 Crystal";
function getResend() {
  if (!ENV.resendApiKey) throw new Error("RESEND_API_KEY \u672A\u8A2D\u5B9A");
  return new Resend(ENV.resendApiKey);
}
async function sendVerificationEmail({
  to,
  name,
  verifyUrl
}) {
  const resend = getResend();
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
            <p style="margin:0 0 8px;font-size:13px;color:#555;">\u89AA\u611B\u7684 ${name}\uFF0C</p>
            <h2 style="margin:0 0 16px;font-size:18px;font-weight:500;color:#1a1a1a;">\u9A57\u8B49\u60A8\u7684 Email</h2>
            <p style="margin:0 0 24px;font-size:13px;color:#666;line-height:1.8;">
              \u611F\u8B1D\u60A8\u52A0\u5165 ${BRAND_NAME}\uFF01\u8ACB\u9EDE\u64CA\u4E0B\u65B9\u6309\u9215\u9A57\u8B49\u60A8\u7684 Email \u5730\u5740\uFF0C\u5B8C\u6210\u5E33\u865F\u555F\u7528\u3002<br>
              \u6B64\u9023\u7D50\u5C07\u65BC <strong>24 \u5C0F\u6642\u5F8C\u5931\u6548</strong>\u3002
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr>
                <td style="background:#1a1a1a;">
                  <a href="${verifyUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:12px;letter-spacing:0.15em;">
                    \u9A57\u8B49 Email
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 8px;font-size:11px;color:#999;line-height:1.7;">
              \u82E5\u6309\u9215\u7121\u6CD5\u9EDE\u64CA\uFF0C\u8ACB\u8907\u88FD\u4EE5\u4E0B\u9023\u7D50\u8CBC\u5230\u700F\u89BD\u5668\uFF1A<br>
              <a href="${verifyUrl}" style="color:#b8936a;word-break:break-all;">${verifyUrl}</a>
            </p>
            <p style="margin:16px 0 0;font-size:11px;color:#bbb;">
              \u5982\u679C\u60A8\u6C92\u6709\u7533\u8ACB\u6B64\u5E33\u865F\uFF0C\u8ACB\u5FFD\u7565\u6B64\u5C01\u4FE1\u4EF6\u3002
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
    subject: `\u3010${BRAND_NAME}\u3011\u8ACB\u9A57\u8B49\u60A8\u7684 Email`,
    html
  });
}
async function sendPasswordResetEmail({
  to,
  name,
  resetUrl
}) {
  const resend = getResend();
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
            <p style="margin:0 0 8px;font-size:13px;color:#555;">\u89AA\u611B\u7684 ${name}\uFF0C</p>
            <h2 style="margin:0 0 16px;font-size:18px;font-weight:500;color:#1a1a1a;">\u5BC6\u78BC\u91CD\u8A2D\u8ACB\u6C42</h2>
            <p style="margin:0 0 24px;font-size:13px;color:#666;line-height:1.8;">
              \u6211\u5011\u6536\u5230\u4E86\u60A8\u7684\u5BC6\u78BC\u91CD\u8A2D\u8ACB\u6C42\u3002\u8ACB\u9EDE\u64CA\u4E0B\u65B9\u6309\u9215\u91CD\u8A2D\u60A8\u7684\u5BC6\u78BC\u3002
              \u6B64\u9023\u7D50\u5C07\u65BC <strong>1 \u5C0F\u6642\u5F8C\u5931\u6548</strong>\u3002
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr>
                <td style="background:#1a1a1a;">
                  <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:12px;letter-spacing:0.15em;">
                    \u91CD\u8A2D\u5BC6\u78BC
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 8px;font-size:11px;color:#999;line-height:1.7;">
              \u82E5\u6309\u9215\u7121\u6CD5\u9EDE\u64CA\uFF0C\u8ACB\u8907\u88FD\u4EE5\u4E0B\u9023\u7D50\u8CBC\u5230\u700F\u89BD\u5668\uFF1A<br>
              <a href="${resetUrl}" style="color:#b8936a;word-break:break-all;">${resetUrl}</a>
            </p>
            <p style="margin:16px 0 0;font-size:11px;color:#bbb;">
              \u5982\u679C\u60A8\u6C92\u6709\u7533\u8ACB\u91CD\u8A2D\u5BC6\u78BC\uFF0C\u8ACB\u5FFD\u7565\u6B64\u5C01\u4FE1\u4EF6\uFF0C\u60A8\u7684\u5E33\u865F\u4E0D\u6703\u6709\u4EFB\u4F55\u8B8A\u52D5\u3002
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
    subject: `\u3010${BRAND_NAME}\u3011\u5BC6\u78BC\u91CD\u8A2D\u9023\u7D50`,
    html
  });
}

// server/routers/member.ts
var SALT_ROUNDS = 10;
var passwordSchema = z5.string().min(8, "\u5BC6\u78BC\u81F3\u5C11\u9700\u8981 8 \u500B\u5B57\u5143");
var memberRouter = router({
  /** 註冊 */
  register: publicProcedure.input(
    z5.object({
      email: z5.string().email("\u8ACB\u8F38\u5165\u6709\u6548\u7684 Email"),
      password: passwordSchema,
      name: z5.string().min(1, "\u8ACB\u8F38\u5165\u59D3\u540D").max(50),
      origin: z5.string().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    const existing = await getUserByEmail(input.email);
    if (existing) {
      throw new TRPCError3({
        code: "CONFLICT",
        message: "\u6B64 Email \u5DF2\u88AB\u8A3B\u518A\uFF0C\u8ACB\u76F4\u63A5\u767B\u5165\u6216\u4F7F\u7528\u5FD8\u8A18\u5BC6\u78BC"
      });
    }
    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const user = await createEmailUser({
      email: input.email,
      passwordHash,
      name: input.name
    });
    if (!user) {
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "\u8A3B\u518A\u5931\u6557\uFF0C\u8ACB\u7A0D\u5F8C\u518D\u8A66" });
    }
    const token = await sdk.createSessionToken(user.openId, { name: user.name ?? "" });
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.cookie(COOKIE_NAME, token, cookieOptions);
    const verifyToken = crypto3.randomBytes(32).toString("hex");
    const verifyExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1e3);
    await setVerifyToken(input.email, verifyToken, verifyExpiresAt);
    const siteOrigin = input.origin ?? "https://goodaytarot.com";
    const verifyUrl = `${siteOrigin}/verify-email?token=${verifyToken}`;
    try {
      await sendVerificationEmail({
        to: input.email,
        name: input.name,
        verifyUrl
      });
    } catch (err) {
      console.error("[Email] \u9A57\u8B49\u4FE1\u767C\u9001\u5931\u6557:", err);
    }
    return { success: true, user: { id: user.id, name: user.name, email: user.email } };
  }),
  /** 登入 */
  login: publicProcedure.input(
    z5.object({
      email: z5.string().email("\u8ACB\u8F38\u5165\u6709\u6548\u7684 Email"),
      password: z5.string().min(1, "\u8ACB\u8F38\u5165\u5BC6\u78BC")
    })
  ).mutation(async ({ input, ctx }) => {
    const user = await getUserByEmail(input.email);
    if (!user || !user.passwordHash) {
      throw new TRPCError3({
        code: "UNAUTHORIZED",
        message: "Email \u6216\u5BC6\u78BC\u932F\u8AA4"
      });
    }
    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new TRPCError3({
        code: "UNAUTHORIZED",
        message: "Email \u6216\u5BC6\u78BC\u932F\u8AA4"
      });
    }
    const token = await sdk.createSessionToken(user.openId, { name: user.name ?? "" });
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.cookie(COOKIE_NAME, token, cookieOptions);
    return { success: true, user: { id: user.id, name: user.name, email: user.email } };
  }),
  /** 驗證 Email */
  verifyEmail: publicProcedure.input(z5.object({ token: z5.string().min(1) })).mutation(async ({ input }) => {
    const user = await getUserByVerifyToken(input.token);
    if (!user) {
      throw new TRPCError3({
        code: "BAD_REQUEST",
        message: "\u9A57\u8B49\u9023\u7D50\u5DF2\u5931\u6548\u6216\u4E0D\u5B58\u5728\uFF0C\u8ACB\u91CD\u65B0\u767C\u9001\u9A57\u8B49\u4FE1"
      });
    }
    await markEmailVerified(user.id);
    return { success: true, message: "Email \u5DF2\u9A57\u8B49\u6210\u529F" };
  }),
  /** 重新發送驗證信 */
  resendVerification: protectedProcedure.input(z5.object({ origin: z5.string().optional() })).mutation(async ({ input, ctx }) => {
    if (!ctx.user.email) {
      throw new TRPCError3({ code: "BAD_REQUEST", message: "\u7121\u6CD5\u53D6\u5F97 Email" });
    }
    const user = await getUserByEmail(ctx.user.email);
    if (!user) throw new TRPCError3({ code: "NOT_FOUND", message: "\u5E33\u865F\u4E0D\u5B58\u5728" });
    if (user.emailVerified) {
      return { success: true, message: "Email \u5DF2\u7D93\u9A57\u8B49\u904E" };
    }
    const verifyToken = crypto3.randomBytes(32).toString("hex");
    const verifyExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1e3);
    await setVerifyToken(ctx.user.email, verifyToken, verifyExpiresAt);
    const siteOrigin = input.origin ?? "https://goodaytarot.com";
    const verifyUrl = `${siteOrigin}/verify-email?token=${verifyToken}`;
    await sendVerificationEmail({
      to: ctx.user.email,
      name: ctx.user.name ?? ctx.user.email,
      verifyUrl
    });
    return { success: true, message: "\u9A57\u8B49\u4FE1\u5DF2\u91CD\u65B0\u767C\u9001" };
  }),
  /** 申請重設密碼 */
  forgotPassword: publicProcedure.input(z5.object({
    email: z5.string().email(),
    origin: z5.string().optional()
  })).mutation(async ({ input }) => {
    const user = await getUserByEmail(input.email);
    if (!user || !user.passwordHash) {
      return { success: true, message: "\u82E5\u6B64 Email \u5DF2\u8A3B\u518A\uFF0C\u91CD\u8A2D\u9023\u7D50\u5DF2\u767C\u9001" };
    }
    const token = crypto3.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1e3);
    await setResetToken(input.email, token, expiresAt);
    const siteOrigin = input.origin ?? "https://goodaytarot.com";
    const resetUrl = `${siteOrigin}/reset-password?token=${token}`;
    try {
      await sendPasswordResetEmail({
        to: input.email,
        name: user.name ?? input.email,
        resetUrl
      });
    } catch (err) {
      console.error("[Email] \u5FD8\u8A18\u5BC6\u78BC\u4FE1\u767C\u9001\u5931\u6557:", err);
    }
    return {
      success: true,
      message: "\u82E5\u6B64 Email \u5DF2\u8A3B\u518A\uFF0C\u91CD\u8A2D\u9023\u7D50\u5DF2\u767C\u9001"
    };
  }),
  /** 使用 token 重設密碼 */
  resetPassword: publicProcedure.input(
    z5.object({
      token: z5.string().min(1),
      newPassword: passwordSchema
    })
  ).mutation(async ({ input }) => {
    const user = await getUserByResetToken(input.token);
    if (!user) {
      throw new TRPCError3({
        code: "BAD_REQUEST",
        message: "\u91CD\u8A2D\u9023\u7D50\u5DF2\u5931\u6548\u6216\u4E0D\u5B58\u5728\uFF0C\u8ACB\u91CD\u65B0\u7533\u8ACB"
      });
    }
    const passwordHash = await bcrypt.hash(input.newPassword, SALT_ROUNDS);
    await updatePasswordAndClearToken(user.id, passwordHash);
    return { success: true, message: "\u5BC6\u78BC\u5DF2\u91CD\u8A2D\uFF0C\u8ACB\u91CD\u65B0\u767B\u5165" };
  }),
  /** 更新會員姓名 */
  updateProfile: protectedProcedure.input(z5.object({ name: z5.string().min(1).max(50) })).mutation(async ({ input, ctx }) => {
    const db2 = await getDb();
    if (!db2) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
    const { users: users2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const { eq: eq5 } = await import("drizzle-orm");
    await db2.update(users2).set({ name: input.name }).where(eq5(users2.openId, ctx.user.openId));
    return { success: true };
  }),
  /** 查詢自己的訂單 */
  myOrders: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user.email) return [];
    const orders2 = await getOrdersByEmail(ctx.user.email);
    return orders2;
  })
});

// server/appRouter.ts
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true
      };
    })
  }),
  order: orderRouter,
  chatbot: chatbotRouter,
  inventory: inventoryRouter,
  member: memberRouter
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_entry/trpcHandler.ts
var app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.get(["/api/trpc/ping", "/ping"], (_req, res) => {
  res.json({ ok: true, at: (/* @__PURE__ */ new Date()).toISOString() });
});
app.use(
  createExpressMiddleware({
    router: appRouter,
    createContext
  })
);
app.use((req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", path: req.url } });
});
app.use(
  (err, _req, res, _next) => {
    const message = err instanceof Error ? err.stack || err.message : String(err);
    console.error("[api/trpc] express error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: { code: "TRPC_EXPRESS_ERROR", message } });
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
    console.error("[api/trpc] handler threw:", err);
    writeJson(res, 500, { error: { code: "HANDLER_THREW", message } });
  }
}
export {
  handler as default
};
