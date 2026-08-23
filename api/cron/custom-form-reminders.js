// server/customFormReminders.ts
import { sql as sql3 } from "drizzle-orm";

// shared/const.ts
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var CUSTOM_PRODUCT_ID = "custom-deposit-product";
var CUSTOM_TAROT_PRODUCT_ID = "tarot-crystal-deposit-product";
var CUSTOM_CHAKRA_PRODUCT_ID = "chakra-crystal-deposit-product";
var CUSTOM_NUMEROLOGY_PRODUCT_ID = "numerology-crystal-deposit-product";
var CUSTOM_PRODUCT_IDS = [CUSTOM_PRODUCT_ID, CUSTOM_TAROT_PRODUCT_ID, CUSTOM_CHAKRA_PRODUCT_ID, CUSTOM_NUMEROLOGY_PRODUCT_ID];

// server/db.ts
import { eq, and, gt, sql } from "drizzle-orm";

// server/_core/emailNormalize.ts
function normalizeOrderEmail(email) {
  return email.trim().toLowerCase();
}

// server/db.ts
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

// server/email.ts
import { Resend } from "resend";
var FROM_ADDRESS = "service@goodaytarot.com";
var BRAND_NAME = "\u691B \xB7 Crystal";
var ADMIN_ORDER_NOTIFICATION_EMAIL = process.env.ADMIN_ORDER_NOTIFICATION_EMAIL ?? "goodaytarot@gmail.com";
function getResend() {
  if (!ENV.resendApiKey) throw new Error("RESEND_API_KEY \u672A\u8A2D\u5B9A");
  return new Resend(ENV.resendApiKey);
}
function escapeHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
async function sendCustomFormReminderEmail(payload) {
  const resend = getResend();
  const { to, buyerName, merchantTradeNo, reminderStage, formUrl } = payload;
  const secondReminder = reminderStage === "72h";
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
            <p style="margin:0;font-size:11px;letter-spacing:0.2em;color:#999;text-transform:uppercase;">Custom Design</p>
            <h1 style="margin:8px 0 0;font-size:22px;font-weight:300;color:#1a1a1a;letter-spacing:0.08em;">LAFLEUR</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 8px;font-size:13px;color:#555;">\u89AA\u611B\u7684 ${escapeHtml(buyerName)}\uFF0C</p>
            <h2 style="margin:0 0 16px;font-size:18px;font-weight:500;color:#1a1a1a;">\u4F60\u7684 LAFLEUR \u5BA2\u88FD\u8A2D\u8A08\u9084\u5728\u7B49\u4F60\u{1F90D}</h2>
            <p style="margin:0 0 24px;font-size:13px;color:#666;line-height:1.8;">
              \u6211\u5011\u9084\u6C92\u6709\u6536\u5230\u4F60\u7684\u5BA2\u88FD\u8CC7\u6599\uFF0C\u586B\u5BEB\u5B8C\u6210\u5F8C\u8A2D\u8A08\u5E2B\u624D\u80FD\u958B\u59CB\u70BA\u4F60\u9032\u884C\u8A2D\u8A08\u3002
              ${secondReminder ? "<br>\u9019\u662F\u6211\u5011\u518D\u4E00\u6B21\u6EAB\u67D4\u63D0\u9192\u4F60\u5B8C\u6210\u8868\u55AE\u3002" : ""}
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f4;padding:16px 20px;margin-bottom:24px;">
              <tr>
                <td style="font-size:13px;color:#555;padding:2px 0;">\u8A02\u55AE\u7DE8\u865F\uFF1A<strong style="color:#1a1a1a;">${escapeHtml(merchantTradeNo)}</strong></td>
              </tr>
            </table>
            <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr>
                <td style="background:#1a1a1a;">
                  <a href="${escapeHtml(formUrl)}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:12px;letter-spacing:0.15em;">
                    \u586B\u5BEB\u5BA2\u88FD\u8CC7\u6599
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0;font-size:11px;color:#999;line-height:1.7;">
              \u82E5\u6309\u9215\u7121\u6CD5\u9EDE\u64CA\uFF0C\u8ACB\u8907\u88FD\u4EE5\u4E0B\u9023\u7D50\u8CBC\u5230\u700F\u89BD\u5668\uFF1A<br>
              <a href="${escapeHtml(formUrl)}" style="color:#b8936a;word-break:break-all;">${escapeHtml(formUrl)}</a>
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
    subject: secondReminder ? "\u3010LAFLEUR\u3011\u518D\u6B21\u63D0\u9192\u4F60\u5B8C\u6210\u5BA2\u88FD\u8CC7\u6599" : "\u3010LAFLEUR\u3011\u4F60\u7684\u5BA2\u88FD\u8A2D\u8A08\u9084\u5728\u7B49\u4F60",
    html
  });
}

