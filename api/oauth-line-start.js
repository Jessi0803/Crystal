var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};

// drizzle/schema.ts
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

// server/_entry/oauthLineStart.ts
import express from "express";

// server/lineOAuthRoutes.ts
import * as crypto from "node:crypto";
import { parse as parseCookieHeader2 } from "cookie";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;

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

// server/_core/emailNormalize.ts
function normalizeOrderEmail(email) {
  return email.trim().toLowerCase();
}

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

// server/db.ts
import { eq, and, gt, sql } from "drizzle-orm";
init_schema();
import { drizzle } from "drizzle-orm/mysql2";

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

// server/db.ts
var ADMIN_EMAIL_ALLOWLIST = new Set(
  [
    "goodaytarot@gmail.com",
    ...process.env.ADMIN_EMAILS?.split(",") ?? []
  ].map((email) => email.trim()).filter(Boolean).map(normalizeOrderEmail)
);
function shouldGrantAdminRole(openId, email) {
  if (openId === ENV.ownerOpenId) return true;
  if (!email) return false;
  return ADMIN_EMAIL_ALLOWLIST.has(normalizeOrderEmail(email));
}
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
    } else if (shouldGrantAdminRole(user.openId, user.email)) {
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

// server/_core/sdk.ts
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
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
      if (!isNonEmptyString(openId)) {
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

// server/lineOAuthRoutes.ts
var LINE_STATE_COOKIE = "line_oauth_state";
function lineConfig() {
  const channelId = process.env.LINE_CHANNEL_ID?.trim();
  const channelSecret = process.env.LINE_CHANNEL_SECRET?.trim();
  return { channelId, channelSecret };
}
function siteBaseUrl(req) {
  const fixed = process.env.SITE_URL?.trim().replace(/\/$/, "");
  if (fixed) return fixed;
  const host = (req.get("x-forwarded-host") || req.get("host") || "").trim();
  const protoHeader = req.get("x-forwarded-proto");
  const proto = (Array.isArray(protoHeader) ? protoHeader[0] : protoHeader?.split(",")[0]?.trim()) || (req.protocol === "https" ? "https" : "http");
  return `${proto}://${host}`;
}
function lineCallbackUrl(req) {
  const fromEnv = process.env.LINE_CALLBACK_URL?.trim();
  if (fromEnv) return fromEnv;
  return `${siteBaseUrl(req)}/api/oauth/line/callback`;
}
function lineOAuthStart(req, res) {
  const { channelId, channelSecret } = lineConfig();
  if (!channelId || !channelSecret) {
    res.status(503).send(
      "LINE \u767B\u5165\u5C1A\u672A\u8A2D\u5B9A\uFF1A\u8ACB\u5728\u74B0\u5883\u8B8A\u6578\u8A2D\u5B9A LINE_CHANNEL_ID\u3001LINE_CHANNEL_SECRET\uFF0C\u4E26\u65BC LINE Developers \u767B\u9304 Callback URL\u3002"
    );
    return;
  }
  const state = crypto.randomBytes(24).toString("hex");
  const callback = lineCallbackUrl(req);
  const cookieOpts = { ...getSessionCookieOptions(req), maxAge: 6e5 };
  res.cookie(LINE_STATE_COOKIE, state, cookieOpts);
  const authorize = new URL("https://access.line.me/oauth2/v2.1/authorize");
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("client_id", channelId);
  authorize.searchParams.set("redirect_uri", callback);
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("scope", "profile openid email");
  res.redirect(302, authorize.toString());
}

// server/_entry/oauthLineStart.ts
var PATH = "/api/oauth-line-start";
var app = express();
app.get(PATH, lineOAuthStart);
app.use((req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", path: req.url } });
});
app.use(
  (err, _req, res, _next) => {
    const message = err instanceof Error ? err.stack || err.message : String(err);
    console.error("[api/oauth-line-start] express error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: { code: "LINE_OAUTH_EXPRESS_ERROR", message } });
    }
  }
);
function handler(req, res) {
  return app(req, res);
}
export {
  handler as default
};