// server/lineMessage.ts
import { eq as eq2 } from "drizzle-orm";
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
  const [order] = await db.select({ userId: orders.userId }).from(orders).where(eq2(orders.id, orderId)).limit(1);
  if (!order?.userId) return null;
  const [user] = await db.select({ openId: users.openId }).from(users).where(eq2(users.id, order.userId)).limit(1);
  return extractLineUserId(user?.openId);
}
async function notifyLineCustomFormReminder(orderId, reminderStage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const lineUserId = await getLineUserIdForOrder(orderId);
  if (!lineUserId) return { sent: false, reason: "missing_line_user" };
  const [order] = await db.select().from(orders).where(eq2(orders.id, orderId)).limit(1);
  if (!order) return { sent: false, reason: "missing_order" };
  const text2 = [
    "\u4F60\u7684 LAFLEUR \u5BA2\u88FD\u8A2D\u8A08\u9084\u5728\u7B49\u4F60\u{1F90D} \u6211\u5011\u9084\u6C92\u6709\u6536\u5230\u4F60\u7684\u5BA2\u88FD\u8CC7\u6599\uFF0C\u586B\u5BEB\u5B8C\u6210\u5F8C\u8A2D\u8A08\u5E2B\u624D\u80FD\u958B\u59CB\u70BA\u4F60\u9032\u884C\u8A2D\u8A08\u3002",
    "",
    `\u8A02\u55AE\u7DE8\u865F\uFF1A${order.merchantTradeNo}`,
    reminderStage === "72h" ? "\u9019\u662F\u6211\u5011\u518D\u4E00\u6B21\u6EAB\u67D4\u63D0\u9192\u4F60\u5B8C\u6210\u8868\u55AE\u3002" : "",
    "",
    `\u586B\u5BEB\u5BA2\u88FD\u8CC7\u6599\uFF1A${getSiteUrl()}/order/${encodeURIComponent(order.merchantTradeNo)}`
  ].filter(Boolean).join("\n");
  return pushLineTextMessage(lineUserId, text2);
}

// server/orderDb.ts
import { eq as eq3, desc, and as and2, gte, sql as sql2, inArray, or } from "drizzle-orm";
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
async function getOrderWithItems(merchantTradeNo) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await ensureBalancePaymentColumns(db);
  const [order] = await db.select().from(orders).where(eq3(orders.merchantTradeNo, merchantTradeNo)).limit(1);
  if (!order) return null;
  const items = await db.select().from(orderItems).where(eq3(orderItems.orderId, order.id));
  const [logistics] = await db.select().from(logisticsOrders).where(eq3(logisticsOrders.orderId, order.id)).limit(1);
  const [balancePayment] = await db.select(balancePaymentLegacySelect).from(orderBalancePayments).where(eq3(orderBalancePayments.orderId, order.id)).limit(1);
  return { ...order, items, logistics: logistics ?? null, balancePayment: hydrateBalancePayment(balancePayment) };
}

// server/customFormReminders.ts
function getSiteUrl2() {
  return process.env.SITE_URL?.trim().replace(/\/$/, "") || "https://goodaytarot.com";
}
function hoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1e3);
}
function minutesAgo(minutes) {
  return new Date(Date.now() - minutes * 60 * 1e3);
}
function getReminderStage(candidate) {
  if (!candidate.paidAt) return null;
  const paidAt = candidate.paidAt instanceof Date ? candidate.paidAt : new Date(candidate.paidAt);
  if (!candidate.customFormReminder24hSentAt && paidAt <= hoursAgo(24)) {
    return "24h";
  }
  if (!candidate.customFormReminder72hSentAt && paidAt <= hoursAgo(72)) {
    return "72h";
  }
  if (!candidate.customFormReminder3mSentAt && paidAt <= minutesAgo(3)) {
    return "3m";
  }
  return null;
}
function getReminderColumn(reminderStage) {
  if (reminderStage === "3m") return "customFormReminder3mSentAt";
  if (reminderStage === "24h") return "customFormReminder24hSentAt";
  return "customFormReminder72hSentAt";
}
function rowsFromExecuteResult(result) {
  if (Array.isArray(result)) {
    const first = result[0];
    if (Array.isArray(first)) return first;
    return result;
  }
  if (result && typeof result === "object" && "rows" in result) {
    return result.rows;
  }
  return [];
}
async function executeRows(query) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return rowsFromExecuteResult(await db.execute(query));
}
async function hasReminderColumns() {
  const rows = await executeRows(sql3`
    SELECT COLUMN_NAME AS columnName
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'orders'
      AND COLUMN_NAME IN (
        'customFormReminder3mSentAt',
        'customFormReminder24hSentAt',
        'customFormReminder72hSentAt'
      )
  `);
  return rows.length === 3;
}
function getCustomConsultationStartMarker(productId, orderItemId, itemIndex) {
  return `\u3010\u5BA2\u88FD\u9700\u6C42\u958B\u59CB\uFF1A${productId}:${orderItemId}:${itemIndex}\u3011`;
}
function hasCustomConsultationNote(customerNote, productId, orderItemId, itemIndex) {
  if (customerNote?.includes(getCustomConsultationStartMarker(productId, orderItemId, itemIndex))) return true;
  return itemIndex === 1 && Boolean(customerNote?.includes(`\u3010\u5BA2\u88FD\u9700\u6C42\u958B\u59CB\uFF1A${productId}\u3011`));
}
async function hasPendingCustomConsultation(merchantTradeNo) {
  const order = await getOrderWithItems(merchantTradeNo);
  if (!order) return false;
  for (const item of order.items) {
    if (!CUSTOM_PRODUCT_IDS.includes(item.productId)) continue;
    for (let itemIndex = 1; itemIndex <= item.quantity; itemIndex += 1) {
      if (!hasCustomConsultationNote(order.customerNote, item.productId, item.id, itemIndex)) {
        return true;
      }
    }
  }
  return false;
}
async function markReminderSent(orderId, reminderStage) {
  const column = getReminderColumn(reminderStage);
  await executeRows(sql3`
    UPDATE \`orders\`
    SET ${sql3.raw(`\`${column}\``)} = NOW()
    WHERE \`id\` = ${orderId}
  `);
}
async function sendReminder(candidate, reminderStage) {
  const lineResult = await notifyLineCustomFormReminder(candidate.id, reminderStage);
  if (lineResult.sent) {
    await markReminderSent(candidate.id, reminderStage);
    return true;
  }
  if (lineResult.reason !== "missing_order") {
    await sendCustomFormReminderEmail({
      to: candidate.buyerEmail,
      buyerName: candidate.buyerName,
      merchantTradeNo: candidate.merchantTradeNo,
      reminderStage,
      formUrl: `${getSiteUrl2()}/order/${encodeURIComponent(candidate.merchantTradeNo)}`
    });
  }
  if (lineResult.reason === "missing_order") return false;
  await markReminderSent(candidate.id, reminderStage);
  return true;
}
async function runCustomFormReminderJob() {
  if (!await hasReminderColumns()) {
    return { scanned: 0, sent3m: 0, sent24h: 0, sent72h: 0, skipped: 0, failed: 0 };
  }
  const candidates = await executeRows(sql3`
    SELECT
      \`id\`,
      \`merchantTradeNo\`,
      \`buyerName\`,
      \`buyerEmail\`,
      \`paidAt\`,
      \`customFormReminder3mSentAt\`,
      \`customFormReminder24hSentAt\`,
      \`customFormReminder72hSentAt\`
    FROM \`orders\`
    WHERE \`isCustomOrder\` = TRUE
      AND \`orderStatus\` = 'deposit_paid'
      AND \`paymentStatus\` IN ('paid', 'confirmed')
      AND \`paidAt\` <= ${minutesAgo(3)}
      AND (
        \`customFormReminder3mSentAt\` IS NULL
        OR \`customFormReminder24hSentAt\` IS NULL
        OR (\`paidAt\` <= ${hoursAgo(72)} AND \`customFormReminder72hSentAt\` IS NULL)
      )
    LIMIT 100
  `);
  const result = {
    scanned: candidates.length,
    sent3m: 0,
    sent24h: 0,
    sent72h: 0,
    skipped: 0,
    failed: 0
  };
  for (const candidate of candidates) {
    if (!await hasPendingCustomConsultation(candidate.merchantTradeNo)) {
      result.skipped += 1;
      continue;
    }
    const reminderStage = getReminderStage(candidate);
    if (!reminderStage) {
      result.skipped += 1;
      continue;
    }
    try {
      const sent = await sendReminder(candidate, reminderStage);
      if (!sent) {
        result.skipped += 1;
      } else if (reminderStage === "3m") {
        result.sent3m += 1;
      } else if (reminderStage === "24h") {
        result.sent24h += 1;
      } else {
        result.sent72h += 1;
      }
    } catch (error) {
      result.failed += 1;
      console.error("[CustomFormReminders] reminder failed", {
        orderId: candidate.id,
        merchantTradeNo: candidate.merchantTradeNo,
        reminderStage,
        error
      });
    }
  }
  return result;
}

// server/_entry/customFormRemindersCronHandler.ts
function writeJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}
function isAuthorized(req) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return true;
  const auth = req.headers.authorization;
  const headerSecret = req.headers["x-cron-secret"];
  return auth === `Bearer ${secret}` || headerSecret === secret;
}
async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    writeJson(res, 405, { error: "method_not_allowed" });
    return;
  }
  if (!isAuthorized(req)) {
    writeJson(res, 401, { error: "unauthorized" });
    return;
  }
  try {
    const result = await runCustomFormReminderJob();
    writeJson(res, 200, { ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[custom-form-reminders cron] failed", error);
    writeJson(res, 500, { ok: false, error: message });
  }
}
export {
  handler as default
};
