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
  chatbotKnowledge: () => chatbotKnowledge,
  chatbotLogs: () => chatbotLogs,
  couponTemplates: () => couponTemplates,
  dbProducts: () => dbProducts,
  inventoryLocks: () => inventoryLocks,
  lineFriendRewards: () => lineFriendRewards,
  logisticsEvents: () => logisticsEvents,
  logisticsOrders: () => logisticsOrders,
  memberCoupons: () => memberCoupons,
  operationAuditEvents: () => operationAuditEvents,
  orderBalancePaymentAttempts: () => orderBalancePaymentAttempts,
  orderBalancePayments: () => orderBalancePayments,
  orderItems: () => orderItems,
  orderMergeGroups: () => orderMergeGroups,
  orderMergeMembers: () => orderMergeMembers,
  orders: () => orders,
  productInventory: () => productInventory,
  productReviews: () => productReviews,
  promotions: () => promotions,
  siteSettings: () => siteSettings,
  users: () => users
});
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, boolean, index, uniqueIndex, longtext, decimal, smallint, tinyint } from "drizzle-orm/mysql-core";
var users, productInventory, inventoryLocks, orders, orderMergeGroups, orderMergeMembers, orderItems, orderBalancePayments, orderBalancePaymentAttempts, logisticsOrders, logisticsEvents, operationAuditEvents, chatbotLogs, chatbotKnowledge, siteSettings, dbProducts, couponTemplates, memberCoupons, lineFriendRewards, productReviews, promotions;
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
      // LINE Login 提供的信箱（僅供後台參考，不參與登入與訂單比對）
      lineEmail: varchar("lineEmail", { length: 320 }),
      // LINE 名稱與大頭貼（僅供後台辨識會員，LINE 登入或綁定時更新）
      lineDisplayName: varchar("lineDisplayName", { length: 100 }),
      linePictureUrl: varchar("linePictureUrl", { length: 1024 }),
      // 生日（年份選填）；會員填寫後不可自行修改，需由管理員調整
      birthYear: smallint("birthYear"),
      birthMonth: tinyint("birthMonth"),
      birthDay: tinyint("birthDay"),
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
      // 僅新訂單明確設定版本；舊訂單維持 NULL，禁止回填升級。
      promotionFlowVersion: tinyint("promotionFlowVersion"),
      promotion: json("promotion").$type(),
      customQuote: json("customQuote").$type(),
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
    orderMergeGroups = mysqlTable("orderMergeGroups", {
      id: int("id").autoincrement().primaryKey(),
      mergeCode: varchar("mergeCode", { length: 32 }).notNull().unique(),
      mainOrderId: int("mainOrderId").notNull().unique(),
      adminNote: text("adminNote"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    }, (table) => [
      index("order_merge_groups_main_order_id_idx").on(table.mainOrderId)
    ]);
    orderMergeMembers = mysqlTable("orderMergeMembers", {
      id: int("id").autoincrement().primaryKey(),
      groupId: int("groupId").notNull(),
      orderId: int("orderId").notNull().unique(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    }, (table) => [
      index("order_merge_members_group_id_idx").on(table.groupId),
      index("order_merge_members_order_id_idx").on(table.orderId)
    ]);
    orderItems = mysqlTable("orderItems", {
      id: int("id").autoincrement().primaryKey(),
      orderId: int("orderId").notNull(),
      productId: varchar("productId", { length: 64 }).notNull(),
      productName: varchar("productName", { length: 200 }).notNull(),
      productImage: text("productImage"),
      quantity: int("quantity").notNull(),
      unitPrice: int("unitPrice").notNull(),
      subtotal: int("subtotal").notNull(),
      purchaseOptionId: varchar("purchaseOptionId", { length: 64 }),
      configurationSnapshot: json("configurationSnapshot").$type(),
      // 是否為預購商品
      isPreorder: boolean("isPreorder").default(false).notNull()
    }, (table) => [
      index("order_items_order_id_idx").on(table.orderId)
    ]);
    orderBalancePayments = mysqlTable("orderBalancePayments", {
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
    orderBalancePaymentAttempts = mysqlTable("orderBalancePaymentAttempts", {
      id: int("id").autoincrement().primaryKey(),
      balancePaymentId: int("balancePaymentId").notNull(),
      merchantTradeNo: varchar("merchantTradeNo", { length: 32 }).notNull().unique(),
      amount: int("amount").notNull(),
      shippingFee: int("shippingFee").default(0).notNull(),
      paymentFee: int("paymentFee").default(0).notNull(),
      totalAmount: int("totalAmount").notNull(),
      paymentMethod: mysqlEnum("paymentMethod", ["credit"]).default("credit").notNull(),
      paymentStatus: mysqlEnum("paymentStatus", [
        "pending",
        "paid",
        "failed",
        "superseded"
      ]).default("pending").notNull(),
      checkoutData: json("checkoutData"),
      tradeNo: varchar("tradeNo", { length: 64 }),
      ecpayNotifyData: json("ecpayNotifyData"),
      paidAt: timestamp("paidAt"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    }, (table) => [
      index("order_balance_payment_attempts_balance_id_idx").on(table.balancePaymentId)
    ]);
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
    logisticsEvents = mysqlTable("logisticsEvents", {
      id: int("id").autoincrement().primaryKey(),
      logisticsOrderId: int("logisticsOrderId").notNull(),
      orderId: int("orderId").notNull(),
      eventKey: varchar("eventKey", { length: 64 }).notNull().unique(),
      eventKind: mysqlEnum("eventKind", ["status", "record_only", "synthetic"]).notNull(),
      normalizedStatus: mysqlEnum("normalizedStatus", [
        "created",
        "in_transit",
        "arrived",
        "picked_up",
        "returned",
        "failed"
      ]),
      rawCode: varchar("rawCode", { length: 20 }),
      message: varchar("message", { length: 255 }),
      occurredAt: timestamp("occurredAt").notNull(),
      receivedAt: timestamp("receivedAt").defaultNow().notNull(),
      rawData: json("rawData")
    }, (table) => [
      index("logistics_events_logistics_occurred_idx").on(table.logisticsOrderId, table.occurredAt),
      index("logistics_events_order_occurred_idx").on(table.orderId, table.occurredAt)
    ]);
    operationAuditEvents = mysqlTable("operationAuditEvents", {
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
    chatbotLogs = mysqlTable("chatbotLogs", {
      id: int("id").autoincrement().primaryKey(),
      sessionId: varchar("sessionId", { length: 64 }).notNull(),
      userId: int("userId"),
      customerName: varchar("customerName", { length: 100 }),
      customerEmail: varchar("customerEmail", { length: 320 }),
      customerQuestion: text("customerQuestion").notNull(),
      botReply: text("botReply").notNull(),
      relatedProducts: json("relatedProducts"),
      retrievedQuestions: json("retrievedQuestions"),
      retrievedKnowledge: json("retrievedKnowledge").$type(),
      answerStatus: mysqlEnum("answerStatus", ["complete", "low_confidence", "knowledge_gap", "handoff"]),
      answerStatusReason: varchar("answerStatusReason", { length: 255 }),
      topKnowledgeScore: decimal("topKnowledgeScore", { precision: 5, scale: 4, mode: "number" }),
      usedFallback: boolean("usedFallback"),
      pagePath: varchar("pagePath", { length: 255 }),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    }, (table) => [
      index("chatbot_logs_created_at_idx").on(table.createdAt),
      index("chatbot_logs_session_created_at_idx").on(table.sessionId, table.createdAt),
      index("chatbot_logs_user_created_at_idx").on(table.userId, table.createdAt),
      index("chatbot_logs_answer_status_created_at_idx").on(table.answerStatus, table.createdAt)
    ]);
    chatbotKnowledge = mysqlTable("chatbotKnowledge", {
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
    siteSettings = mysqlTable("siteSettings", {
      key: varchar("key", { length: 64 }).primaryKey(),
      value: text("value").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    dbProducts = mysqlTable("products", {
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
    couponTemplates = mysqlTable("couponTemplates", {
      id: int("id").autoincrement().primaryKey(),
      name: varchar("name", { length: 100 }).notNull(),
      // 固定金額折抵（新台幣）
      discountAmount: int("discountAmount").notNull(),
      // 最低消費（以商品小計計算，不含運費）
      minOrderAmount: int("minOrderAmount").notNull().default(0),
      // 有效期限：發放後 N 天，或固定截止日期
      validityType: mysqlEnum("validityType", ["days_after_issue", "fixed_date"]).notNull().default("days_after_issue"),
      validDays: int("validDays"),
      fixedExpiresAt: timestamp("fixedExpiresAt"),
      maxPerUser: int("maxPerUser").notNull().default(1),
      isActive: boolean("isActive").notNull().default(true),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    memberCoupons = mysqlTable("memberCoupons", {
      id: int("id").autoincrement().primaryKey(),
      couponTemplateId: int("couponTemplateId").notNull(),
      userId: int("userId").notNull(),
      name: varchar("name", { length: 100 }).notNull(),
      discountAmount: int("discountAmount").notNull(),
      minOrderAmount: int("minOrderAmount").notNull().default(0),
      issuedAt: timestamp("issuedAt").defaultNow().notNull(),
      expiresAt: timestamp("expiresAt").notNull(),
      // available：可使用；reserved：已套用在待付款訂單；used：訂單已付款
      status: mysqlEnum("status", ["available", "reserved", "used"]).notNull().default("available"),
      orderId: int("orderId"),
      reservedAt: timestamp("reservedAt"),
      usedAt: timestamp("usedAt"),
      // LINE_FRIEND / BIRTHDAY / ADMIN_GIFT / CAMPAIGN
      source: varchar("source", { length: 32 }).notNull(),
      // 週期性活動的防重複鍵，例如 birthday:2026；一般人工發券維持 null
      campaignKey: varchar("campaignKey", { length: 64 }),
      issuedByUserId: int("issuedByUserId"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    }, (table) => [
      index("member_coupons_user_status_idx").on(table.userId, table.status),
      index("member_coupons_template_idx").on(table.couponTemplateId),
      index("member_coupons_order_idx").on(table.orderId),
      uniqueIndex("member_coupons_campaign_user_unique").on(table.source, table.campaignKey, table.userId)
    ]);
    lineFriendRewards = mysqlTable("lineFriendRewards", {
      id: int("id").autoincrement().primaryKey(),
      userId: int("userId").notNull().unique(),
      lineUserId: varchar("lineUserId", { length: 64 }).notNull().unique(),
      couponTemplateId: int("couponTemplateId").notNull(),
      memberCouponId: int("memberCouponId"),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    productReviews = mysqlTable("productReviews", {
      id: int("id").autoincrement().primaryKey(),
      // 對應 products.id（varchar）；本專案不建 FK，商品是否存在由 API 驗證
      productId: varchar("productId", { length: 64 }).notNull(),
      productName: varchar("productName", { length: 200 }).notNull(),
      // admin：後台人工建立；customer：第二階段顧客投稿
      source: mysqlEnum("source", ["admin", "customer"]).notNull().default("admin"),
      // 以下兩欄第一階段恆為 null，保留給第二階段的已購買驗證
      userId: int("userId"),
      orderItemId: int("orderItemId"),
      displayName: varchar("displayName", { length: 50 }).notNull(),
      rating: tinyint("rating").notNull(),
      content: text("content").notNull(),
      // 回饋圖片網址（Vercel Blob），最多 3 張，陣列順序即顯示順序
      images: json("images").$type(),
      // pending：待審核（第二階段用）；published：商品頁顯示；hidden：隱藏
      status: mysqlEnum("status", ["pending", "published", "hidden"]).notNull().default("published"),
      // 首頁「暖心回饋」精選；第一階段只存欄位，首頁尚未串接
      isFeatured: boolean("isFeatured").notNull().default(false),
      sortOrder: int("sortOrder").notNull().default(0),
      // 第一次切到 published 的時間；之後隱藏再上架不覆寫
      publishedAt: timestamp("publishedAt"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    }, (table) => [
      index("product_reviews_product_status_idx").on(table.productId, table.status),
      index("product_reviews_featured_idx").on(table.isFeatured, table.status),
      // 一個 orderItem 只能留一則顧客評價。MySQL／TiDB 的 UNIQUE 允許多筆 NULL，
      // 後台建立的回饋 orderItemId 為 null，不受影響（已在 TiDB 8.5.3 實測）。
      uniqueIndex("product_reviews_order_item_unique").on(table.orderItemId)
    ]);
    promotions = mysqlTable("promotions", {
      id: int("id").autoincrement().primaryKey(),
      name: varchar("name", { length: 100 }).notNull(),
      threshold: int("threshold").notNull(),
      discountAmount: int("discountAmount").notNull(),
      maxDiscount: int("maxDiscount"),
      startsAt: timestamp("startsAt").notNull(),
      endsAt: timestamp("endsAt").notNull(),
      isActive: boolean("isActive").notNull().default(false),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
  }
});

// server/_entry/trpcHandler.ts
import express2 from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// server/routers/promotions.ts
init_schema();
import { z } from "zod";
import { eq as eq4, desc as desc3 } from "drizzle-orm";
import { TRPCError as TRPCError3 } from "@trpc/server";

// server/db.ts
import { eq, and, gt, sql } from "drizzle-orm";

// server/_core/emailNormalize.ts
function normalizeOrderEmail(email) {
  return email.trim().toLowerCase();
}

// server/db.ts
init_schema();
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

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
    "k0919933386@gmail.com",
    ...process.env.ADMIN_EMAILS?.split(",") ?? []
  ].map((email) => email.trim()).filter(Boolean).map(normalizeOrderEmail)
);
function shouldGrantAdminRole(openId, email, emailVerified = false) {
  if (openId === ENV.ownerOpenId) return true;
  if (!email || !emailVerified) return false;
  return ADMIN_EMAIL_ALLOWLIST.has(normalizeOrderEmail(email));
}
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
    const textFields = ["name", "email", "loginMethod", "lineEmail", "lineDisplayName", "linePictureUrl"];
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
    } else if (shouldGrantAdminRole(user.openId, user.email, user.emailVerified === true)) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (user.emailVerified !== void 0) {
      values.emailVerified = user.emailVerified;
      updateSet.emailVerified = user.emailVerified;
      if (user.emailVerified) {
        updateSet.verifyToken = null;
        updateSet.verifyTokenExpiresAt = null;
      }
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
  const key = normalizeOrderEmail(email);
  const result = await db.select().from(users).where(sql`LOWER(TRIM(${users.email})) = ${key}`).orderBy(sql`CASE WHEN ${users.openId} LIKE 'line:%' THEN 0 ELSE 1 END`, sql`${users.updatedAt} DESC`).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function mergeDuplicateMemberIntoPrimary(opts) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (opts.primaryUserId === opts.duplicateUserId) return;
  const [primary] = await db.select().from(users).where(eq(users.id, opts.primaryUserId)).limit(1);
  const [duplicate] = await db.select().from(users).where(eq(users.id, opts.duplicateUserId)).limit(1);
  if (!primary || !duplicate) return;
  await db.update(orders).set({ userId: opts.primaryUserId }).where(eq(orders.userId, opts.duplicateUserId));
  await db.update(chatbotLogs).set({ userId: opts.primaryUserId }).where(eq(chatbotLogs.userId, opts.duplicateUserId));
  await db.update(memberCoupons).set({ userId: opts.primaryUserId }).where(eq(memberCoupons.userId, opts.duplicateUserId));
  const shouldKeepAdmin = primary.role === "admin" || duplicate.role === "admin" || shouldGrantAdminRole(opts.lineOpenId, opts.email, true);
  await db.update(users).set({
    openId: opts.lineOpenId,
    name: opts.name?.trim() || primary.name || duplicate.name,
    email: opts.email,
    lineEmail: opts.lineEmail ?? primary.lineEmail,
    ...opts.lineProfile,
    passwordHash: primary.passwordHash ?? duplicate.passwordHash,
    emailVerified: true,
    verifyToken: null,
    verifyTokenExpiresAt: null,
    resetToken: primary.resetToken ?? duplicate.resetToken,
    resetTokenExpiresAt: primary.resetTokenExpiresAt ?? duplicate.resetTokenExpiresAt,
    loginMethod: "line",
    role: shouldKeepAdmin ? "admin" : "user",
    lastSignedIn: opts.lastSignedIn,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq(users.id, opts.primaryUserId));
  try {
    await db.execute(sql`
      UPDATE \`users\` primary_user
      JOIN \`users\` duplicate_user ON duplicate_user.\`id\` = ${opts.duplicateUserId}
      SET primary_user.\`vipTier\` = CASE
            WHEN COALESCE(primary_user.\`vipTier\`, 'none') = 'none'
            THEN COALESCE(duplicate_user.\`vipTier\`, 'none')
            ELSE primary_user.\`vipTier\`
          END,
          primary_user.\`vipNote\` = COALESCE(primary_user.\`vipNote\`, duplicate_user.\`vipNote\`)
      WHERE primary_user.\`id\` = ${opts.primaryUserId}
    `);
  } catch (error) {
    if (!String(error).includes("Unknown column")) {
      console.warn("[Database] Failed to merge member VIP fields:", error);
    }
  }
  await db.delete(users).where(eq(users.id, opts.duplicateUserId));
}
async function upsertLineUserAsPrimary(data) {
  if (!data.openId.startsWith("line:")) {
    throw new Error("LINE openId is required");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert LINE user: database not available");
    return;
  }
  const email = data.email ? normalizeOrderEmail(data.email) : null;
  const lastSignedIn = data.lastSignedIn ?? /* @__PURE__ */ new Date();
  const lineProfile = normalizeLineProfile(data);
  const name = data.name?.trim() || null;
  const [lineUser] = await db.select().from(users).where(eq(users.openId, data.openId)).limit(1);
  const isBoundEmailAccount = Boolean(lineUser?.passwordHash && lineUser.email);
  const [sameEmailCandidate] = email && !isBoundEmailAccount ? await db.select().from(users).where(sql`LOWER(TRIM(${users.email})) = ${email} AND ${users.openId} <> ${data.openId}`).limit(1) : [];
  const emailOwnedByOtherLine = Boolean(sameEmailCandidate?.openId.startsWith("line:"));
  const sameEmailUser = emailOwnedByOtherLine ? void 0 : sameEmailCandidate;
  const assignableEmail = emailOwnedByOtherLine ? null : email;
  if (emailOwnedByOtherLine) {
    console.warn("[Database] LINE email already belongs to a member bound to another LINE account; not merging", {
      lineOpenId: data.openId,
      existingUserId: sameEmailCandidate.id
    });
  }
  if (lineUser && sameEmailUser) {
    await mergeDuplicateMemberIntoPrimary({
      primaryUserId: lineUser.id,
      duplicateUserId: sameEmailUser.id,
      lineOpenId: data.openId,
      email,
      lineEmail: email,
      lineProfile,
      name,
      lastSignedIn
    });
    return;
  }
  if (lineUser && isBoundEmailAccount) {
    await db.update(users).set({
      name: lineUser.name || name,
      lineEmail: email ?? lineUser.lineEmail,
      ...lineProfile,
      role: shouldGrantAdminRole(data.openId, lineUser.email, lineUser.emailVerified === true) || lineUser.role === "admin" ? "admin" : lineUser.role,
      lastSignedIn,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(users.id, lineUser.id));
    return;
  }
  if (lineUser) {
    await db.update(users).set({
      name: name || lineUser.name,
      email: assignableEmail ?? lineUser.email,
      lineEmail: email ?? lineUser.lineEmail,
      ...lineProfile,
      loginMethod: "line",
      emailVerified: true,
      verifyToken: null,
      verifyTokenExpiresAt: null,
      role: shouldGrantAdminRole(data.openId, assignableEmail ?? lineUser.email, true) || lineUser.role === "admin" ? "admin" : lineUser.role,
      lastSignedIn,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(users.id, lineUser.id));
    return;
  }
  if (sameEmailUser) {
    await db.update(users).set({
      openId: data.openId,
      name: name || sameEmailUser.name,
      email,
      lineEmail: email,
      ...lineProfile,
      loginMethod: "line",
      emailVerified: true,
      verifyToken: null,
      verifyTokenExpiresAt: null,
      role: shouldGrantAdminRole(data.openId, email, true) || sameEmailUser.role === "admin" ? "admin" : sameEmailUser.role,
      lastSignedIn,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(users.id, sameEmailUser.id));
    return;
  }
  await upsertUser({
    openId: data.openId,
    name: name ?? void 0,
    email: assignableEmail ?? void 0,
    lineEmail: email ?? void 0,
    ...lineProfile,
    loginMethod: "line",
    lastSignedIn,
    emailVerified: true
  });
}
function normalizeLineProfile(profile) {
  const fields2 = {};
  const name = profile.lineDisplayName?.trim();
  if (name) fields2.lineDisplayName = name.slice(0, 100);
  const picture = profile.linePictureUrl?.trim();
  if (picture && picture.startsWith("https://") && picture.length <= 1024) fields2.linePictureUrl = picture;
  return fields2;
}
async function bindLineToUser(opts) {
  if (!opts.lineOpenId.startsWith("line:")) throw new Error("LINE openId is required");
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [current] = await db.select().from(users).where(eq(users.id, opts.userId)).limit(1);
  if (!current) throw new Error("User not found");
  const lineProfile = normalizeLineProfile(opts);
  if (current.openId === opts.lineOpenId) {
    const updates = { ...opts.lineEmail ? { lineEmail: opts.lineEmail } : {}, ...lineProfile };
    if (Object.keys(updates).length > 0) {
      await db.update(users).set(updates).where(eq(users.id, current.id));
    }
    return "already_bound";
  }
  if (current.openId.startsWith("line:")) return "user_has_other_line";
  const [owner] = await db.select({ id: users.id }).from(users).where(eq(users.openId, opts.lineOpenId)).limit(1);
  if (owner) return "line_in_use";
  try {
    const result = await db.update(users).set({
      openId: opts.lineOpenId,
      lineEmail: opts.lineEmail ?? null,
      lineDisplayName: lineProfile.lineDisplayName ?? null,
      linePictureUrl: lineProfile.linePictureUrl ?? null,
      lastSignedIn: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(and(eq(users.id, current.id), eq(users.openId, current.openId)));
    const affected = Array.isArray(result) ? result[0] : result;
    return affected?.affectedRows ? "bound" : "user_has_other_line";
  } catch (error) {
    if (String(error).includes("Duplicate entry") || String(error?.cause).includes("Duplicate entry")) {
      return "line_in_use";
    }
    throw error;
  }
}
async function createEmailUser(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const emailNorm = normalizeOrderEmail(data.email);
  const openId = `email:${emailNorm}`;
  const role = shouldGrantAdminRole(openId, emailNorm) ? "admin" : "user";
  await db.insert(users).values({
    openId,
    email: emailNorm,
    passwordHash: data.passwordHash,
    name: data.name,
    loginMethod: "email",
    role,
    lastSignedIn: /* @__PURE__ */ new Date()
  });
  return getUserByEmail(emailNorm);
}
async function setResetToken(email, token, expiresAt) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const key = normalizeOrderEmail(email);
  await db.update(users).set({ resetToken: token, resetTokenExpiresAt: expiresAt }).where(sql`LOWER(TRIM(${users.email})) = ${key}`);
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
  const key = normalizeOrderEmail(email);
  await db.update(users).set({ verifyToken: token, verifyTokenExpiresAt: expiresAt }).where(sql`LOWER(TRIM(${users.email})) = ${key}`);
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

// server/promotionDb.ts
init_schema();
import { and as and2, eq as eq2, lte, gt as gt2, desc } from "drizzle-orm";
async function getActivePromotion(now = /* @__PURE__ */ new Date()) {
  const db = await getDb();
  if (!db) throw new Error("\u76EE\u524D\u7121\u6CD5\u78BA\u8A8D\u6D3B\u52D5\uFF0C\u8ACB\u7A0D\u5F8C\u518D\u8A66");
  const [row] = await db.select().from(promotions).where(
    and2(
      eq2(promotions.isActive, true),
      lte(promotions.startsAt, now),
      gt2(promotions.endsAt, now)
    )
  ).orderBy(desc(promotions.id)).limit(1);
  return row ? {
    id: row.id,
    name: row.name,
    threshold: row.threshold,
    discountAmount: row.discountAmount,
    maxDiscount: row.maxDiscount,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString()
  } : null;
}

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
var CUSTOM_PRODUCT_ID = "custom-deposit-product";
var CUSTOM_TAROT_PRODUCT_ID = "tarot-crystal-deposit-product";
var CUSTOM_CHAKRA_PRODUCT_ID = "chakra-crystal-deposit-product";
var CUSTOM_NUMEROLOGY_PRODUCT_ID = "numerology-crystal-deposit-product";
var CUSTOM_PRODUCT_IDS = [CUSTOM_PRODUCT_ID, CUSTOM_TAROT_PRODUCT_ID, CUSTOM_CHAKRA_PRODUCT_ID, CUSTOM_NUMEROLOGY_PRODUCT_ID];
var CLEAR_QUARTZ_CHIPS_PRODUCT_ID = "prod-1781070485343";

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";

// server/_core/rateLimit.ts
import { TRPCError } from "@trpc/server";
var buckets = /* @__PURE__ */ new Map();
var MAX_BUCKETS = 1e4;
function requestIp(req) {
  const headers = req?.headers ?? {};
  const vercelIp = headers["x-vercel-forwarded-for"];
  const forwarded = headers["x-forwarded-for"];
  const raw = vercelIp ?? forwarded;
  const first = (Array.isArray(raw) ? raw[0] : raw)?.split(",")[0]?.trim();
  return first || req?.ip || req?.socket?.remoteAddress || "unknown";
}
function pruneExpired(now) {
  if (buckets.size < MAX_BUCKETS) return;
  buckets.forEach((bucket, key) => {
    if (bucket.resetAt <= now) buckets.delete(key);
  });
  if (buckets.size >= MAX_BUCKETS) buckets.delete(buckets.keys().next().value);
}
function rateLimitMultiplier() {
  if (process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME) return 1;
  const raw = Number(process.env.E2E_RATE_LIMIT_MULTIPLIER);
  if (!Number.isFinite(raw) || raw < 1) return 1;
  return Math.min(raw, 1e3);
}
function enforceRateLimit(req, res, scope, limit, windowMs) {
  const now = Date.now();
  pruneExpired(now);
  const effectiveLimit = limit * rateLimitMultiplier();
  const key = `${scope}:${requestIp(req)}`;
  const current = buckets.get(key);
  const bucket = !current || current.resetAt <= now ? { count: 1, resetAt: now + windowMs } : { count: current.count + 1, resetAt: current.resetAt };
  buckets.set(key, bucket);
  if (typeof res?.setHeader === "function") {
    res.setHeader("X-RateLimit-Limit", String(effectiveLimit));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, effectiveLimit - bucket.count)));
  }
  if (bucket.count <= effectiveLimit) return;
  const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1e3));
  if (typeof res?.setHeader === "function") res.setHeader("Retry-After", String(retryAfter));
  throw new TRPCError({
    code: "TOO_MANY_REQUESTS",
    message: "\u64CD\u4F5C\u904E\u65BC\u983B\u7E41\uFF0C\u8ACB\u7A0D\u5F8C\u518D\u8A66"
  });
}

// server/auditDb.ts
init_schema();
import { and as and3, desc as desc2, eq as eq3, gte, sql as sql2 } from "drizzle-orm";
var ensurePromise = null;
async function ensureAuditTable() {
  const db = await getDb();
  if (!db) return null;
  if (!ensurePromise) {
    ensurePromise = db.execute(sql2`
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
async function listAuditEvents(input) {
  const db = await ensureAuditTable();
  if (!db) throw new Error("Database not available");
  const conditions = [];
  if (input.orderId) conditions.push(eq3(operationAuditEvents.orderId, input.orderId));
  if (input.outcome) conditions.push(eq3(operationAuditEvents.outcome, input.outcome));
  if (input.source) conditions.push(eq3(operationAuditEvents.source, input.source));
  if (input.since) conditions.push(gte(operationAuditEvents.createdAt, input.since));
  return db.select().from(operationAuditEvents).where(conditions.length > 0 ? and3(...conditions) : void 0).orderBy(desc2(operationAuditEvents.createdAt), desc2(operationAuditEvents.id)).limit(Math.min(Math.max(input.limit ?? 50, 1), 200));
}
async function getAuditSummary(hours = 24) {
  const db = await ensureAuditTable();
  if (!db) throw new Error("Database not available");
  const since = new Date(Date.now() - hours * 60 * 6e4);
  const rows = await db.select({ outcome: operationAuditEvents.outcome, count: sql2`count(*)` }).from(operationAuditEvents).where(gte(operationAuditEvents.createdAt, since)).groupBy(operationAuditEvents.outcome);
  const result = { success: 0, rejected: 0, failed: 0, duplicate: 0 };
  for (const row of rows) {
    const key = row.outcome;
    if (key in result) result[key] = Number(row.count ?? 0);
  }
  return { hours, ...result };
}

// server/_core/trpc.ts
var PUBLIC_INTERNAL_ERROR_MESSAGE = "\u7CFB\u7D71\u66AB\u6642\u767C\u751F\u932F\u8AA4\uFF0C\u8ACB\u7A0D\u5F8C\u518D\u8A66";
function isUnexpectedInternalError(error) {
  if (error.code !== "INTERNAL_SERVER_ERROR") return false;
  const cause = error.cause;
  return cause != null && !(cause instanceof TRPCError2) && error.message === cause.message;
}
function logTrpcError({ error, path: path2, type }) {
  if (error.code !== "INTERNAL_SERVER_ERROR") return;
  console.error(`[tRPC] ${type ?? "request"} ${path2 ?? "(unknown)"} failed:`, error.cause ?? error);
}
var t = initTRPC.context().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    if (!isUnexpectedInternalError(error)) return shape;
    const { stack: _stack, ...data } = shape.data;
    return { ...shape, message: PUBLIC_INTERNAL_ERROR_MESSAGE, data };
  }
});
var router = t.router;
var publicProcedure = t.procedure;
function rateLimitedPublicProcedure(config) {
  return t.procedure.use(
    t.middleware(async ({ ctx, next }) => {
      enforceRateLimit(ctx.req, ctx.res, config.scope, config.limit, config.windowMs);
      return next();
    })
  );
}
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
function rateLimitedProtectedProcedure(config) {
  return protectedProcedure.use(
    t.middleware(async ({ ctx, next }) => {
      enforceRateLimit(ctx.req, ctx.res, config.scope, config.limit, config.windowMs);
      return next();
    })
  );
}
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    const rawInput = opts.type === "mutation" ? await opts.getRawInput() : void 0;
    const input = rawInput && typeof rawInput === "object" ? rawInput : {};
    const orderId = typeof input.orderId === "number" ? input.orderId : null;
    const merchantTradeNo = typeof input.merchantTradeNo === "string" ? input.merchantTradeNo : null;
    try {
      const result = await next({
        ctx: {
          ...ctx,
          user: ctx.user
        }
      });
      if (opts.type === "mutation") {
        await recordAuditEventSafely({
          source: "admin",
          category: opts.path.split(".")[0] || "admin",
          action: opts.path,
          outcome: result.ok ? "success" : "failed",
          severity: result.ok ? "info" : "error",
          orderId,
          merchantTradeNo,
          actorUserId: ctx.user.id,
          summary: result.ok ? `\u7BA1\u7406\u54E1\u64CD\u4F5C ${opts.path} \u5B8C\u6210` : `\u7BA1\u7406\u54E1\u64CD\u4F5C ${opts.path} \u5931\u6557`,
          details: result.ok ? { input } : { input, error: result.error.message }
        });
      }
      return result;
    } catch (error) {
      if (opts.type === "mutation") {
        await recordAuditEventSafely({
          source: "admin",
          category: opts.path.split(".")[0] || "admin",
          action: opts.path,
          outcome: "failed",
          severity: "error",
          orderId,
          merchantTradeNo,
          actorUserId: ctx.user.id,
          summary: `\u7BA1\u7406\u54E1\u64CD\u4F5C ${opts.path} \u767C\u751F\u4F8B\u5916`,
          details: { input, error: error instanceof Error ? error.message : String(error) }
        });
      }
      throw error;
    }
  })
);

// server/routers/promotions.ts
var fields = z.object({
  name: z.string().trim().min(1).max(100),
  threshold: z.number().int().min(1).max(1e7),
  discountAmount: z.number().int().min(1).max(1e7),
  maxDiscount: z.number().int().min(1).max(1e7).nullable(),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  isActive: z.boolean()
});
var promotionRouter = router({
  active: publicProcedure.query(() => getActivePromotion()),
  adminList: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return db.select().from(promotions).orderBy(desc3(promotions.id));
  }),
  adminSave: adminProcedure.input(fields.extend({ id: z.number().int().positive().optional() })).mutation(async ({ input }) => {
    if (new Date(input.endsAt) <= new Date(input.startsAt))
      throw new TRPCError3({
        code: "BAD_REQUEST",
        message: "\u7D50\u675F\u6642\u9593\u9808\u665A\u65BC\u958B\u59CB\u6642\u9593"
      });
    if (input.discountAmount >= input.threshold)
      throw new TRPCError3({
        code: "BAD_REQUEST",
        message: "\u6BCF\u6B21\u6298\u62B5\u9808\u5C0F\u65BC\u6BCF\u6EFF\u91D1\u984D"
      });
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const { id, ...rest } = input;
    const values = {
      ...rest,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt)
    };
    if (id)
      await db.update(promotions).set(values).where(eq4(promotions.id, id));
    else await db.insert(promotions).values(values);
    return { success: true };
  })
});

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  const secure = isSecureRequest(req);
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure
  };
}

// server/_core/systemRouter.ts
import { z as z2 } from "zod";

// server/_core/notification.ts
import { TRPCError as TRPCError4 } from "@trpc/server";
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
    throw new TRPCError4({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError4({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError4({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError4({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError4({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError4({
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

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z2.object({
      timestamp: z2.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  /** 前台及 E2E 只需要知道目前是否為沙盒，不暴露商店識別資料。 */
  paymentMode: publicProcedure.query(() => ({
    ecpaySandbox: process.env.ECPAY_SANDBOX === "true",
    ecpayLogisticsSandbox: process.env.ECPAY_LOGISTICS_SANDBOX === "true"
  })),
  /** 僅供管理員診斷環境變數是否注入；不回傳值或金鑰前綴。 */
  envCheck: adminProcedure.query(() => ({
    hasResendApiKey: !!ENV.resendApiKey && ENV.resendApiKey.length > 0,
    nodeEnv: process.env.NODE_ENV ?? "(not set)",
    hasEcpayMerchantId: !!process.env.ECPAY_MERCHANT_ID,
    hasEcpayHashKey: !!process.env.ECPAY_HASH_KEY,
    ecpaySandbox: process.env.ECPAY_SANDBOX === "true",
    hasEcpayLogisticsMerchantId: !!process.env.ECPAY_LOGISTICS_MERCHANT_ID,
    hasEcpayLogisticsHashKey: !!process.env.ECPAY_LOGISTICS_HASH_KEY,
    hasEcpayLogisticsHashIV: !!process.env.ECPAY_LOGISTICS_HASH_IV,
    ecpayLogisticsSandbox: process.env.ECPAY_LOGISTICS_SANDBOX === "true"
  })),
  notifyOwner: adminProcedure.input(
    z2.object({
      title: z2.string().min(1, "title is required"),
      content: z2.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// shared/promotions.ts
var PROMOTION_DISCOUNT_PRODUCT_ID = "promotion-discount";
function promotionDiscount(subtotal, rule) {
  if (!rule || subtotal <= 0) return 0;
  return Math.min(
    subtotal,
    rule.maxDiscount ?? subtotal,
    Math.floor(subtotal / rule.threshold) * rule.discountAmount
  );
}
function quoteCustomPromotion(finalPrice, depositPaid, rule, paidRegularSubtotal = 0) {
  const discount = promotionDiscount(finalPrice + paidRegularSubtotal, rule);
  return { finalPrice, depositPaid, paidRegularSubtotal, discount };
}
function promotionProductSubtotal(quote) {
  return quote.finalPrice + (quote.paidRegularSubtotal ?? 0);
}
function balancePromotionTotal(amount, shippingFee, addOn, quote) {
  const discount = quote?.discount ?? 0;
  const total = Math.max(0, amount + addOn + shippingFee - discount);
  return { total, discount: Math.min(discount, amount + addOn + shippingFee) };
}
var PROMOTION_FLOW_VERSION = 1;
function usesPromotionFlow(order) {
  return order.promotionFlowVersion === PROMOTION_FLOW_VERSION;
}

// server/routers/order.ts
init_schema();

// shared/balanceCoupons.ts
function balanceCouponDiscount(params) {
  if (params.productAmountAfterPromotion < params.coupon.minOrderAmount)
    return {
      ok: false,
      reason: `\u672A\u9054\u512A\u60E0\u5238\u4F7F\u7528\u9580\u6ABB NT$ ${params.coupon.minOrderAmount.toLocaleString()}`
    };
  const discount = Math.min(
    params.coupon.discountAmount,
    Math.max(0, params.remainingProductAmount)
  );
  if (discount <= 0)
    return { ok: false, reason: "\u6C92\u6709\u53EF\u6298\u62B5\u7684\u5546\u54C1\u5C3E\u6B3E" };
  return { ok: true, discount };
}

// server/couponDb.ts
init_schema();
import { and as and4, count, desc as desc4, eq as eq5, gt as gt3, inArray, isNull, lt, or, sql as sql3 } from "drizzle-orm";

// shared/coupons.ts
var COUPON_DISCOUNT_PRODUCT_ID = "coupon-discount";
var NON_PRODUCT_ORDER_ITEM_IDS = ["shipping", "shipping-fee", "payment-fee", COUPON_DISCOUNT_PRODUCT_ID, "promotion-discount"];
var COUPON_RESERVATION_TTL_MS = 30 * 6e4;
function getMemberCouponDisplayStatus(coupon, opts) {
  const now = opts.now ?? /* @__PURE__ */ new Date();
  if (coupon.status === "used") return "used";
  if (coupon.status === "reserved" && !opts.reservationReleasable) return "pending";
  if (coupon.expiresAt.getTime() <= now.getTime()) return "expired";
  return "available";
}
function calcCouponDiscount(params) {
  const { subtotal, shippingFee, coupon } = params;
  if (subtotal < coupon.minOrderAmount) {
    return { ok: false, reason: `\u672A\u9054\u6700\u4F4E\u6D88\u8CBB NT$ ${coupon.minOrderAmount.toLocaleString()}` };
  }
  const discount = Math.min(coupon.discountAmount, subtotal);
  const total = subtotal - discount + shippingFee;
  if (discount <= 0 || total <= 0) {
    return { ok: false, reason: "\u6B64\u8A02\u55AE\u91D1\u984D\u7121\u6CD5\u4F7F\u7528\u9019\u5F35\u512A\u60E0\u5238" };
  }
  return { ok: true, discount, total };
}

// server/couponDb.ts
var CouponError = class extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = "CouponError";
  }
};
var LINE_REWARD_ENABLED_KEY = "lineFriendRewardEnabled";
var LINE_REWARD_TEMPLATE_KEY = "lineFriendRewardTemplateId";
var RESERVABLE_PAYMENT_METHODS = ["credit", "paypal"];
var DAY_MS = 24 * 60 * 60 * 1e3;
async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db;
}
function getAffectedRows(result) {
  const candidate = Array.isArray(result) ? result[0] : result;
  if (!candidate || typeof candidate !== "object") return 0;
  const affectedRows = candidate.affectedRows;
  return typeof affectedRows === "number" ? affectedRows : 0;
}
function toDbTimestamp(date) {
  return date.toISOString().slice(0, -1).replace("T", " ");
}
function nowInSeconds() {
  return new Date(Math.floor(Date.now() / 1e3) * 1e3);
}
function isDuplicateKeyError(error) {
  for (let current = error, depth = 0; current && depth < 4; depth++) {
    const candidate = current;
    if (candidate.code === "ER_DUP_ENTRY" || candidate.errno === 1062) return true;
    if (typeof candidate.message === "string" && candidate.message.includes("Duplicate entry")) return true;
    current = candidate.cause;
  }
  return false;
}
var reservationOrderReleasableSql = sql3`(
  ${memberCoupons.orderId} IS NULL OR NOT EXISTS (
    SELECT 1 FROM \`orders\` o
    WHERE o.\`id\` = ${memberCoupons.orderId}
      AND (o.\`paymentStatus\` <> 'pending' OR o.\`paymentMethod\` NOT IN ('credit', 'paypal'))
  )
)`;
function isReservationReleasable(coupon, order, now = /* @__PURE__ */ new Date()) {
  if (coupon.status !== "reserved") return false;
  if (coupon.reservedAt && coupon.reservedAt.getTime() > now.getTime() - COUPON_RESERVATION_TTL_MS) return false;
  if (coupon.orderId == null || !order) return true;
  return order.paymentStatus === "pending" && RESERVABLE_PAYMENT_METHODS.includes(order.paymentMethod);
}
function computeCouponExpiresAt(template, issuedAt) {
  if (template.validityType === "fixed_date") return template.fixedExpiresAt ?? null;
  if (!template.validDays || template.validDays < 1) return null;
  return new Date(issuedAt.getTime() + template.validDays * DAY_MS);
}
function normalizeTemplateInput(input) {
  return {
    name: input.name,
    discountAmount: input.discountAmount,
    minOrderAmount: input.minOrderAmount,
    validityType: input.validityType,
    validDays: input.validityType === "days_after_issue" ? input.validDays : null,
    fixedExpiresAt: input.validityType === "fixed_date" ? input.fixedExpiresAt : null,
    maxPerUser: input.maxPerUser,
    isActive: input.isActive
  };
}
async function createCouponTemplate(input) {
  const db = await requireDb();
  const [created] = await db.insert(couponTemplates).values(normalizeTemplateInput(input)).$returningId();
  return getCouponTemplate(created.id);
}
async function updateCouponTemplate(id, input) {
  const db = await requireDb();
  const existing = await getCouponTemplate(id);
  if (!existing) throw new CouponError("NOT_FOUND", "\u627E\u4E0D\u5230\u512A\u60E0\u5238");
  await db.update(couponTemplates).set(normalizeTemplateInput(input)).where(eq5(couponTemplates.id, id));
  return getCouponTemplate(id);
}
async function getCouponTemplate(id) {
  const db = await requireDb();
  const [template] = await db.select().from(couponTemplates).where(eq5(couponTemplates.id, id)).limit(1);
  return template ?? null;
}
async function listActiveCouponTemplates() {
  const db = await requireDb();
  return db.select().from(couponTemplates).where(eq5(couponTemplates.isActive, true)).orderBy(desc4(couponTemplates.createdAt));
}
function couponStatsSelect(now) {
  const nowSql = toDbTimestamp(now);
  return {
    issued: sql3`CAST(COUNT(*) AS SIGNED)`,
    used: sql3`CAST(COALESCE(SUM(CASE WHEN ${memberCoupons.status} = 'used' THEN 1 ELSE 0 END), 0) AS SIGNED)`,
    reserved: sql3`CAST(COALESCE(SUM(CASE WHEN ${memberCoupons.status} = 'reserved' THEN 1 ELSE 0 END), 0) AS SIGNED)`,
    expired: sql3`CAST(COALESCE(SUM(CASE WHEN ${memberCoupons.status} = 'available' AND ${memberCoupons.expiresAt} <= ${nowSql} THEN 1 ELSE 0 END), 0) AS SIGNED)`,
    unused: sql3`CAST(COALESCE(SUM(CASE WHEN ${memberCoupons.status} = 'available' AND ${memberCoupons.expiresAt} > ${nowSql} THEN 1 ELSE 0 END), 0) AS SIGNED)`
  };
}
function normalizeStats(row) {
  return {
    issued: Number(row?.issued ?? 0),
    used: Number(row?.used ?? 0),
    reserved: Number(row?.reserved ?? 0),
    expired: Number(row?.expired ?? 0),
    unused: Number(row?.unused ?? 0)
  };
}
async function listCouponTemplatesWithStats(now = /* @__PURE__ */ new Date()) {
  const db = await requireDb();
  const templates = await db.select().from(couponTemplates).orderBy(desc4(couponTemplates.createdAt));
  const stats = await db.select({ templateId: memberCoupons.couponTemplateId, ...couponStatsSelect(now) }).from(memberCoupons).groupBy(memberCoupons.couponTemplateId);
  const statsByTemplate = new Map(stats.map((row) => [row.templateId, normalizeStats(row)]));
  return templates.map((template) => ({
    ...template,
    stats: statsByTemplate.get(template.id) ?? normalizeStats()
  }));
}
async function getCouponTemplateDetail(id, now = /* @__PURE__ */ new Date()) {
  const db = await requireDb();
  const template = await getCouponTemplate(id);
  if (!template) return null;
  const [statsRow] = await db.select(couponStatsSelect(now)).from(memberCoupons).where(eq5(memberCoupons.couponTemplateId, id));
  const rows = await db.select({
    coupon: memberCoupons,
    userName: users.name,
    userEmail: users.email,
    orderMerchantTradeNo: orders.merchantTradeNo,
    orderPaymentStatus: orders.paymentStatus,
    orderPaymentMethod: orders.paymentMethod
  }).from(memberCoupons).leftJoin(users, eq5(users.id, memberCoupons.userId)).leftJoin(orders, eq5(orders.id, memberCoupons.orderId)).where(eq5(memberCoupons.couponTemplateId, id)).orderBy(desc4(memberCoupons.issuedAt)).limit(500);
  return {
    template,
    stats: normalizeStats(statsRow),
    records: rows.map((row) => ({
      ...toMemberCouponView(row.coupon, orderFromRow(row), now),
      userName: row.userName,
      userEmail: row.userEmail
    }))
  };
}
async function issueCouponInTx(tx, opts) {
  const [template] = await tx.select().from(couponTemplates).where(eq5(couponTemplates.id, opts.templateId)).limit(1).for("update");
  if (!template) throw new CouponError("NOT_FOUND", "\u627E\u4E0D\u5230\u512A\u60E0\u5238");
  if (!template.isActive) throw new CouponError("INACTIVE", "\u6B64\u512A\u60E0\u5238\u5DF2\u505C\u7528\uFF0C\u7121\u6CD5\u767C\u653E");
  const issuedAt = nowInSeconds();
  const expiresAt = computeCouponExpiresAt(template, issuedAt);
  if (!expiresAt || expiresAt.getTime() <= issuedAt.getTime()) {
    throw new CouponError("EXPIRED", "\u6B64\u512A\u60E0\u5238\u5DF2\u8D85\u904E\u622A\u6B62\u65E5\u671F\uFF0C\u7121\u6CD5\u767C\u653E");
  }
  const [{ issuedCount }] = await tx.select({ issuedCount: count() }).from(memberCoupons).where(
    opts.campaignKey ? and4(
      eq5(memberCoupons.source, opts.source),
      eq5(memberCoupons.campaignKey, opts.campaignKey),
      eq5(memberCoupons.userId, opts.userId)
    ) : and4(eq5(memberCoupons.couponTemplateId, template.id), eq5(memberCoupons.userId, opts.userId))
  );
  if (issuedCount >= template.maxPerUser) {
    throw new CouponError(
      "LIMIT_REACHED",
      opts.campaignKey ? "\u6B64\u6703\u54E1\u5DF2\u9818\u53D6\u672C\u5E74\u5EA6\u751F\u65E5\u512A\u60E0" : `\u6B64\u6703\u54E1\u5DF2\u9054\u9019\u5F35\u512A\u60E0\u5238\u7684\u9818\u53D6\u4E0A\u9650\uFF08${template.maxPerUser} \u5F35\uFF09`
    );
  }
  let created;
  try {
    [created] = await tx.insert(memberCoupons).values({
      couponTemplateId: template.id,
      userId: opts.userId,
      name: template.name,
      discountAmount: template.discountAmount,
      minOrderAmount: template.minOrderAmount,
      issuedAt,
      expiresAt,
      status: "available",
      source: opts.source,
      campaignKey: opts.campaignKey ?? null,
      issuedByUserId: opts.issuedByUserId ?? null
    }).$returningId();
  } catch (error) {
    if (opts.campaignKey && isDuplicateKeyError(error)) {
      throw new CouponError("LIMIT_REACHED", "\u6B64\u6703\u54E1\u5DF2\u9818\u53D6\u672C\u5E74\u5EA6\u751F\u65E5\u512A\u60E0");
    }
    throw error;
  }
  const [coupon] = await tx.select().from(memberCoupons).where(eq5(memberCoupons.id, created.id)).limit(1);
  return coupon;
}
async function issueCoupon(opts) {
  const db = await requireDb();
  return db.transaction((tx) => issueCouponInTx(tx, opts));
}
function orderFromRow(row) {
  if (!row.orderMerchantTradeNo) return null;
  return {
    merchantTradeNo: row.orderMerchantTradeNo,
    paymentStatus: row.orderPaymentStatus,
    paymentMethod: row.orderPaymentMethod
  };
}
function toMemberCouponView(coupon, order, now) {
  const releasable = isReservationReleasable(coupon, order, now);
  const displayStatus = getMemberCouponDisplayStatus(coupon, { reservationReleasable: releasable, now });
  return {
    id: coupon.id,
    couponTemplateId: coupon.couponTemplateId,
    userId: coupon.userId,
    name: coupon.name,
    discountAmount: coupon.discountAmount,
    minOrderAmount: coupon.minOrderAmount,
    issuedAt: coupon.issuedAt,
    expiresAt: coupon.expiresAt,
    usedAt: coupon.usedAt,
    source: coupon.source,
    displayStatus,
    // 可再次使用的保留不再顯示舊訂單
    orderMerchantTradeNo: displayStatus === "available" ? null : order?.merchantTradeNo ?? null
  };
}
async function listMemberCoupons(userId, now = /* @__PURE__ */ new Date()) {
  const db = await requireDb();
  const rows = await db.select({
    coupon: memberCoupons,
    orderMerchantTradeNo: orders.merchantTradeNo,
    orderPaymentStatus: orders.paymentStatus,
    orderPaymentMethod: orders.paymentMethod
  }).from(memberCoupons).leftJoin(orders, eq5(orders.id, memberCoupons.orderId)).where(eq5(memberCoupons.userId, userId)).orderBy(desc4(memberCoupons.issuedAt));
  return rows.map((row) => toMemberCouponView(row.coupon, orderFromRow(row), now));
}
async function getCouponForCheckout(memberCouponId, userId, now = /* @__PURE__ */ new Date()) {
  const db = await requireDb();
  const [row] = await db.select({
    coupon: memberCoupons,
    orderMerchantTradeNo: orders.merchantTradeNo,
    orderPaymentStatus: orders.paymentStatus,
    orderPaymentMethod: orders.paymentMethod
  }).from(memberCoupons).leftJoin(orders, eq5(orders.id, memberCoupons.orderId)).where(eq5(memberCoupons.id, memberCouponId)).limit(1);
  if (!row || row.coupon.userId !== userId) {
    throw new CouponError("NOT_FOUND", "\u627E\u4E0D\u5230\u9019\u5F35\u512A\u60E0\u5238");
  }
  const view = toMemberCouponView(row.coupon, orderFromRow(row), now);
  if (view.displayStatus === "used") throw new CouponError("UNAVAILABLE", "\u9019\u5F35\u512A\u60E0\u5238\u5DF2\u4F7F\u7528");
  if (view.displayStatus === "pending") {
    throw new CouponError("UNAVAILABLE", "\u9019\u5F35\u512A\u60E0\u5238\u5DF2\u5957\u7528\u5728\u53E6\u4E00\u7B46\u5F85\u4ED8\u6B3E\u8A02\u55AE\uFF0C\u8ACB\u5B8C\u6210\u4ED8\u6B3E\u6216 30 \u5206\u9418\u5F8C\u518D\u8A66");
  }
  if (view.displayStatus === "expired") throw new CouponError("EXPIRED", "\u9019\u5F35\u512A\u60E0\u5238\u5DF2\u904E\u671F");
  return row.coupon;
}
async function reserveCoupon(memberCouponId, userId) {
  const db = await requireDb();
  const reservedAt = nowInSeconds();
  const cutoff = new Date(reservedAt.getTime() - COUPON_RESERVATION_TTL_MS);
  const [previous] = await db.select({ status: memberCoupons.status, orderId: memberCoupons.orderId }).from(memberCoupons).where(eq5(memberCoupons.id, memberCouponId)).limit(1);
  const result = await db.update(memberCoupons).set({ status: "reserved", orderId: null, reservedAt, usedAt: null }).where(
    and4(
      eq5(memberCoupons.id, memberCouponId),
      eq5(memberCoupons.userId, userId),
      gt3(memberCoupons.expiresAt, reservedAt),
      or(
        eq5(memberCoupons.status, "available"),
        and4(
          eq5(memberCoupons.status, "reserved"),
          or(isNull(memberCoupons.reservedAt), lt(memberCoupons.reservedAt, cutoff)),
          reservationOrderReleasableSql
        )
      )
    )
  );
  if (getAffectedRows(result) === 0) return null;
  if (previous?.status === "reserved" && previous.orderId != null) {
    await recordAuditEventSafely({
      source: "coupon",
      category: "coupon",
      action: "coupon.reservation.takeover",
      outcome: "success",
      severity: "warning",
      orderId: previous.orderId,
      summary: "\u5F85\u4ED8\u6B3E\u8A02\u55AE\u903E\u6642\uFF0C\u512A\u60E0\u5238\u6539\u7528\u65BC\u65B0\u8A02\u55AE",
      details: { memberCouponId, previousOrderId: previous.orderId }
    });
  }
  return reservedAt;
}
async function attachReservedCouponToOrder(memberCouponId, reservedAt, orderId) {
  const db = await requireDb();
  const result = await db.update(memberCoupons).set({ orderId }).where(
    and4(
      eq5(memberCoupons.id, memberCouponId),
      eq5(memberCoupons.status, "reserved"),
      eq5(memberCoupons.reservedAt, reservedAt),
      isNull(memberCoupons.orderId)
    )
  );
  return getAffectedRows(result) > 0;
}
async function cancelCouponReservation(memberCouponId, reservedAt) {
  const db = await requireDb();
  await db.update(memberCoupons).set({ status: "available", reservedAt: null }).where(
    and4(
      eq5(memberCoupons.id, memberCouponId),
      eq5(memberCoupons.status, "reserved"),
      eq5(memberCoupons.reservedAt, reservedAt),
      isNull(memberCoupons.orderId)
    )
  );
}
async function markCouponUsedForOrder(orderId, context = {}) {
  const db = await requireDb();
  const result = await db.update(memberCoupons).set({ status: "used", usedAt: nowInSeconds() }).where(and4(eq5(memberCoupons.orderId, orderId), eq5(memberCoupons.status, "reserved")));
  const affected = getAffectedRows(result);
  if (affected > 0) return affected;
  const [discountRow] = await db.select({ id: orderItems.id }).from(orderItems).where(and4(eq5(orderItems.orderId, orderId), eq5(orderItems.productId, COUPON_DISCOUNT_PRODUCT_ID))).limit(1);
  if (!discountRow) return 0;
  const [usedCoupon] = await db.select({ id: memberCoupons.id }).from(memberCoupons).where(and4(eq5(memberCoupons.orderId, orderId), eq5(memberCoupons.status, "used"))).limit(1);
  if (!usedCoupon) {
    await recordAuditEventSafely({
      source: "coupon",
      category: "coupon",
      action: "coupon.use.missing_reservation",
      outcome: "failed",
      severity: "error",
      orderId,
      merchantTradeNo: context.merchantTradeNo ?? null,
      summary: "\u8A02\u55AE\u5DF2\u4ED8\u6B3E\u4E26\u6298\u62B5\u512A\u60E0\u5238\uFF0C\u4F46\u8A72\u5238\u5DF2\u88AB\u5176\u4ED6\u8A02\u55AE\u4F7F\u7528\u6216\u5DF2\u9000\u56DE\uFF0C\u8ACB\u4EBA\u5DE5\u78BA\u8A8D"
    });
  }
  return 0;
}
async function releaseCouponsForOrders(orderIds, opts) {
  if (orderIds.length === 0) return 0;
  const db = await requireDb();
  const statuses = opts.includeUsed ? ["reserved", "used"] : ["reserved"];
  const affectedCoupons = await db.select({ id: memberCoupons.id, orderId: memberCoupons.orderId, status: memberCoupons.status }).from(memberCoupons).where(and4(inArray(memberCoupons.orderId, orderIds), inArray(memberCoupons.status, statuses)));
  if (affectedCoupons.length === 0) return 0;
  const result = await db.update(memberCoupons).set({ status: "available", orderId: null, reservedAt: null, usedAt: null }).where(and4(inArray(memberCoupons.orderId, orderIds), inArray(memberCoupons.status, statuses)));
  await recordAuditEventSafely({
    source: "coupon",
    category: "coupon",
    action: "coupon.release",
    outcome: "success",
    orderId: orderIds.length === 1 ? orderIds[0] : null,
    actorUserId: opts.actorUserId ?? null,
    summary: `\u5DF2\u9000\u56DE ${getAffectedRows(result)} \u5F35\u512A\u60E0\u5238\uFF08${opts.reason}\uFF09`,
    details: { orderIds, coupons: affectedCoupons }
  });
  return getAffectedRows(result);
}
async function markCouponUsedForOrderSafely(orderId, context = {}) {
  try {
    return await markCouponUsedForOrder(orderId, context);
  } catch (error) {
    console.error("[Coupon] mark used failed", { orderId, error });
    await recordAuditEventSafely({
      source: "coupon",
      category: "coupon",
      action: "coupon.use",
      outcome: "failed",
      severity: "error",
      orderId,
      merchantTradeNo: context.merchantTradeNo ?? null,
      summary: "\u8A02\u55AE\u5DF2\u4ED8\u6B3E\uFF0C\u4F46\u512A\u60E0\u5238\u6838\u92B7\u5931\u6557\uFF0C\u8ACB\u4EBA\u5DE5\u78BA\u8A8D",
      details: { error: error instanceof Error ? error.message : String(error) }
    });
    return null;
  }
}
async function releaseCouponsForOrdersSafely(orderIds, opts) {
  try {
    return await releaseCouponsForOrders(orderIds, opts);
  } catch (error) {
    console.error("[Coupon] release failed", { orderIds, error });
    await recordAuditEventSafely({
      source: "coupon",
      category: "coupon",
      action: "coupon.release",
      outcome: "failed",
      severity: "error",
      orderId: orderIds.length === 1 ? orderIds[0] : null,
      actorUserId: opts.actorUserId ?? null,
      summary: `\u512A\u60E0\u5238\u9000\u56DE\u5931\u6557\uFF08${opts.reason}\uFF09\uFF0C\u8ACB\u4EBA\u5DE5\u78BA\u8A8D`,
      details: { orderIds, error: error instanceof Error ? error.message : String(error) }
    });
    return null;
  }
}
async function getSetting(db, key) {
  const [row] = await db.select().from(siteSettings).where(eq5(siteSettings.key, key)).limit(1);
  return row?.value ?? null;
}
async function getLineFriendRewardSettings() {
  const db = await requireDb();
  const [enabled, templateId] = await Promise.all([
    getSetting(db, LINE_REWARD_ENABLED_KEY),
    getSetting(db, LINE_REWARD_TEMPLATE_KEY)
  ]);
  const parsedTemplateId = templateId ? Number(templateId) : null;
  return {
    enabled: enabled === "true",
    templateId: parsedTemplateId && Number.isInteger(parsedTemplateId) ? parsedTemplateId : null
  };
}
async function saveLineFriendRewardSettings(input) {
  const db = await requireDb();
  if (input.enabled) {
    if (!input.templateId) throw new CouponError("NOT_FOUND", "\u8ACB\u9078\u64C7\u597D\u53CB\u7D81\u5B9A\u5F8C\u8981\u8D08\u9001\u7684\u512A\u60E0\u5238");
    const template = await getCouponTemplate(input.templateId);
    if (!template) throw new CouponError("NOT_FOUND", "\u627E\u4E0D\u5230\u512A\u60E0\u5238");
    if (!template.isActive) throw new CouponError("INACTIVE", "\u8ACB\u9078\u64C7\u555F\u7528\u4E2D\u7684\u512A\u60E0\u5238");
  }
  const values = [
    { key: LINE_REWARD_ENABLED_KEY, value: String(input.enabled) },
    { key: LINE_REWARD_TEMPLATE_KEY, value: input.templateId ? String(input.templateId) : "" }
  ];
  for (const value of values) {
    await db.insert(siteSettings).values(value).onDuplicateKeyUpdate({ set: { value: value.value } });
  }
  return getLineFriendRewardSettings();
}
async function getLineFriendRewardOffer() {
  const settings = await getLineFriendRewardSettings();
  if (!settings.enabled || !settings.templateId) return null;
  const template = await getCouponTemplate(settings.templateId);
  if (!template || !template.isActive) return null;
  return {
    name: template.name,
    discountAmount: template.discountAmount,
    minOrderAmount: template.minOrderAmount
  };
}
async function getLineFriendRewardForUser(userId) {
  const db = await requireDb();
  const [reward] = await db.select().from(lineFriendRewards).where(eq5(lineFriendRewards.userId, userId)).limit(1);
  return reward ?? null;
}
async function grantLineFriendReward(opts) {
  const db = await requireDb();
  const settings = await getLineFriendRewardSettings();
  if (!settings.enabled || !settings.templateId) return { status: "disabled" };
  const templateId = settings.templateId;
  const [existing] = await db.select({ id: lineFriendRewards.id }).from(lineFriendRewards).where(or(eq5(lineFriendRewards.userId, opts.userId), eq5(lineFriendRewards.lineUserId, opts.lineUserId))).limit(1);
  if (existing) return { status: "already" };
  try {
    const result = await db.transaction(async (tx) => {
      await tx.insert(lineFriendRewards).values({
        userId: opts.userId,
        lineUserId: opts.lineUserId,
        couponTemplateId: templateId
      });
      let coupon;
      try {
        coupon = await issueCouponInTx(tx, { templateId, userId: opts.userId, source: "LINE_FRIEND" });
      } catch (error) {
        if (error instanceof CouponError && error.code === "LIMIT_REACHED") return { status: "already" };
        throw error;
      }
      await tx.update(lineFriendRewards).set({ memberCouponId: coupon.id }).where(eq5(lineFriendRewards.userId, opts.userId));
      return { status: "granted", coupon };
    });
    await recordAuditEventSafely({
      source: "line",
      category: "coupon",
      action: "coupon.line_friend_reward",
      outcome: result.status === "granted" ? "success" : "duplicate",
      actorUserId: opts.userId,
      summary: result.status === "granted" ? "LINE \u597D\u53CB\u79AE\u5DF2\u767C\u653E" : "\u6703\u54E1\u5DF2\u6301\u6709 LINE \u597D\u53CB\u79AE\u512A\u60E0\u5238\uFF0C\u672A\u91CD\u8907\u767C\u653E",
      details: {
        userId: opts.userId,
        templateId,
        memberCouponId: result.status === "granted" ? result.coupon.id : null
      }
    });
    return result;
  } catch (error) {
    if (isDuplicateKeyError(error)) return { status: "already" };
    if (error instanceof CouponError) return { status: "unavailable", message: error.message };
    throw error;
  }
}
async function claimBalanceCoupon(orderId, balanceId, userId, amounts, couponId) {
  const db = await requireDb();
  return db.transaction(async (tx) => {
    await tx.execute(
      sql3`SELECT \`id\` FROM \`orders\` WHERE \`id\` = ${orderId} FOR UPDATE`
    );
    await tx.execute(
      sql3`SELECT \`id\` FROM \`orderBalancePayments\` WHERE \`id\` = ${balanceId} FOR UPDATE`
    );
    const [order] = await tx.select().from(orders).where(eq5(orders.id, orderId)).limit(1);
    const [balance] = await tx.select().from(orderBalancePayments).where(eq5(orderBalancePayments.id, balanceId)).limit(1);
    if (!order || order.orderStatus === "cancelled" || !balance || !["pending", "failed"].includes(balance.paymentStatus))
      throw new Error("\u8A02\u55AE\u6216\u5C3E\u6B3E\u72C0\u614B\u5DF2\u66F4\u65B0\uFF0C\u8ACB\u91CD\u65B0\u6574\u7406");
    const [attached] = await tx.select().from(memberCoupons).where(
      and4(
        eq5(memberCoupons.orderId, orderId),
        inArray(memberCoupons.status, ["reserved", "used"])
      )
    ).limit(1);
    if (attached?.status === "used") {
      if (couponId) throw new Error("\u6B64\u8A02\u55AE\u5DF2\u4F7F\u7528\u4E00\u5F35\u512A\u60E0\u5238\uFF0C\u4E0D\u53EF\u91CD\u8907\u4F7F\u7528");
      return null;
    }
    if (attached) {
      if (couponId != null && couponId !== attached.id)
        throw new Error("\u6B64\u7B46\u5C3E\u6B3E\u5DF2\u5957\u7528\u512A\u60E0\u5238\uFF0C\u8ACB\u4F7F\u7528\u539F\u5238\u5B8C\u6210\u4ED8\u6B3E\u3002");
      const preview2 = balanceCouponDiscount({ ...amounts, coupon: attached });
      if (!preview2.ok) throw new Error(preview2.reason);
      return { ...attached, discount: preview2.discount };
    }
    if (!couponId) return null;
    const attempts = await tx.select().from(orderBalancePaymentAttempts).where(
      and4(
        eq5(orderBalancePaymentAttempts.balancePaymentId, balanceId),
        inArray(orderBalancePaymentAttempts.paymentStatus, [
          "pending",
          "superseded"
        ])
      )
    );
    if (attempts.length)
      throw new Error(
        "\u4FE1\u7528\u5361\u4ED8\u6B3E\u5DF2\u958B\u59CB\uFF0C\u76EE\u524D\u7121\u6CD5\u66F4\u63DB\u512A\u60E0\u5238\u3002"
      );
    if (userId == null || order.userId !== userId)
      throw new Error("\u8ACB\u767B\u5165\u539F\u8A02\u8CFC\u6703\u54E1\u5E33\u865F\u624D\u80FD\u4F7F\u7528\u512A\u60E0\u5238");
    const [coupon] = await tx.select().from(memberCoupons).where(eq5(memberCoupons.id, couponId)).limit(1);
    if (!coupon || coupon.userId !== userId || coupon.expiresAt <= /* @__PURE__ */ new Date())
      throw new Error("\u512A\u60E0\u5238\u4E0D\u5B58\u5728\u6216\u5DF2\u904E\u671F");
    const preview = balanceCouponDiscount({ ...amounts, coupon });
    if (!preview.ok) throw new Error(preview.reason);
    const result = await tx.update(memberCoupons).set({
      status: "reserved",
      orderId,
      reservedAt: nowInSeconds(),
      usedAt: null
    }).where(
      and4(
        eq5(memberCoupons.id, couponId),
        eq5(memberCoupons.userId, userId),
        eq5(memberCoupons.status, "available"),
        gt3(memberCoupons.expiresAt, /* @__PURE__ */ new Date())
      )
    );
    if (getAffectedRows(result) === 0)
      throw new Error("\u9019\u5F35\u512A\u60E0\u5238\u76EE\u524D\u7121\u6CD5\u4F7F\u7528\uFF0C\u8ACB\u91CD\u65B0\u9078\u64C7\u3002");
    return {
      ...coupon,
      status: "reserved",
      orderId,
      discount: preview.discount
    };
  });
}
async function getBalanceCoupon(orderId) {
  const db = await requireDb();
  const [coupon] = await db.select({
    id: memberCoupons.id,
    name: memberCoupons.name,
    discountAmount: memberCoupons.discountAmount,
    minOrderAmount: memberCoupons.minOrderAmount,
    status: memberCoupons.status
  }).from(memberCoupons).where(
    and4(
      eq5(memberCoupons.orderId, orderId),
      eq5(memberCoupons.status, "reserved")
    )
  ).limit(1);
  return coupon ?? null;
}

// server/orderDb.ts
import { eq as eq7, desc as desc5, asc, and as and5, gte as gte2, sql as sql5, inArray as inArray2 } from "drizzle-orm";
import crypto from "node:crypto";

// server/memberOrderAccess.ts
init_schema();
import { eq as eq6, or as or2, sql as sql4 } from "drizzle-orm";
async function resolveMemberIdentity(sessionUser) {
  const current = await getUserByOpenId(sessionUser.openId) ?? sessionUser;
  return {
    userId: current.id,
    verifiedEmail: current.emailVerified ? current.email ?? null : null
  };
}
function memberVisibleOrdersWhere(opts) {
  const conditions = [];
  if (opts.userId != null) {
    conditions.push(eq6(orders.userId, opts.userId));
  }
  if (opts.email) {
    const key = normalizeOrderEmail(opts.email);
    conditions.push(sql4`LOWER(TRIM(${orders.buyerEmail})) = ${key}`);
  }
  if (conditions.length === 0) return null;
  return conditions.length === 1 ? conditions[0] : or2(...conditions);
}
function isOrderOwnedByMember(order, identity) {
  if (order.userId != null) return order.userId === identity.userId;
  if (!identity.verifiedEmail) return false;
  return normalizeOrderEmail(order.buyerEmail) === normalizeOrderEmail(identity.verifiedEmail);
}

// shared/customFormNote.ts
function customConsultationKey(productId, orderItemId, itemIndex) {
  if (orderItemId && itemIndex) return `${productId}:${orderItemId}:${itemIndex}`;
  return productId;
}
function findBlockRange(customerNote, key) {
  const startMarker = `\u3010\u5BA2\u88FD\u9700\u6C42\u958B\u59CB\uFF1A${key}\u3011`;
  const endMarker = `\u3010\u5BA2\u88FD\u9700\u6C42\u7D50\u675F\uFF1A${key}\u3011`;
  const blockStart = customerNote.indexOf(startMarker);
  if (blockStart < 0) return null;
  const contentStart = blockStart + startMarker.length;
  const endIndex = customerNote.indexOf(endMarker, contentStart);
  if (endIndex >= 0) {
    return {
      blockStart,
      blockEnd: endIndex + endMarker.length,
      contentStart,
      contentEnd: endIndex
    };
  }
  const nextBlockIndex = customerNote.indexOf("\u3010\u5BA2\u88FD\u9700\u6C42\u958B\u59CB\uFF1A", contentStart);
  const contentEnd = nextBlockIndex >= 0 ? nextBlockIndex : customerNote.length;
  return { blockStart, blockEnd: contentEnd, contentStart, contentEnd };
}
function buildNoteBlock(key, customerNote) {
  return [`\u3010\u5BA2\u88FD\u9700\u6C42\u958B\u59CB\uFF1A${key}\u3011`, customerNote.trim(), `\u3010\u5BA2\u88FD\u9700\u6C42\u7D50\u675F\uFF1A${key}\u3011`].join("\n");
}
function replaceBlock(customerNote, key, noteBlock) {
  const range = findBlockRange(customerNote, key);
  if (!range) return null;
  return [
    customerNote.slice(0, range.blockStart).trimEnd(),
    noteBlock,
    customerNote.slice(range.blockEnd).trimStart()
  ].filter(Boolean).join("\n\n");
}
function upsertCustomConsultationNote(existingNote, {
  productId,
  customerNote,
  orderItemId,
  itemIndex
}) {
  const key = customConsultationKey(productId, orderItemId, itemIndex);
  const noteBlock = buildNoteBlock(key, customerNote);
  const current = existingNote?.trim() ?? "";
  if (!current) return noteBlock;
  const replaced = replaceBlock(current, key, noteBlock);
  if (replaced !== null) return replaced;
  if (orderItemId && itemIndex === 1) {
    const legacyReplaced = replaceBlock(current, productId, noteBlock);
    if (legacyReplaced !== null) return legacyReplaced;
  }
  return [current, noteBlock].join("\n\n");
}

// server/orderDb.ts
init_schema();

// shared/checkoutFees.ts
var DOMESTIC_SHIPPING_FEES = {
  home: 130,
  cvs_711: 60,
  cvs_family: 60
};
var OVERSEAS_SHIPPING_FEES = {
  MY: 334,
  HK: 350,
  SG: 350,
  US: 771,
  GB: 644,
  AU: 552
};
var FREE_SHIPPING_EMAILS = [];
function isCheckoutFeeExemptProduct(item) {
  const productId = item.baseProductId ?? item.id;
  return CUSTOM_PRODUCT_IDS.includes(productId) || productId.startsWith("test-") || item.id.startsWith("test-") || item.name?.includes("\u6E2C\u8A66\u7528") === true;
}
function isTestProduct(item) {
  const productId = item.baseProductId ?? item.id;
  return productId.startsWith("test-") || item.id.startsWith("test-") || item.name?.includes("\u6E2C\u8A66\u7528") === true;
}
function calcFreeShippingQuantity(items) {
  return items.filter((item) => !isTestProduct(item) && item.twoItemFreeShippingEligible !== false).reduce((sum, item) => sum + item.quantity, 0);
}
function isFreeShippingEmail(email) {
  return email ? FREE_SHIPPING_EMAILS.includes(email.trim().toLowerCase()) : false;
}
function calcCheckoutFees(params) {
  const subtotal = params.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const chargeableSubtotal = params.items.filter((item) => !isCheckoutFeeExemptProduct(item)).reduce((sum, item) => sum + item.price * item.quantity, 0);
  const appliesFees = chargeableSubtotal > 0 || params.chargeShippingWhenSubtotalZero === true;
  const domesticFreeShipping = params.checkoutRegion === "domestic" && calcFreeShippingQuantity(params.items) >= 2;
  const emailFreeShipping = isFreeShippingEmail(params.buyerEmail);
  const forcedFreeShipping = params.forceFreeShipping === true;
  const forcedPaidShipping = params.forcePaidShipping === true;
  const shippingFee = !appliesFees ? 0 : forcedFreeShipping ? 0 : forcedPaidShipping ? params.checkoutRegion === "overseas" ? params.overseasCountry ? OVERSEAS_SHIPPING_FEES[params.overseasCountry] : 0 : DOMESTIC_SHIPPING_FEES[params.shippingMethod] : emailFreeShipping ? 0 : domesticFreeShipping ? 0 : params.checkoutRegion === "overseas" ? params.overseasCountry ? OVERSEAS_SHIPPING_FEES[params.overseasCountry] : 0 : DOMESTIC_SHIPPING_FEES[params.shippingMethod];
  const paymentFee = 0;
  const total = subtotal + shippingFee + paymentFee;
  return {
    subtotal,
    chargeableSubtotal,
    shippingFee,
    paymentFee,
    total,
    appliesFees,
    domesticFreeShipping,
    emailFreeShipping,
    forcedFreeShipping,
    forcedPaidShipping
  };
}

// server/orderDb.ts
function normalizeInsertValue(value) {
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return JSON.stringify(value);
  }
  return value;
}
function getAffectedRows2(result) {
  const candidate = Array.isArray(result) ? result[0] : result;
  if (!candidate || typeof candidate !== "object") return 0;
  const affectedRows = candidate.affectedRows;
  return typeof affectedRows === "number" ? affectedRows : 0;
}
async function insertOrderCompat(db, orderData) {
  const entries = Object.entries(orderData).filter(([, value]) => value !== void 0).map(([key, value]) => [key, normalizeInsertValue(value)]);
  if (entries.length === 0) {
    throw new Error("Order data is empty");
  }
  await db.execute(sql5`
    INSERT INTO \`orders\` (${sql5.join(
    entries.map(([key]) => sql5.raw(`\`${key}\``)),
    sql5`, `
  )})
    VALUES (${sql5.join(
    entries.map(([, value]) => sql5`${value}`),
    sql5`, `
  )})
  `);
}
function toPublicLogistics(logistics, events) {
  const { ecpayLogisticsData: _privateCallbackData, ...publicLogistics } = logistics;
  return { ...publicLogistics, events };
}
async function orderHasDomesticFreeShipping(db, orderId) {
  const items = await db.select({
    id: orderItems.productId,
    name: orderItems.productName,
    price: orderItems.unitPrice,
    quantity: orderItems.quantity,
    twoItemFreeShippingEligible: dbProducts.twoItemFreeShippingEligible
  }).from(orderItems).leftJoin(dbProducts, eq7(orderItems.productId, dbProducts.id)).where(eq7(orderItems.orderId, orderId));
  const productItems = items.filter((item) => !NON_PRODUCT_ORDER_ITEM_IDS.includes(item.id)).map((item) => ({
    ...item,
    twoItemFreeShippingEligible: item.twoItemFreeShippingEligible ?? true
  }));
  if (productItems.length === 0) return false;
  return calcCheckoutFees({
    items: productItems,
    checkoutRegion: "domestic",
    shippingMethod: "cvs_711",
    paymentMethod: "credit"
  }).domesticFreeShipping;
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
    await db.execute(sql5`ALTER TABLE \`orderBalancePayments\` ADD COLUMN \`transferReceiptUrl\` longtext NULL`);
  } catch {
  }
  balancePaymentColumnsEnsured = true;
}
var balancePaymentAttemptTableEnsured = false;
async function ensureBalancePaymentAttemptTable(db) {
  if (balancePaymentAttemptTableEnsured) return;
  await db.execute(sql5`
    CREATE TABLE IF NOT EXISTS \`orderBalancePaymentAttempts\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`balancePaymentId\` int NOT NULL,
      \`merchantTradeNo\` varchar(32) NOT NULL,
      \`amount\` int NOT NULL,
      \`shippingFee\` int NOT NULL DEFAULT 0,
      \`paymentFee\` int NOT NULL DEFAULT 0,
      \`totalAmount\` int NOT NULL,
      \`paymentMethod\` enum('credit') NOT NULL DEFAULT 'credit',
      \`paymentStatus\` enum('pending','paid','failed','superseded') NOT NULL DEFAULT 'pending',
      \`checkoutData\` json NULL,
      \`tradeNo\` varchar(64) NULL,
      \`ecpayNotifyData\` json NULL,
      \`paidAt\` timestamp NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`orderBalancePaymentAttempts_merchantTradeNo_unique\` (\`merchantTradeNo\`),
      KEY \`order_balance_payment_attempts_balance_id_idx\` (\`balancePaymentId\`)
    )
  `);
  balancePaymentAttemptTableEnsured = true;
}
async function getMergeInfoForOrderIds(db, orderIds) {
  if (orderIds.length === 0) return /* @__PURE__ */ new Map();
  const memberRows = await db.select({
    orderId: orderMergeMembers.orderId,
    groupId: orderMergeMembers.groupId,
    mergeCode: orderMergeGroups.mergeCode,
    mainOrderId: orderMergeGroups.mainOrderId
  }).from(orderMergeMembers).leftJoin(orderMergeGroups, eq7(orderMergeMembers.groupId, orderMergeGroups.id)).where(inArray2(orderMergeMembers.orderId, orderIds));
  const mainOrderIds = Array.from(new Set(memberRows.map((row) => row.mainOrderId).filter((id) => typeof id === "number")));
  const mainOrders = mainOrderIds.length > 0 ? await db.select({ id: orders.id, merchantTradeNo: orders.merchantTradeNo }).from(orders).where(inArray2(orders.id, mainOrderIds)) : [];
  const mainTradeNoById = new Map(mainOrders.map((order) => [order.id, order.merchantTradeNo]));
  const infoByOrderId = /* @__PURE__ */ new Map();
  for (const row of memberRows) {
    if (!row.groupId || !row.mergeCode || !row.mainOrderId) continue;
    infoByOrderId.set(row.orderId, {
      groupId: row.groupId,
      mergeCode: row.mergeCode,
      mainOrderId: row.mainOrderId,
      mainOrderMerchantTradeNo: mainTradeNoById.get(row.mainOrderId) ?? "",
      role: row.orderId === row.mainOrderId ? "main" : "member"
    });
  }
  return infoByOrderId;
}
function visibleOrdersOnlyWhere(baseWhere) {
  const visibleWhere = sql5`NOT EXISTS (
    SELECT 1
    FROM \`orderMergeMembers\` omm
    INNER JOIN \`orderMergeGroups\` omg ON omm.\`groupId\` = omg.\`id\`
    WHERE omm.\`orderId\` = ${orders.id}
      AND omg.\`mainOrderId\` <> ${orders.id}
  )`;
  return baseWhere ? and5(baseWhere, visibleWhere) : visibleWhere;
}
async function getMergeDetailForOrder(db, orderId) {
  const infoByOrderId = await getMergeInfoForOrderIds(db, [orderId]);
  const info = infoByOrderId.get(orderId);
  if (!info) return null;
  const memberRows = await db.select({
    orderId: orders.id,
    merchantTradeNo: orders.merchantTradeNo,
    buyerName: orders.buyerName,
    isCustomOrder: orders.isCustomOrder,
    orderStatus: orders.orderStatus,
    totalAmount: orders.totalAmount,
    customerNote: orders.customerNote,
    promotionFlowVersion: orders.promotionFlowVersion,
    promotion: orders.promotion,
    customQuote: orders.customQuote
  }).from(orderMergeMembers).leftJoin(orders, eq7(orderMergeMembers.orderId, orders.id)).where(eq7(orderMergeMembers.groupId, info.groupId));
  return {
    ...info,
    members: memberRows.filter((row) => Boolean(row.orderId)).map((row) => ({
      orderId: row.orderId,
      merchantTradeNo: row.merchantTradeNo,
      buyerName: row.buyerName,
      isCustomOrder: row.isCustomOrder,
      orderStatus: row.orderStatus,
      totalAmount: row.totalAmount,
      customerNote: row.customerNote,
      promotionFlowVersion: row.promotionFlowVersion,
      promotion: row.promotion,
      customQuote: row.customQuote
    }))
  };
}
async function attachItemsAndLogisticsForOrders(db, orderRows) {
  if (orderRows.length === 0) return [];
  const orderIds = orderRows.map((o) => o.id);
  const mergeInfoByOrderId = await getMergeInfoForOrderIds(db, orderIds);
  const visibleOrderRows = orderRows.filter((order) => mergeInfoByOrderId.get(order.id)?.role !== "member");
  if (visibleOrderRows.length === 0) return [];
  const visibleOrderIds = visibleOrderRows.map((order) => order.id);
  const visibleMergeInfos = visibleOrderIds.map((orderId) => mergeInfoByOrderId.get(orderId)).filter((info) => Boolean(info));
  const groupIds = Array.from(new Set(visibleMergeInfos.filter((info) => info.role === "main").map((info) => info.groupId)));
  const mergeMemberRows = groupIds.length > 0 ? await db.select({
    groupId: orderMergeMembers.groupId,
    orderId: orderMergeMembers.orderId,
    mainOrderId: orderMergeGroups.mainOrderId
  }).from(orderMergeMembers).leftJoin(orderMergeGroups, eq7(orderMergeMembers.groupId, orderMergeGroups.id)).where(inArray2(orderMergeMembers.groupId, groupIds)) : [];
  const combinedOrderIdsByMainId = /* @__PURE__ */ new Map();
  for (const row of mergeMemberRows) {
    if (!row.mainOrderId) continue;
    const current = combinedOrderIdsByMainId.get(row.mainOrderId) ?? [];
    current.push(row.orderId);
    combinedOrderIdsByMainId.set(row.mainOrderId, current);
  }
  const allItemOrderIds = Array.from(/* @__PURE__ */ new Set([
    ...visibleOrderIds,
    ...Array.from(combinedOrderIdsByMainId.values()).flat()
  ]));
  const allItems = await db.select().from(orderItems).where(inArray2(orderItems.orderId, allItemOrderIds));
  const allLogistics = await db.select().from(logisticsOrders).where(inArray2(logisticsOrders.orderId, visibleOrderIds));
  const logisticsIds = allLogistics.map((row) => row.id);
  const allLogisticsEvents = logisticsIds.length > 0 ? await db.select({
    id: logisticsEvents.id,
    logisticsOrderId: logisticsEvents.logisticsOrderId,
    eventKind: logisticsEvents.eventKind,
    normalizedStatus: logisticsEvents.normalizedStatus,
    rawCode: logisticsEvents.rawCode,
    message: logisticsEvents.message,
    occurredAt: logisticsEvents.occurredAt,
    receivedAt: logisticsEvents.receivedAt
  }).from(logisticsEvents).where(inArray2(logisticsEvents.logisticsOrderId, logisticsIds)).orderBy(asc(logisticsEvents.occurredAt), asc(logisticsEvents.id)) : [];
  const itemsByOrder = /* @__PURE__ */ new Map();
  for (const item of allItems) {
    const arr = itemsByOrder.get(item.orderId) ?? [];
    arr.push(item);
    itemsByOrder.set(item.orderId, arr);
  }
  const eventsByLogisticsId = /* @__PURE__ */ new Map();
  for (const event of allLogisticsEvents) {
    const arr = eventsByLogisticsId.get(event.logisticsOrderId) ?? [];
    const { logisticsOrderId: _logisticsOrderId, ...publicEvent } = event;
    arr.push(publicEvent);
    eventsByLogisticsId.set(event.logisticsOrderId, arr);
  }
  const logisticsByOrder = /* @__PURE__ */ new Map();
  for (const log of allLogistics) {
    logisticsByOrder.set(
      log.orderId,
      toPublicLogistics(log, eventsByLogisticsId.get(log.id) ?? [])
    );
  }
  return visibleOrderRows.map((order) => {
    const combinedOrderIds = combinedOrderIdsByMainId.get(order.id) ?? [order.id];
    const items = combinedOrderIds.flatMap((orderId) => itemsByOrder.get(orderId) ?? []);
    return {
      ...order,
      items,
      logistics: logisticsByOrder.get(order.id) ?? null,
      mergeInfo: null
    };
  });
}
var MAX_PRODUCT_IMAGE_LEN = 6e4;
function sanitizeProductImage(image) {
  if (!image) return null;
  const normalized = normalizeProductImageUrl(image);
  if (normalized.startsWith("data:")) return null;
  if (normalized.length > MAX_PRODUCT_IMAGE_LEN) return null;
  return normalized;
}
function normalizeProductImageUrl(image) {
  const trimmed = image.trim();
  if (!trimmed.includes("drive.google.com")) return trimmed;
  const fileMatch = trimmed.match(/\/file\/d\/([^/?#]+)/);
  const idMatch = trimmed.match(/[?&]id=([^&#]+)/);
  const id = fileMatch?.[1] ?? idMatch?.[1];
  return id ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1600` : trimmed;
}
async function createOrder(orderData, items) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await insertOrderCompat(db, orderData);
  const [created] = await db.select().from(orders).where(eq7(orders.merchantTradeNo, orderData.merchantTradeNo)).limit(1);
  if (!created) throw new Error("Failed to create order");
  const itemsWithOrderId = items.map((item) => ({
    ...item,
    orderId: created.id,
    // productImage 欄位是 MySQL TEXT（上限約 64KB）。商品圖若是內嵌的
    // base64 data URI（測試商品常見），長度動輒數百 KB，會讓 insert 直接失敗，
    // 也會讓每筆訂單暴肥。這類圖片不存（存 null），只保留正常的網址圖。
    productImage: sanitizeProductImage(item.productImage)
  }));
  await db.insert(orderItems).values(itemsWithOrderId);
  return created.id;
}
function toCustomerFacingOrder(order) {
  const { adminNote: _adminNote, customFormToken: _customFormToken, ...rest } = order;
  return rest;
}
async function getOrderWithItems(merchantTradeNo) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await ensureBalancePaymentColumns(db);
  const [order] = await db.select().from(orders).where(eq7(orders.merchantTradeNo, merchantTradeNo)).limit(1);
  if (!order) return null;
  const items = await db.select().from(orderItems).where(eq7(orderItems.orderId, order.id));
  const [logistics] = await db.select().from(logisticsOrders).where(eq7(logisticsOrders.orderId, order.id)).limit(1);
  const logisticsEventRows = logistics ? await db.select({
    id: logisticsEvents.id,
    eventKind: logisticsEvents.eventKind,
    normalizedStatus: logisticsEvents.normalizedStatus,
    rawCode: logisticsEvents.rawCode,
    message: logisticsEvents.message,
    occurredAt: logisticsEvents.occurredAt,
    receivedAt: logisticsEvents.receivedAt
  }).from(logisticsEvents).where(eq7(logisticsEvents.logisticsOrderId, logistics.id)).orderBy(asc(logisticsEvents.occurredAt), asc(logisticsEvents.id)) : [];
  const [balancePayment] = await db.select(balancePaymentLegacySelect).from(orderBalancePayments).where(eq7(orderBalancePayments.orderId, order.id)).limit(1);
  return {
    ...order,
    items,
    logistics: logistics ? toPublicLogistics(logistics, logisticsEventRows) : null,
    balancePayment: hydrateBalancePayment(balancePayment)
  };
}
async function markOrderPaidPayPal(merchantTradeNo, paypalCaptureId, capturePayload) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(orders).set({
    paymentStatus: "paid",
    orderStatus: "paid",
    tradeNo: paypalCaptureId,
    ecpayNotifyData: capturePayload,
    paidAt: /* @__PURE__ */ new Date()
  }).where(
    and5(
      eq7(orders.merchantTradeNo, merchantTradeNo),
      eq7(orders.paymentMethod, "paypal"),
      eq7(orders.paymentStatus, "pending")
    )
  );
  return result;
}
async function updateOrderTransferLastFive(merchantTradeNo, lastFive) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(orders).set({
    transferLastFive: lastFive,
    paymentStatus: "transfer_pending"
  }).where(eq7(orders.merchantTradeNo, merchantTradeNo));
}
async function confirmTransferPayment(merchantTradeNo) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [order] = await db.select({ isCustomOrder: orders.isCustomOrder }).from(orders).where(eq7(orders.merchantTradeNo, merchantTradeNo)).limit(1);
  await db.update(orders).set({
    paymentStatus: "confirmed",
    orderStatus: order?.isCustomOrder ? "deposit_paid" : "paid",
    confirmedAt: /* @__PURE__ */ new Date(),
    paidAt: /* @__PURE__ */ new Date()
  }).where(eq7(orders.merchantTradeNo, merchantTradeNo));
}
async function updateOrderStatus(merchantTradeNo, orderStatus) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(orders).set({ orderStatus }).where(eq7(orders.merchantTradeNo, merchantTradeNo));
}
function buildOrderStatusWhere(statusFilter) {
  if (!statusFilter || statusFilter === "all") return void 0;
  return statusFilter === "transfer_pending" ? eq7(orders.paymentStatus, "transfer_pending") : eq7(orders.orderStatus, statusFilter);
}
async function getAdminOrderSummaries(limit = 100, offset = 0, statusFilter) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const statusWhere = visibleOrdersOnlyWhere(buildOrderStatusWhere(statusFilter));
  const summarySelect = {
    id: orders.id,
    merchantTradeNo: orders.merchantTradeNo,
    paymentStatus: orders.paymentStatus,
    paymentMethod: orders.paymentMethod,
    shippingMethod: orders.shippingMethod,
    orderStatus: orders.orderStatus,
    isPreorder: orders.isPreorder,
    isCustomOrder: orders.isCustomOrder,
    freeShippingOverride: orders.freeShippingOverride,
    totalAmount: orders.totalAmount,
    buyerName: orders.buyerName,
    createdAt: orders.createdAt
  };
  const orderRows = statusWhere ? await db.select(summarySelect).from(orders).where(statusWhere).orderBy(desc5(orders.createdAt)).limit(limit).offset(offset) : await db.select(summarySelect).from(orders).orderBy(desc5(orders.createdAt)).limit(limit).offset(offset);
  const [totalRow] = statusWhere ? await db.select({ count: sql5`CAST(COUNT(*) AS SIGNED)` }).from(orders).where(statusWhere) : await db.select({ count: sql5`CAST(COUNT(*) AS SIGNED)` }).from(orders);
  const total = Number(totalRow?.count ?? 0);
  const page = Math.floor(offset / limit) + 1;
  if (orderRows.length === 0) {
    return {
      items: [],
      total,
      page,
      pageSize: limit
    };
  }
  const orderIds = orderRows.map((order) => order.id);
  const mergeInfoByOrderId = await getMergeInfoForOrderIds(db, orderIds);
  const mainMergeInfos = orderIds.map((orderId) => mergeInfoByOrderId.get(orderId)).filter((info) => Boolean(info && info.role === "main"));
  const groupIds = Array.from(new Set(mainMergeInfos.map((info) => info.groupId)));
  const mergeMemberRows = groupIds.length > 0 ? await db.select({
    groupId: orderMergeMembers.groupId,
    orderId: orderMergeMembers.orderId,
    mainOrderId: orderMergeGroups.mainOrderId,
    totalAmount: orders.totalAmount
  }).from(orderMergeMembers).leftJoin(orderMergeGroups, eq7(orderMergeMembers.groupId, orderMergeGroups.id)).leftJoin(orders, eq7(orderMergeMembers.orderId, orders.id)).where(inArray2(orderMergeMembers.groupId, groupIds)) : [];
  const combinedOrderIdsByMainId = /* @__PURE__ */ new Map();
  const extraTotalByMainId = /* @__PURE__ */ new Map();
  for (const row of mergeMemberRows) {
    if (!row.mainOrderId) continue;
    const current = combinedOrderIdsByMainId.get(row.mainOrderId) ?? [];
    current.push(row.orderId);
    combinedOrderIdsByMainId.set(row.mainOrderId, current);
    if (row.orderId !== row.mainOrderId) {
      extraTotalByMainId.set(row.mainOrderId, (extraTotalByMainId.get(row.mainOrderId) ?? 0) + Number(row.totalAmount ?? 0));
    }
  }
  const allSummaryOrderIds = Array.from(/* @__PURE__ */ new Set([
    ...orderIds,
    ...Array.from(combinedOrderIdsByMainId.values()).flat()
  ]));
  const itemCounts = await db.select({
    orderId: orderItems.orderId,
    itemCount: sql5`CAST(COUNT(*) AS SIGNED)`
  }).from(orderItems).where(inArray2(orderItems.orderId, allSummaryOrderIds)).groupBy(orderItems.orderId);
  const logisticsRows = await db.select({ orderId: logisticsOrders.orderId }).from(logisticsOrders).where(inArray2(logisticsOrders.orderId, orderIds));
  const thumbnailRows = await db.select({
    id: orderItems.id,
    orderId: orderItems.orderId,
    productName: orderItems.productName,
    productImage: sql5`COALESCE(NULLIF(${orderItems.productImage}, ''), ${dbProducts.image})`
  }).from(orderItems).leftJoin(dbProducts, eq7(orderItems.productId, dbProducts.id)).where(inArray2(orderItems.orderId, allSummaryOrderIds)).orderBy(orderItems.id);
  const itemCountByOrderId = new Map(itemCounts.map((row) => [row.orderId, Number(row.itemCount ?? 0)]));
  const logisticsOrderIds = new Set(logisticsRows.map((row) => row.orderId));
  const thumbnailsByOrderId = /* @__PURE__ */ new Map();
  for (const row of thumbnailRows) {
    const image = row.productImage?.trim();
    if (!image || image.startsWith("data:")) continue;
    const current = thumbnailsByOrderId.get(row.orderId) ?? [];
    if (current.length >= 3) continue;
    current.push({
      id: row.id,
      productName: row.productName,
      productImage: normalizeProductImageUrl(image)
    });
    thumbnailsByOrderId.set(row.orderId, current);
  }
  return {
    items: orderRows.map((order) => {
      const combinedOrderIds = combinedOrderIdsByMainId.get(order.id) ?? [order.id];
      const itemCount = combinedOrderIds.reduce((sum, orderId) => sum + (itemCountByOrderId.get(orderId) ?? 0), 0);
      const productThumbnails = combinedOrderIds.flatMap((orderId) => thumbnailsByOrderId.get(orderId) ?? []).slice(0, 3);
      return {
        ...order,
        totalAmount: order.totalAmount + (extraTotalByMainId.get(order.id) ?? 0),
        itemCount,
        hasLogistics: logisticsOrderIds.has(order.id),
        mergeInfo: mergeInfoByOrderId.get(order.id) ?? null,
        productThumbnails
      };
    }),
    total,
    page,
    pageSize: limit
  };
}
async function getAdminOrderDetail(orderId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await ensureBalancePaymentColumns(db);
  await ensureBalancePaymentAttemptTable(db);
  const [order] = await db.select().from(orders).where(eq7(orders.id, orderId)).limit(1);
  if (!order) return null;
  const mergeInfo = await getMergeDetailForOrder(db, order.id);
  const itemOrderIds = mergeInfo?.role === "main" ? mergeInfo.members.map((member) => member.orderId) : [order.id];
  const displayTotalAmount = mergeInfo?.role === "main" ? mergeInfo.members.reduce((sum, member) => sum + member.totalAmount, 0) : order.totalAmount;
  const [items, logistics, balancePayment] = await Promise.all([
    db.select({
      id: orderItems.id,
      orderId: orderItems.orderId,
      productId: orderItems.productId,
      productName: orderItems.productName,
      productImage: sql5`COALESCE(NULLIF(${orderItems.productImage}, ''), ${dbProducts.image})`,
      purchaseOptionId: orderItems.purchaseOptionId,
      configurationSnapshot: orderItems.configurationSnapshot,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
      subtotal: orderItems.subtotal,
      isPreorder: orderItems.isPreorder
    }).from(orderItems).leftJoin(dbProducts, eq7(orderItems.productId, dbProducts.id)).where(inArray2(orderItems.orderId, itemOrderIds)),
    db.select().from(logisticsOrders).where(eq7(logisticsOrders.orderId, order.id)).limit(1),
    db.select(balancePaymentLegacySelect).from(orderBalancePayments).where(eq7(orderBalancePayments.orderId, order.id)).limit(1)
  ]);
  const balanceAttempts = balancePayment[0] ? await db.select({
    merchantTradeNo: orderBalancePaymentAttempts.merchantTradeNo,
    totalAmount: orderBalancePaymentAttempts.totalAmount,
    paymentStatus: orderBalancePaymentAttempts.paymentStatus,
    tradeNo: orderBalancePaymentAttempts.tradeNo,
    ecpayNotifyData: orderBalancePaymentAttempts.ecpayNotifyData,
    paidAt: orderBalancePaymentAttempts.paidAt,
    createdAt: orderBalancePaymentAttempts.createdAt
  }).from(orderBalancePaymentAttempts).where(eq7(orderBalancePaymentAttempts.balancePaymentId, balancePayment[0].id)).orderBy(desc5(orderBalancePaymentAttempts.id)).limit(10) : [];
  const adminLogisticsEvents = logistics[0] ? await db.select({
    id: logisticsEvents.id,
    eventKind: logisticsEvents.eventKind,
    normalizedStatus: logisticsEvents.normalizedStatus,
    rawCode: logisticsEvents.rawCode,
    message: logisticsEvents.message,
    occurredAt: logisticsEvents.occurredAt,
    receivedAt: logisticsEvents.receivedAt
  }).from(logisticsEvents).where(eq7(logisticsEvents.logisticsOrderId, logistics[0].id)).orderBy(asc(logisticsEvents.occurredAt), asc(logisticsEvents.id)) : [];
  return {
    ...order,
    totalAmount: displayTotalAmount,
    items: items.map((item) => ({
      ...item,
      productImage: item.productImage ? normalizeProductImageUrl(item.productImage) : item.productImage
    })),
    logistics: logistics[0] ? { ...logistics[0], events: adminLogisticsEvents } : null,
    balancePayment: hydrateBalancePayment(balancePayment[0]),
    balancePaymentAttempts: balanceAttempts,
    mergeInfo
  };
}
async function getOrderStats() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const now = /* @__PURE__ */ new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const [row] = await db.select({
    totalOrders: sql5`CAST(COUNT(*) AS SIGNED)`,
    pendingPayment: sql5`CAST(COALESCE(SUM(CASE WHEN ${orders.orderStatus} = 'pending_payment' THEN 1 ELSE 0 END), 0) AS SIGNED)`,
    depositPaid: sql5`CAST(COALESCE(SUM(CASE WHEN ${orders.orderStatus} = 'deposit_paid' THEN 1 ELSE 0 END), 0) AS SIGNED)`,
    transferPending: sql5`CAST(COALESCE(SUM(CASE WHEN ${orders.paymentStatus} = 'transfer_pending' THEN 1 ELSE 0 END), 0) AS SIGNED)`,
    toShip: sql5`CAST(COALESCE(SUM(CASE WHEN ${orders.orderStatus} IN ('paid', 'processing') THEN 1 ELSE 0 END), 0) AS SIGNED)`,
    paid: sql5`CAST(COALESCE(SUM(CASE WHEN ${orders.orderStatus} = 'paid' THEN 1 ELSE 0 END), 0) AS SIGNED)`,
    shipped: sql5`CAST(COALESCE(SUM(CASE WHEN ${orders.orderStatus} = 'shipped' THEN 1 ELSE 0 END), 0) AS SIGNED)`,
    completed: sql5`CAST(COALESCE(SUM(CASE WHEN ${orders.orderStatus} IN ('picked_up', 'completed') THEN 1 ELSE 0 END), 0) AS SIGNED)`,
    totalRevenue: sql5`CAST(COALESCE(SUM(CASE WHEN ${orders.orderStatus} IN ('paid', 'processing', 'shipped', 'arrived', 'picked_up', 'completed') THEN ${orders.totalAmount} ELSE 0 END), 0) AS SIGNED)`,
    monthRevenue: sql5`CAST(COALESCE(SUM(CASE WHEN ${orders.orderStatus} IN ('paid', 'processing', 'shipped', 'arrived', 'picked_up', 'completed') AND ${orders.paidAt} IS NOT NULL AND ${orders.paidAt} >= ${monthStart} AND ${orders.paidAt} < ${nextMonthStart} THEN ${orders.totalAmount} ELSE 0 END), 0) AS SIGNED)`,
    monthOrders: sql5`CAST(COALESCE(SUM(CASE WHEN ${orders.orderStatus} IN ('paid', 'processing', 'shipped', 'arrived', 'picked_up', 'completed') AND ${orders.paidAt} IS NOT NULL AND ${orders.paidAt} >= ${monthStart} AND ${orders.paidAt} < ${nextMonthStart} THEN 1 ELSE 0 END), 0) AS SIGNED)`
  }).from(orders).where(visibleOrdersOnlyWhere());
  const n = (v) => Number(v ?? 0);
  return {
    totalOrders: n(row?.totalOrders),
    pendingPayment: n(row?.pendingPayment),
    depositPaid: n(row?.depositPaid),
    transferPending: n(row?.transferPending),
    toShip: n(row?.toShip),
    paid: n(row?.paid),
    shipped: n(row?.shipped),
    completed: n(row?.completed),
    totalRevenue: n(row?.totalRevenue),
    monthRevenue: n(row?.monthRevenue),
    monthOrders: n(row?.monthOrders)
  };
}
async function getMonthlyRevenue(months = 6) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = [];
  const now = /* @__PURE__ */ new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const monthOrders = await db.select().from(orders).where(
      visibleOrdersOnlyWhere(
        and5(
          gte2(orders.paidAt, start),
          sql5`${orders.paidAt} < ${end}`
        )
      )
    );
    const paidOrders = monthOrders.filter(
      (o) => ["paid", "processing", "shipped", "arrived", "picked_up", "completed"].includes(o.orderStatus)
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
  const salesTotals = await getProductSalesTotals();
  return salesTotals.slice(0, limit);
}
async function getProductSalesTotals() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const paidOrders = await db.select({ id: orders.id }).from(orders).where(
    sql5`${orders.orderStatus} IN ('paid', 'processing', 'shipped', 'arrived', 'picked_up', 'completed')`
  );
  if (paidOrders.length === 0) return [];
  const orderIds = paidOrders.map((o) => o.id);
  const allItems = await db.select().from(orderItems).where(sql5`${orderItems.orderId} IN (${sql5.join(orderIds.map((id) => sql5`${id}`), sql5`, `)})`);
  const productMap = /* @__PURE__ */ new Map();
  for (const item of allItems) {
    if (NON_PRODUCT_ORDER_ITEM_IDS.includes(item.productId)) continue;
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
  return Array.from(productMap.values()).sort((a, b) => b.totalQty - a.totalQty);
}
async function createLogisticsOrder(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async (tx) => {
    await tx.insert(logisticsOrders).values(data);
    const [created] = await tx.select().from(logisticsOrders).where(eq7(logisticsOrders.logisticsMerchantTradeNo, data.logisticsMerchantTradeNo)).limit(1);
    if (!created) throw new Error("Failed to create logistics order");
    const occurredAt = created.createdAt ?? /* @__PURE__ */ new Date();
    await tx.insert(logisticsEvents).values({
      logisticsOrderId: created.id,
      orderId: created.orderId,
      eventKey: createLogisticsEventKey({
        logisticsMerchantTradeNo: created.logisticsMerchantTradeNo,
        eventKind: "synthetic",
        statusOrCode: "created",
        occurredAt
      }),
      eventKind: "synthetic",
      normalizedStatus: "created",
      rawCode: null,
      message: "\u7269\u6D41\u55AE\u5DF2\u5EFA\u7ACB",
      occurredAt,
      rawData: null
    });
    return created;
  });
}
function createLogisticsEventKey(input) {
  return crypto.createHash("sha256").update([
    input.logisticsMerchantTradeNo,
    input.eventKind,
    input.statusOrCode,
    input.occurredAt.toISOString()
  ].join("|")).digest("hex");
}
function generateBalanceMerchantTradeNo() {
  return `CB${crypto.randomBytes(9).toString("hex").toUpperCase()}`;
}
async function getCustomQuoteOrders(db, orderId) {
  const [membership] = await db.select().from(orderMergeMembers).where(eq7(orderMergeMembers.orderId, orderId)).limit(1);
  const members = membership ? await db.select().from(orderMergeMembers).where(eq7(orderMergeMembers.groupId, membership.groupId)) : [];
  const ids = members.length ? members.map((member) => member.orderId) : [orderId];
  const rows = await db.select().from(orders).where(inArray2(orders.id, ids));
  return rows.filter((row) => row.isCustomOrder);
}
async function getCustomQuoteSummary(db, orderId) {
  const customRows = await getCustomQuoteOrders(db, orderId);
  if (!customRows.some(usesPromotionFlow)) return null;
  if (customRows.some((row) => !usesPromotionFlow(row)))
    throw new Error("\u65B0\u820A\u6D41\u7A0B\u8A02\u55AE\u4E0D\u53EF\u5408\u4F75\u5831\u50F9");
  if (customRows.some((row) => !row.customQuote))
    throw new Error("\u8ACB\u5148\u9010\u55AE\u8A2D\u5B9A\u6240\u6709\u5BA2\u88FD\u8A02\u55AE\u7684\u6700\u7D42\u7E3D\u50F9\uFF0C\u518D\u7522\u751F\u5408\u4F75\u5C3E\u6B3E");
  return customRows.reduce(
    (sum, row) => ({
      finalPrice: sum.finalPrice + row.customQuote.finalPrice,
      depositPaid: sum.depositPaid + row.customQuote.depositPaid,
      paidRegularSubtotal: (sum.paidRegularSubtotal ?? 0) + (row.customQuote.paidRegularSubtotal ?? 0),
      discount: sum.discount + row.customQuote.discount
    }),
    { finalPrice: 0, depositPaid: 0, paidRegularSubtotal: 0, discount: 0 }
  );
}
async function saveCustomQuote(tx, orderId, input) {
  const [order] = await tx.select().from(orders).where(eq7(orders.id, orderId)).limit(1);
  if (!order || !usesPromotionFlow(order))
    throw new Error("\u820A\u8A02\u55AE\u8ACB\u6CBF\u7528\u539F\u672C\u7684\u5546\u54C1\u5C3E\u6B3E\u8F38\u5165\u6D41\u7A0B");
  if (!order.isCustomOrder || order.orderStatus !== "deposit_paid")
    throw new Error("\u50C5\u80FD\u8A2D\u5B9A\u5DF2\u4ED8\u8A02\u91D1\u7684\u5BA2\u88FD\u8A02\u55AE\u7E3D\u50F9");
  const items = await tx.select().from(orderItems).where(eq7(orderItems.orderId, orderId));
  const depositPaid = items.filter((item) => CUSTOM_PRODUCT_IDS.includes(item.productId)).reduce((sum, item) => sum + item.subtotal, 0);
  const finalPrice = "remainingAmount" in input ? depositPaid + input.remainingAmount : input.finalPrice;
  if (!Number.isSafeInteger(finalPrice) || finalPrice > 1e7)
    throw new Error("\u5BA2\u88FD\u5546\u54C1\u91D1\u984D\u904E\u5927");
  const paidRegularSubtotal = items.filter(
    (item) => !CUSTOM_PRODUCT_IDS.includes(item.productId) && !NON_PRODUCT_ORDER_ITEM_IDS.includes(item.productId)
  ).reduce((sum, item) => sum + item.subtotal, 0);
  if (finalPrice < depositPaid)
    throw new Error("\u6700\u7D42\u7E3D\u50F9\u4E0D\u53EF\u4F4E\u65BC\u5DF2\u4ED8\u8A02\u91D1\uFF1B\u5982\u9700\u9000\u6B3E\u8ACB\u53E6\u884C\u8655\u7406");
  const quote = quoteCustomPromotion(
    finalPrice,
    depositPaid,
    order.promotion?.rule,
    paidRegularSubtotal
  );
  await tx.update(orders).set({
    customQuote: quote,
    ...order.promotion ? {
      promotion: {
        ...order.promotion,
        discount: quote.discount,
        quote
      }
    } : {}
  }).where(eq7(orders.id, orderId));
  await tx.delete(orderItems).where(
    and5(
      eq7(orderItems.orderId, orderId),
      eq7(orderItems.productId, PROMOTION_DISCOUNT_PRODUCT_ID)
    )
  );
  if (quote.discount > 0)
    await tx.insert(orderItems).values({
      orderId,
      productId: PROMOTION_DISCOUNT_PRODUCT_ID,
      productName: `\u6D3B\u52D5\u6298\u62B5\uFF08\u5C3E\u6B3E\uFF09- ${order.promotion.rule.name}`,
      quantity: 1,
      unitPrice: -quote.discount,
      subtotal: -quote.discount,
      isPreorder: false
    });
  return quote;
}
async function setCustomFinalPrice(orderId, finalPrice) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [targetOrder] = await db.select().from(orders).where(eq7(orders.id, orderId)).limit(1);
  if (!targetOrder || !usesPromotionFlow(targetOrder))
    throw new Error("\u820A\u8A02\u55AE\u8ACB\u6CBF\u7528\u539F\u672C\u7684\u5546\u54C1\u5C3E\u6B3E\u8F38\u5165\u6D41\u7A0B");
  const context = await getMergeDetailForOrder(db, orderId);
  const mainOrderId = context?.mainOrderId ?? orderId;
  return db.transaction(async (tx) => {
    await tx.execute(
      sql5`SELECT \`id\` FROM \`orders\` WHERE \`id\` = ${mainOrderId} FOR UPDATE`
    );
    const [balance] = await tx.select().from(orderBalancePayments).where(eq7(orderBalancePayments.orderId, mainOrderId)).limit(1);
    if (balance) {
      await tx.execute(
        sql5`SELECT \`id\` FROM \`orderBalancePayments\` WHERE \`id\` = ${balance.id} FOR UPDATE`
      );
      const attempts = await tx.select().from(orderBalancePaymentAttempts).where(eq7(orderBalancePaymentAttempts.balancePaymentId, balance.id));
      if (["paid", "transfer_pending"].includes(balance.paymentStatus) || balance.ecpayNotifyData?.source === "balance_atm_checkout" || attempts.some(
        (attempt) => ["pending", "superseded", "paid"].includes(attempt.paymentStatus)
      ))
        throw new Error("\u5C3E\u6B3E\u5DF2\u9032\u5165\u4ED8\u6B3E\u6D41\u7A0B\uFF0C\u8ACB\u52FF\u4FEE\u6539\u5831\u50F9");
      await tx.update(orderBalancePayments).set({ paymentStatus: "cancelled" }).where(eq7(orderBalancePayments.id, balance.id));
    }
    const [reservedCoupon] = await tx.select().from(memberCoupons).where(
      and5(
        eq7(memberCoupons.orderId, mainOrderId),
        eq7(memberCoupons.status, "reserved")
      )
    ).limit(1);
    if (reservedCoupon) throw new Error("\u5C3E\u6B3E\u5DF2\u4FDD\u7559\u512A\u60E0\u5238\uFF0C\u8ACB\u52FF\u4FEE\u6539\u5831\u50F9");
    return saveCustomQuote(tx, orderId, { finalPrice });
  });
}
async function legacyCreateOrReplaceBalancePayment(opts) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await ensureBalancePaymentColumns(db);
  const [order] = await db.select().from(orders).where(eq7(orders.id, opts.orderId)).limit(1);
  if (!order) throw new Error("Order not found");
  const [existing] = await db.select(balancePaymentLegacySelect).from(orderBalancePayments).where(eq7(orderBalancePayments.orderId, opts.orderId)).limit(1);
  if (existing?.paymentStatus === "paid") {
    throw new Error("Balance already paid");
  }
  const linkMerchantTradeNo = existing?.merchantTradeNo ?? generateBalanceMerchantTradeNo();
  const previousBalanceTotal = existing?.totalAmount ?? existing?.amount ?? 0;
  const nextTotalAmount = Math.max(
    1,
    order.totalAmount - previousBalanceTotal + opts.amount
  );
  await db.update(orders).set({ totalAmount: nextTotalAmount }).where(eq7(orders.id, opts.orderId));
  if (existing) {
    await db.update(orderBalancePayments).set({
      amount: opts.amount,
      shippingFee: 0,
      paymentFee: 0,
      totalAmount: opts.amount,
      paymentStatus: "pending",
      tradeNo: null,
      ecpayNotifyData: null,
      paidAt: null
    }).where(eq7(orderBalancePayments.id, existing.id));
    const [updated] = await db.select(balancePaymentLegacySelect).from(orderBalancePayments).where(eq7(orderBalancePayments.id, existing.id)).limit(1);
    return hydrateBalancePayment(updated);
  }
  const insertData = {
    orderId: opts.orderId,
    merchantTradeNo: linkMerchantTradeNo,
    amount: opts.amount,
    shippingFee: 0,
    paymentFee: 0,
    totalAmount: opts.amount,
    paymentStatus: "pending"
  };
  await db.insert(orderBalancePayments).values(insertData);
  const [created] = await db.select(balancePaymentLegacySelect).from(orderBalancePayments).where(eq7(orderBalancePayments.merchantTradeNo, linkMerchantTradeNo)).limit(1);
  return hydrateBalancePayment(created);
}
async function createOrReplaceBalancePayment(opts) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [targetOrder] = await db.select().from(orders).where(eq7(orders.id, opts.orderId)).limit(1);
  if (!targetOrder) throw new Error("Order not found");
  if (!usesPromotionFlow(targetOrder)) {
    if (opts.balances) throw new Error("\u820A\u8A02\u55AE\u8ACB\u6CBF\u7528\u539F\u672C\u5408\u4F75\u5C3E\u6B3E\u8F38\u5165\u65B9\u5F0F");
    if (opts.amount == null) throw new Error("\u820A\u8A02\u55AE\u8ACB\u8F38\u5165\u5546\u54C1\u5C3E\u6B3E\u91D1\u984D");
    return legacyCreateOrReplaceBalancePayment({
      orderId: opts.orderId,
      amount: opts.amount
    });
  }
  await ensureBalancePaymentColumns(db);
  await ensureBalancePaymentAttemptTable(db);
  return db.transaction(async (tx) => {
    await tx.execute(
      sql5`SELECT \`id\` FROM \`orders\` WHERE \`id\` = ${opts.orderId} FOR UPDATE`
    );
    const [order] = await tx.select().from(orders).where(eq7(orders.id, opts.orderId)).limit(1);
    if (!order?.isCustomOrder || order.orderStatus !== "deposit_paid")
      throw new Error("\u50C5\u80FD\u70BA\u5DF2\u4ED8\u8A02\u91D1\u7684\u5BA2\u88FD\u8A02\u55AE\u7522\u751F\u5C3E\u6B3E");
    const [reservedCoupon] = await tx.select().from(memberCoupons).where(
      and5(
        eq7(memberCoupons.orderId, opts.orderId),
        eq7(memberCoupons.status, "reserved")
      )
    ).limit(1);
    if (reservedCoupon) throw new Error("\u5C3E\u6B3E\u5DF2\u4FDD\u7559\u512A\u60E0\u5238\uFF0C\u8ACB\u6CBF\u7528\u65E2\u6709\u4ED8\u6B3E\u9023\u7D50");
    const [existing] = await tx.select(balancePaymentLegacySelect).from(orderBalancePayments).where(eq7(orderBalancePayments.orderId, opts.orderId)).limit(1);
    if (existing) {
      await tx.execute(
        sql5`SELECT \`id\` FROM \`orderBalancePayments\` WHERE \`id\` = ${existing.id} FOR UPDATE`
      );
      const attempts = await tx.select().from(orderBalancePaymentAttempts).where(eq7(orderBalancePaymentAttempts.balancePaymentId, existing.id));
      if (["paid", "transfer_pending"].includes(existing.paymentStatus) || existing.ecpayNotifyData?.source === "balance_atm_checkout" || attempts.some(
        (attempt) => ["pending", "superseded", "paid"].includes(attempt.paymentStatus)
      ))
        throw new Error("\u5C3E\u6B3E\u5DF2\u9032\u5165\u4ED8\u6B3E\u6D41\u7A0B\uFF0C\u4E0D\u53EF\u91CD\u8A2D\u91D1\u984D");
    }
    if (opts.amount != null || opts.balances) {
      if (opts.amount != null && opts.balances)
        throw new Error("\u8ACB\u9078\u64C7\u55AE\u7B46\u6216\u9010\u55AE\u5C3E\u6B3E\u8F38\u5165\u65B9\u5F0F");
      const customOrders = await getCustomQuoteOrders(tx, opts.orderId);
      const entries = opts.balances ?? [
        { orderId: opts.orderId, amount: opts.amount }
      ];
      const expectedIds = new Set(customOrders.map((row) => row.id));
      if (entries.length !== expectedIds.size || new Set(entries.map((entry) => entry.orderId)).size !== entries.length || entries.some((entry) => !expectedIds.has(entry.orderId)))
        throw new Error("\u5408\u4F75\u8A02\u55AE\u8ACB\u9010\u55AE\u8F38\u5165\u5C1A\u9700\u88DC\u4ED8\u7684\u5BA2\u88FD\u5C3E\u6B3E");
      for (const entry of entries) {
        if (!Number.isSafeInteger(entry.amount) || entry.amount < 0 || entry.amount > 1e7)
          throw new Error("\u8ACB\u8F38\u5165\u6709\u6548\u7684\u5BA2\u88FD\u5C3E\u6B3E\u91D1\u984D");
        await saveCustomQuote(tx, entry.orderId, {
          remainingAmount: entry.amount
        });
      }
    }
    const quote = await getCustomQuoteSummary(tx, opts.orderId);
    if (!quote) throw new Error("\u8ACB\u8F38\u5165\u5C1A\u9700\u88DC\u4ED8\u7684\u5BA2\u88FD\u5C3E\u6B3E");
    const amount = quote.finalPrice - quote.depositPaid;
    const totalAmount = Math.max(0, amount - quote.discount);
    const merchantTradeNo = existing?.merchantTradeNo ?? generateBalanceMerchantTradeNo();
    const values = {
      amount,
      shippingFee: 0,
      paymentFee: 0,
      totalAmount,
      paymentStatus: "pending",
      tradeNo: null,
      ecpayNotifyData: null,
      paidAt: null
    };
    if (existing)
      await tx.update(orderBalancePayments).set(values).where(eq7(orderBalancePayments.id, existing.id));
    else
      await tx.insert(orderBalancePayments).values({ orderId: opts.orderId, merchantTradeNo, ...values });
    await tx.update(orders).set({
      totalAmount: order.totalAmount - (existing?.totalAmount ?? 0) + totalAmount
    }).where(eq7(orders.id, opts.orderId));
    const [result] = await tx.select(balancePaymentLegacySelect).from(orderBalancePayments).where(eq7(orderBalancePayments.merchantTradeNo, merchantTradeNo)).limit(1);
    return hydrateBalancePayment(result);
  });
}
async function createBalancePaymentAttempt(opts) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await ensureBalancePaymentAttemptTable(db);
  return db.transaction(async (tx) => {
    await tx.execute(
      sql5`SELECT \`id\` FROM \`orderBalancePayments\` WHERE \`id\` = ${opts.balancePaymentId} FOR UPDATE`
    );
    const [balance] = await tx.select(balancePaymentLegacySelect).from(orderBalancePayments).where(eq7(orderBalancePayments.id, opts.balancePaymentId)).limit(1);
    if (!balance) throw new Error("Balance payment not found");
    if (balance.paymentStatus === "paid" || balance.paymentStatus === "cancelled" || balance.paymentStatus === "transfer_pending") {
      throw new Error("Inactive balance payment cannot be retried");
    }
    if (opts.checkoutData.promotionFlowVersion === 1) {
      if (balance.amount !== opts.amount)
        throw new Error("\u5C3E\u6B3E\u5831\u50F9\u5DF2\u66F4\u65B0\uFF0C\u8ACB\u91CD\u65B0\u6574\u7406");
      const [reservedCoupon] = await tx.select().from(memberCoupons).where(
        and5(
          eq7(memberCoupons.orderId, balance.orderId),
          eq7(memberCoupons.status, "reserved")
        )
      ).limit(1);
      if ((reservedCoupon?.id ?? null) !== (opts.checkoutData.coupon?.id ?? null))
        throw new Error("\u512A\u60E0\u5238\u5DF2\u66F4\u65B0\uFF0C\u8ACB\u91CD\u65B0\u6574\u7406\u5C3E\u6B3E\u9801");
      const [parent] = await tx.select().from(orders).where(eq7(orders.id, balance.orderId)).limit(1);
      if (!parent || parent.orderStatus === "cancelled")
        throw new Error("\u8A02\u55AE\u5DF2\u53D6\u6D88");
      if (opts.expectedQuote !== void 0 && JSON.stringify(await getCustomQuoteSummary(tx, balance.orderId)) !== JSON.stringify(opts.expectedQuote))
        throw new Error("\u5C3E\u6B3E\u5831\u50F9\u5DF2\u66F4\u65B0\uFF0C\u8ACB\u91CD\u65B0\u6574\u7406");
    }
    await tx.update(orderBalancePaymentAttempts).set({ paymentStatus: "superseded" }).where(
      and5(
        eq7(
          orderBalancePaymentAttempts.balancePaymentId,
          opts.balancePaymentId
        ),
        eq7(orderBalancePaymentAttempts.paymentStatus, "pending")
      )
    );
    const merchantTradeNo = generateBalanceMerchantTradeNo();
    await tx.insert(orderBalancePaymentAttempts).values({
      balancePaymentId: opts.balancePaymentId,
      merchantTradeNo,
      amount: opts.amount,
      shippingFee: opts.shippingFee,
      paymentFee: opts.paymentFee,
      totalAmount: opts.totalAmount,
      paymentMethod: "credit",
      paymentStatus: "pending",
      checkoutData: opts.checkoutData
    });
    if (balance.paymentStatus === "failed") {
      await tx.update(orderBalancePayments).set({
        paymentStatus: "pending",
        tradeNo: null,
        ecpayNotifyData: null,
        paidAt: null
      }).where(
        and5(
          eq7(orderBalancePayments.id, balance.id),
          eq7(orderBalancePayments.paymentStatus, "failed")
        )
      );
    }
    return { merchantTradeNo };
  });
}
async function getBalancePaymentDetail(merchantTradeNo) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await ensureBalancePaymentColumns(db);
  await ensureBalancePaymentAttemptTable(db);
  const [row] = await db.select(balancePaymentLegacySelect).from(orderBalancePayments).where(eq7(orderBalancePayments.merchantTradeNo, merchantTradeNo)).limit(1);
  const balancePayment = hydrateBalancePayment(row);
  if (!balancePayment) return null;
  const [order] = await db.select().from(orders).where(eq7(orders.id, row.orderId)).limit(1);
  if (!order) return null;
  const orderMergeInfo = await getMergeDetailForOrder(db, order.id);
  if (usesPromotionFlow(order) && orderMergeInfo?.role === "member") return null;
  const [clearQuartzChipsItem] = await db.select().from(orderItems).where(and5(
    eq7(orderItems.orderId, row.orderId),
    eq7(orderItems.productId, CLEAR_QUARTZ_CHIPS_PRODUCT_ID)
  )).limit(1);
  const [couponItem] = usesPromotionFlow(order) ? await db.select().from(orderItems).where(and5(eq7(orderItems.orderId, row.orderId), eq7(orderItems.productId, COUPON_DISCOUNT_PRODUCT_ID))).limit(1) : [];
  const originalDomesticFreeShipping = await orderHasDomesticFreeShipping(db, order.id);
  const [latestAttempt] = await db.select({
    paymentStatus: orderBalancePaymentAttempts.paymentStatus,
    createdAt: orderBalancePaymentAttempts.createdAt
  }).from(orderBalancePaymentAttempts).where(eq7(orderBalancePaymentAttempts.balancePaymentId, balancePayment.id)).orderBy(desc5(orderBalancePaymentAttempts.id)).limit(1);
  return {
    ...balancePayment,
    quote: usesPromotionFlow(order) ? await getCustomQuoteSummary(db, order.id) : null,
    order,
    orderMergeInfo,
    promotionOrders: usesPromotionFlow(order) ? orderMergeInfo?.members.filter((member) => member.isCustomOrder).map((member) => ({ merchantTradeNo: member.merchantTradeNo, promotion: member.promotion, customQuote: member.customQuote })) ?? [] : [],
    clearQuartzChipsItem: clearQuartzChipsItem ?? null,
    couponItem: couponItem ?? null,
    originalDomesticFreeShipping,
    latestAttempt: latestAttempt ?? null
  };
}
async function updateBalancePaymentTransferCode(merchantTradeNo, lastFive, transferReceiptUrl) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await ensureBalancePaymentColumns(db);
  const [balance] = await db.select({ orderId: orderBalancePayments.orderId }).from(orderBalancePayments).where(eq7(orderBalancePayments.merchantTradeNo, merchantTradeNo)).limit(1);
  await db.update(orderBalancePayments).set({ transferLastFive: lastFive, transferReceiptUrl, paymentStatus: "transfer_pending" }).where(eq7(orderBalancePayments.merchantTradeNo, merchantTradeNo));
  if (balance) {
    await db.update(orders).set({ paymentStatus: "transfer_pending" }).where(eq7(orders.id, balance.orderId));
  }
}
async function legacyConfirmBalanceTransfer(merchantTradeNo, audit) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await ensureBalancePaymentColumns(db);
  const [balance] = await db.select(balancePaymentLegacySelect).from(orderBalancePayments).where(eq7(orderBalancePayments.merchantTradeNo, merchantTradeNo)).limit(1);
  if (!balance) throw new Error("Balance payment not found");
  if (balance.paymentStatus === "paid") return;
  if (balance.paymentStatus === "failed" || balance.paymentStatus === "cancelled") {
    throw new Error("Inactive balance payment cannot be confirmed");
  }
  const now = /* @__PURE__ */ new Date();
  const manualAudit = audit ? {
    source: "admin_manual_balance_confirmation",
    adminUserId: audit.adminUserId,
    note: audit.note?.trim() || null,
    confirmedAt: now.toISOString()
  } : balance.ecpayNotifyData;
  await db.update(orderBalancePayments).set({ paymentStatus: "paid", paidAt: now, ecpayNotifyData: manualAudit }).where(eq7(orderBalancePayments.id, balance.id));
  await db.update(orders).set({ orderStatus: "paid", paymentStatus: "confirmed", confirmedAt: now }).where(eq7(orders.id, balance.orderId));
}
async function confirmBalanceTransfer(merchantTradeNo, audit) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await ensureBalancePaymentColumns(db);
  const [reference] = await db.select({
    orderId: orderBalancePayments.orderId,
    id: orderBalancePayments.id
  }).from(orderBalancePayments).where(eq7(orderBalancePayments.merchantTradeNo, merchantTradeNo)).limit(1);
  if (!reference) throw new Error("Balance payment not found");
  const [targetOrder] = await db.select().from(orders).where(eq7(orders.id, reference.orderId)).limit(1);
  if (!targetOrder || !usesPromotionFlow(targetOrder)) return legacyConfirmBalanceTransfer(merchantTradeNo, audit);
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq7(orders.id, reference.orderId)).limit(1).for("update");
    const [balance] = await tx.select().from(orderBalancePayments).where(eq7(orderBalancePayments.id, reference.id)).limit(1).for("update");
    if (!order || order.orderStatus === "cancelled")
      throw new Error("\u8A02\u55AE\u5DF2\u53D6\u6D88\uFF0C\u4E0D\u53EF\u78BA\u8A8D\u6536\u6B3E");
    if (!balance) throw new Error("Balance payment not found");
    if (balance.paymentStatus === "paid") return;
    if (!["pending", "transfer_pending"].includes(balance.paymentStatus))
      throw new Error("Inactive balance payment cannot be confirmed");
    const now = /* @__PURE__ */ new Date();
    const manualAudit = audit ? {
      source: "admin_manual_balance_confirmation",
      adminUserId: audit.adminUserId,
      note: audit.note?.trim() || null,
      confirmedAt: now.toISOString()
    } : balance.ecpayNotifyData;
    await tx.update(orderBalancePayments).set({ paymentStatus: "paid", paidAt: now, ecpayNotifyData: manualAudit }).where(eq7(orderBalancePayments.id, balance.id));
    await tx.update(orders).set({
      orderStatus: "paid",
      paymentStatus: "confirmed",
      confirmedAt: now
    }).where(eq7(orders.id, balance.orderId));
    await tx.update(memberCoupons).set({ status: "used", usedAt: now }).where(
      and5(
        eq7(memberCoupons.orderId, order.id),
        eq7(memberCoupons.status, "reserved")
      )
    );
  });
}
async function settleZeroBalancePayment(orderId, audit) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await ensureBalancePaymentColumns(db);
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq7(orders.id, orderId)).limit(1);
    if (!order) throw new Error("Order not found");
    if (!order.isCustomOrder) throw new Error("Only custom orders can waive a balance");
    const [existing] = await tx.select({ id: orderBalancePayments.id }).from(orderBalancePayments).where(eq7(orderBalancePayments.orderId, orderId)).limit(1);
    if (existing) throw new Error("Balance payment already exists");
    const merchantTradeNo = `CZ${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`.slice(0, 20);
    const now = /* @__PURE__ */ new Date();
    const auditData = {
      source: "admin_zero_balance",
      adminUserId: audit.adminUserId,
      note: audit.note?.trim() || null,
      confirmedAt: now.toISOString()
    };
    await tx.insert(orderBalancePayments).values({
      orderId,
      merchantTradeNo,
      amount: 0,
      shippingFee: 0,
      paymentFee: 0,
      totalAmount: 0,
      paymentMethod: "atm",
      paymentStatus: "paid",
      tradeNo: "ADMIN_ZERO_BALANCE",
      ecpayNotifyData: auditData,
      paidAt: now
    });
    await tx.update(orders).set({ orderStatus: "paid", paymentStatus: "confirmed", confirmedAt: now }).where(eq7(orders.id, orderId));
    return { merchantTradeNo };
  });
}
function isCustomDepositProduct(items) {
  return items.some((item) => CUSTOM_PRODUCT_IDS.includes(item.baseProductId ?? item.id));
}
async function getOrdersForMember(opts) {
  const db = await getDb();
  if (!db) return [];
  const ownershipWhere = memberVisibleOrdersWhere(opts);
  if (!ownershipWhere) return [];
  const whereClause = visibleOrdersOnlyWhere(ownershipWhere);
  try {
    const memberOrders = await db.select().from(orders).where(whereClause).orderBy(desc5(orders.createdAt)).limit(100);
    return attachItemsAndLogisticsForOrders(db, memberOrders);
  } catch (error) {
    if (!opts.email) {
      console.warn("[getOrdersForMember] no email available for legacy fallback:", error);
      return [];
    }
    console.warn("[getOrdersForMember] fallback to email-only legacy query:", error);
    const key = normalizeOrderEmail(opts.email);
    const legacyOrders = await db.select({
      id: orders.id,
      merchantTradeNo: orders.merchantTradeNo,
      tradeNo: orders.tradeNo,
      paymentStatus: orders.paymentStatus,
      paymentMethod: orders.paymentMethod,
      shippingMethod: orders.shippingMethod,
      orderStatus: orders.orderStatus,
      isPreorder: orders.isPreorder,
      totalAmount: orders.totalAmount,
      buyerName: orders.buyerName,
      buyerEmail: orders.buyerEmail,
      buyerPhone: orders.buyerPhone,
      cvsStoreId: orders.cvsStoreId,
      cvsStoreName: orders.cvsStoreName,
      cvsType: orders.cvsType,
      shippingAddress: orders.shippingAddress,
      transferLastFive: orders.transferLastFive,
      transferReceiptUrl: orders.transferReceiptUrl,
      ecpayNotifyData: orders.ecpayNotifyData,
      paidAt: orders.paidAt,
      confirmedAt: orders.confirmedAt,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt
    }).from(orders).where(visibleOrdersOnlyWhere(sql5`LOWER(TRIM(${orders.buyerEmail})) = ${key}`)).orderBy(desc5(orders.createdAt)).limit(100);
    const normalizedOrders = legacyOrders.map((order) => ({
      ...order,
      userId: null,
      deliveryRegion: "domestic",
      receiverZipCode: null
    }));
    return attachItemsAndLogisticsForOrders(db, normalizedOrders);
  }
}
var MAX_CUSTOM_NOTE_ATTEMPTS = 4;
async function saveCustomConsultationNote(input) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  let expected = input.expectedNote;
  for (let attempt = 1; attempt <= MAX_CUSTOM_NOTE_ATTEMPTS; attempt += 1) {
    const nextNote = upsertCustomConsultationNote(expected, {
      productId: input.productId,
      customerNote: input.customerNote,
      orderItemId: input.orderItemId,
      itemIndex: input.itemIndex
    });
    if (nextNote === expected) return true;
    const result = await db.update(orders).set({ customerNote: nextNote }).where(
      and5(
        eq7(orders.merchantTradeNo, input.merchantTradeNo),
        // NULL-safe 比對：沒填過的訂單 customerNote 是 NULL
        sql5`${orders.customerNote} <=> ${expected}`
      )
    );
    if (getAffectedRows2(result) > 0) return true;
    const [row] = await db.select({ customerNote: orders.customerNote }).from(orders).where(eq7(orders.merchantTradeNo, input.merchantTradeNo)).limit(1);
    if (!row) return false;
    expected = row.customerNote;
  }
  return false;
}

// server/routers/order.ts
import { z as z3 } from "zod";
import { TRPCError as TRPCError5 } from "@trpc/server";

// server/ecpay.ts
import crypto2 from "crypto";
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
  const hash2 = crypto2.createHash("sha256").update(encoded).digest("hex").toUpperCase();
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

// server/inventoryDb.ts
import { eq as eq8, lt as lt2, and as and6, sql as sql6 } from "drizzle-orm";
init_schema();
var ordersColumnsEnsured = false;
async function ensureOrdersColumns() {
  if (ordersColumnsEnsured) return;
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(sql6`ALTER TABLE \`orders\` ADD COLUMN \`inventoryDeducted\` BOOLEAN NOT NULL DEFAULT FALSE`);
  } catch {
  }
  try {
    await db.execute(sql6`ALTER TABLE \`orders\` ADD COLUMN \`transferReceiptUrl\` text NULL`);
  } catch {
  }
  try {
    await db.execute(sql6`ALTER TABLE \`orders\` MODIFY COLUMN \`transferReceiptUrl\` longtext NULL`);
  } catch {
  }
  try {
    await db.execute(sql6`ALTER TABLE \`orders\` ADD COLUMN \`freeShippingOverride\` BOOLEAN NOT NULL DEFAULT FALSE`);
  } catch {
  }
  try {
    await db.execute(sql6`ALTER TABLE \`orderItems\` ADD COLUMN \`purchaseOptionId\` varchar(64) NULL`);
  } catch {
  }
  ordersColumnsEnsured = true;
}
var NON_INVENTORY_PRODUCT_IDS = /* @__PURE__ */ new Set([...NON_PRODUCT_ORDER_ITEM_IDS, ...CUSTOM_PRODUCT_IDS]);
function shouldSkipInventory(productId) {
  return NON_INVENTORY_PRODUCT_IDS.has(productId);
}
async function isMonthlyLimitedProduct(productId) {
  const db = await getDb();
  if (!db) return false;
  const [product] = await db.select({ isMonthlyLimited: dbProducts.isMonthlyLimited }).from(dbProducts).where(eq8(dbProducts.id, productId)).limit(1);
  return product?.isMonthlyLimited === true;
}
async function adjustPurchaseOptionStock(productId, purchaseOptionId, quantityDelta) {
  if (!purchaseOptionId) return false;
  const db = await getDb();
  if (!db) return false;
  const [product] = await db.select({ purchaseOptions: dbProducts.purchaseOptions }).from(dbProducts).where(eq8(dbProducts.id, productId)).limit(1);
  const options = product?.purchaseOptions;
  const option = options?.find((candidate) => candidate.id === purchaseOptionId);
  if (!options || !option || option.stock == null) return false;
  if (option.stock === -1) return true;
  const nextOptions = options.map(
    (candidate) => candidate.id === purchaseOptionId ? { ...candidate, stock: Math.max(0, (candidate.stock ?? 0) + quantityDelta) } : candidate
  );
  await db.update(dbProducts).set({ purchaseOptions: nextOptions }).where(eq8(dbProducts.id, productId));
  return true;
}
async function getDefaultAllowPreorder(productId) {
  if (shouldSkipInventory(productId)) return false;
  const monthlyLimited = await isMonthlyLimitedProduct(productId);
  return !monthlyLimited;
}
async function getProductInventory(productId) {
  const db = await getDb();
  if (!db) return null;
  const [inv] = await db.select().from(productInventory).where(eq8(productInventory.productId, productId)).limit(1);
  return inv ?? null;
}
async function upsertProductInventory(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getProductInventory(data.productId);
  if (existing) {
    await db.update(productInventory).set({ stock: data.stock, allowPreorder: data.allowPreorder, preorderNote: data.preorderNote }).where(eq8(productInventory.productId, data.productId));
  } else {
    await db.insert(productInventory).values(data);
  }
}
async function deductInventoryAfterPayment(merchantTradeNo) {
  const db = await getDb();
  if (!db) return;
  await ensureOrdersColumns();
  const [order] = await db.select({ id: orders.id, inventoryDeducted: orders.inventoryDeducted }).from(orders).where(eq8(orders.merchantTradeNo, merchantTradeNo)).limit(1);
  if (!order || order.inventoryDeducted) return;
  const items = await db.select({ productId: orderItems.productId, purchaseOptionId: orderItems.purchaseOptionId, quantity: orderItems.quantity }).from(orderItems).where(eq8(orderItems.orderId, order.id));
  for (const item of items) {
    if (shouldSkipInventory(item.productId)) continue;
    const handledByPurchaseOption = await adjustPurchaseOptionStock(item.productId, item.purchaseOptionId, -item.quantity);
    if (handledByPurchaseOption) continue;
    await db.update(productInventory).set({ stock: sql6`GREATEST(0, ${productInventory.stock} - ${item.quantity})` }).where(
      and6(
        eq8(productInventory.productId, item.productId),
        sql6`${productInventory.stock} != -1`
      )
    );
  }
  await db.update(orders).set({ inventoryDeducted: true }).where(eq8(orders.merchantTradeNo, merchantTradeNo));
}
async function deductInventoryAfterBalancePayment(balanceMerchantTradeNo) {
  const db = await getDb();
  if (!db) return;
  await ensureOrdersColumns();
  const [balance] = await db.select({ orderId: orderBalancePayments.orderId }).from(orderBalancePayments).where(eq8(orderBalancePayments.merchantTradeNo, balanceMerchantTradeNo)).limit(1);
  if (!balance) return;
  const [order] = await db.select({ merchantTradeNo: orders.merchantTradeNo }).from(orders).where(eq8(orders.id, balance.orderId)).limit(1);
  if (!order) return;
  await deductInventoryAfterPayment(order.merchantTradeNo);
}
async function restoreInventoryOnCancel(merchantTradeNo) {
  const db = await getDb();
  if (!db) return;
  await ensureOrdersColumns();
  const [order] = await db.select({ id: orders.id, inventoryDeducted: orders.inventoryDeducted }).from(orders).where(eq8(orders.merchantTradeNo, merchantTradeNo)).limit(1);
  if (!order || !order.inventoryDeducted) return;
  const items = await db.select({ productId: orderItems.productId, purchaseOptionId: orderItems.purchaseOptionId, quantity: orderItems.quantity }).from(orderItems).where(eq8(orderItems.orderId, order.id));
  for (const item of items) {
    if (shouldSkipInventory(item.productId)) continue;
    const handledByPurchaseOption = await adjustPurchaseOptionStock(item.productId, item.purchaseOptionId, item.quantity);
    if (handledByPurchaseOption) continue;
    await db.update(productInventory).set({ stock: sql6`${productInventory.stock} + ${item.quantity}` }).where(
      and6(
        eq8(productInventory.productId, item.productId),
        sql6`${productInventory.stock} != -1`
      )
    );
  }
  await db.update(orders).set({ inventoryDeducted: false }).where(eq8(orders.merchantTradeNo, merchantTradeNo));
}
async function getProductAvailability(productId) {
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
      isMonthlyLimited: true
    };
  }
  return {
    available: true,
    stock: inv.stock,
    isPreorder: inv.stock <= 0,
    preorderNote: inv.preorderNote ?? null,
    isMonthlyLimited: monthlyLimited
  };
}

// server/ecpayLogistics.ts
import crypto3 from "crypto";
var EcpayLogisticsError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "EcpayLogisticsError";
  }
};
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
  return crypto3.createHash("md5").update(encoded).digest("hex").toUpperCase();
}
function formatECPayDate2(date) {
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
    MerchantTradeDate: formatECPayDate2(/* @__PURE__ */ new Date()),
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
function encryptLogisticsData(data) {
  const json2 = JSON.stringify(data);
  const encoded = encodeURIComponent(json2);
  const cipher = crypto3.createCipheriv(
    "aes-128-cbc",
    ECPAY_LOGISTICS_CONFIG.HashKey,
    ECPAY_LOGISTICS_CONFIG.HashIV
  );
  return Buffer.concat([cipher.update(encoded, "utf8"), cipher.final()]).toString("base64");
}
function logisticsSubTypeFromType(logisticsType, logisticsSubType) {
  if (logisticsSubType) return logisticsSubType;
  return logisticsType === "HOME" ? "TCAT" : "UNIMARTC2C";
}
async function fetchPrintTradeDocument(opts) {
  const timestamp2 = Math.floor(Date.now() / 1e3).toString();
  const data = {
    MerchantID: ECPAY_LOGISTICS_CONFIG.MerchantID,
    LogisticsID: [opts.allPayLogisticsId],
    LogisticsSubType: logisticsSubTypeFromType(opts.logisticsType, opts.logisticsSubType ?? void 0),
    PrintMode: opts.printMode ?? 1
  };
  const response = await fetch(ECPAY_LOGISTICS_CONFIG.PrintTradeDocumentURL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      MerchantID: ECPAY_LOGISTICS_CONFIG.MerchantID,
      PlatformID: "",
      RqHeader: { Timestamp: timestamp2 },
      Data: encryptLogisticsData(data)
    })
  });
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = response.headers.get("content-type") || "application/pdf";
  const normalizedContentType = contentType.toLowerCase();
  const isPrintableDocument = normalizedContentType.includes("pdf") || normalizedContentType.includes("html");
  if (!response.ok || !isPrintableDocument) {
    const body = buffer.toString("utf8").slice(0, 500);
    throw new EcpayLogisticsError(`\u7DA0\u754C\u8A17\u904B\u55AE\u7522\u751F\u5931\u6557\uFF1A${body || response.statusText}`);
  }
  return { buffer, contentType };
}

// server/routers/order.ts
init_schema();
import { and as and7, eq as eq11, inArray as inArray3, sql as sql7 } from "drizzle-orm";

// server/_core/paypal.ts
function getApiBase() {
  if (process.env.PAYPAL_SANDBOX === "1") {
    return "https://api-m.sandbox.paypal.com";
  }
  return "https://api-m.paypal.com";
}
async function getAccessToken() {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error("PAYPAL_CREDENTIALS_MISSING");
  }
  const auth = Buffer.from(`${id}:${secret}`).toString("base64");
  const res = await fetch(`${getApiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description ?? `PayPal token HTTP ${res.status}`);
  }
  return data.access_token;
}
async function createPayPalCheckoutOrder(params) {
  const token = await getAccessToken();
  const value = String(Math.max(1, Math.round(params.totalAmountTwd)));
  const res = await fetch(`${getApiBase()}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": params.merchantTradeNo
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: params.merchantTradeNo,
          custom_id: params.merchantTradeNo,
          description: "\u691BCrystal\u80FD\u91CF\u6C34\u6676",
          amount: {
            currency_code: "TWD",
            value
          }
        }
      ],
      application_context: {
        return_url: params.returnUrl,
        cancel_url: params.cancelUrl,
        shipping_preference: "NO_SHIPPING"
      }
    })
  });
  const data = await res.json();
  if (!res.ok || !data.id) {
    throw new Error(data.message ?? `PayPal create order HTTP ${res.status}`);
  }
  const approval = data.links?.find((l) => l.rel === "approve")?.href;
  if (!approval) {
    throw new Error("PayPal create order: missing approve link");
  }
  return { paypalOrderId: data.id, approvalUrl: approval };
}
async function verifyPayPalOrderBelongsToMerchant(paypalOrderId, merchantTradeNo) {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBase()}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message ?? `PayPal get order HTTP ${res.status}`);
  }
  const customId = data.purchase_units?.[0]?.custom_id;
  if (customId !== merchantTradeNo) {
    throw new Error("PAYPAL_ORDER_MISMATCH");
  }
}
async function capturePayPalOrder(paypalOrderId) {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBase()}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: "{}"
  });
  const raw = await res.json();
  if (!res.ok) {
    return {
      status: "failed",
      message: raw.message ?? `PayPal capture HTTP ${res.status}`,
      raw
    };
  }
  const capture = raw.purchase_units?.[0]?.payments?.captures?.[0];
  const captureId = capture?.id;
  const capStatus = capture?.status;
  if (capStatus === "COMPLETED" && captureId) {
    return { status: "completed", captureId, raw };
  }
  return {
    status: "failed",
    message: capStatus ? `Capture status: ${capStatus}` : "PayPal capture incomplete",
    raw
  };
}

// server/customerOrderNotification.ts
init_schema();
import { eq as eq10 } from "drizzle-orm";

// server/email.ts
import { Resend } from "resend";
var FROM_ADDRESS = "service@goodaytarot.com";
var BRAND_NAME = "\u691B \xB7 Crystal";
var ADMIN_ORDER_NOTIFICATION_EMAIL = process.env.ADMIN_ORDER_NOTIFICATION_EMAIL ?? "goodaytarot@gmail.com";
var OPS_ALERT_EMAIL = process.env.CERT_ALERT_EMAIL?.trim() || ADMIN_ORDER_NOTIFICATION_EMAIL;
function getSiteUrl() {
  return process.env.SITE_URL?.trim().replace(/\/$/, "") || "https://goodaytarot.com";
}
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
var EMAIL_THUMB_SIZE = 56;
function toEmailImageUrl(image) {
  const value = image?.trim();
  if (!value || value.startsWith("data:")) return null;
  if (/^https:\/\//i.test(value)) return value;
  if (value.startsWith("/") && !value.startsWith("//")) return `${getSiteUrl()}${value}`;
  return null;
}
function renderEmailItemRows(items, borderColor = "#f0ece7") {
  const cell = `padding:10px 0;border-bottom:1px solid ${borderColor};font-size:13px;`;
  return items.map((item) => {
    const name = escapeHtml(item.productName);
    const imageUrl = item.subtotal >= 0 ? toEmailImageUrl(item.productImage) : null;
    const thumb = item.subtotal < 0 ? "" : imageUrl ? `<img src="${escapeHtml(imageUrl)}" width="${EMAIL_THUMB_SIZE}" height="${EMAIL_THUMB_SIZE}" alt="${name}" style="display:block;width:${EMAIL_THUMB_SIZE}px;height:${EMAIL_THUMB_SIZE}px;object-fit:cover;border:0;border-radius:6px;background:#f2eae2;">` : `<div style="width:${EMAIL_THUMB_SIZE}px;height:${EMAIL_THUMB_SIZE}px;border-radius:6px;background:#f2eae2;"></div>`;
    const nameCell = thumb ? `<table cellpadding="0" cellspacing="0" role="presentation"><tr>
            <td width="${EMAIL_THUMB_SIZE}" style="padding-right:12px;vertical-align:middle;">${thumb}</td>
            <td style="vertical-align:middle;font-size:13px;color:#333;line-height:1.5;">${name}</td>
          </tr></table>` : name;
    return `
      <tr>
        <td style="${cell}color:#333;">${nameCell}</td>
        <td style="${cell}color:#666;text-align:center;white-space:nowrap;">\xD7 ${item.quantity}</td>
        <td style="${cell}color:#333;text-align:right;white-space:nowrap;">NT$ ${item.subtotal.toLocaleString()}</td>
      </tr>`;
  }).join("");
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
  const itemRows = renderEmailItemRows(items, "#f0ece7");
  const deliveryInfo = shippingMethod === "home" ? `<p style="margin:4px 0;font-size:13px;color:#555;">\u914D\u9001\u5730\u5740\uFF1A${receiverAddress ?? "\u2014"}</p>` : `<p style="margin:4px 0;font-size:13px;color:#555;">\u53D6\u8CA8\u9580\u5E02\uFF1A${cvsStoreName ?? "\u2014"}</p>`;
  const orderUrl = `${getSiteUrl()}/order/${encodeURIComponent(merchantTradeNo)}`;
  const safeOrderUrl = escapeHtml(orderUrl);
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

            <table cellpadding="0" cellspacing="0" style="margin:28px 0 18px;">
              <tr>
                <td style="background:#1a1a1a;">
                  <a href="${safeOrderUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:12px;letter-spacing:0.15em;">
                    \u67E5\u770B\u8A02\u55AE
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 20px;font-size:11px;color:#999;line-height:1.7;">
              \u82E5\u6309\u9215\u7121\u6CD5\u9EDE\u64CA\uFF0C\u8ACB\u8907\u88FD\u4EE5\u4E0B\u9023\u7D50\u8CBC\u5230\u700F\u89BD\u5668\uFF1A<br>
              <a href="${safeOrderUrl}" style="color:#b8936a;word-break:break-all;">${safeOrderUrl}</a><br>
              \u82E5\u60A8\u4F7F\u7528\u4E0D\u540C\u88DD\u7F6E\u958B\u555F\uFF0C\u7CFB\u7D71\u6703\u8ACB\u60A8\u8F38\u5165\u8A02\u8CFC\u6642\u4F7F\u7528\u7684 Email \u9032\u884C\u9A57\u8B49\u3002
            </p>

            <p style="margin:0;font-size:12px;color:#999;line-height:1.8;">
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
  const itemRows = renderEmailItemRows(items, "#f0ece7");
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
import { eq as eq9 } from "drizzle-orm";
init_schema();
function getLineAccessToken() {
  return process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim() || process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN?.trim();
}
function getSiteUrl2() {
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
  const [order] = await db.select({ userId: orders.userId }).from(orders).where(eq9(orders.id, orderId)).limit(1);
  if (!order?.userId) return null;
  const [user] = await db.select({ openId: users.openId }).from(users).where(eq9(users.id, order.userId)).limit(1);
  return extractLineUserId(user?.openId);
}
async function notifyLineOrderPlaced(orderId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const lineUserId = await getLineUserIdForOrder(orderId);
  if (!lineUserId) return { sent: false, reason: "missing_line_user" };
  const [order] = await db.select().from(orders).where(eq9(orders.id, orderId)).limit(1);
  if (!order) return { sent: false, reason: "missing_order" };
  const items = await db.select().from(orderItems).where(eq9(orderItems.orderId, orderId));
  const productLines = items.filter((item) => !NON_PRODUCT_ORDER_ITEM_IDS.includes(item.productId)).slice(0, 6).map((item) => `\u30FB${item.productName} x${item.quantity}`).join("\n");
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
    `\u67E5\u770B\u8A02\u55AE\uFF1A${getSiteUrl2()}/order/${encodeURIComponent(order.merchantTradeNo)}`
  ].filter(Boolean).join("\n");
  return pushLineTextMessage(lineUserId, text2);
}
async function notifyLineOrderShipped(orderId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const lineUserId = await getLineUserIdForOrder(orderId);
  if (!lineUserId) return { sent: false, reason: "missing_line_user" };
  const [order] = await db.select().from(orders).where(eq9(orders.id, orderId)).limit(1);
  if (!order) return { sent: false, reason: "missing_order" };
  const [logistics] = await db.select().from(logisticsOrders).where(eq9(logisticsOrders.orderId, orderId)).limit(1);
  const shippingLabel = order.shippingMethod === "home" ? "\u9ED1\u8C93\u5B85\u6025\u4FBF" : order.shippingMethod === "cvs_711" ? "7-11 \u5E97\u5230\u5E97" : "\u5168\u5BB6\u5E97\u5230\u5E97";
  const trackingNo = logistics?.bookingNote || logistics?.allPayLogisticsId || logistics?.logisticsMerchantTradeNo;
  const text2 = [
    `${order.buyerName} \u60A8\u597D\uFF0C\u60A8\u7684\u8A02\u55AE\u5DF2\u51FA\u8CA8\u3002`,
    "",
    `\u8A02\u55AE\u7DE8\u865F\uFF1A${order.merchantTradeNo}`,
    `\u914D\u9001\u65B9\u5F0F\uFF1A${shippingLabel}`,
    trackingNo ? `\u7269\u6D41\u7DE8\u865F\uFF1A${trackingNo}` : "",
    "",
    `\u67E5\u770B\u8A02\u55AE\uFF1A${getSiteUrl2()}/order/${encodeURIComponent(order.merchantTradeNo)}`
  ].filter(Boolean).join("\n");
  return pushLineTextMessage(lineUserId, text2);
}

// server/customerOrderNotification.ts
async function getMerchantTradeNoByOrderId(orderId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [order] = await db.select({ merchantTradeNo: orders.merchantTradeNo }).from(orders).where(eq10(orders.id, orderId)).limit(1);
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
      subtotal: item.subtotal,
      productImage: item.productImage
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

// server/storage.ts
import fs from "node:fs/promises";
import path from "node:path";
var DEFAULT_UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
function getLocalStorageConfig() {
  const publicPath = (process.env.LOCAL_STORAGE_PUBLIC_PATH || "/uploads").replace(/\/+$/, "");
  const uploadDir = process.env.LOCAL_STORAGE_DIR ? path.resolve(process.env.LOCAL_STORAGE_DIR) : DEFAULT_UPLOAD_DIR;
  return { publicPath: publicPath || "/uploads", uploadDir };
}
function getStorageConfig() {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;
  if (!baseUrl || !apiKey) {
    throw new Error(
      "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}
function buildUploadUrl(baseUrl, relKey) {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}
function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}
function normalizeKey(relKey) {
  const normalized = path.posix.normalize(relKey.replace(/\\/g, "/").replace(/^\/+/, "")).replace(/^(\.\.(\/|$))+/, "");
  if (!normalized || normalized === ".") {
    throw new Error("Storage key is empty");
  }
  return normalized;
}
function toFormData(data, contentType, fileName) {
  const blob = typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}
function buildAuthHeaders(apiKey) {
  return { Authorization: `Bearer ${apiKey}` };
}
function isServerlessRuntime() {
  return process.env.VERCEL === "1" || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
}
function toDataUrl(data, contentType) {
  const base64 = typeof data === "string" ? Buffer.from(data).toString("base64") : Buffer.from(data).toString("base64");
  return `data:${contentType};base64,${base64}`;
}
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const key = normalizeKey(relKey);
  if (process.env.E2E_STORAGE_STUB === "true") {
    return { key, url: `https://e2e-storage.local/${encodeURIComponent(key)}` };
  }
  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
    if (isServerlessRuntime()) {
      return { key, url: toDataUrl(data, contentType) };
    }
    return storagePutLocal(key, data, contentType);
  }
  const { baseUrl, apiKey } = getStorageConfig();
  const uploadUrl = buildUploadUrl(baseUrl, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: buildAuthHeaders(apiKey),
    body: formData
  });
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }
  const url = (await response.json()).url;
  return { key, url };
}
async function storagePutLocal(key, data, contentType) {
  const { publicPath, uploadDir } = getLocalStorageConfig();
  const filePath = path.resolve(uploadDir, key);
  const relativePath = path.relative(uploadDir, filePath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error("Storage key escapes upload directory");
  }
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, data);
  } catch (error) {
    const code = error?.code;
    if (code === "ENOENT" || code === "EROFS" || code === "EACCES" || code === "EPERM") {
      return { key, url: toDataUrl(data, contentType) };
    }
    throw error;
  }
  return {
    key,
    url: `${publicPath}/${key.split("/").map(encodeURIComponent).join("/")}`
  };
}

// shared/overseasShipping.ts
var OVERSEAS_SHIP_COUNTRY_CODES = ["MY", "HK", "SG", "US", "GB", "AU"];
var OVERSEAS_SHIP_COUNTRY_LABELS = {
  MY: "\u99AC\u4F86\u897F\u4E9E",
  HK: "\u9999\u6E2F",
  SG: "\u65B0\u52A0\u5761",
  US: "\u7F8E\u570B",
  GB: "\u82F1\u570B",
  AU: "\u6FB3\u6D32"
};
function isOverseasShipCountryCode(v) {
  return OVERSEAS_SHIP_COUNTRY_CODES.includes(v);
}
var OVERSEAS_SHIP_COUNTRY_OPTIONS = OVERSEAS_SHIP_COUNTRY_CODES.map((code) => ({
  code,
  label: OVERSEAS_SHIP_COUNTRY_LABELS[code]
}));

// shared/overseasAddress.ts
var OVERSEAS_COUNTRY_EN = {
  MY: "Malaysia",
  HK: "Hong Kong",
  SG: "Singapore",
  US: "United States",
  GB: "United Kingdom",
  AU: "Australia"
};
var US_STATE_OPTIONS = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" }
];
var AU_STATE_OPTIONS = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"];
var US_STATE_CODES = new Set(US_STATE_OPTIONS.map((s) => s.code));
function hasNonEnglishScript(s) {
  return /[\u3040-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF\u0E00-\u0E7F\u0600-\u06FF\u0590-\u05FF]/.test(s);
}
function isValidUKPostcode(pc) {
  const s = pc.replace(/\s+/g, " ").trim().toUpperCase();
  if (!s) return false;
  return /^([A-Z]{1,2}\d[A-Z0-9]?\s*\d[A-Z]{2}|GIR\s*0A{2})$/i.test(s);
}
function overseasStateRequired(country) {
  return country === "US" || country === "AU";
}
function validateOverseasAddress(p) {
  const issues = [];
  const ccRaw = p.intlCountry.trim();
  if (!isOverseasShipCountryCode(ccRaw)) {
    issues.push({ path: "intlCountry", message: "Please select a country." });
    return issues;
  }
  const cc = ccRaw;
  const line1 = p.intlAddrLine1.trim();
  const line2 = p.intlAddrLine2.trim();
  const city = p.intlCity.trim();
  const state = p.intlState.trim();
  const postal = p.intlPostalCode.trim();
  if (!line1) issues.push({ path: "intlAddrLine1", message: "Address Line 1 is required." });
  if (!city) issues.push({ path: "intlCity", message: "City is required." });
  const textFields = [
    [line1, "intlAddrLine1"],
    [line2, "intlAddrLine2"],
    [city, "intlCity"],
    [state, "intlState"]
  ];
  for (const [t2, path2] of textFields) {
    if (t2 && hasNonEnglishScript(t2)) {
      issues.push({ path: path2, message: "Please use English only (no Chinese or other scripts)." });
    }
  }
  if (postal && hasNonEnglishScript(postal)) {
    issues.push({ path: "intlPostalCode", message: "Postal code must use English letters and digits only." });
  }
  if (overseasStateRequired(cc) && !state) {
    issues.push({
      path: "intlState",
      message: cc === "US" ? "State is required." : "State / territory is required (e.g. NSW)."
    });
  }
  if (cc !== "HK" && !postal) {
    issues.push({ path: "intlPostalCode", message: "Postal code is required." });
  }
  if (cc === "US") {
    if (state && !US_STATE_CODES.has(state)) {
      issues.push({ path: "intlState", message: "Please select a valid US state." });
    }
    if (postal && !/^\d{5}(-\d{4})?$/.test(postal)) {
      issues.push({ path: "intlPostalCode", message: "ZIP code must be 5 digits or ZIP+4 (e.g. 12345 or 12345-6789)." });
    }
  } else if (cc === "AU") {
    if (state && !AU_STATE_OPTIONS.includes(state)) {
      issues.push({ path: "intlState", message: "Please select a valid Australian state/territory." });
    }
    if (postal && !/^\d{4}$/.test(postal)) {
      issues.push({ path: "intlPostalCode", message: "Australian postcode must be 4 digits." });
    }
  } else if (cc === "GB") {
    if (postal && !isValidUKPostcode(postal)) {
      issues.push({
        path: "intlPostalCode",
        message: "Please enter a valid UK postcode (e.g. SW1A 1AA)."
      });
    }
  } else if (cc === "MY") {
    if (postal && !/^\d{5}$/.test(postal)) {
      issues.push({ path: "intlPostalCode", message: "Malaysia postcode must be 5 digits." });
    }
  } else if (cc === "SG") {
    if (postal && !/^\d{6}$/.test(postal)) {
      issues.push({ path: "intlPostalCode", message: "Singapore postal code must be 6 digits." });
    }
  } else if (cc === "HK") {
    if (postal && !/^[A-Za-z0-9\s-]{1,12}$/.test(postal)) {
      issues.push({ path: "intlPostalCode", message: "If provided, use digits/letters only (optional for Hong Kong)." });
    }
  }
  return issues;
}
function formatOverseasShippingAddress(p) {
  const en = OVERSEAS_COUNTRY_EN[p.countryCode];
  const lines = [p.line1.trim()];
  if (p.line2.trim()) lines.push(p.line2.trim());
  const parts = [p.city.trim()];
  if (p.state.trim()) parts.push(p.state.trim());
  if (p.postal.trim()) parts.push(p.postal.trim());
  lines.push(parts.join(", "));
  lines.push(`${en} (${p.countryCode})`);
  const postalSlice = p.postal.trim().slice(0, 10);
  const receiverZipCode = postalSlice || (p.countryCode === "HK" ? "HK-NONE" : "");
  return { shippingAddress: lines.join("\n"), receiverZipCode };
}

// shared/customSpecs.ts
var CUSTOM_SPEC_CODES = ["bracelet", "necklace", "pendant"];
var DEFAULT_CUSTOM_SPEC_CODE = "bracelet";
var CUSTOM_SPECS = {
  bracelet: {
    code: "bracelet",
    label: "\u624B\u934A",
    priceDisplay: "NT$2,500 \xB1 NT$500",
    fixedNotes: [],
    preferenceFields: [
      "fitPreference",
      "metalPreference",
      "silverTube",
      "beadFrame",
      "claspType",
      "pendantCharm"
    ],
    asksWristSize: true,
    selectorNote: "\u53EF\u9078\u9B06\u7DCA\u3001\u6263\u5177\u8207\u914D\u4EF6",
    formStepDescription: "\u63D0\u4F9B\u624B\u570D\u3001\u559C\u6B61\u91D1\u98FE\u6216\u9280\u98FE\uFF0C\u4E26\u78BA\u8A8D\u8A2D\u8A08\u9700\u6C42",
    preferenceStepSubtitle: "\u8ACB\u9078\u64C7\u9B06\u7DCA\u3001\u91D1\u9280\u98FE\u3001\u9280\u7BA1\u73E0\u6846\u3001\u6263\u5177\u8207\u540A\u98FE\u504F\u597D"
  },
  necklace: {
    code: "necklace",
    label: "\u9805\u934A",
    priceDisplay: "NT$1,300 \xB1 NT$300",
    fixedNotes: ["\u9577\u5EA6\u56FA\u5B9A 45 \u516C\u5206", "\u50C5\u63D0\u4F9B\u91D1\u98FE\u6B3E\uFF0C\u4E0D\u63D0\u4F9B\u9280\u98FE"],
    preferenceFields: ["silverTube", "pendantCharm"],
    asksWristSize: false,
    selectorNote: "\u9577\u5EA6 45 \u516C\u5206\u30FB\u91D1\u98FE\u6B3E",
    formStepDescription: "\u78BA\u8A8D\u6C34\u6676\u984F\u8272\u3001\u529F\u6548\u8207\u914D\u4EF6\u9700\u6C42",
    preferenceStepSubtitle: "\u8ACB\u9078\u64C7\u9280\u7BA1\u8207\u540A\u98FE\u504F\u597D"
  },
  pendant: {
    code: "pendant",
    label: "\u540A\u98FE",
    priceDisplay: "NT$1,000 \xB1 NT$300",
    fixedNotes: [],
    preferenceFields: ["metalPreference", "pendantCharm"],
    asksWristSize: false,
    selectorNote: "\u53EF\u9078\u91D1\u98FE\u6216\u9280\u98FE",
    formStepDescription: "\u9078\u64C7\u91D1\u98FE\u6216\u9280\u98FE\uFF0C\u4E26\u78BA\u8A8D\u6C34\u6676\u984F\u8272\u8207\u529F\u6548\u9700\u6C42",
    preferenceStepSubtitle: "\u8ACB\u9078\u64C7\u91D1\u9280\u98FE\u8207\u4E2D\u9593\u4E3B\u589C\u504F\u597D"
  }
};
var CUSTOM_SPEC_LIST = CUSTOM_SPEC_CODES.map((code) => CUSTOM_SPECS[code]);
function isCustomSpecCode(value) {
  return typeof value === "string" && CUSTOM_SPEC_CODES.includes(value);
}
function resolveCustomSpec(value) {
  return CUSTOM_SPECS[isCustomSpecCode(value) ? value : DEFAULT_CUSTOM_SPEC_CODE];
}

// shared/bankAccount.ts
var STORE_BANK_INFO = {
  bankName: "\u9023\u7DDA\u9280\u884C\uFF08824\uFF09",
  accountName: "",
  accountNumber: "111004444556"
};

// shared/tarotPricing.ts
var TAROT_DEPOSIT_PRODUCT_ID = "tarot-crystal-deposit-product";
var TAROT_TOPIC_OPTION_PREFIX = "tarot-topic:";
var TAROT_BASE_READING_PRICE = 899;
var TAROT_TOPICS = [
  { id: "love-guide", label: "\u6200\u611B\u6307\u5357", originalPrice: 999, price: 899 },
  { id: "reconciliation", label: "\u611F\u60C5\u5FA9\u5408", originalPrice: 999, price: 899 },
  { id: "secret-love", label: "\u7DE3\u4F86\u6697\u6200", originalPrice: 999, price: 899 },
  { id: "romance-luck", label: "\u65FA\u6843\u82B1\u904B", originalPrice: 999, price: 899 },
  { id: "friendship", label: "\u53CB\u60C5\u53EF\u8CB4", originalPrice: 999, price: 899 },
  { id: "two-paths", label: "\u96D9\u5411\u4E4B\u8DEF", originalPrice: 999, price: 899 },
  { id: "wealth-code", label: "\u8CA1\u5BCC\u5BC6\u78BC", originalPrice: 999, price: 899 },
  { id: "entrepreneurship", label: "\u5275\u696D\u885D\u885D", originalPrice: 999, price: 899 },
  { id: "career", label: "\u8077\u6DAF\u63A2\u7D22", originalPrice: 999, price: 899 },
  { id: "interview", label: "\u9762\u8A66\u52DD\u7D93", originalPrice: 999, price: 899 },
  { id: "evolution", label: "\u9032\u5316\u4EBA\u751F", originalPrice: 999, price: 899 },
  { id: "healing", label: "\u5FC3\u9748\u7642\u7652", originalPrice: 999, price: 899 },
  { id: "guardian", label: "\u5B88\u8B77\u795E", originalPrice: 1088, price: 979 },
  { id: "past-life-3", label: "\u524D\u4E16\u4ECA\u751F3", originalPrice: 800, price: 720 },
  { id: "past-life-2", label: "\u524D\u4E16\u4ECA\u751F2", originalPrice: 999, price: 899 },
  { id: "past-life-1", label: "\u524D\u4E16\u4ECA\u751F1", originalPrice: 1288, price: 1159 },
  { id: "annual-fortune-3", label: "\u6D41\u5E74\u904B\u52E23", originalPrice: 1088, price: 979 },
  { id: "annual-fortune-1", label: "\u6D41\u5E74\u904B\u52E21", originalPrice: 1288, price: 1159 },
  { id: "annual-fortune-2", label: "\u6D41\u5E74\u904B\u52E22", originalPrice: 1588, price: 1429 }
];
function tarotTopicOptionId(topicId) {
  return `${TAROT_TOPIC_OPTION_PREFIX}${topicId}`;
}
function getTarotTopicByOptionId(optionId) {
  if (!optionId?.startsWith(TAROT_TOPIC_OPTION_PREFIX)) return void 0;
  const topicId = optionId.slice(TAROT_TOPIC_OPTION_PREFIX.length);
  return TAROT_TOPICS.find((topic) => topic.id === topicId);
}
function getTarotDepositPrice(productBasePrice, topic) {
  return productBasePrice - TAROT_BASE_READING_PRICE + topic.price;
}

// server/orderAccess.ts
import crypto4 from "node:crypto";
function accessPayload(merchantTradeNo, buyerEmail) {
  return `order-access:v1:${merchantTradeNo}:${normalizeOrderEmail(buyerEmail)}`;
}
function createOrderAccessToken(merchantTradeNo, buyerEmail) {
  if (!ENV.cookieSecret) return null;
  return crypto4.createHmac("sha256", ENV.cookieSecret).update(accessPayload(merchantTradeNo, buyerEmail)).digest("base64url");
}
function verifyOrderAccessToken(merchantTradeNo, buyerEmail, token) {
  const expected = createOrderAccessToken(merchantTradeNo, buyerEmail);
  if (!expected || !token) return false;
  const expectedBuffer = Buffer.from(expected);
  const tokenBuffer = Buffer.from(token);
  return expectedBuffer.length === tokenBuffer.length && crypto4.timingSafeEqual(expectedBuffer, tokenBuffer);
}

// server/routers/order.ts
var COUPON_CONSUMING_ORDER_STATUSES = /* @__PURE__ */ new Set([
  "deposit_paid",
  "paid",
  "processing",
  "shipped",
  "arrived",
  "picked_up",
  "completed"
]);
var TRANSFER_RECEIPT_CONTENT_TYPES = /* @__PURE__ */ new Set(["image/jpeg", "image/png", "image/webp"]);
async function getClearQuartzChipsAddOn(db) {
  const [product] = await db.select().from(dbProducts).where(eq11(dbProducts.id, CLEAR_QUARTZ_CHIPS_PRODUCT_ID)).limit(1);
  if (!product || !product.active) {
    throw new TRPCError5({ code: "BAD_REQUEST", message: "\u627E\u4E0D\u5230\u767D\u6C34\u6676\u788E\u77F3\u52A0\u8CFC\u5546\u54C1" });
  }
  return product;
}
async function deleteCancelledOrderRecords(db, orderIds) {
  if (!db) throw new Error("Database not available");
  await releaseCouponsForOrdersSafely(orderIds, { includeUsed: true, reason: "\u522A\u9664\u5DF2\u53D6\u6D88\u8A02\u55AE" });
  await db.transaction(async (tx) => {
    const mergeMemberships = await tx.select({ groupId: orderMergeMembers.groupId }).from(orderMergeMembers).where(inArray3(orderMergeMembers.orderId, orderIds));
    const mergeGroupIds = Array.from(new Set(mergeMemberships.map((row) => row.groupId)));
    if (mergeGroupIds.length > 0) {
      await tx.delete(orderMergeMembers).where(inArray3(orderMergeMembers.groupId, mergeGroupIds));
      await tx.delete(orderMergeGroups).where(inArray3(orderMergeGroups.id, mergeGroupIds));
    }
    await tx.delete(orderBalancePayments).where(inArray3(orderBalancePayments.orderId, orderIds));
    await tx.delete(logisticsOrders).where(inArray3(logisticsOrders.orderId, orderIds));
    await tx.delete(orderItems).where(inArray3(orderItems.orderId, orderIds));
    await tx.delete(orders).where(inArray3(orders.id, orderIds));
  });
}
function getReceiptExtension(contentType, filename) {
  const ext = filename?.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (ext && ["jpg", "jpeg", "png", "webp"].includes(ext)) return ext === "jpeg" ? "jpg" : ext;
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}
function siteBaseUrl(req) {
  const fixed = process.env.SITE_URL?.trim().replace(/\/$/, "");
  if (fixed) return fixed;
  const host = (req.get("x-forwarded-host") || req.get("host") || "").trim();
  const protoHeader = req.get("x-forwarded-proto");
  const proto = (Array.isArray(protoHeader) ? protoHeader[0] : protoHeader?.split(",")[0]?.trim()) || (req.protocol === "https" ? "https" : "http");
  return `${proto}://${host}`;
}
var MERGED_ORDER_SYNC_STATUSES = /* @__PURE__ */ new Set([
  "processing",
  "shipped",
  "arrived",
  "picked_up",
  "not_picked",
  "completed",
  "cancelled"
]);
var FULFILLMENT_STATUSES = /* @__PURE__ */ new Set([
  "shipped",
  "arrived",
  "picked_up",
  "not_picked",
  "completed"
]);
async function getOrderOperationContext(db, orderId) {
  const [mergeMember] = await db.select({
    groupId: orderMergeMembers.groupId,
    mainOrderId: orderMergeGroups.mainOrderId
  }).from(orderMergeMembers).leftJoin(orderMergeGroups, eq11(orderMergeMembers.groupId, orderMergeGroups.id)).where(eq11(orderMergeMembers.orderId, orderId)).limit(1);
  if (mergeMember?.mainOrderId && mergeMember.mainOrderId !== orderId) {
    throw new TRPCError5({ code: "BAD_REQUEST", message: "\u6B64\u8A02\u55AE\u5DF2\u4F75\u5165\u4E3B\u8A02\u55AE\uFF0C\u8ACB\u5F9E\u4E3B\u8A02\u55AE\u64CD\u4F5C" });
  }
  if (!mergeMember?.groupId) {
    return { groupId: null, mainOrderId: orderId, orderIds: [orderId] };
  }
  const members = await db.select({ orderId: orderMergeMembers.orderId }).from(orderMergeMembers).where(eq11(orderMergeMembers.groupId, mergeMember.groupId));
  return {
    groupId: mergeMember.groupId,
    mainOrderId: mergeMember.mainOrderId ?? orderId,
    orderIds: members.map((member) => member.orderId)
  };
}
async function assertReadyForFulfillment(db, context) {
  const groupOrders = await db.select({
    id: orders.id,
    merchantTradeNo: orders.merchantTradeNo,
    paymentStatus: orders.paymentStatus,
    orderStatus: orders.orderStatus,
    isCustomOrder: orders.isCustomOrder
  }).from(orders).where(inArray3(orders.id, context.orderIds));
  if (groupOrders.length !== context.orderIds.length) {
    throw new TRPCError5({ code: "NOT_FOUND", message: "\u90E8\u5206\u5408\u4F75\u8A02\u55AE\u4E0D\u5B58\u5728\uFF0C\u8ACB\u91CD\u65B0\u6574\u7406\u5F8C\u518D\u8A66" });
  }
  const unpaidOrders = groupOrders.filter(
    (order) => !["paid", "confirmed"].includes(order.paymentStatus)
  );
  if (unpaidOrders.length > 0) {
    throw new TRPCError5({
      code: "BAD_REQUEST",
      message: `\u5C1A\u6709\u8A02\u55AE\u672A\u5B8C\u6210\u4ED8\u6B3E\uFF1A${unpaidOrders.map((order) => order.merchantTradeNo).join(", ")}`
    });
  }
  if (!groupOrders.some((order) => order.isCustomOrder)) return;
  const balances = await db.select({
    orderId: orderBalancePayments.orderId,
    paymentStatus: orderBalancePayments.paymentStatus
  }).from(orderBalancePayments).where(inArray3(orderBalancePayments.orderId, context.orderIds));
  const mainBalance = balances.find((balance) => balance.orderId === context.mainOrderId);
  if (!mainBalance) {
    throw new TRPCError5({
      code: "BAD_REQUEST",
      message: "\u5BA2\u88FD\u8A02\u55AE\u5C1A\u672A\u8A2D\u5B9A\u5C3E\u6B3E\uFF1B\u82E5\u5546\u54C1\u5C3E\u6B3E\u70BA 0\uFF0C\u8ACB\u5148\u7522\u751F\u914D\u9001\u9023\u7D50\u6216\u4F7F\u7528\u300C\u6574\u7B46\u514D\u6536\u4E26\u5B8C\u6210\u300D"
    });
  }
  if (mainBalance.paymentStatus !== "paid") {
    throw new TRPCError5({ code: "BAD_REQUEST", message: "\u5BA2\u88FD\u8A02\u55AE\u5C3E\u6B3E\u5C1A\u672A\u5B8C\u6210\uFF0C\u4E0D\u80FD\u9032\u5165\u51FA\u8CA8\u6D41\u7A0B" });
  }
}
function generateOrderMergeCode() {
  const now = /* @__PURE__ */ new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `OM${ymd}${rand}`.slice(0, 32);
}
var mergeableOrderStatuses = /* @__PURE__ */ new Set([
  "pending_payment",
  "deposit_paid",
  "paid",
  "processing"
]);
var CartItemSchema = z3.object({
  id: z3.string(),
  baseProductId: z3.string().optional(),
  purchaseOptionId: z3.string().optional(),
  purchaseOptionLabel: z3.string().optional(),
  // 客製方案的規格。不走 purchaseOptionId，理由見 shared/customSpecs。
  specCode: z3.enum(CUSTOM_SPEC_CODES).optional(),
  wristSize: z3.string().optional(),
  wristSizeSelections: z3.array(z3.object({
    id: z3.string(),
    label: z3.string(),
    value: z3.string()
  })).optional(),
  claspType: z3.enum(["elastic", "lobster", "magnetic"]).optional(),
  fitPreference: z3.enum(["just-right", "loose"]).optional(),
  name: z3.string(),
  // 價格欄位只保留向下相容；實際成交價一律由伺服器依商品資料重算。
  price: z3.number().finite(),
  quantity: z3.number().int().min(1).max(100),
  image: z3.string().optional(),
  isPreorder: z3.boolean().optional(),
  twoItemFreeShippingEligible: z3.boolean().optional(),
  purchaseOptionUsesOwnStock: z3.boolean().optional()
});
var OrderAccessSchema = z3.object({
  merchantTradeNo: z3.string().min(1),
  accessToken: z3.string().min(1).optional(),
  buyerEmail: z3.string().trim().email().optional()
});
function hasOrderAccess(order, user, input) {
  if (user?.role === "admin") return true;
  if (user?.id != null && order.userId === user.id) return true;
  if (verifyOrderAccessToken(order.merchantTradeNo, order.buyerEmail, input.accessToken)) return true;
  return order.userId == null && Boolean(input.buyerEmail) && normalizeOrderEmail(input.buyerEmail) === normalizeOrderEmail(order.buyerEmail);
}
function assertOrderAccess(order, ctx, input) {
  if (!hasOrderAccess(order, ctx.user, input)) {
    enforceRateLimit(
      ctx.req,
      ctx.res,
      `order-access:${order.merchantTradeNo}`,
      8,
      15 * 6e4
    );
    throw new TRPCError5({ code: "UNAUTHORIZED", message: "\u8ACB\u9A57\u8B49\u8A02\u8CFC Email \u5F8C\u67E5\u770B\u8A02\u55AE" });
  }
}
function getWristSizeRulePrice(product, wristSize) {
  const rules = product.wristSizePriceRules?.filter((rule) => Number.isFinite(rule.maxWristSize) && Number.isFinite(rule.price)).sort((a, b) => a.maxWristSize - b.maxWristSize);
  if (!rules?.length) return null;
  return rules.find((rule) => wristSize <= rule.maxWristSize)?.price ?? rules[rules.length - 1].price;
}
var DEFAULT_CLASP_OPTIONS = ["elastic", "lobster", "magnetic"];
var CLASP_SURCHARGE = 200;
function getValidatedWristSize(item, product) {
  const wristSize = item.wristSize == null ? NaN : Number(item.wristSize);
  if (!Number.isFinite(wristSize) || !Number.isInteger(wristSize * 2) || wristSize < product.wristSizeMin || wristSize > product.wristSizeMax) {
    throw new TRPCError5({
      code: "BAD_REQUEST",
      message: `\u8ACB\u91CD\u65B0\u9078\u64C7\u300C${product.name}\u300D\u7684\u624B\u570D\u5C3A\u5BF8\u5F8C\u518D\u7D50\u5E33\u3002`
    });
  }
  return wristSize;
}
function getClaspSurcharge(item, product) {
  if (product.category === "custom" || item.claspType == null) return 0;
  const allowedOptions = product.claspOptions ?? [...DEFAULT_CLASP_OPTIONS];
  if (!allowedOptions.includes(item.claspType)) {
    throw new TRPCError5({
      code: "BAD_REQUEST",
      message: `\u8ACB\u91CD\u65B0\u9078\u64C7\u300C${product.name}\u300D\u7684\u6263\u5177\u5F8C\u518D\u7D50\u5E33\u3002`
    });
  }
  return item.claspType === "elastic" ? 0 : CLASP_SURCHARGE;
}
function formatOrderItemWristSize(wristSize) {
  return Number.isInteger(wristSize) ? String(wristSize) : wristSize.toFixed(1);
}
function buildOrderItemName(input) {
  const details = [
    input.specLabel,
    input.purchaseOptionLabel,
    input.wristSize == null ? null : `\u624B\u570D ${formatOrderItemWristSize(input.wristSize)}cm`,
    ...(input.wristSizeSelections ?? []).map(
      (selection) => `${selection.label} ${formatOrderItemWristSize(selection.wristSize)}cm`
    ),
    input.claspType === "lobster" ? "\u9F8D\u8766\u6263" : input.claspType === "magnetic" ? "\u78C1\u6263" : null,
    input.fitPreference === "just-right" ? "\u525B\u597D" : input.fitPreference === "loose" ? "\u5FAE\u9B06" : null
  ].filter((detail) => Boolean(detail));
  return `${input.productName}${details.map((detail) => `\uFF08${detail}\uFF09`).join("")}`;
}
function buildOrderItemConfigurationSnapshot(input) {
  const claspLabels = {
    elastic: "\u5F48\u529B\u7E69",
    lobster: "\u9F8D\u8766\u6263",
    magnetic: "\u78C1\u6263"
  };
  const fitPreferenceLabels = {
    "just-right": "\u525B\u597D",
    loose: "\u5FAE\u9B06"
  };
  return {
    version: 1,
    baseProductName: input.productName,
    spec: input.spec ?? null,
    purchaseOption: input.purchaseOption ?? null,
    wristSizes: (input.wristSizes ?? []).map((wristSize) => ({
      ...wristSize,
      unit: "cm"
    })),
    clasp: input.claspType ? {
      code: input.claspType,
      label: claspLabels[input.claspType],
      surcharge: input.claspSurcharge
    } : null,
    fitPreference: input.fitPreference ? {
      code: input.fitPreference,
      label: fitPreferenceLabels[input.fitPreference]
    } : null,
    pricing: {
      basePrice: input.basePrice,
      claspSurcharge: input.claspSurcharge,
      unitPrice: input.basePrice + input.claspSurcharge
    }
  };
}
async function normalizePurchaseOptionItems(items) {
  const db = await getDb();
  if (!db) {
    throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "\u76EE\u524D\u7121\u6CD5\u78BA\u8A8D\u5546\u54C1\u50F9\u683C\uFF0C\u8ACB\u7A0D\u5F8C\u518D\u8A66\u3002" });
  }
  const productIds = Array.from(new Set(items.map((item) => item.baseProductId ?? item.id)));
  if (productIds.length === 0) {
    return items.map((item) => ({ ...item, configurationSnapshot: null }));
  }
  const products2 = await db.select({
    id: dbProducts.id,
    name: dbProducts.name,
    price: dbProducts.price,
    image: dbProducts.image,
    active: dbProducts.active,
    category: dbProducts.category,
    claspOptions: dbProducts.claspOptions,
    wristSizeMin: dbProducts.wristSizeMin,
    wristSizeMax: dbProducts.wristSizeMax,
    showFitPreference: dbProducts.showFitPreference,
    wristSizePriceRules: dbProducts.wristSizePriceRules,
    purchaseOptions: dbProducts.purchaseOptions
  }).from(dbProducts).where(inArray3(dbProducts.id, productIds));
  const productById = new Map(products2.map((product) => [product.id, product]));
  const requestedOptionQuantity = /* @__PURE__ */ new Map();
  for (const item of items) {
    if (!item.purchaseOptionId) continue;
    const productId = item.baseProductId ?? item.id;
    const key = `${productId}:${item.purchaseOptionId}`;
    requestedOptionQuantity.set(key, (requestedOptionQuantity.get(key) ?? 0) + item.quantity);
  }
  return items.map((item) => {
    const productId = item.baseProductId ?? item.id;
    const product = productById.get(productId);
    const customSpec = product?.category === "custom" ? resolveCustomSpec(item.specCode) : null;
    const specDetail = customSpec ? { code: customSpec.code, label: customSpec.label } : null;
    if (productId === TAROT_DEPOSIT_PRODUCT_ID) {
      const topic = getTarotTopicByOptionId(item.purchaseOptionId);
      if (!product || product.active === false || !topic) {
        throw new TRPCError5({
          code: "BAD_REQUEST",
          message: "\u8ACB\u91CD\u65B0\u9078\u64C7\u5854\u7F85\u5360\u535C\u4E3B\u984C\u5F8C\u518D\u7D50\u5E33\u3002"
        });
      }
      return {
        ...item,
        name: buildOrderItemName({
          productName: product.name,
          specLabel: specDetail?.label,
          purchaseOptionLabel: topic.label
        }),
        price: getTarotDepositPrice(product.price, topic),
        image: item.image || product.image,
        purchaseOptionLabel: topic.label,
        purchaseOptionUsesOwnStock: false,
        // 規格放 snapshot，塔羅主題仍佔著 purchaseOptionId，兩者不衝突
        configurationSnapshot: buildOrderItemConfigurationSnapshot({
          productName: product.name,
          spec: specDetail,
          purchaseOption: { id: tarotTopicOptionId(topic.id), label: topic.label },
          basePrice: getTarotDepositPrice(product.price, topic),
          claspSurcharge: 0
        })
      };
    }
    if (!product || product.active === false) {
      throw new TRPCError5({ code: "BAD_REQUEST", message: `\u300C${item.name}\u300D\u5DF2\u4E0D\u5B58\u5728\u6216\u4E0D\u53EF\u8CFC\u8CB7\u3002` });
    }
    const claspSurcharge = getClaspSurcharge(item, product);
    const fitPreference = product.category !== "custom" && product.showFitPreference !== false ? item.fitPreference : void 0;
    if (!item.purchaseOptionId) {
      const hasWristSizePriceRules = Boolean(product.wristSizePriceRules?.length);
      const wristSize2 = hasWristSizePriceRules || item.wristSize != null ? getValidatedWristSize(item, product) : null;
      const wristSizePrice = wristSize2 == null ? null : getWristSizeRulePrice(product, wristSize2);
      if (hasWristSizePriceRules && wristSizePrice == null) {
        throw new TRPCError5({
          code: "BAD_REQUEST",
          message: `\u300C${product.name}\u300D\u5C1A\u672A\u8A2D\u5B9A\u6B64\u624B\u570D\u5C3A\u5BF8\u7684\u50F9\u683C\u3002`
        });
      }
      const basePrice2 = wristSizePrice ?? product.price;
      return {
        ...item,
        id: product.id,
        baseProductId: product.id,
        name: buildOrderItemName({
          productName: product.name,
          specLabel: specDetail?.label,
          wristSize: wristSize2,
          claspType: item.claspType,
          fitPreference
        }),
        price: basePrice2 + claspSurcharge,
        image: product.image || item.image,
        configurationSnapshot: buildOrderItemConfigurationSnapshot({
          productName: product.name,
          spec: specDetail,
          wristSizes: wristSize2 == null ? [] : [{ key: "wrist", label: "\u624B\u570D", value: wristSize2 }],
          claspType: item.claspType,
          fitPreference,
          basePrice: basePrice2,
          claspSurcharge
        })
      };
    }
    const option = product?.purchaseOptions?.find((candidate) => candidate.id === item.purchaseOptionId);
    if (!product || !option || option.active === false) {
      throw new TRPCError5({ code: "BAD_REQUEST", message: `\u300C${item.name}\u300D\u7684\u8CFC\u8CB7\u65B9\u6848\u5DF2\u4E0D\u53EF\u8CFC\u8CB7\u3002` });
    }
    const requestedQuantity = requestedOptionQuantity.get(`${productId}:${item.purchaseOptionId}`) ?? item.quantity;
    if (option.stock != null && option.stock !== -1 && option.stock < requestedQuantity) {
      throw new TRPCError5({ code: "BAD_REQUEST", message: `\u300C${product.name}\uFF08${option.label}\uFF09\u300D\u5EAB\u5B58\u4E0D\u8DB3\u3002` });
    }
    const optionProductName = `${product.name}\uFF08${option.label}\uFF09`;
    if (option.type === "combo") {
      const groups = option.wristSizeGroups ?? [];
      if (groups.length === 0) {
        throw new TRPCError5({ code: "BAD_REQUEST", message: `\u300C${optionProductName}\u300D\u5C1A\u672A\u8A2D\u5B9A\u7D44\u5408\u624B\u570D\u50F9\u683C\u3002` });
      }
      const selections = item.wristSizeSelections ?? [];
      const validatedSelections = groups.map((group) => {
        const selected = selections.find((selection) => selection.id === group.id);
        const wristSize2 = getValidatedWristSize(
          { ...item, wristSize: selected?.value },
          product
        );
        const groupPrice = getWristSizeRulePrice(group, wristSize2);
        if (groupPrice == null) {
          throw new TRPCError5({ code: "BAD_REQUEST", message: `\u300C${optionProductName}\u300D\u7F3A\u5C11 ${group.label} \u7684\u50F9\u683C\u3002` });
        }
        return { key: group.id, label: group.label, wristSize: wristSize2, price: groupPrice };
      });
      const price = validatedSelections.reduce((sum, selection) => sum + selection.price, 0);
      return {
        ...item,
        name: buildOrderItemName({
          productName: product.name,
          purchaseOptionLabel: option.label,
          wristSizeSelections: validatedSelections,
          claspType: item.claspType,
          fitPreference
        }),
        price: price + claspSurcharge,
        image: item.image || product.image,
        purchaseOptionLabel: option.label,
        purchaseOptionUsesOwnStock: option.stock != null,
        configurationSnapshot: buildOrderItemConfigurationSnapshot({
          productName: product.name,
          purchaseOption: { id: option.id, label: option.label },
          wristSizes: validatedSelections.map((selection) => ({
            key: selection.key,
            label: selection.label,
            value: selection.wristSize
          })),
          claspType: item.claspType,
          fitPreference,
          basePrice: price,
          claspSurcharge
        })
      };
    }
    const wristSize = item.wristSize == null ? null : getValidatedWristSize(item, product);
    const optionWristSizeRulePrice = wristSize != null ? getWristSizeRulePrice(option, wristSize) : null;
    const productWristSizeRulePrice = wristSize != null ? getWristSizeRulePrice(product, wristSize) : null;
    const wristSizeRulePrice = optionWristSizeRulePrice ?? productWristSizeRulePrice;
    const wristSizePriceDelta = wristSizeRulePrice == null ? 0 : wristSizeRulePrice - product.price;
    const basePrice = optionWristSizeRulePrice ?? option.price + wristSizePriceDelta;
    return {
      ...item,
      name: buildOrderItemName({
        productName: product.name,
        purchaseOptionLabel: option.label,
        wristSize,
        claspType: item.claspType,
        fitPreference
      }),
      price: basePrice + claspSurcharge,
      image: item.image || product.image,
      purchaseOptionLabel: option.label,
      purchaseOptionUsesOwnStock: option.stock != null,
      configurationSnapshot: buildOrderItemConfigurationSnapshot({
        productName: product.name,
        purchaseOption: { id: option.id, label: option.label },
        wristSizes: wristSize == null ? [] : [{ key: "wrist", label: "\u624B\u570D", value: wristSize }],
        claspType: item.claspType,
        fitPreference,
        basePrice,
        claspSurcharge
      })
    };
  });
}
function isCustomCheckoutItem(item) {
  return CUSTOM_PRODUCT_IDS.includes(item.baseProductId ?? item.id);
}
async function attachTwoItemFreeShippingEligibility(items) {
  const db = await getDb();
  if (!db) return items;
  const productIds = Array.from(new Set(items.map((item) => item.baseProductId ?? item.id)));
  if (productIds.length === 0) return items;
  const rows = await db.select({
    id: dbProducts.id,
    twoItemFreeShippingEligible: dbProducts.twoItemFreeShippingEligible
  }).from(dbProducts).where(inArray3(dbProducts.id, productIds));
  const eligibilityById = new Map(rows.map((row) => [row.id, row.twoItemFreeShippingEligible]));
  return items.map((item) => {
    const productId = item.baseProductId ?? item.id;
    return {
      ...item,
      twoItemFreeShippingEligible: eligibilityById.get(productId) ?? item.twoItemFreeShippingEligible ?? true
    };
  });
}
async function originalOrderHasDomesticFreeShipping(orderId) {
  const db = await getDb();
  if (!db) return false;
  const items = await db.select({
    id: orderItems.productId,
    name: orderItems.productName,
    price: orderItems.unitPrice,
    quantity: orderItems.quantity
  }).from(orderItems).where(eq11(orderItems.orderId, orderId));
  const productItems = items.filter((item) => !NON_PRODUCT_ORDER_ITEM_IDS.includes(item.id));
  if (productItems.length === 0) return false;
  const feeItems = await attachTwoItemFreeShippingEligibility(productItems);
  return calcCheckoutFees({
    items: feeItems,
    checkoutRegion: "domestic",
    shippingMethod: "cvs_711",
    paymentMethod: "credit"
  }).domesticFreeShipping;
}
var balanceCheckoutInputSchema = z3.object({
  merchantTradeNo: z3.string().min(1),
  paymentMethod: z3.enum(["credit", "atm"]),
  memberCouponId: z3.number().int().positive().optional(),
  expectedTotal: z3.number().int().min(0).optional(),
  includeClearQuartzChips: z3.boolean().optional(),
  checkoutRegion: z3.enum(["domestic", "overseas"]),
  receiverPhone: z3.string().min(1).max(32),
  shippingMethod: z3.enum(["cvs_711", "cvs_family", "home"]),
  cvsStoreId: z3.string().optional(),
  cvsStoreName: z3.string().optional(),
  cvsType: z3.string().optional(),
  shippingAddress: z3.string().optional(),
  receiverZipCode: z3.string().optional(),
  intlCountry: z3.string().optional(),
  intlAddrLine1: z3.string().optional(),
  intlAddrLine2: z3.string().optional(),
  intlCity: z3.string().optional(),
  intlState: z3.string().optional(),
  intlPostalCode: z3.string().optional(),
  origin: z3.string().url()
}).superRefine((data, ctx) => {
  const receiverPhone = data.receiverPhone.trim();
  if (data.checkoutRegion === "domestic") {
    if (!/^09\d{8}$/.test(receiverPhone.replace(/\s/g, ""))) {
      ctx.addIssue({
        code: "custom",
        message: "\u8ACB\u8F38\u5165\u53F0\u7063\u624B\u6A5F\u683C\u5F0F\uFF0809 \u958B\u982D\u5171 10 \u78BC\uFF09",
        path: ["receiverPhone"]
      });
    }
    if (data.shippingMethod === "cvs_711" || data.shippingMethod === "cvs_family") {
      if (!data.cvsStoreId?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "\u8ACB\u9078\u64C7\u8D85\u5546\u9580\u5E02",
          path: ["cvsStoreId"]
        });
      }
    }
    if (data.shippingMethod === "home") {
      if (!data.shippingAddress?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "\u8ACB\u586B\u5BEB\u6536\u4EF6\u5730\u5740",
          path: ["shippingAddress"]
        });
      }
      const zip = data.receiverZipCode?.trim() ?? "";
      if (!/^\d{3,6}$/.test(zip)) {
        ctx.addIssue({
          code: "custom",
          message: "\u8ACB\u586B\u5BEB\u90F5\u905E\u5340\u865F",
          path: ["receiverZipCode"]
        });
      }
    }
  } else {
    if (receiverPhone.length < 8) {
      ctx.addIssue({
        code: "custom",
        message: "\u8ACB\u586B\u5BEB\u806F\u7D61\u96FB\u8A71",
        path: ["receiverPhone"]
      });
    }
    const payload = {
      intlCountry: data.intlCountry ?? "",
      intlAddrLine1: data.intlAddrLine1 ?? "",
      intlAddrLine2: data.intlAddrLine2 ?? "",
      intlCity: data.intlCity ?? "",
      intlState: data.intlState ?? "",
      intlPostalCode: data.intlPostalCode ?? ""
    };
    for (const it of validateOverseasAddress(payload)) {
      ctx.addIssue({
        code: "custom",
        message: it.message,
        path: [it.path]
      });
    }
  }
});
async function legacyBalancePaymentCheckout(input, ctx, balancePayment) {
  if (!balancePayment) {
    throw new TRPCError5({ code: "NOT_FOUND", message: "\u627E\u4E0D\u5230\u5C3E\u6B3E\u8CC7\u6599" });
  }
  if (balancePayment.paymentStatus === "paid") {
    throw new TRPCError5({ code: "BAD_REQUEST", message: "\u5C3E\u6B3E\u5DF2\u4ED8\u6B3E" });
  }
  if (balancePayment.paymentStatus !== "pending" && balancePayment.paymentStatus !== "failed") {
    throw new TRPCError5({
      code: "BAD_REQUEST",
      message: "\u6B64\u5C3E\u6B3E\u9023\u7D50\u76EE\u524D\u4E0D\u53EF\u4ED8\u6B3E"
    });
  }
  const db = await getDb();
  if (!db)
    throw new TRPCError5({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database not available"
    });
  const isOverseas = input.checkoutRegion === "overseas";
  const shippingMethod = isOverseas ? "home" : input.shippingMethod;
  let shippingAddress = input.shippingAddress;
  let receiverZipCode = input.receiverZipCode;
  let cvsStoreId = input.cvsStoreId;
  let cvsStoreName = input.cvsStoreName;
  let cvsType = input.cvsType;
  let overseasCountry = null;
  if (isOverseas) {
    cvsStoreId = void 0;
    cvsStoreName = void 0;
    cvsType = void 0;
    const countryCode = input.intlCountry.trim();
    if (!isOverseasShipCountryCode(countryCode)) {
      throw new TRPCError5({
        code: "BAD_REQUEST",
        message: "\u4E0D\u652F\u63F4\u7684\u6D77\u5916\u914D\u9001\u5730\u5340"
      });
    }
    overseasCountry = countryCode;
    const formatted = formatOverseasShippingAddress({
      countryCode,
      line1: input.intlAddrLine1.trim(),
      line2: input.intlAddrLine2 ?? "",
      city: input.intlCity.trim(),
      state: input.intlState ?? "",
      postal: input.intlPostalCode ?? ""
    });
    shippingAddress = formatted.shippingAddress;
    receiverZipCode = formatted.receiverZipCode;
  }
  const balanceItems = [
    {
      id: "custom-balance-payment",
      name: "\u5BA2\u88FD\u5316\u5546\u54C1\u5C3E\u6B3E",
      price: balancePayment.amount,
      quantity: 1,
      twoItemFreeShippingEligible: false
    }
  ];
  const clearQuartzChipsAddOn = input.includeClearQuartzChips ? await getClearQuartzChipsAddOn(db) : null;
  if (clearQuartzChipsAddOn) {
    balanceItems.push({
      id: clearQuartzChipsAddOn.id,
      name: clearQuartzChipsAddOn.name,
      price: clearQuartzChipsAddOn.price,
      quantity: 1,
      twoItemFreeShippingEligible: clearQuartzChipsAddOn.twoItemFreeShippingEligible
    });
  }
  const originalDomesticFreeShipping = input.checkoutRegion === "domestic" ? await originalOrderHasDomesticFreeShipping(balancePayment.orderId) : false;
  const forceBalanceFreeShipping = balancePayment.order.freeShippingOverride || originalDomesticFreeShipping;
  const feeSummary = calcCheckoutFees({
    items: balanceItems,
    checkoutRegion: input.checkoutRegion,
    shippingMethod,
    paymentMethod: input.paymentMethod,
    overseasCountry,
    buyerEmail: balancePayment.order.buyerEmail,
    forceFreeShipping: forceBalanceFreeShipping,
    forcePaidShipping: Boolean(
      balancePayment.orderMergeInfo && !forceBalanceFreeShipping
    ),
    chargeShippingWhenSubtotalZero: balancePayment.amount === 0
  });
  const totalAmount = feeSummary.total;
  const orderUpdate = {
    buyerPhone: input.receiverPhone.trim(),
    deliveryRegion: isOverseas ? "overseas" : "domestic",
    shippingMethod,
    cvsStoreId: cvsStoreId ?? null,
    cvsStoreName: cvsStoreName ?? null,
    cvsType: cvsType ?? null,
    shippingAddress: shippingAddress ?? null,
    receiverZipCode: receiverZipCode ?? null
  };
  if (totalAmount === 0) {
    const now = /* @__PURE__ */ new Date();
    const completed = await db.transaction(async (tx) => {
      await tx.execute(
        sql7`SELECT \`id\` FROM \`orderBalancePayments\` WHERE \`id\` = ${balancePayment.id} FOR UPDATE`
      );
      const [currentBalance] = await tx.select({ paymentStatus: orderBalancePayments.paymentStatus }).from(orderBalancePayments).where(eq11(orderBalancePayments.id, balancePayment.id)).limit(1);
      if (!currentBalance || !["pending", "failed"].includes(currentBalance.paymentStatus))
        return false;
      await tx.update(orderBalancePayments).set({
        paymentMethod: input.paymentMethod,
        shippingFee: 0,
        paymentFee: 0,
        totalAmount: 0,
        paymentStatus: "paid",
        tradeNo: "NO_PAYMENT_REQUIRED",
        ecpayNotifyData: {
          source: "zero_balance_shipping_confirmation",
          confirmedAt: now.toISOString()
        },
        paidAt: now
      }).where(eq11(orderBalancePayments.id, balancePayment.id));
      await tx.update(orders).set({
        ...orderUpdate,
        orderStatus: "paid",
        paymentStatus: "confirmed",
        confirmedAt: now,
        paidAt: now,
        totalAmount: Math.max(
          1,
          balancePayment.order.totalAmount - (balancePayment.totalAmount ?? balancePayment.amount)
        )
      }).where(eq11(orders.id, balancePayment.orderId));
      return true;
    });
    if (!completed) {
      throw new TRPCError5({
        code: "CONFLICT",
        message: "\u5C3E\u6B3E\u72C0\u614B\u5DF2\u66F4\u65B0\uFF0C\u8ACB\u91CD\u65B0\u6574\u7406\u9801\u9762"
      });
    }
    return {
      kind: "no_payment",
      amount: 0,
      shippingFee: 0,
      paymentFee: 0
    };
  }
  if (input.paymentMethod === "credit") {
    let attempt;
    try {
      attempt = await createBalancePaymentAttempt({
        balancePaymentId: balancePayment.id,
        amount: balancePayment.amount,
        shippingFee: feeSummary.shippingFee,
        paymentFee: feeSummary.paymentFee,
        totalAmount,
        checkoutData: {
          orderUpdate,
          clearQuartzChipsAddOn: clearQuartzChipsAddOn ? {
            productId: CLEAR_QUARTZ_CHIPS_PRODUCT_ID,
            productName: clearQuartzChipsAddOn.name,
            productImage: clearQuartzChipsAddOn.image,
            quantity: 1,
            unitPrice: clearQuartzChipsAddOn.price,
            subtotal: clearQuartzChipsAddOn.price
          } : null
        }
      });
    } catch (error) {
      if (error instanceof Error && error.message === "Inactive balance payment cannot be retried") {
        throw new TRPCError5({
          code: "CONFLICT",
          message: "\u5C3E\u6B3E\u72C0\u614B\u5DF2\u66F4\u65B0\uFF0C\u8ACB\u91CD\u65B0\u6574\u7406\u9801\u9762"
        });
      }
      throw error;
    }
    const origin = siteBaseUrl(ctx.req);
    const paymentParams = buildCreditPaymentParams({
      merchantTradeNo: attempt.merchantTradeNo,
      tradeDesc: "\u691BCrystal\u5BA2\u88FD\u5316\u5C3E\u6B3E",
      itemName: balanceItems.map((item) => `${item.name} x${item.quantity}`).join("#"),
      totalAmount,
      returnURL: `${origin}/api/ecpay/notify`,
      orderResultURL: `${origin}/api/ecpay/balance-result`,
      clientBackURL: `${origin}/balance/${encodeURIComponent(balancePayment.merchantTradeNo)}`
    });
    return {
      kind: "credit",
      paymentURL: ECPAY_CONFIG.PaymentURL,
      paymentParams,
      amount: totalAmount,
      shippingFee: feeSummary.shippingFee,
      paymentFee: feeSummary.paymentFee
    };
  }
  await db.update(orderBalancePayments).set({
    paymentMethod: input.paymentMethod,
    shippingFee: feeSummary.shippingFee,
    paymentFee: feeSummary.paymentFee,
    totalAmount,
    paymentStatus: "pending",
    tradeNo: null,
    ecpayNotifyData: null,
    paidAt: null
  }).where(eq11(orderBalancePayments.merchantTradeNo, input.merchantTradeNo));
  const [existingClearQuartzItem] = await db.select().from(orderItems).where(
    and7(
      eq11(orderItems.orderId, balancePayment.orderId),
      eq11(orderItems.productId, CLEAR_QUARTZ_CHIPS_PRODUCT_ID)
    )
  ).limit(1);
  if (clearQuartzChipsAddOn) {
    const itemValues = {
      productName: clearQuartzChipsAddOn.name,
      productImage: clearQuartzChipsAddOn.image,
      quantity: 1,
      unitPrice: clearQuartzChipsAddOn.price,
      subtotal: clearQuartzChipsAddOn.price,
      isPreorder: false
    };
    if (existingClearQuartzItem) {
      await db.update(orderItems).set(itemValues).where(eq11(orderItems.id, existingClearQuartzItem.id));
    } else {
      await db.insert(orderItems).values({
        orderId: balancePayment.orderId,
        productId: CLEAR_QUARTZ_CHIPS_PRODUCT_ID,
        ...itemValues
      });
    }
  }
  await db.update(orders).set({
    ...orderUpdate,
    totalAmount: balancePayment.order.totalAmount - (balancePayment.totalAmount ?? balancePayment.amount) + totalAmount,
    ...clearQuartzChipsAddOn ? { inventoryDeducted: false } : {}
  }).where(eq11(orders.id, balancePayment.orderId));
  return {
    kind: "atm",
    amount: totalAmount,
    shippingFee: feeSummary.shippingFee,
    paymentFee: feeSummary.paymentFee,
    bankInfo: STORE_BANK_INFO
  };
}
var orderRouter = router({
  /**
   * 建立訂單並取得付款資訊
   * - credit：回傳綠界付款表單參數
   * - atm：回傳轉帳帳號資訊
   */
  createAndPay: rateLimitedPublicProcedure({ scope: "checkout", limit: 20, windowMs: 15 * 6e4 }).input(
    z3.object({
      buyerName: z3.string().min(1),
      buyerEmail: z3.string().email(),
      buyerPhone: z3.string().min(1).max(64),
      checkoutRegion: z3.enum(["domestic", "overseas"]),
      paymentMethod: z3.enum(["credit", "atm"]),
      shippingMethod: z3.enum(["cvs_711", "cvs_family", "home"]),
      cvsStoreId: z3.string().optional(),
      cvsStoreName: z3.string().optional(),
      cvsType: z3.string().optional(),
      shippingAddress: z3.string().optional(),
      receiverZipCode: z3.string().optional(),
      intlCountry: z3.string().optional(),
      intlAddrLine1: z3.string().optional(),
      intlAddrLine2: z3.string().optional(),
      intlCity: z3.string().optional(),
      intlState: z3.string().optional(),
      intlPostalCode: z3.string().optional(),
      transferLastFive: z3.string().optional(),
      transferReceiptImageBase64: z3.string().max(8e6).optional(),
      transferReceiptImageContentType: z3.string().optional(),
      transferReceiptImageFilename: z3.string().optional(),
      items: z3.array(CartItemSchema).min(1),
      origin: z3.string(),
      sessionToken: z3.string().optional(),
      customerNote: z3.string().max(1e4).optional(),
      // 只接受會員持有的優惠券 ID；折抵金額一律由伺服器重新計算
      memberCouponId: z3.number().int().positive().optional(),
      expectedPromotion: z3.object({ id: z3.number().nullable(), discount: z3.number().int().min(0), subtotal: z3.number().int().min(0).optional() }).optional()
    }).superRefine((data, ctx) => {
      const isCustomDepositCheckout = data.items.filter((item) => {
        const productId = item.baseProductId ?? item.id;
        return !NON_PRODUCT_ORDER_ITEM_IDS.includes(productId);
      }).some(isCustomCheckoutItem);
      if (data.checkoutRegion === "domestic" && data.paymentMethod === "atm" && !/^\d{5}$/.test(data.transferLastFive ?? "")) {
        ctx.addIssue({
          code: "custom",
          message: "\u8ACB\u8F38\u5165\u9280\u884C\u5E33\u865F\u672B\u4E94\u78BC",
          path: ["transferLastFive"]
        });
      }
      if (data.checkoutRegion === "domestic" && data.paymentMethod === "atm") {
        if (!data.transferReceiptImageBase64 || !data.transferReceiptImageContentType) {
          ctx.addIssue({
            code: "custom",
            message: "\u8ACB\u4E0A\u50B3\u8F49\u5E33\u6210\u529F\u622A\u5716",
            path: ["transferReceiptImageBase64"]
          });
        } else if (!TRANSFER_RECEIPT_CONTENT_TYPES.has(data.transferReceiptImageContentType)) {
          ctx.addIssue({
            code: "custom",
            message: "\u8F49\u5E33\u622A\u5716\u8ACB\u4E0A\u50B3 JPG\u3001PNG \u6216 WebP \u5716\u7247",
            path: ["transferReceiptImageContentType"]
          });
        }
      }
      if (isCustomDepositCheckout) {
        if (!/^09\d{8}$/.test(data.buyerPhone.replace(/\s/g, ""))) {
          ctx.addIssue({
            code: "custom",
            message: "\u8ACB\u8F38\u5165\u6709\u6548\u7684\u624B\u6A5F\u865F\u78BC\uFF0809xxxxxxxx\uFF09",
            path: ["buyerPhone"]
          });
        }
        return;
      }
      if (data.checkoutRegion === "domestic") {
        const phone = data.buyerPhone.replace(/\s/g, "");
        if (!/^09\d{8}$/.test(phone)) {
          ctx.addIssue({
            code: "custom",
            message: "\u8ACB\u8F38\u5165\u53F0\u7063\u624B\u6A5F\u683C\u5F0F\uFF0809 \u958B\u982D\u5171 10 \u78BC\uFF09",
            path: ["buyerPhone"]
          });
        }
        if (data.shippingMethod === "cvs_711" || data.shippingMethod === "cvs_family") {
          if (!data.cvsStoreId?.trim()) {
            ctx.addIssue({ code: "custom", message: "\u8ACB\u9078\u64C7\u8D85\u5546\u9580\u5E02", path: ["cvsStoreId"] });
          }
        }
        if (data.shippingMethod === "home") {
          if (!data.shippingAddress?.trim()) {
            ctx.addIssue({ code: "custom", message: "\u8ACB\u586B\u5BEB\u6536\u4EF6\u5730\u5740", path: ["shippingAddress"] });
          }
          const zip = data.receiverZipCode?.trim() ?? "";
          if (!/^\d{3,6}$/.test(zip)) {
            ctx.addIssue({ code: "custom", message: "\u8ACB\u586B\u5BEB\u90F5\u905E\u5340\u865F", path: ["receiverZipCode"] });
          }
        }
      } else {
        if (data.buyerPhone.trim().length < 8) {
          ctx.addIssue({ code: "custom", message: "\u8ACB\u586B\u5BEB\u806F\u7D61\u96FB\u8A71", path: ["buyerPhone"] });
        }
        const payload = {
          intlCountry: data.intlCountry ?? "",
          intlAddrLine1: data.intlAddrLine1 ?? "",
          intlAddrLine2: data.intlAddrLine2 ?? "",
          intlCity: data.intlCity ?? "",
          intlState: data.intlState ?? "",
          intlPostalCode: data.intlPostalCode ?? ""
        };
        for (const it of validateOverseasAddress(payload)) {
          ctx.addIssue({
            code: "custom",
            message: it.message,
            path: [it.path]
          });
        }
      }
    })
  ).mutation(async ({ input, ctx }) => {
    await ensureOrdersColumns();
    let submittedItems = input.items.filter((item) => {
      const productId = item.baseProductId ?? item.id;
      return !NON_PRODUCT_ORDER_ITEM_IDS.includes(productId);
    }).map((item) => ({ ...item, configurationSnapshot: null }));
    submittedItems = await normalizePurchaseOptionItems(submittedItems);
    if (submittedItems.length === 0) {
      throw new TRPCError5({ code: "BAD_REQUEST", message: "\u8CFC\u7269\u8ECA\u6C92\u6709\u53EF\u7D50\u5E33\u5546\u54C1" });
    }
    const isCustomOrder = isCustomDepositProduct(submittedItems);
    const qualifiedAt = /* @__PURE__ */ new Date();
    const activePromotion = await getActivePromotion(qualifiedAt);
    const productSubtotal = submittedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const activityDiscount = isCustomOrder ? 0 : promotionDiscount(productSubtotal, activePromotion);
    if (input.expectedPromotion && (input.expectedPromotion.id !== (activePromotion?.id ?? null) || input.expectedPromotion.discount !== activityDiscount || input.expectedPromotion.subtotal != null && input.expectedPromotion.subtotal !== productSubtotal)) {
      throw new TRPCError5({ code: "CONFLICT", message: "\u6D3B\u52D5\u6216\u5546\u54C1\u91D1\u984D\u5DF2\u66F4\u65B0\uFF0C\u8ACB\u91CD\u65B0\u6574\u7406\u7D50\u5E33\u9801\u78BA\u8A8D\u91D1\u984D" });
    }
    if (isCustomOrder && input.memberCouponId != null) throw new TRPCError5({ code: "BAD_REQUEST", message: "\u5BA2\u88FD\u512A\u60E0\u5238\u8ACB\u65BC\u6700\u7D42\u5831\u50F9\u5F8C\u5728\u5C3E\u6B3E\u4F7F\u7528" });
    const checkoutRegion = isCustomOrder ? "domestic" : input.checkoutRegion;
    const isOverseas = checkoutRegion === "overseas";
    const shippingMethod = isCustomOrder ? "home" : isOverseas ? "home" : input.shippingMethod;
    const paymentMethod = isOverseas ? "paypal" : input.paymentMethod;
    for (const item of submittedItems) {
      if (item.purchaseOptionUsesOwnStock) continue;
      const productId = item.baseProductId ?? item.id;
      const availability = await getProductAvailability(productId);
      if (availability.isMonthlyLimited && (!availability.available || availability.stock !== -1 && availability.stock < item.quantity)) {
        throw new TRPCError5({
          code: "BAD_REQUEST",
          message: `\u300C${item.name}\u300D\u5DF2\u552E\u5B8C\uFF0C\u7121\u6CD5\u9810\u8CFC\u3002`
        });
      }
    }
    const merchantTradeNo = generateMerchantTradeNo();
    const isPreorder = submittedItems.some((i) => i.isPreorder);
    const buyerEmail = normalizeOrderEmail(input.buyerEmail);
    const orderAccessToken = createOrderAccessToken(merchantTradeNo, buyerEmail) ?? void 0;
    let shippingAddress = isCustomOrder ? void 0 : input.shippingAddress;
    let receiverZipCode = isCustomOrder ? void 0 : input.receiverZipCode;
    let cvsStoreId = isCustomOrder ? void 0 : input.cvsStoreId;
    let cvsStoreName = isCustomOrder ? void 0 : input.cvsStoreName;
    let cvsType = isCustomOrder ? void 0 : input.cvsType;
    let overseasCountry = null;
    if (isOverseas) {
      cvsStoreId = void 0;
      cvsStoreName = void 0;
      cvsType = void 0;
      const countryCode = input.intlCountry.trim();
      if (!isOverseasShipCountryCode(countryCode)) {
        throw new TRPCError5({ code: "BAD_REQUEST", message: "\u4E0D\u652F\u63F4\u7684\u6D77\u5916\u914D\u9001\u5730\u5340" });
      }
      overseasCountry = countryCode;
      const formatted = formatOverseasShippingAddress({
        countryCode,
        line1: input.intlAddrLine1.trim(),
        line2: input.intlAddrLine2 ?? "",
        city: input.intlCity.trim(),
        state: input.intlState ?? "",
        postal: input.intlPostalCode ?? ""
      });
      shippingAddress = formatted.shippingAddress;
      receiverZipCode = formatted.receiverZipCode;
    }
    const feeItemsForCalculation = await attachTwoItemFreeShippingEligibility(submittedItems);
    const feeSummary = isCustomOrder ? {
      shippingFee: 0,
      total: submittedItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    } : calcCheckoutFees({
      items: feeItemsForCalculation,
      checkoutRegion,
      shippingMethod,
      paymentMethod,
      overseasCountry,
      buyerEmail
    });
    const feeItems = [];
    if (feeSummary.shippingFee > 0) {
      feeItems.push({
        id: "shipping-fee",
        baseProductId: "shipping-fee",
        name: isOverseas ? `\u6D77\u5916\u904B\u8CBB - ${OVERSEAS_SHIP_COUNTRY_LABELS[overseasCountry]}` : shippingMethod === "home" ? "\u904B\u8CBB - \u9ED1\u8C93\u5B85\u6025\u4FBF" : shippingMethod === "cvs_711" ? "\u904B\u8CBB - 7-11\u5E97\u5230\u5E97" : "\u904B\u8CBB - \u5168\u5BB6\u5E97\u5230\u5E97",
        price: feeSummary.shippingFee,
        quantity: 1,
        image: "",
        configurationSnapshot: null
      });
    }
    if (activityDiscount > 0) feeItems.push({ id: PROMOTION_DISCOUNT_PRODUCT_ID, baseProductId: PROMOTION_DISCOUNT_PRODUCT_ID, name: `\u6D3B\u52D5\u6298\u62B5 - ${activePromotion.name}`, price: -activityDiscount, quantity: 1, image: "", configurationSnapshot: null });
    let totalAmount = feeSummary.total - activityDiscount;
    const couponUserId = ctx.user?.id ?? null;
    let couponToReserve = null;
    if (input.memberCouponId != null) {
      if (couponUserId == null) {
        throw new TRPCError5({ code: "UNAUTHORIZED", message: "\u8ACB\u5148\u767B\u5165\u6703\u54E1\u624D\u80FD\u4F7F\u7528\u512A\u60E0\u5238" });
      }
      let coupon;
      try {
        coupon = await getCouponForCheckout(input.memberCouponId, couponUserId);
      } catch (error) {
        if (error instanceof CouponError) throw new TRPCError5({ code: "BAD_REQUEST", message: error.message });
        throw error;
      }
      const productSubtotal2 = submittedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const discount = calcCouponDiscount({
        subtotal: productSubtotal2 - activityDiscount,
        shippingFee: feeSummary.shippingFee,
        coupon
      });
      if (!discount.ok) {
        throw new TRPCError5({ code: "BAD_REQUEST", message: `\u300C${coupon.name}\u300D\u7121\u6CD5\u4F7F\u7528\uFF1A${discount.reason}` });
      }
      feeItems.push({
        id: COUPON_DISCOUNT_PRODUCT_ID,
        baseProductId: COUPON_DISCOUNT_PRODUCT_ID,
        name: `\u512A\u60E0\u5238\u6298\u62B5 - ${coupon.name}`,
        price: -discount.discount,
        quantity: 1,
        image: "",
        configurationSnapshot: null
      });
      totalAmount = discount.total;
      couponToReserve = { id: coupon.id };
    }
    const orderItems2 = submittedItems.concat(feeItems);
    let transferReceiptUrl;
    if (paymentMethod === "atm") {
      const receiptBase64 = input.transferReceiptImageBase64;
      const receiptContentType = input.transferReceiptImageContentType;
      if (!receiptBase64 || !receiptContentType || !TRANSFER_RECEIPT_CONTENT_TYPES.has(receiptContentType)) {
        throw new TRPCError5({ code: "BAD_REQUEST", message: "\u8ACB\u4E0A\u50B3\u8F49\u5E33\u6210\u529F\u622A\u5716" });
      }
      const receiptBuffer = Buffer.from(receiptBase64, "base64");
      if (receiptBuffer.length === 0 || receiptBuffer.length > 6 * 1024 * 1024) {
        throw new TRPCError5({ code: "BAD_REQUEST", message: "\u8F49\u5E33\u622A\u5716\u5927\u5C0F\u9700\u5C0F\u65BC 6MB" });
      }
      const ext = getReceiptExtension(receiptContentType, input.transferReceiptImageFilename);
      const uploaded = await storagePut(`transfer-receipts/${merchantTradeNo}-${Date.now()}.${ext}`, receiptBuffer, receiptContentType);
      transferReceiptUrl = uploaded.url;
    }
    const itemName = orderItems2.map((i) => `${i.name} x${i.quantity}`).join("#");
    const orderRow = {
      merchantTradeNo,
      paymentStatus: paymentMethod === "atm" ? "transfer_pending" : "pending",
      paymentMethod,
      shippingMethod,
      deliveryRegion: checkoutRegion,
      orderStatus: "pending_payment",
      isPreorder,
      isCustomOrder,
      totalAmount,
      createdAt: qualifiedAt,
      promotionFlowVersion: PROMOTION_FLOW_VERSION,
      promotion: activePromotion ? { rule: activePromotion, qualifiedAt: qualifiedAt.toISOString(), discount: activityDiscount } : null,
      buyerName: input.buyerName,
      buyerEmail,
      buyerPhone: input.buyerPhone,
      cvsStoreId,
      cvsStoreName,
      cvsType,
      shippingAddress,
      receiverZipCode,
      transferLastFive: paymentMethod === "atm" ? input.transferLastFive : void 0,
      transferReceiptUrl,
      customerNote: input.customerNote ?? null
    };
    if (ctx.user?.id != null) {
      orderRow.userId = ctx.user.id;
    }
    const couponReservedAt = couponToReserve && couponUserId != null ? await reserveCoupon(couponToReserve.id, couponUserId) : null;
    if (couponToReserve && !couponReservedAt) {
      throw new TRPCError5({ code: "BAD_REQUEST", message: "\u9019\u5F35\u512A\u60E0\u5238\u76EE\u524D\u7121\u6CD5\u4F7F\u7528\uFF0C\u8ACB\u91CD\u65B0\u6574\u7406\u5F8C\u518D\u8A66" });
    }
    let createdOrderId;
    try {
      createdOrderId = await createOrder(
        orderRow,
        orderItems2.map((item) => ({
          orderId: 0,
          productId: item.baseProductId ?? item.id,
          productName: item.name,
          productImage: item.image ?? "",
          quantity: item.quantity,
          unitPrice: item.price,
          subtotal: item.price * item.quantity,
          purchaseOptionId: item.purchaseOptionId ?? null,
          configurationSnapshot: item.configurationSnapshot,
          isPreorder: item.isPreorder ?? false
        }))
      );
    } catch (error) {
      if (couponToReserve && couponReservedAt) await cancelCouponReservation(couponToReserve.id, couponReservedAt);
      throw error;
    }
    if (couponToReserve && couponReservedAt) {
      const attached = await attachReservedCouponToOrder(couponToReserve.id, couponReservedAt, createdOrderId);
      if (!attached) {
        await deleteCancelledOrderRecords(await getDb(), [createdOrderId]);
        throw new TRPCError5({ code: "BAD_REQUEST", message: "\u9019\u5F35\u512A\u60E0\u5238\u76EE\u524D\u7121\u6CD5\u4F7F\u7528\uFF0C\u8ACB\u91CD\u65B0\u6574\u7406\u5F8C\u518D\u8A66" });
      }
    }
    if (paymentMethod === "atm") {
      await notifyCustomerOrderPlacedSafely(createdOrderId);
    }
    const origin = siteBaseUrl(ctx.req);
    if (paymentMethod === "paypal") {
      const returnUrl = `${origin}/order/${encodeURIComponent(merchantTradeNo)}?paypal_return=1`;
      const cancelUrl = `${origin}/order/${encodeURIComponent(merchantTradeNo)}?paypal_cancel=1`;
      try {
        const { approvalUrl } = await createPayPalCheckoutOrder({
          merchantTradeNo,
          totalAmountTwd: totalAmount,
          returnUrl,
          cancelUrl
        });
        return {
          kind: "paypal",
          merchantTradeNo,
          orderAccessToken,
          approvalUrl
        };
      } catch (e) {
        console.error("[createAndPay paypal]", e);
        const missing = e instanceof Error && e.message === "PAYPAL_CREDENTIALS_MISSING";
        throw new TRPCError5({
          code: missing ? "PRECONDITION_FAILED" : "INTERNAL_SERVER_ERROR",
          message: missing ? "\u6D77\u5916 PayPal \u4ED8\u6B3E\u5C1A\u672A\u5B8C\u6210\u5546\u5E97\u8A2D\u5B9A\uFF0C\u8ACB\u6539\u9078\u570B\u5167\u7D50\u5E33\u6216\u806F\u7D61\u5BA2\u670D\u3002" : "\u5EFA\u7ACB PayPal \u4ED8\u6B3E\u5931\u6557\uFF0C\u8ACB\u7A0D\u5F8C\u518D\u8A66\u3002"
        });
      }
    }
    if (paymentMethod === "atm") {
      await deductInventoryAfterPayment(merchantTradeNo);
      return {
        kind: "atm",
        paymentMethod: "atm",
        merchantTradeNo,
        orderAccessToken,
        bankInfo: STORE_BANK_INFO
      };
    }
    const returnURL = `${origin}/api/ecpay/notify`;
    const orderResultURL = `${origin}/api/ecpay/order-result`;
    const clientBackURL = `${origin}/products`;
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
      kind: "ecpay_credit",
      paymentMethod: "credit",
      merchantTradeNo,
      orderAccessToken,
      paymentURL: ECPAY_CONFIG.PaymentURL,
      paymentParams
    };
  }),
  /**
   * PayPal 核准後於 return 頁呼叫：驗證訂單與 PayPal Order 後 Capture
   */
  capturePayPal: rateLimitedPublicProcedure({ scope: "paypal-capture", limit: 20, windowMs: 15 * 6e4 }).input(
    z3.object({
      merchantTradeNo: z3.string().min(1),
      paypalOrderId: z3.string().min(1)
    })
  ).mutation(async ({ input }) => {
    const order = await getOrderWithItems(input.merchantTradeNo);
    if (!order) {
      throw new TRPCError5({ code: "NOT_FOUND", message: "\u627E\u4E0D\u5230\u8A02\u55AE" });
    }
    if (order.paymentMethod !== "paypal") {
      throw new TRPCError5({ code: "BAD_REQUEST", message: "\u6B64\u8A02\u55AE\u7121\u9700 PayPal \u6263\u6B3E" });
    }
    if (order.paymentStatus === "paid" || order.paymentStatus === "confirmed") {
      await recordAuditEventSafely({
        source: "paypal",
        category: "payment",
        action: "paypal.capture",
        outcome: "duplicate",
        orderId: order.id,
        merchantTradeNo: input.merchantTradeNo,
        summary: "\u5DF2\u4ED8\u6B3E\u7684 PayPal \u8A02\u55AE\u91CD\u8907\u8981\u6C42 Capture\uFF0C\u5DF2\u5FFD\u7565",
        details: { paypalOrderId: input.paypalOrderId }
      });
      return { success: true, alreadyPaid: true };
    }
    if (order.paymentStatus !== "pending") {
      throw new TRPCError5({ code: "BAD_REQUEST", message: "\u8A02\u55AE\u72C0\u614B\u7121\u6CD5\u5B8C\u6210\u4ED8\u6B3E" });
    }
    try {
      await verifyPayPalOrderBelongsToMerchant(input.paypalOrderId, input.merchantTradeNo);
    } catch (e) {
      console.error("[capturePayPal verify]", e);
      await recordAuditEventSafely({
        source: "paypal",
        category: "payment",
        action: "paypal.capture.verify",
        outcome: "rejected",
        severity: "warning",
        orderId: order.id,
        merchantTradeNo: input.merchantTradeNo,
        summary: "PayPal \u8A02\u55AE\u6B78\u5C6C\u9A57\u8B49\u5931\u6557",
        details: { paypalOrderId: input.paypalOrderId, error: e instanceof Error ? e.message : String(e) }
      });
      throw new TRPCError5({
        code: "FORBIDDEN",
        message: e instanceof Error && e.message === "PAYPAL_ORDER_MISMATCH" ? "\u4ED8\u6B3E\u8CC7\u6599\u8207\u8A02\u55AE\u4E0D\u7B26" : "\u7121\u6CD5\u9A57\u8B49 PayPal \u8A02\u55AE"
      });
    }
    try {
      const cap = await capturePayPalOrder(input.paypalOrderId);
      if (cap.status !== "completed") {
        throw new TRPCError5({
          code: "BAD_REQUEST",
          message: cap.message ?? "PayPal \u6263\u6B3E\u5931\u6557"
        });
      }
      await markOrderPaidPayPal(input.merchantTradeNo, cap.captureId, cap.raw);
      await markCouponUsedForOrderSafely(order.id, { merchantTradeNo: input.merchantTradeNo });
      await deductInventoryAfterPayment(input.merchantTradeNo);
      await notifyCustomerOrderPlacedSafely(order.id);
      await recordAuditEventSafely({
        source: "paypal",
        category: "payment",
        action: "paypal.capture",
        outcome: "success",
        orderId: order.id,
        merchantTradeNo: input.merchantTradeNo,
        summary: "PayPal \u8A02\u55AE Capture \u6210\u529F",
        details: { paypalOrderId: input.paypalOrderId, captureId: cap.captureId }
      });
      return { success: true, alreadyPaid: false };
    } catch (e) {
      await recordAuditEventSafely({
        source: "paypal",
        category: "payment",
        action: "paypal.capture",
        outcome: "failed",
        severity: "error",
        orderId: order.id,
        merchantTradeNo: input.merchantTradeNo,
        summary: "PayPal \u8A02\u55AE Capture \u5931\u6557",
        details: { paypalOrderId: input.paypalOrderId, error: e instanceof Error ? e.message : String(e) }
      });
      if (e instanceof TRPCError5) throw e;
      console.error("[capturePayPal]", e);
      throw new TRPCError5({
        code: "INTERNAL_SERVER_ERROR",
        message: e instanceof Error ? e.message : "PayPal \u6263\u6B3E\u767C\u751F\u932F\u8AA4"
      });
    }
  }),
  /**
   * 查詢訂單（含商品明細）
   */
  getOrder: rateLimitedPublicProcedure({ scope: "order-read", limit: 240, windowMs: 15 * 6e4 }).input(OrderAccessSchema).query(async ({ input, ctx }) => {
    const order = await getOrderWithItems(input.merchantTradeNo);
    if (!order) {
      enforceRateLimit(ctx.req, ctx.res, "order-read-miss", 12, 15 * 6e4);
      return null;
    }
    assertOrderAccess(order, ctx, input);
    return {
      ...toCustomerFacingOrder(order),
      paymentSandbox: usePaymentSandbox
    };
  }),
  submitCustomConsultation: publicProcedure.input(
    z3.object({
      merchantTradeNo: z3.string().min(1),
      accessToken: z3.string().min(1).optional(),
      buyerEmail: z3.string().trim().email().optional(),
      productId: z3.enum([
        "custom-deposit-product",
        "tarot-crystal-deposit-product",
        "chakra-crystal-deposit-product",
        "numerology-crystal-deposit-product"
      ]),
      orderItemId: z3.number().int().positive().optional(),
      itemIndex: z3.number().int().positive().optional(),
      customerNote: z3.string().min(1).max(1e4)
    })
  ).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const order = await getOrderWithItems(input.merchantTradeNo);
    if (!order) {
      throw new TRPCError5({ code: "NOT_FOUND", message: "\u627E\u4E0D\u5230\u8A02\u55AE" });
    }
    assertOrderAccess(order, ctx, input);
    if (!order.isCustomOrder) {
      throw new TRPCError5({ code: "BAD_REQUEST", message: "\u6B64\u8A02\u55AE\u4E0D\u662F\u5BA2\u88FD\u5316\u8A02\u91D1\u8A02\u55AE" });
    }
    const hasMatchingProduct = order.items.some((item) => item.productId === input.productId);
    if (!hasMatchingProduct) {
      throw new TRPCError5({ code: "BAD_REQUEST", message: "\u8868\u55AE\u65B9\u6848\u8207\u8A02\u55AE\u5546\u54C1\u4E0D\u7B26" });
    }
    const targetItem = input.orderItemId ? order.items.find((item) => item.id === input.orderItemId && item.productId === input.productId) : order.items.find((item) => item.productId === input.productId);
    if (!targetItem) {
      throw new TRPCError5({ code: "BAD_REQUEST", message: "\u627E\u4E0D\u5230\u9019\u4E00\u7B46\u5BA2\u88FD\u8A02\u91D1\u5546\u54C1" });
    }
    const itemIndex = input.itemIndex ?? 1;
    if (itemIndex < 1 || itemIndex > targetItem.quantity) {
      throw new TRPCError5({ code: "BAD_REQUEST", message: "\u5BA2\u88FD\u8868\u55AE\u4EF6\u6578\u8207\u8A02\u55AE\u5546\u54C1\u4E0D\u7B26" });
    }
    const canSubmit = order.paymentStatus === "paid" || order.paymentStatus === "confirmed" || order.paymentStatus === "transfer_pending";
    if (!canSubmit) {
      throw new TRPCError5({ code: "BAD_REQUEST", message: "\u8ACB\u5148\u5B8C\u6210\u4ED8\u6B3E\u5F8C\u518D\u586B\u5BEB\u5BA2\u88FD\u9700\u6C42" });
    }
    if (order.orderStatus === "cancelled" || order.paymentStatus === "failed" || order.paymentStatus === "cancelled") {
      throw new TRPCError5({ code: "BAD_REQUEST", message: "\u6B64\u8A02\u55AE\u72C0\u614B\u7121\u6CD5\u586B\u5BEB\u5BA2\u88FD\u9700\u6C42" });
    }
    const saved = await saveCustomConsultationNote({
      merchantTradeNo: input.merchantTradeNo,
      productId: input.productId,
      customerNote: input.customerNote,
      orderItemId: input.orderItemId,
      itemIndex: input.itemIndex,
      expectedNote: order.customerNote
    });
    if (!saved) {
      throw new TRPCError5({
        code: "CONFLICT",
        message: "\u9019\u7B46\u8A02\u55AE\u525B\u624D\u6709\u5176\u4ED6\u66F4\u65B0\uFF0C\u8ACB\u91CD\u65B0\u6574\u7406\u5F8C\u518D\u9001\u51FA\u4E00\u6B21"
      });
    }
    return { success: true };
  }),
  /**
   * 客人填入轉帳匯款末五碼
   */
  submitTransferCode: publicProcedure.input(z3.object({
    merchantTradeNo: z3.string(),
    accessToken: z3.string().min(1).optional(),
    buyerEmail: z3.string().trim().email().optional(),
    lastFive: z3.string().length(5).regex(/^\d+$/)
  })).mutation(async ({ input, ctx }) => {
    const order = await getOrderWithItems(input.merchantTradeNo);
    if (!order) throw new TRPCError5({ code: "NOT_FOUND", message: "\u627E\u4E0D\u5230\u8A02\u55AE" });
    assertOrderAccess(order, ctx, input);
    await updateOrderTransferLastFive(input.merchantTradeNo, input.lastFive);
    return { success: true };
  }),
  /**
   * 老闆確認轉帳收款（管理後台）
   */
  confirmTransfer: adminProcedure.input(z3.object({ orderId: z3.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [order] = await db.select({ merchantTradeNo: orders.merchantTradeNo }).from(orders).where(eq11(orders.id, input.orderId)).limit(1);
    if (!order) throw new Error("Order not found");
    await confirmTransferPayment(order.merchantTradeNo);
    await markCouponUsedForOrderSafely(input.orderId, { merchantTradeNo: order.merchantTradeNo });
    await deductInventoryAfterPayment(order.merchantTradeNo);
    return { success: true };
  }),
  /**
   * 手動更新訂單狀態（管理後台）
   */
  updateOrderStatus: adminProcedure.input(z3.object({
    orderId: z3.number(),
    status: z3.enum(["pending_payment", "transfer_pending", "deposit_paid", "paid", "processing", "shipped", "arrived", "picked_up", "not_picked", "completed", "cancelled"])
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [order] = await db.select({ id: orders.id, merchantTradeNo: orders.merchantTradeNo }).from(orders).where(eq11(orders.id, input.orderId)).limit(1);
    if (!order) throw new Error("Order not found");
    const operationContext = await getOrderOperationContext(db, input.orderId);
    if (input.status === "transfer_pending") {
      await db.update(orders).set({ paymentStatus: "transfer_pending" }).where(eq11(orders.id, order.id));
      return { success: true };
    }
    if (MERGED_ORDER_SYNC_STATUSES.has(input.status)) {
      if (FULFILLMENT_STATUSES.has(input.status)) {
        await assertReadyForFulfillment(db, operationContext);
      }
      await db.update(orders).set({ orderStatus: input.status }).where(inArray3(orders.id, operationContext.orderIds));
      if (input.status === "cancelled") {
        const affectedOrders = await db.select({ merchantTradeNo: orders.merchantTradeNo }).from(orders).where(inArray3(orders.id, operationContext.orderIds));
        await Promise.all(
          affectedOrders.map((affectedOrder) => restoreInventoryOnCancel(affectedOrder.merchantTradeNo))
        );
        await releaseCouponsForOrdersSafely(operationContext.orderIds, {
          includeUsed: true,
          reason: "\u7BA1\u7406\u54E1\u53D6\u6D88\u8A02\u55AE",
          actorUserId: ctx.user.id
        });
      } else if (COUPON_CONSUMING_ORDER_STATUSES.has(input.status)) {
        await Promise.all(operationContext.orderIds.map((orderId) => markCouponUsedForOrderSafely(orderId)));
      }
      if (input.status === "shipped") {
        await Promise.all(
          operationContext.orderIds.map((orderId) => notifyCustomerOrderShippedSafely(orderId))
        );
      }
      return { success: true };
    }
    await updateOrderStatus(order.merchantTradeNo, input.status);
    if (input.status === "paid") {
      await db.update(orders).set({ paymentStatus: "paid", paidAt: /* @__PURE__ */ new Date() }).where(eq11(orders.id, order.id));
      await deductInventoryAfterPayment(order.merchantTradeNo);
    }
    if (COUPON_CONSUMING_ORDER_STATUSES.has(input.status)) {
      await markCouponUsedForOrderSafely(order.id, { merchantTradeNo: order.merchantTradeNo });
    }
    return { success: true };
  }),
  /**
   * 刪除已取消訂單（管理後台）
   */
  deleteCancelledOrder: adminProcedure.input(z3.object({ orderId: z3.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [order] = await db.select({ id: orders.id, orderStatus: orders.orderStatus }).from(orders).where(eq11(orders.id, input.orderId)).limit(1);
    if (!order) throw new TRPCError5({ code: "NOT_FOUND", message: "Order not found" });
    if (order.orderStatus !== "cancelled") {
      throw new TRPCError5({ code: "BAD_REQUEST", message: "\u53EA\u80FD\u522A\u9664\u5DF2\u53D6\u6D88\u7684\u8A02\u55AE" });
    }
    await deleteCancelledOrderRecords(db, [order.id]);
    return { success: true };
  }),
  /**
   * 批次刪除已取消訂單（管理後台）
   */
  deleteCancelledOrders: adminProcedure.input(
    z3.object({
      orderIds: z3.array(z3.number().int().positive()).min(1).max(100)
    })
  ).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const orderIds = Array.from(new Set(input.orderIds));
    const rows = await db.select({
      id: orders.id,
      orderStatus: orders.orderStatus,
      merchantTradeNo: orders.merchantTradeNo
    }).from(orders).where(inArray3(orders.id, orderIds));
    if (rows.length !== orderIds.length) {
      throw new TRPCError5({ code: "NOT_FOUND", message: "\u90E8\u5206\u8A02\u55AE\u4E0D\u5B58\u5728\uFF0C\u8ACB\u91CD\u65B0\u6574\u7406\u5F8C\u518D\u8A66" });
    }
    const notCancelled = rows.filter((order) => order.orderStatus !== "cancelled");
    if (notCancelled.length > 0) {
      throw new TRPCError5({
        code: "BAD_REQUEST",
        message: `\u53EA\u80FD\u522A\u9664\u5DF2\u53D6\u6D88\u7684\u8A02\u55AE\uFF1A${notCancelled.map((order) => order.merchantTradeNo).join(", ")}`
      });
    }
    await deleteCancelledOrderRecords(db, orderIds);
    return { success: true, deletedCount: orderIds.length };
  }),
  /**
   * 手動合併訂單：有客製化時用第一筆選取的客製化作為主訂單；
   * 純一般商品合併時，使用最晚建立的訂單作為主訂單。
   */
  mergeOrders: adminProcedure.input(
    z3.object({
      orderIds: z3.array(z3.number().int().positive()).min(2).max(20),
      adminNote: z3.string().max(1e3).optional()
    })
  ).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const orderIds = Array.from(new Set(input.orderIds));
    if (orderIds.length < 2) {
      throw new TRPCError5({ code: "BAD_REQUEST", message: "\u8ACB\u81F3\u5C11\u9078\u53D6\u5169\u7B46\u4E0D\u540C\u8A02\u55AE" });
    }
    const rows = await db.select().from(orders).where(inArray3(orders.id, orderIds));
    if (rows.length !== orderIds.length) {
      throw new TRPCError5({ code: "NOT_FOUND", message: "\u90E8\u5206\u8A02\u55AE\u4E0D\u5B58\u5728\uFF0C\u8ACB\u91CD\u65B0\u6574\u7406\u5F8C\u518D\u8A66" });
    }
    const customOrderIds = new Set(rows.filter((order) => order.isCustomOrder).map((order) => order.id));
    const unmergeable = rows.filter((order) => !mergeableOrderStatuses.has(order.orderStatus));
    if (unmergeable.length > 0) {
      throw new TRPCError5({
        code: "BAD_REQUEST",
        message: `\u53EA\u80FD\u5408\u4F75\u5C1A\u672A\u51FA\u8CA8/\u672A\u53D6\u6D88\u7684\u8A02\u55AE\uFF1A${unmergeable.map((order) => order.merchantTradeNo).join(", ")}`
      });
    }
    const normalizedEmails = new Set(rows.map((order) => normalizeOrderEmail(order.buyerEmail)));
    if (normalizedEmails.size > 1) {
      throw new TRPCError5({ code: "BAD_REQUEST", message: "\u53EA\u80FD\u5408\u4F75\u540C\u4E00\u4F4D\u8CB7\u5BB6\u7684\u8A02\u55AE" });
    }
    const existingLogistics = await db.select({ orderId: logisticsOrders.orderId }).from(logisticsOrders).where(inArray3(logisticsOrders.orderId, orderIds));
    if (existingLogistics.length > 0) {
      throw new TRPCError5({ code: "BAD_REQUEST", message: "\u5DF2\u6709\u7269\u6D41\u55AE\u7684\u8A02\u55AE\u4E0D\u80FD\u518D\u5408\u4F75" });
    }
    const existingMergeMembers = await db.select({ orderId: orderMergeMembers.orderId }).from(orderMergeMembers).where(inArray3(orderMergeMembers.orderId, orderIds));
    if (existingMergeMembers.length > 0) {
      throw new TRPCError5({ code: "BAD_REQUEST", message: "\u9078\u53D6\u7684\u8A02\u55AE\u5DF2\u6709\u5408\u4F75\u7D00\u9304" });
    }
    const latestOrder = rows.reduce(
      (latest, order) => new Date(order.createdAt).getTime() > new Date(latest.createdAt).getTime() ? order : latest
    );
    const mainOrderId = orderIds.find((orderId) => customOrderIds.has(orderId)) ?? latestOrder.id;
    const mainOrder = rows.find((order) => order.id === mainOrderId);
    if (!mainOrder) {
      throw new TRPCError5({ code: "BAD_REQUEST", message: "\u627E\u4E0D\u5230\u53EF\u4F5C\u70BA\u4E3B\u8A02\u55AE\u7684\u8A02\u55AE" });
    }
    const promotionOrders = rows.filter(usesPromotionFlow);
    if (promotionOrders.length > 0 && promotionOrders.length !== rows.length) throw new TRPCError5({ code: "BAD_REQUEST", message: "\u65B0\u820A\u6D41\u7A0B\u8A02\u55AE\u66AB\u4E0D\u652F\u63F4\u8DE8\u7248\u672C\u5408\u4F75\uFF1B\u8ACB\u5206\u5225\u8655\u7406\u5C3E\u6B3E" });
    if (promotionOrders.length > 0) {
      const activeBalances = await db.select().from(orderBalancePayments).where(inArray3(orderBalancePayments.orderId, orderIds));
      if (activeBalances.length) throw new TRPCError5({ code: "BAD_REQUEST", message: "\u8ACB\u5728\u7522\u751F\u5C3E\u6B3E\u9023\u7D50\u524D\u5408\u4F75\u8A02\u55AE\uFF0C\u907F\u514D\u65E2\u6709\u4ED8\u6B3E\u9023\u7D50\u91D1\u984D\u5931\u6548" });
    }
    const mergeCode = generateOrderMergeCode();
    await db.insert(orderMergeGroups).values({
      mergeCode,
      mainOrderId: mainOrder.id,
      adminNote: input.adminNote?.trim() || null
    });
    const [group] = await db.select().from(orderMergeGroups).where(eq11(orderMergeGroups.mergeCode, mergeCode)).limit(1);
    if (!group) {
      throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "\u5408\u4F75\u7FA4\u7D44\u5EFA\u7ACB\u5931\u6557" });
    }
    await db.insert(orderMergeMembers).values(orderIds.map((orderId) => ({
      groupId: group.id,
      orderId
    })));
    await db.update(orders).set({ freeShippingOverride: true }).where(inArray3(orders.id, orderIds));
    return {
      success: true,
      mergeCode,
      groupId: group.id,
      mainOrderId: mainOrder.id,
      mainOrderMerchantTradeNo: mainOrder.merchantTradeNo,
      mergedOrderIds: orderIds
    };
  }),
  updateFreeShippingOverride: adminProcedure.input(z3.object({
    orderId: z3.number().int().positive(),
    freeShippingOverride: z3.boolean()
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [order] = await db.select({ id: orders.id }).from(orders).where(eq11(orders.id, input.orderId)).limit(1);
    if (!order) {
      throw new TRPCError5({ code: "NOT_FOUND", message: "Order not found" });
    }
    const [mergeMember] = await db.select({
      groupId: orderMergeMembers.groupId,
      mainOrderId: orderMergeGroups.mainOrderId
    }).from(orderMergeMembers).leftJoin(orderMergeGroups, eq11(orderMergeMembers.groupId, orderMergeGroups.id)).where(eq11(orderMergeMembers.orderId, input.orderId)).limit(1);
    if (mergeMember?.mainOrderId && mergeMember.mainOrderId !== input.orderId) {
      throw new TRPCError5({ code: "BAD_REQUEST", message: "\u8ACB\u5F9E\u5408\u4F75\u4E3B\u8A02\u55AE\u8ABF\u6574\u514D\u904B\u8A2D\u5B9A" });
    }
    if (mergeMember?.groupId) {
      const mergeRows = await db.select({ orderId: orderMergeMembers.orderId }).from(orderMergeMembers).where(eq11(orderMergeMembers.groupId, mergeMember.groupId));
      const orderIds = mergeRows.map((row) => row.orderId);
      if (orderIds.length > 0) {
        await db.update(orders).set({ freeShippingOverride: input.freeShippingOverride }).where(inArray3(orders.id, orderIds));
      }
    } else {
      await db.update(orders).set({ freeShippingOverride: input.freeShippingOverride }).where(eq11(orders.id, input.orderId));
    }
    return { success: true, freeShippingOverride: input.freeShippingOverride };
  }),
  setCustomFinalPrice: adminProcedure.input(z3.object({ orderId: z3.number().int().positive(), finalPrice: z3.number().int().min(0).max(1e7) })).mutation(async ({ input }) => {
    try {
      return await setCustomFinalPrice(input.orderId, input.finalPrice);
    } catch (error) {
      throw new TRPCError5({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "\u8A2D\u5B9A\u5831\u50F9\u5931\u6557" });
    }
  }),
  createBalancePaymentLink: adminProcedure.input(
    z3.object({
      orderId: z3.number(),
      amount: z3.number().int().min(0).optional(),
      balances: z3.array(z3.object({ orderId: z3.number().int().positive(), amount: z3.number().int().min(0).max(1e7) })).min(1).max(20).optional()
    })
  ).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [mergeMember] = await db.select({
      mainOrderId: orderMergeGroups.mainOrderId
    }).from(orderMergeMembers).leftJoin(orderMergeGroups, eq11(orderMergeMembers.groupId, orderMergeGroups.id)).where(eq11(orderMergeMembers.orderId, input.orderId)).limit(1);
    if (mergeMember?.mainOrderId && mergeMember.mainOrderId !== input.orderId) {
      throw new TRPCError5({ code: "BAD_REQUEST", message: "\u88AB\u5408\u4F75\u8A02\u55AE\u4E0D\u53EF\u7522\u751F\u5C3E\u6B3E\uFF0C\u8ACB\u5F9E\u4E3B\u8A02\u55AE\u7522\u751F\u5408\u4F75\u5C3E\u6B3E" });
    }
    let payment;
    try {
      payment = await createOrReplaceBalancePayment(input);
    } catch (error) {
      throw new TRPCError5({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "\u7522\u751F\u5C3E\u6B3E\u9023\u7D50\u5931\u6557" });
    }
    const origin = siteBaseUrl(ctx.req);
    return {
      merchantTradeNo: payment.merchantTradeNo,
      amount: payment.amount,
      payableAmount: payment.totalAmount ?? payment.amount,
      paymentLink: `${origin}/balance/${encodeURIComponent(payment.merchantTradeNo)}`
    };
  }),
  /** 管理員明確確認客製訂單無尾款；沒有尾款紀錄仍代表尚未報價。 */
  settleZeroBalance: adminProcedure.input(z3.object({
    orderId: z3.number().int().positive(),
    note: z3.string().max(500).optional()
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await getOrderOperationContext(db, input.orderId);
    try {
      const result = await settleZeroBalancePayment(input.orderId, {
        adminUserId: ctx.user.id,
        note: input.note
      });
      return { success: true, merchantTradeNo: result.merchantTradeNo };
    } catch (error) {
      const message = error instanceof Error ? error.message : "\u78BA\u8A8D\u96F6\u5C3E\u6B3E\u5931\u6557";
      throw new TRPCError5({ code: "BAD_REQUEST", message });
    }
  }),
  /**
   * 建立物流訂單（管理後台）
   */
  createLogistics: adminProcedure.input(z3.object({ orderId: z3.number() })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [order] = await db.select().from(orders).where(eq11(orders.id, input.orderId)).limit(1);
    if (!order) throw new Error("Order not found");
    const operationContext = await getOrderOperationContext(db, input.orderId);
    await assertReadyForFulfillment(db, operationContext);
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
    const serverReplyURL = `${siteBaseUrl(ctx.req)}/api/ecpay/logistics-notify`;
    let ecpayResult;
    try {
      if (order.shippingMethod === "home") {
        ecpayResult = await createHomeLogisticsOrder({
          logisticsMerchantTradeNo,
          goodsName: "\u691BCrystal\u80FD\u91CF\u6C34\u6676",
          goodsAmount: order.totalAmount,
          senderName: process.env.SENDER_NAME || "\u9673\u67D4\u85AB",
          senderPhone: process.env.SENDER_PHONE || "0903288876",
          senderZipCode: process.env.SENDER_ZIPCODE || "330",
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
          senderPhone: process.env.SENDER_PHONE || "0903288876",
          senderZipCode: process.env.SENDER_ZIPCODE || "330",
          receiverName: normalizedReceiverName,
          receiverPhone: order.buyerPhone,
          receiverStoreID: order.cvsStoreId || "",
          logisticsSubType,
          serverReplyURL
        });
      }
      console.log("[createLogistics] ECPay result", {
        success: ecpayResult.success,
        allPayLogisticsId: ecpayResult.allPayLogisticsId ?? null,
        rtnMsg: ecpayResult.rtnMsg ?? null
      });
      if (ecpayResult.success) {
        await db.update(logisticsOrders).set({
          allPayLogisticsId: ecpayResult.allPayLogisticsId || null,
          cvsPaymentNo: ecpayResult.cvsPaymentNo || null,
          cvsValidationNo: ecpayResult.cvsValidationNo || null,
          bookingNote: ecpayResult.bookingNote || null,
          logisticsStatus: "in_transit",
          ecpayLogisticsData: ecpayResult.raw
        }).where(eq11(logisticsOrders.logisticsMerchantTradeNo, logisticsMerchantTradeNo));
        if (operationContext.groupId) {
          await db.update(orders).set({ orderStatus: "shipped" }).where(inArray3(orders.id, operationContext.orderIds));
          await Promise.all(
            operationContext.orderIds.map((orderId) => notifyCustomerOrderShippedSafely(orderId))
          );
        } else {
          await updateOrderStatus(order.merchantTradeNo, "shipped");
          await notifyCustomerOrderShippedSafely(input.orderId);
        }
        return {
          success: true,
          sandbox: useLogisticsSandbox,
          logisticsId: logisticsMerchantTradeNo,
          logisticsSubType,
          allPayLogisticsId: ecpayResult.allPayLogisticsId,
          cvsPaymentNo: ecpayResult.cvsPaymentNo || null,
          cvsValidationNo: ecpayResult.cvsValidationNo || null,
          bookingNote: ecpayResult.bookingNote || null
        };
      } else {
        await db.delete(logisticsOrders).where(eq11(logisticsOrders.logisticsMerchantTradeNo, logisticsMerchantTradeNo));
        throw new TRPCError5({ code: "BAD_GATEWAY", message: `\u7DA0\u754C\u7269\u6D41\u5EFA\u7ACB\u5931\u6557\uFF1A${ecpayResult.rtnMsg}` });
      }
    } catch (err) {
      if (err instanceof TRPCError5) throw err;
      console.error("[createLogistics] Error calling ECPay:", err);
      try {
        await db.delete(logisticsOrders).where(eq11(logisticsOrders.logisticsMerchantTradeNo, logisticsMerchantTradeNo));
      } catch (_) {
      }
      throw new TRPCError5({ code: "BAD_GATEWAY", message: "\u547C\u53EB\u7DA0\u754C\u7269\u6D41 API \u5931\u6557\uFF0C\u8ACB\u7A0D\u5F8C\u518D\u8A66", cause: err });
    }
  }),
  /**
   * 取得宅配託運單列印 URL（管理後台）
   */
  getPrintURL: adminProcedure.input(z3.object({ orderId: z3.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [logistics] = await db.select().from(logisticsOrders).where(eq11(logisticsOrders.orderId, input.orderId)).limit(1);
    if (!logistics) throw new Error("Logistics order not found");
    if (logistics.logisticsType !== "HOME") throw new Error("Only HOME logistics supports print");
    if (!logistics.allPayLogisticsId) throw new Error("AllPayLogisticsID not available yet");
    const printURL = buildPrintTradeDocURL({
      allPayLogisticsId: logistics.allPayLogisticsId
    });
    return { printURL };
  }),
  /**
   * 取得宅配託運單 PDF（管理後台）
   */
  getPrintDocument: adminProcedure.input(z3.object({ orderId: z3.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [logistics] = await db.select().from(logisticsOrders).where(eq11(logisticsOrders.orderId, input.orderId)).limit(1);
    if (!logistics) throw new TRPCError5({ code: "NOT_FOUND", message: "\u627E\u4E0D\u5230\u9019\u7B46\u8A02\u55AE\u7684\u7269\u6D41\u55AE" });
    if (logistics.logisticsType !== "HOME") {
      throw new TRPCError5({ code: "BAD_REQUEST", message: "\u53EA\u6709\u5B85\u914D\u7269\u6D41\u55AE\u53EF\u4EE5\u5217\u5370\u8A17\u904B\u55AE" });
    }
    if (!logistics.allPayLogisticsId) {
      throw new TRPCError5({ code: "BAD_REQUEST", message: "\u7DA0\u754C\u5C1A\u672A\u56DE\u50B3\u7269\u6D41\u7DE8\u865F\uFF0C\u8ACB\u7A0D\u5F8C\u518D\u8A66" });
    }
    let document;
    try {
      document = await fetchPrintTradeDocument({
        allPayLogisticsId: logistics.allPayLogisticsId,
        logisticsType: logistics.logisticsType,
        logisticsSubType: logistics.logisticsSubType
      });
    } catch (err) {
      if (err instanceof EcpayLogisticsError) throw new TRPCError5({ code: "BAD_GATEWAY", message: err.message });
      throw err;
    }
    return {
      contentType: document.contentType,
      filename: `ecpay-waybill-${logistics.allPayLogisticsId}${document.contentType.toLowerCase().includes("html") ? ".html" : ".pdf"}`,
      base64: document.buffer.toString("base64")
    };
  }),
  /**
   * 取得所有訂單（管理後台）
   */
  listOrders: adminProcedure.input(
    z3.object({
      status: z3.enum(["all", "pending_payment", "deposit_paid", "paid", "processing", "shipped", "arrived", "picked_up", "not_picked", "completed", "cancelled", "transfer_pending"]).optional().default("all"),
      limit: z3.number().min(1).max(500).optional().default(100),
      offset: z3.number().min(0).optional().default(0)
    })
  ).query(async ({ input }) => {
    return getAdminOrderSummaries(input.limit, input.offset, input.status);
  }),
  /**
   * 取得單筆訂單明細（管理後台展開卡片時才載入）
   */
  getOrderDetail: adminProcedure.input(z3.object({ orderId: z3.number() })).query(async ({ input }) => {
    const order = await getAdminOrderDetail(input.orderId);
    if (!order) {
      throw new TRPCError5({ code: "NOT_FOUND", message: "Order not found" });
    }
    return {
      ...order,
      printURL: null,
      printAvailable: Boolean(
        order.shippingMethod === "home" && order.logistics?.logisticsType === "HOME" && order.logistics?.allPayLogisticsId
      )
    };
  }),
  getBalancePayment: rateLimitedPublicProcedure({ scope: "balance-read", limit: 240, windowMs: 15 * 6e4 }).input(z3.object({ merchantTradeNo: z3.string().min(1) })).query(async ({ input, ctx }) => {
    const balancePayment = await getBalancePaymentDetail(input.merchantTradeNo);
    if (!balancePayment) {
      enforceRateLimit(ctx.req, ctx.res, "balance-read-miss", 12, 15 * 6e4);
      return null;
    }
    return { ...balancePayment, coupon: usesPromotionFlow(balancePayment.order) ? await getBalanceCoupon(balancePayment.orderId) : null };
  }),
  getBalancePaymentCheckout: rateLimitedPublicProcedure({ scope: "balance-write", limit: 20, windowMs: 15 * 6e4 }).input(balanceCheckoutInputSchema).mutation(async ({ input, ctx }) => {
    const balancePayment = await getBalancePaymentDetail(input.merchantTradeNo);
    if (!balancePayment) {
      throw new TRPCError5({ code: "NOT_FOUND", message: "\u627E\u4E0D\u5230\u5C3E\u6B3E\u8CC7\u6599" });
    }
    if (!usesPromotionFlow(balancePayment.order)) return legacyBalancePaymentCheckout(input, ctx, balancePayment);
    if (balancePayment.paymentStatus === "paid") {
      throw new TRPCError5({ code: "BAD_REQUEST", message: "\u5C3E\u6B3E\u5DF2\u4ED8\u6B3E" });
    }
    if (balancePayment.paymentStatus !== "pending" && balancePayment.paymentStatus !== "failed") {
      throw new TRPCError5({ code: "BAD_REQUEST", message: "\u6B64\u5C3E\u6B3E\u9023\u7D50\u76EE\u524D\u4E0D\u53EF\u4ED8\u6B3E" });
    }
    if (balancePayment.ecpayNotifyData?.source === "balance_atm_checkout" && input.paymentMethod !== "atm") throw new TRPCError5({ code: "BAD_REQUEST", message: "\u5DF2\u7522\u751F\u8F49\u5E33\u91D1\u984D\uFF0C\u8ACB\u6CBF\u7528\u8F49\u5E33\u65B9\u5F0F\u4ED8\u6B3E" });
    const db = await getDb();
    if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const isOverseas = input.checkoutRegion === "overseas";
    const shippingMethod = isOverseas ? "home" : input.shippingMethod;
    let shippingAddress = input.shippingAddress;
    let receiverZipCode = input.receiverZipCode;
    let cvsStoreId = input.cvsStoreId;
    let cvsStoreName = input.cvsStoreName;
    let cvsType = input.cvsType;
    let overseasCountry = null;
    if (isOverseas) {
      cvsStoreId = void 0;
      cvsStoreName = void 0;
      cvsType = void 0;
      const countryCode = input.intlCountry.trim();
      if (!isOverseasShipCountryCode(countryCode)) {
        throw new TRPCError5({ code: "BAD_REQUEST", message: "\u4E0D\u652F\u63F4\u7684\u6D77\u5916\u914D\u9001\u5730\u5340" });
      }
      overseasCountry = countryCode;
      const formatted = formatOverseasShippingAddress({
        countryCode,
        line1: input.intlAddrLine1.trim(),
        line2: input.intlAddrLine2 ?? "",
        city: input.intlCity.trim(),
        state: input.intlState ?? "",
        postal: input.intlPostalCode ?? ""
      });
      shippingAddress = formatted.shippingAddress;
      receiverZipCode = formatted.receiverZipCode;
    }
    const balanceItems = [{
      id: "custom-balance-payment",
      name: "\u5BA2\u88FD\u5316\u5546\u54C1\u5C3E\u6B3E",
      price: balancePayment.amount,
      quantity: 1,
      twoItemFreeShippingEligible: false
    }];
    const clearQuartzChipsAddOn = input.includeClearQuartzChips ? await getClearQuartzChipsAddOn(db) : null;
    if (clearQuartzChipsAddOn) {
      balanceItems.push({
        id: clearQuartzChipsAddOn.id,
        name: clearQuartzChipsAddOn.name,
        price: clearQuartzChipsAddOn.price,
        quantity: 1,
        twoItemFreeShippingEligible: clearQuartzChipsAddOn.twoItemFreeShippingEligible
      });
    }
    const originalDomesticFreeShipping = input.checkoutRegion === "domestic" ? await originalOrderHasDomesticFreeShipping(balancePayment.orderId) : false;
    const forceBalanceFreeShipping = balancePayment.order.freeShippingOverride || originalDomesticFreeShipping;
    const feeSummary = calcCheckoutFees({
      items: balanceItems,
      checkoutRegion: input.checkoutRegion,
      shippingMethod,
      paymentMethod: input.paymentMethod,
      overseasCountry,
      buyerEmail: balancePayment.order.buyerEmail,
      forceFreeShipping: forceBalanceFreeShipping,
      forcePaidShipping: Boolean(balancePayment.orderMergeInfo && !forceBalanceFreeShipping),
      chargeShippingWhenSubtotalZero: balancePayment.amount === 0
    });
    const activitySummary = balancePromotionTotal(balancePayment.amount, feeSummary.shippingFee, clearQuartzChipsAddOn?.price ?? 0, balancePayment.quote);
    let totalAmount = activitySummary.total;
    let balanceCoupon;
    try {
      balanceCoupon = await claimBalanceCoupon(balancePayment.orderId, balancePayment.id, ctx.user?.id ?? null, {
        productAmountAfterPromotion: balancePayment.quote ? Math.max(0, promotionProductSubtotal(balancePayment.quote) - balancePayment.quote.discount) : balancePayment.order.totalAmount,
        remainingProductAmount: Math.max(0, balancePayment.amount - (balancePayment.quote?.discount ?? 0))
      }, input.memberCouponId);
    } catch (error) {
      throw new TRPCError5({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "\u512A\u60E0\u5238\u7121\u6CD5\u4F7F\u7528" });
    }
    totalAmount = Math.max(0, totalAmount - (balanceCoupon?.discount ?? 0));
    if (input.expectedTotal != null && totalAmount !== input.expectedTotal) throw new TRPCError5({ code: "CONFLICT", message: "\u5C3E\u6B3E\u91D1\u984D\u5DF2\u66F4\u65B0\uFF0C\u8ACB\u91CD\u65B0\u6574\u7406\u78BA\u8A8D\u5F8C\u518D\u4ED8\u6B3E" });
    const orderUpdate = {
      buyerPhone: input.receiverPhone.trim(),
      deliveryRegion: isOverseas ? "overseas" : "domestic",
      shippingMethod,
      cvsStoreId: cvsStoreId ?? null,
      cvsStoreName: cvsStoreName ?? null,
      cvsType: cvsType ?? null,
      shippingAddress: shippingAddress ?? null,
      receiverZipCode: receiverZipCode ?? null
    };
    const verifyCurrentBalance = async (tx) => {
      await tx.execute(sql7`SELECT \`id\` FROM \`orders\` WHERE \`id\` = ${balancePayment.orderId} FOR UPDATE`);
      await tx.execute(sql7`SELECT \`id\` FROM \`orderBalancePayments\` WHERE \`id\` = ${balancePayment.id} FOR UPDATE`);
      const [current] = await tx.select().from(orderBalancePayments).where(eq11(orderBalancePayments.id, balancePayment.id)).limit(1);
      const [parent] = await tx.select().from(orders).where(eq11(orders.id, balancePayment.orderId)).limit(1);
      if (!parent || parent.orderStatus === "cancelled" || !current || !["pending", "failed"].includes(current.paymentStatus) || current.amount !== balancePayment.amount || current.totalAmount !== balancePayment.totalAmount || JSON.stringify(await getCustomQuoteSummary(tx, balancePayment.orderId)) !== JSON.stringify(balancePayment.quote)) throw new TRPCError5({ code: "CONFLICT", message: "\u5C3E\u6B3E\u6216\u5831\u50F9\u5DF2\u66F4\u65B0\uFF0C\u8ACB\u91CD\u65B0\u6574\u7406\u5F8C\u518D\u4ED8\u6B3E" });
      const attempts = await tx.select().from(orderBalancePaymentAttempts).where(and7(eq11(orderBalancePaymentAttempts.balancePaymentId, balancePayment.id), inArray3(orderBalancePaymentAttempts.paymentStatus, ["pending", "superseded"])));
      if (attempts.length) throw new TRPCError5({ code: "CONFLICT", message: "\u5DF2\u6709\u4FE1\u7528\u5361\u4EA4\u6613\u9032\u884C\u4E2D\uFF0C\u8ACB\u5B8C\u6210\u539F\u4ED8\u6B3E\uFF0C\u6216\u4ED8\u6B3E\u5931\u6557\u5F8C\u91CD\u8A66" });
    };
    if (totalAmount === 0) {
      const now = /* @__PURE__ */ new Date();
      const completed = await db.transaction(async (tx) => {
        await verifyCurrentBalance(tx);
        await tx.execute(sql7`SELECT \`id\` FROM \`orderBalancePayments\` WHERE \`id\` = ${balancePayment.id} FOR UPDATE`);
        const [currentBalance] = await tx.select({ paymentStatus: orderBalancePayments.paymentStatus }).from(orderBalancePayments).where(eq11(orderBalancePayments.id, balancePayment.id)).limit(1);
        if (!currentBalance || !["pending", "failed"].includes(currentBalance.paymentStatus)) return false;
        const [currentOrder] = await tx.select().from(orders).where(eq11(orders.id, balancePayment.orderId)).limit(1);
        if (!currentOrder || currentOrder.orderStatus === "cancelled") return false;
        if (balanceCoupon) {
          await tx.update(memberCoupons).set({ status: "used", usedAt: now }).where(and7(eq11(memberCoupons.id, balanceCoupon.id), eq11(memberCoupons.orderId, balancePayment.orderId), eq11(memberCoupons.status, "reserved")));
          await tx.delete(orderItems).where(and7(eq11(orderItems.orderId, balancePayment.orderId), eq11(orderItems.productId, COUPON_DISCOUNT_PRODUCT_ID)));
          await tx.insert(orderItems).values({ orderId: balancePayment.orderId, productId: COUPON_DISCOUNT_PRODUCT_ID, productName: `\u512A\u60E0\u5238\u6298\u62B5 - ${balanceCoupon.name}`, quantity: 1, unitPrice: -balanceCoupon.discount, subtotal: -balanceCoupon.discount, isPreorder: false });
        }
        await tx.update(orderBalancePayments).set({
          paymentMethod: input.paymentMethod,
          shippingFee: 0,
          paymentFee: 0,
          totalAmount: 0,
          paymentStatus: "paid",
          tradeNo: "NO_PAYMENT_REQUIRED",
          ecpayNotifyData: {
            source: "zero_balance_shipping_confirmation",
            confirmedAt: now.toISOString()
          },
          paidAt: now
        }).where(eq11(orderBalancePayments.id, balancePayment.id));
        await tx.update(orders).set({
          ...orderUpdate,
          orderStatus: "paid",
          paymentStatus: "confirmed",
          confirmedAt: now,
          paidAt: now,
          totalAmount: Math.max(
            1,
            balancePayment.order.totalAmount - (balancePayment.totalAmount ?? balancePayment.amount)
          )
        }).where(eq11(orders.id, balancePayment.orderId));
        if (clearQuartzChipsAddOn) {
          await tx.delete(orderItems).where(and7(eq11(orderItems.orderId, balancePayment.orderId), eq11(orderItems.productId, CLEAR_QUARTZ_CHIPS_PRODUCT_ID)));
          await tx.insert(orderItems).values({ orderId: balancePayment.orderId, productId: CLEAR_QUARTZ_CHIPS_PRODUCT_ID, productName: clearQuartzChipsAddOn.name, productImage: clearQuartzChipsAddOn.image, quantity: 1, unitPrice: clearQuartzChipsAddOn.price, subtotal: clearQuartzChipsAddOn.price, isPreorder: false });
          await tx.update(orders).set({ inventoryDeducted: false }).where(eq11(orders.id, balancePayment.orderId));
        }
        return true;
      });
      if (!completed) {
        throw new TRPCError5({ code: "CONFLICT", message: "\u5C3E\u6B3E\u72C0\u614B\u5DF2\u66F4\u65B0\uFF0C\u8ACB\u91CD\u65B0\u6574\u7406\u9801\u9762" });
      }
      if (clearQuartzChipsAddOn) await deductInventoryAfterBalancePayment(input.merchantTradeNo);
      return {
        kind: "no_payment",
        amount: 0,
        shippingFee: 0,
        paymentFee: 0
      };
    }
    if (input.paymentMethod === "credit") {
      let attempt;
      try {
        attempt = await createBalancePaymentAttempt({
          balancePaymentId: balancePayment.id,
          amount: balancePayment.amount,
          shippingFee: feeSummary.shippingFee,
          paymentFee: feeSummary.paymentFee,
          totalAmount,
          expectedQuote: balancePayment.quote,
          checkoutData: {
            promotionFlowVersion: PROMOTION_FLOW_VERSION,
            coupon: balanceCoupon ? { id: balanceCoupon.id, name: balanceCoupon.name, discount: balanceCoupon.discount } : null,
            promotionDiscount: activitySummary.discount,
            orderUpdate,
            clearQuartzChipsAddOn: clearQuartzChipsAddOn ? {
              productId: CLEAR_QUARTZ_CHIPS_PRODUCT_ID,
              productName: clearQuartzChipsAddOn.name,
              productImage: clearQuartzChipsAddOn.image,
              quantity: 1,
              unitPrice: clearQuartzChipsAddOn.price,
              subtotal: clearQuartzChipsAddOn.price
            } : null
          }
        });
      } catch (error) {
        if (error instanceof Error && error.message === "Inactive balance payment cannot be retried") {
          throw new TRPCError5({ code: "CONFLICT", message: "\u5C3E\u6B3E\u72C0\u614B\u5DF2\u66F4\u65B0\uFF0C\u8ACB\u91CD\u65B0\u6574\u7406\u9801\u9762" });
        }
        throw error;
      }
      const origin = siteBaseUrl(ctx.req);
      const paymentParams = buildCreditPaymentParams({
        merchantTradeNo: attempt.merchantTradeNo,
        tradeDesc: "\u691BCrystal\u5BA2\u88FD\u5316\u5C3E\u6B3E",
        itemName: balanceItems.map((item) => `${item.name} x${item.quantity}`).join("#"),
        totalAmount,
        returnURL: `${origin}/api/ecpay/notify`,
        orderResultURL: `${origin}/api/ecpay/balance-result`,
        clientBackURL: `${origin}/balance/${encodeURIComponent(balancePayment.merchantTradeNo)}`
      });
      return {
        kind: "credit",
        paymentURL: ECPAY_CONFIG.PaymentURL,
        paymentParams,
        amount: totalAmount,
        shippingFee: feeSummary.shippingFee,
        paymentFee: feeSummary.paymentFee
      };
    }
    await db.transaction(async (tx) => {
      await verifyCurrentBalance(tx);
      await tx.update(orderBalancePayments).set({
        paymentMethod: input.paymentMethod,
        shippingFee: feeSummary.shippingFee,
        paymentFee: feeSummary.paymentFee,
        totalAmount,
        paymentStatus: "pending",
        tradeNo: null,
        ecpayNotifyData: { source: "balance_atm_checkout" },
        paidAt: null
      }).where(eq11(orderBalancePayments.merchantTradeNo, input.merchantTradeNo));
      const [existingClearQuartzItem] = await tx.select().from(orderItems).where(and7(
        eq11(orderItems.orderId, balancePayment.orderId),
        eq11(orderItems.productId, CLEAR_QUARTZ_CHIPS_PRODUCT_ID)
      )).limit(1);
      if (clearQuartzChipsAddOn) {
        const itemValues = {
          productName: clearQuartzChipsAddOn.name,
          productImage: clearQuartzChipsAddOn.image,
          quantity: 1,
          unitPrice: clearQuartzChipsAddOn.price,
          subtotal: clearQuartzChipsAddOn.price,
          isPreorder: false
        };
        if (existingClearQuartzItem) {
          await tx.update(orderItems).set(itemValues).where(eq11(orderItems.id, existingClearQuartzItem.id));
        } else {
          await tx.insert(orderItems).values({
            orderId: balancePayment.orderId,
            productId: CLEAR_QUARTZ_CHIPS_PRODUCT_ID,
            ...itemValues
          });
        }
      }
      await tx.update(orders).set({
        ...orderUpdate,
        totalAmount: balancePayment.order.totalAmount - (balancePayment.totalAmount ?? balancePayment.amount) + totalAmount,
        ...clearQuartzChipsAddOn ? { inventoryDeducted: false } : {}
      }).where(eq11(orders.id, balancePayment.orderId));
      if (balanceCoupon) {
        await tx.delete(orderItems).where(and7(eq11(orderItems.orderId, balancePayment.orderId), eq11(orderItems.productId, COUPON_DISCOUNT_PRODUCT_ID)));
        await tx.insert(orderItems).values({ orderId: balancePayment.orderId, productId: COUPON_DISCOUNT_PRODUCT_ID, productName: `\u512A\u60E0\u5238\u6298\u62B5 - ${balanceCoupon.name}`, quantity: 1, unitPrice: -balanceCoupon.discount, subtotal: -balanceCoupon.discount, isPreorder: false });
      }
    });
    return {
      kind: "atm",
      amount: totalAmount,
      shippingFee: feeSummary.shippingFee,
      paymentFee: feeSummary.paymentFee,
      bankInfo: STORE_BANK_INFO
    };
  }),
  submitBalanceTransferCode: rateLimitedPublicProcedure({ scope: "balance-write", limit: 20, windowMs: 15 * 6e4 }).input(z3.object({
    merchantTradeNo: z3.string().min(1),
    lastFive: z3.string().length(5).regex(/^\d+$/),
    transferReceiptImageBase64: z3.string().max(8e6),
    transferReceiptImageContentType: z3.string(),
    transferReceiptImageFilename: z3.string().optional()
  })).mutation(async ({ input }) => {
    const balancePayment = await getBalancePaymentDetail(input.merchantTradeNo);
    if (!balancePayment) {
      throw new TRPCError5({ code: "NOT_FOUND", message: "\u627E\u4E0D\u5230\u5C3E\u6B3E\u8CC7\u6599" });
    }
    if (balancePayment.paymentStatus !== "pending") {
      throw new TRPCError5({ code: "BAD_REQUEST", message: "\u6B64\u5C3E\u6B3E\u9023\u7D50\u76EE\u524D\u4E0D\u53EF\u63D0\u4EA4\u8F49\u5E33\u8CC7\u6599" });
    }
    const receiptContentType = input.transferReceiptImageContentType;
    if (!TRANSFER_RECEIPT_CONTENT_TYPES.has(receiptContentType)) {
      throw new TRPCError5({ code: "BAD_REQUEST", message: "\u8F49\u5E33\u622A\u5716\u8ACB\u4E0A\u50B3 JPG\u3001PNG \u6216 WebP \u5716\u7247" });
    }
    const receiptBuffer = Buffer.from(input.transferReceiptImageBase64, "base64");
    if (receiptBuffer.length === 0 || receiptBuffer.length > 6 * 1024 * 1024) {
      throw new TRPCError5({ code: "BAD_REQUEST", message: "\u8F49\u5E33\u622A\u5716\u5927\u5C0F\u9700\u5C0F\u65BC 6MB" });
    }
    const ext = getReceiptExtension(receiptContentType, input.transferReceiptImageFilename);
    const uploaded = await storagePut(
      `balance-transfer-receipts/${input.merchantTradeNo}-${Date.now()}.${ext}`,
      receiptBuffer,
      receiptContentType
    );
    await updateBalancePaymentTransferCode(input.merchantTradeNo, input.lastFive, uploaded.url);
    await deductInventoryAfterBalancePayment(input.merchantTradeNo);
    return { success: true };
  }),
  confirmBalanceTransfer: adminProcedure.input(z3.object({
    merchantTradeNo: z3.string().min(1),
    note: z3.string().max(500).optional()
  })).mutation(async ({ input, ctx }) => {
    await confirmBalanceTransfer(input.merchantTradeNo, {
      adminUserId: ctx.user.id,
      note: input.note
    });
    await deductInventoryAfterBalancePayment(input.merchantTradeNo);
    return { success: true };
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
  getMonthlyRevenue: adminProcedure.input(z3.object({ months: z3.number().min(1).max(24).optional().default(6) })).query(async ({ input }) => {
    return getMonthlyRevenue(input.months);
  }),
  /**
   * 熱銷商品排行
   */
  getTopProducts: adminProcedure.input(z3.object({ limit: z3.number().min(1).max(20).optional().default(10) })).query(async ({ input }) => {
    return getTopProducts(input.limit);
  }),
  /**
   * 商品銷售量排序資料（前台商品列表使用）
   */
  getProductSalesTotals: publicProcedure.query(async () => {
    try {
      return await getProductSalesTotals();
    } catch (error) {
      console.error("[order.getProductSalesTotals] failed", error);
      return [];
    }
  })
});

// server/routers/chatbot.ts
import { z as z4 } from "zod";
import { TRPCError as TRPCError6 } from "@trpc/server";
import { and as and9, desc as desc6, eq as eq14, inArray as inArray4, isNull as isNull2, or as or4, sql as sql10 } from "drizzle-orm";

// server/crystalKnowledge.ts
init_schema();
import { eq as eq12, sql as sql8 } from "drizzle-orm";

// shared/richText.ts
var RICH_TEXT_FONT_SIZES = [14, 16, 18, 20, 24, 28];
var RICH_TEXT_COLORS = [
  { id: "umber", label: "Deep Umber \u6DF1\u68D5" },
  { id: "taupe", label: "Rose Taupe \u73AB\u7470\u68D5" },
  { id: "blush", label: "Rosy Blush \u73AB\u7470\u7C89" },
  { id: "greige", label: "\u7070\u68D5\u8272" }
];
var RICH_TEXT_ALIGNMENTS = ["left", "center", "right"];
var RICH_TEXT_IMAGE_SIZES = [
  { id: "sm", label: "\u5C0F" },
  { id: "md", label: "\u4E2D" },
  { id: "lg", label: "\u5927" },
  { id: "full", label: "100%" }
];
var RICH_TEXT_MAX_LENGTH = 6e4;
var RICH_TEXT_ALLOWED_TAGS = ["p", "br", "strong", "em", "u", "s", "h2", "h3", "ul", "ol", "li", "a", "img", "span"];
var alignClasses = RICH_TEXT_ALIGNMENTS.map((align) => `rt-align-${align}`);
var RICH_TEXT_ALLOWED_CLASSES = {
  p: alignClasses,
  h2: alignClasses,
  h3: alignClasses,
  span: [
    ...RICH_TEXT_FONT_SIZES.map((size) => `rt-size-${size}`),
    ...RICH_TEXT_COLORS.map((color) => `rt-color-${color.id}`)
  ],
  img: [
    ...RICH_TEXT_ALIGNMENTS.map((align) => `rt-img-${align}`),
    ...RICH_TEXT_IMAGE_SIZES.map((size) => `rt-img-${size.id}`)
  ]
};
function isSafeLinkHref(href) {
  return /^(https?:\/\/|mailto:)/i.test(href.trim());
}
function isSafeImageSrc(src) {
  const value = src.trim();
  return /^https:\/\//i.test(value) || /^\/(?!\/)/.test(value);
}
function isRichTextHtml(value) {
  return /^\s*<(p|h2|h3|ul|ol|img)[\s>/]/i.test(value);
}
var ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", nbsp: " " };
function richTextToPlainText(value) {
  if (!isRichTextHtml(value)) return value.trim();
  return value.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|h2|h3|li)>/gi, "\n").replace(/<[^>]*>/g, "").replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, name) => ENTITIES[name]).replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
function isRichTextEmpty(value) {
  return richTextToPlainText(value).length === 0 && !/<img\s/i.test(value);
}

// server/crystalKnowledge.ts
var PUBLIC_SITE = "https://goodaytarot.com";
var chatbotKnowledgeTableEnsured = false;
function asStringArray(value) {
  return Array.isArray(value) ? value.filter((item) => item.trim().length > 0) : [];
}
function splitTerms(text2) {
  if (!text2) return [];
  return text2.split(/[・、，,／/｜|;；\n\r\t]+/g).map((part) => part.trim()).filter(Boolean);
}
function uniqueTerms(values, max = 36) {
  const seen = /* @__PURE__ */ new Set();
  const result = [];
  for (const value of values) {
    const term = value?.trim();
    if (!term) continue;
    const key = term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(term);
    if (result.length >= max) break;
  }
  return result;
}
function productPriceText(product) {
  return product.priceRange?.trim() || `NT$${product.price.toLocaleString("zh-TW")}`;
}
function buildProductKnowledgeChunk(product) {
  const crystalTerms = splitTerms(product.crystalType);
  const benefits = asStringArray(product.benefits).map(richTextToPlainText).filter(Boolean);
  const tags = asStringArray(product.tags);
  const suitableFor = asStringArray(product.suitableFor);
  const categoryLabels = asStringArray(product.categoryLabels);
  const categoryTerms = categoryLabels.length > 0 ? categoryLabels : [product.categoryLabel, product.category];
  const limitedTerms = product.isMonthlyLimited ? ["\u9650\u5B9A\u6B3E", "\u6BCF\u6708\u9650\u91CF", "\u9650\u91CF\u624B\u934A"] : [];
  const keywords = uniqueTerms([
    product.name,
    product.id,
    ...limitedTerms,
    ...crystalTerms,
    ...benefits,
    ...suitableFor,
    ...tags,
    ...categoryTerms
  ]);
  const crystalText = crystalTerms.length > 0 ? `\u6C34\u6676\u5305\u542B${crystalTerms.join("\u3001")}\u3002` : "";
  const benefitText = benefits.length > 0 ? `\u9069\u5408${benefits.join("\u3001")}\u7684\u4EBA\u3002` : product.description?.trim() || product.subtitle?.trim() || "\u9069\u5408\u60F3\u4F9D\u7167\u5546\u54C1\u80FD\u91CF\u65B9\u5411\u6311\u9078\u6C34\u6676\u98FE\u54C1\u7684\u4EBA\u3002";
  const answer = `\u300C${product.name}\u300D${product.isMonthlyLimited ? "\u662F\u6BCF\u6708\u9650\u91CF\u5546\u54C1\uFF0C" : ""}${crystalText}${benefitText}\u50F9\u683C ${productPriceText(product)}\uFF0C\u5546\u54C1\u9023\u7D50\uFF1A${PUBLIC_SITE}/products/${product.id}`;
  const embedText = uniqueTerms([
    product.name,
    product.id,
    product.subtitle,
    product.description,
    product.story,
    ...limitedTerms,
    ...crystalTerms,
    ...benefits,
    ...suitableFor,
    ...tags,
    ...categoryTerms
  ], 80).join(" ");
  return {
    id: `product-${product.id}`,
    question: `${product.name}\u9069\u5408\u4EC0\u9EBC\u9700\u6C42\uFF1F`,
    answer,
    embedText,
    keywords,
    category: "\u5546\u54C1\u63A8\u85A6",
    relatedProductIds: [product.id]
  };
}
async function ensureChatbotKnowledgeTable() {
  if (chatbotKnowledgeTableEnsured) return;
  const db = await getDb();
  if (!db) return;
  await db.execute(sql8`
    CREATE TABLE IF NOT EXISTS \`chatbotKnowledge\` (
      \`id\` varchar(128) NOT NULL,
      \`sourceType\` varchar(32) NOT NULL,
      \`sourceId\` varchar(64) NOT NULL,
      \`question\` text NOT NULL,
      \`answer\` text NOT NULL,
      \`embedText\` text NOT NULL,
      \`keywords\` json,
      \`category\` varchar(64) NOT NULL,
      \`relatedProductIds\` json,
      \`vector\` json,
      \`active\` boolean NOT NULL DEFAULT true,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`)
    )
  `);
  try {
    await db.execute(sql8`CREATE INDEX \`chatbot_knowledge_source_idx\` ON \`chatbotKnowledge\` (\`sourceType\`, \`sourceId\`)`);
  } catch {
  }
  try {
    await db.execute(sql8`CREATE INDEX \`chatbot_knowledge_active_idx\` ON \`chatbotKnowledge\` (\`active\`)`);
  } catch {
  }
  chatbotKnowledgeTableEnsured = true;
}
async function embedKnowledgeText(text2) {
  if (!ENV.geminiApiKey) return null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${ENV.geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/gemini-embedding-001",
          content: { parts: [{ text: text2 }] }
        })
      }
    );
    if (!res.ok) {
      console.warn("[chatbotKnowledge] embedding failed:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return data.embedding?.values ?? null;
  } catch (error) {
    console.warn("[chatbotKnowledge] embedding request failed:", error);
    return null;
  }
}
async function syncProductKnowledge(product) {
  const db = await getDb();
  if (!db) return;
  await ensureChatbotKnowledgeTable();
  if (product.category === "test") {
    await removeProductKnowledge(product.id);
    return;
  }
  const chunk = buildProductKnowledgeChunk(product);
  const vector = await embedKnowledgeText(chunk.embedText);
  const existing = vector ? [] : await db.select({ embedText: chatbotKnowledge.embedText, vector: chatbotKnowledge.vector }).from(chatbotKnowledge).where(eq12(chatbotKnowledge.id, chunk.id)).limit(1);
  const vectorToStore = vector ?? (existing[0]?.embedText === chunk.embedText ? existing[0]?.vector : null);
  await db.insert(chatbotKnowledge).values({
    id: chunk.id,
    sourceType: "product",
    sourceId: product.id,
    question: chunk.question,
    answer: chunk.answer,
    embedText: chunk.embedText,
    keywords: chunk.keywords,
    category: chunk.category,
    relatedProductIds: chunk.relatedProductIds,
    vector: vectorToStore,
    active: product.active
  }).onDuplicateKeyUpdate({
    set: {
      question: chunk.question,
      answer: chunk.answer,
      embedText: chunk.embedText,
      keywords: chunk.keywords,
      category: chunk.category,
      relatedProductIds: chunk.relatedProductIds,
      vector: vectorToStore,
      active: product.active
    }
  });
}
async function syncProductKnowledgeById(productId) {
  const db = await getDb();
  if (!db) return;
  const rows = await db.select().from(dbProducts).where(eq12(dbProducts.id, productId)).limit(1);
  if (rows[0]) await syncProductKnowledge(rows[0]);
}
async function removeProductKnowledge(productId) {
  const db = await getDb();
  if (!db) return;
  await ensureChatbotKnowledgeTable();
  await db.delete(chatbotKnowledge).where(eq12(chatbotKnowledge.id, `product-${productId}`));
}
async function loadDynamicKnowledgeChunks() {
  const db = await getDb();
  if (!db) return [];
  await ensureChatbotKnowledgeTable();
  const rows = await db.select().from(chatbotKnowledge).where(eq12(chatbotKnowledge.active, true));
  return rows.map((row) => ({
    id: row.id,
    question: row.question,
    answer: row.answer,
    embedText: row.embedText,
    keywords: row.keywords ?? [],
    category: row.category,
    relatedProductIds: row.relatedProductIds ?? void 0,
    vector: row.vector
  }));
}
function cosineSimilarity(a, b) {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
function keywordHitCount(query, chunk) {
  const q = query.toLowerCase();
  return chunk.keywords.filter(
    (k) => q.includes(k.toLowerCase()) || k.toLowerCase().includes(q)
  ).length;
}
function keywordBoostScore(chunk, hits) {
  if (hits <= 0) return 0;
  if (chunk.category === "\u5546\u54C1\u63A8\u85A6") {
    return Math.min(0.78, 0.73 + 0.02 * Math.min(hits - 1, 3));
  }
  return Math.min(0.92, 0.6 + 0.12 * Math.min(hits, 3));
}
async function searchKnowledge(query, queryVector, topK = 3, threshold = 0.45) {
  const chunks = await loadDynamicKnowledgeChunks();
  const scoreChunk = (chunk) => {
    const { vector, ...rest } = chunk;
    const vecScore = vector ? cosineSimilarity(queryVector, vector) : 0;
    const hits = keywordHitCount(query, chunk);
    const kwScore = keywordBoostScore(chunk, hits);
    return { ...rest, score: Math.max(vecScore, kwScore) };
  };
  return chunks.map(scoreChunk).filter((c) => c.score >= threshold).sort((a, b) => b.score - a.score).slice(0, topK);
}

// client/src/lib/data.ts
var products = [
  {
    id: "custom-deposit-product",
    name: "\u5BA2\u88FD\u5316\u5546\u54C1",
    subtitle: "\u5BA2\u88FD\u5316\u670D\u52D9\u8A02\u91D1\u4E0B\u55AE\u5C08\u7528",
    category: "custom",
    categoryLabel: "\u5BA2\u88FD\u5316",
    price: 500,
    priceRange: "NT$1,500 \xB1 NT$300",
    image: "/images/custom3.jpg",
    tags: [],
    description: "\u7D14\u5BA2\u88FD\u6C34\u6676\u98FE\u54C1\u670D\u52D9\u8A02\u91D1\u3002",
    story: "",
    benefits: [],
    suitableFor: ["\u5DF2\u6C7A\u5B9A\u9810\u7D04\u7D14\u5BA2\u88FD\u6C34\u6676\u98FE\u54C1\u670D\u52D9\u7684\u9867\u5BA2"],
    howToUse: [
      "\u6B64\u5546\u54C1\u70BA\u8A02\u91D1\u5C08\u7528",
      "\u4E0B\u55AE\u5F8C\u8ACB\u52A0\u5165\u5B98\u65B9 LINE \u7559\u4E0B\u8A02\u55AE\u7DE8\u865F\u8DDF\u59D3\u540D\uFF0C\u4EE5\u4FBF\u6536\u5230\u624B\u934A\u8A2D\u8A08\u5B8C\u5F8C\u7684\u6210\u54C1\u5716",
      "\u652F\u4ED8\u5C3E\u6B3E"
    ],
    disclaimer: "\u6B64\u5546\u54C1\u70BA\u5BA2\u88FD\u5316\u670D\u52D9\u8A02\u91D1\uFF0C\u5BE6\u969B\u5C3E\u6B3E\u91D1\u984D\u7531\u8A2D\u8A08\u5E2B\u78BA\u8A8D\u5F8C\u53E6\u884C\u901A\u77E5\u3002",
    inStock: true,
    featured: false,
    crystalType: "\u53EF\u63D0\u4F9B\u60F3\u8981\u7684\u529F\u6548\u3001\u8272\u7CFB\u3001\u6B3E\u5F0F\uFF0C\u6216\u662F\u4E5F\u53EF\u4EE5\u8DDF\u6211\u8A0E\u8AD6\uFF5C\u5982\u611B\u60C5\u3001\u6E9D\u901A\u80FD\u529B\u3001\u8CA1\u904B\u3001\u75BE\u75C5\u7B49\u7B49\uFF5C\u63D0\u4F9B\u521D\u7248\u514D\u8CBB\u4FEE\u6539 1 \u6B21",
    color: "\u8A02\u91D1"
  },
  {
    id: "tarot-crystal-deposit-product",
    name: "\u5854\u7F85 \xD7 \u6C34\u6676\u5BA2\u88FD\u5316\u5546\u54C1",
    subtitle: "\u5854\u7F85 \xD7 \u6C34\u6676\u98FE\u54C1\u5BA2\u88FD\u5316\u670D\u52D9\u8A02\u91D1\u4E0B\u55AE\u5C08\u7528",
    category: "custom",
    categoryLabel: "\u5BA2\u88FD\u5316",
    price: 1399,
    priceRange: "\u624B\u934A NT$1,500 \xB1 NT$300\uFF5C\u5854\u7F85\u4F9D\u50F9\u76EE\u8868 9 \u6298",
    image: "/images/custom-tarot2.jpg",
    tags: ["\u5854\u7F85"],
    description: "\u5854\u7F85 \xD7 \u6C34\u6676\u98FE\u54C1\u5BA2\u88FD\u5316\u670D\u52D9\u8A02\u91D1\u3002",
    story: "",
    benefits: [],
    suitableFor: ["\u5DF2\u6C7A\u5B9A\u9810\u7D04\u5854\u7F85 \xD7 \u6C34\u6676\u98FE\u54C1\u5BA2\u88FD\u5316\u670D\u52D9\u7684\u9867\u5BA2"],
    howToUse: [
      "\u6B64\u5546\u54C1\u70BA\u8A02\u91D1\u5C08\u7528",
      "\u4E0B\u55AE\u5F8C\u8ACB\u52A0\u5165\u5B98\u65B9 LINE \u7559\u4E0B\u8A02\u55AE\u7DE8\u865F\u8DDF\u59D3\u540D\uFF0C\u4EE5\u4FBF\u6536\u5230\u624B\u934A\u8A2D\u8A08\u5B8C\u5F8C\u7684\u6210\u54C1\u5716",
      "\u652F\u4ED8\u5C3E\u6B3E"
    ],
    disclaimer: "\u6B64\u5546\u54C1\u70BA\u5BA2\u88FD\u5316\u670D\u52D9\u8A02\u91D1\uFF0C\u5BE6\u969B\u5C3E\u6B3E\u91D1\u984D\u7531\u8A2D\u8A08\u5E2B\u78BA\u8A8D\u5F8C\u53E6\u884C\u901A\u77E5\u3002",
    inStock: true,
    featured: false,
    crystalType: "\u63D0\u4F9B\u5854\u7F85\u89E3\u6790\uFF0C\u900F\u904E\u89E3\u6790\u5206\u6790\u51FA\u7F3A\u5931\u7684\u80FD\u91CF\uFF0C\u5229\u7528\u6C34\u6676\u80FD\u91CF\u88DC\u8DB3\uFF5C\u4E5F\u53EF\u4EE5\u8A31\u9858\u60F3\u984D\u5916\u52A0\u5F37\u7684\u80FD\u91CF\uFF01\uFF5C\u63D0\u4F9B\u521D\u7248\u514D\u8CBB\u4FEE\u6539 1 \u6B21",
    color: "\u8A02\u91D1"
  },
  {
    id: "chakra-crystal-deposit-product",
    name: "\u8108\u8F2A\u6AA2\u6E2C \xD7 \u6C34\u6676\u5BA2\u88FD\u5316\u5546\u54C1",
    subtitle: "\u8108\u8F2A\u6AA2\u6E2C \xD7 \u6C34\u6676\u98FE\u54C1\u5BA2\u88FD\u5316\u670D\u52D9\u8A02\u91D1\u4E0B\u55AE\u5C08\u7528",
    category: "custom",
    categoryLabel: "\u5BA2\u88FD\u5316",
    price: 1e3,
    priceRange: "\u624B\u934A NT$1,500 \xB1 NT$300\uFF5C\u8108\u8F2A\u6AA2\u6E2C NT$500",
    image: "/images/custom-chakra2.jpg",
    tags: ["\u8108\u8F2A"],
    description: "\u8108\u8F2A\u6AA2\u6E2C \xD7 \u6C34\u6676\u98FE\u54C1\u5BA2\u88FD\u5316\u670D\u52D9\u8A02\u91D1\u3002",
    story: "",
    benefits: [],
    suitableFor: ["\u5DF2\u6C7A\u5B9A\u9810\u7D04\u8108\u8F2A\u6AA2\u6E2C \xD7 \u6C34\u6676\u98FE\u54C1\u5BA2\u88FD\u5316\u670D\u52D9\u7684\u9867\u5BA2"],
    howToUse: [
      "\u6B64\u5546\u54C1\u70BA\u8A02\u91D1\u5C08\u7528",
      "\u4E0B\u55AE\u5F8C\u8ACB\u52A0\u5165\u5B98\u65B9 LINE \u7559\u4E0B\u8A02\u55AE\u7DE8\u865F\u8DDF\u59D3\u540D\uFF0C\u4EE5\u4FBF\u6536\u5230\u624B\u934A\u8A2D\u8A08\u5B8C\u5F8C\u7684\u6210\u54C1\u5716",
      "\u652F\u4ED8\u5C3E\u6B3E"
    ],
    disclaimer: "\u6B64\u5546\u54C1\u70BA\u5BA2\u88FD\u5316\u670D\u52D9\u8A02\u91D1\uFF0C\u5BE6\u969B\u5C3E\u6B3E\u91D1\u984D\u7531\u8A2D\u8A08\u5E2B\u78BA\u8A8D\u5F8C\u53E6\u884C\u901A\u77E5\u3002",
    inStock: true,
    featured: false,
    crystalType: "\u4EE5\u9748\u64FA\u8207\u5854\u7F85\u6E2C\u51FA\u60A8\u7684\u4E03\u8108\u8F2A\u80FD\u91CF\u72C0\u6CC1\uFF5C\u63D0\u4F9B\u4E00\u4EFD\u5C08\u5C6C\u8108\u8F2A\u6AA2\u6E2C\u5831\u544A\uFF5C\u5229\u7528\u6C34\u6676\u80FD\u91CF\u88DC\u8DB3\u8108\u8F2A\u80FD\u91CF\u7F3A\u5931\uFF5C\u4E5F\u53EF\u4EE5\u8A31\u9858\u60F3\u984D\u5916\u52A0\u5F37\u7684\u80FD\u91CF\uFF01\uFF5C\u63D0\u4F9B\u521D\u7248\u514D\u8CBB\u4FEE\u6539 1 \u6B21",
    color: "\u8A02\u91D1"
  },
  {
    id: "numerology-crystal-deposit-product",
    name: "\u751F\u547D\u9748\u6578 \xD7 \u6C34\u6676\u5BA2\u88FD\u5316\u5546\u54C1",
    subtitle: "\u751F\u547D\u9748\u6578 \xD7 \u6C34\u6676\u98FE\u54C1\u5BA2\u88FD\u5316\u670D\u52D9\u8A02\u91D1\u4E0B\u55AE\u5C08\u7528",
    category: "custom",
    categoryLabel: "\u5BA2\u88FD\u5316",
    price: 1e3,
    priceRange: "\u624B\u934A NT$1,500 \xB1 NT$300\uFF5C\u751F\u547D\u9748\u6578\u89E3\u6790 NT$500",
    image: "/images/custom-numerology3.jpg",
    tags: ["\u751F\u547D\u9748\u6578"],
    description: "\u751F\u547D\u9748\u6578 \xD7 \u6C34\u6676\u98FE\u54C1\u5BA2\u88FD\u5316\u670D\u52D9\u8A02\u91D1\u3002",
    story: "",
    benefits: [],
    suitableFor: ["\u5DF2\u6C7A\u5B9A\u9810\u7D04\u751F\u547D\u9748\u6578 \xD7 \u6C34\u6676\u98FE\u54C1\u5BA2\u88FD\u5316\u670D\u52D9\u7684\u9867\u5BA2"],
    howToUse: [
      "\u6B64\u5546\u54C1\u70BA\u8A02\u91D1\u5C08\u7528",
      "\u4E0B\u55AE\u5F8C\u8ACB\u52A0\u5165\u5B98\u65B9 LINE \u7559\u4E0B\u8A02\u55AE\u7DE8\u865F\u8DDF\u59D3\u540D\uFF0C\u4EE5\u4FBF\u6536\u5230\u624B\u934A\u8A2D\u8A08\u5B8C\u5F8C\u7684\u6210\u54C1\u5716",
      "\u652F\u4ED8\u5C3E\u6B3E"
    ],
    disclaimer: "\u6B64\u5546\u54C1\u70BA\u5BA2\u88FD\u5316\u670D\u52D9\u8A02\u91D1\uFF0C\u5BE6\u969B\u5C3E\u6B3E\u91D1\u984D\u7531\u8A2D\u8A08\u5E2B\u78BA\u8A8D\u5F8C\u53E6\u884C\u901A\u77E5\u3002",
    inStock: true,
    featured: false,
    crystalType: "\u900F\u904E\u897F\u5143\u51FA\u751F\u5E74\u6708\u65E5\u627E\u51FA\u5929\u8CE6\u6578\u3001\u751F\u547D\u6578\u3001\u5148\u5929\u6578\u3001\u661F\u5EA7\u6578\uFF5C\u627E\u51FA\u7F3A\u6578\u4E26\u900F\u904E\u751F\u547D\u6578\u8207\u7F3A\u6578\u505A\u80FD\u91CF\u642D\u914D\uFF5C\u4E5F\u53EF\u4EE5\u8A31\u9858\u60F3\u984D\u5916\u52A0\u5F37\u7684\u80FD\u91CF\uFF01\uFF5C\u63D0\u4F9B\u521D\u7248\u514D\u8CBB\u4FEE\u6539 1 \u6B21",
    color: "\u8A02\u91D1"
  },
  {
    id: "d001-moon-secret",
    name: "\u6708\u4E0B\u5BC6\u8A9E\u624B\u934A",
    subtitle: "\u6DE8\u5316\u58D3\u529B\uFF0C\u559A\u9192\u5167\u5728\u5E73\u975C\u8207\u9B45\u529B",
    category: "healing",
    categoryLabel: "\u7642\u7652\u7CFB\u5217",
    categories: ["healing", "protect", "love"],
    categoryLabels: ["\u7642\u7652\u7CFB\u5217", "\u80FD\u91CF\u9632\u8B77", "\u611B\u60C5\u6843\u82B1"],
    price: 1480,
    originalPrice: 1880,
    image: "/images/d-design/d001.jpg",
    tags: ["\u6DE8\u5316", "\u5E73\u8861"],
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
      "\u624B\u570D\uFF1A13\u300113.5\u300114\u300114.5\u300115\u300115.5\u300116\u300116.5\u300117\u300117.5\u300118\u300118.5\u300119",
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
    categoryLabel: "\u8CA1\u904B\u4E8B\u696D",
    categories: ["wealth", "love", "protect", "healing"],
    categoryLabels: ["\u8CA1\u904B\u4E8B\u696D", "\u611B\u60C5\u6843\u82B1", "\u80FD\u91CF\u9632\u8B77", "\u7642\u7652\u7CFB\u5217"],
    price: 1580,
    originalPrice: 1880,
    image: "/images/d-design/d002.jpg",
    tags: ["\u62DB\u8CA1", "\u4EBA\u7DE3"],
    description: "\u7D50\u5408\u9285\u9AEE\u6676\u3001\u9EC3\u6C34\u6676\u3001\u8349\u8393\u6676\u3001\u8461\u8404\u77F3\u3001\u592A\u967D\u77F3\u7B49\u591A\u7A2E\u6676\u77F3\uFF0C\u6253\u9020\u8C50\u76DB\u4E14\u7A69\u5B9A\u7684\u80FD\u91CF\u5834\u3002",
    story: "\u871C\u5149\u4E4B\u5883\u662F\u4E00\u6B3E\u8907\u65B9\u8A2D\u8A08\uFF0C\u517C\u9867\u884C\u52D5\u529B\u3001\u8CA1\u5BCC\u904B\u8207\u60C5\u7DD2\u5E73\u8861\u3002\u9069\u5408\u60F3\u52A0\u901F\u57F7\u884C\u76EE\u6A19\uFF0C\u540C\u6642\u7DAD\u6301\u5167\u5728\u7A69\u5B9A\u8207\u4EBA\u969B\u548C\u8AE7\u8005\u3002\u5546\u54C1\u6703\u56E0\u624B\u570D\u4E0D\u540C\u800C\u6709\u4E9B\u5FAE\u8B8A\u5316\uFF1B\u82E5\u9700\u6539\u9F8D\u8766\u6263\u6216\u78C1\u6263\uFF0C\u9700\u52A0\u6536 200 \u5143\u5DE5\u672C\u8CBB\u3002",
    benefits: [
      "\u62DB\u8CA1\u805A\u80FD\u4E26\u63D0\u5347\u884C\u52D5\u529B",
      "\u5438\u5F15\u611B\u60C5\u8207\u597D\u4EBA\u7DE3",
      "\u6DE8\u5316\u4E26\u653E\u5927\u500B\u4EBA\u80FD\u91CF",
      "\u5F37\u5316\u4FDD\u8B77\u529B\u8207\u7A69\u5B9A\u6C23\u5834",
      "\u5E36\u4F86\u7642\u7652\u3001\u6D3B\u529B\u8207\u5167\u5728\u7A69\u5B9A",
      "\u4FC3\u9032\u6210\u9577\u4E26\u589E\u5F37\u81EA\u4FE1"
    ],
    suitableFor: ["\u5E0C\u671B\u540C\u6642\u63D0\u5347\u8CA1\u904B\u8207\u4EBA\u7DE3\u8005", "\u6B63\u5728\u885D\u523A\u5DE5\u4F5C\u76EE\u6A19\u8005", "\u9700\u8981\u7A69\u5B9A\u60C5\u7DD2\u8207\u9632\u8B77\u529B\u8005"],
    howToUse: [
      "\u624B\u570D\u53EF\u9078 13-19 \u516C\u5206\uFF0C\u8ACB\u4F9D\u6DE8\u624B\u570D\u4E0B\u55AE",
      "\u6A19\u6E96\u70BA\u5F48\u529B\u7E69\u7248\u672C\uFF1B\u82E5\u6539\u9F8D\u8766\u6263\u6216\u78C1\u6263\u9700\u52A0\u6536 200 \u5143"
    ],
    disclaimer: "\u672C\u5546\u54C1\u70BA\u5929\u7136\u7926\u77F3\u98FE\u54C1\uFF0C\u5177\u6709\u500B\u4EBA\u80FD\u91CF\u652F\u6301\u4F5C\u7528\uFF0C\u975E\u91AB\u7642\u7528\u54C1\uFF0C\u4E0D\u5177\u4EFB\u4F55\u91AB\u7642\u7642\u6548\u3002\u6548\u679C\u56E0\u500B\u4EBA\u80FD\u91CF\u72C0\u614B\u800C\u7570\u3002",
    inStock: true,
    featured: false,
    crystalType: "\u9285\u9AEE\u6676\u3001\u9EC3\u6C34\u6676\u3001\u8349\u8393\u6676\u3001\u767D\u6C34\u6676\u3001\u9ED1\u66DC\u77F3\u3001\u73CD\u73E0\u3001\u8461\u8404\u77F3\u3001\u592A\u967D\u77F3\u3001\u7C89\u6676",
    color: "\u871C\u91D1\u6696\u7C89"
  },
  {
    id: "d003-venus",
    name: "\u7DAD\u7D0D\u65AF Venus",
    subtitle: "\u559A\u9192\u81EA\u4FE1\u8207\u5438\u5F15\u529B\u7684\u65E5\u5E38\u914D\u6234\u6B3E",
    category: "pendant",
    categoryLabel: "\u540A\u98FE",
    categories: ["pendant", "wealth", "healing"],
    categoryLabels: ["\u540A\u98FE", "\u8CA1\u904B\u4E8B\u696D", "\u7642\u7652\u7CFB\u5217"],
    price: 950,
    image: "/images/d-design/d003.jpg",
    tags: ["\u81EA\u4FE1", "\u9B45\u529B"],
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
    categoryLabel: "\u611B\u60C5\u6843\u82B1",
    categories: ["love", "healing", "protect"],
    categoryLabels: ["\u611B\u60C5\u6843\u82B1", "\u7642\u7652\u7CFB\u5217", "\u80FD\u91CF\u9632\u8B77"],
    price: 1800,
    originalPrice: 2100,
    wristSizePriceRules: [
      { maxWristSize: 13.5, price: 1700 },
      { maxWristSize: 17, price: 1800 },
      { maxWristSize: 19, price: 1900 }
    ],
    image: "/images/d-design/d004.jpg",
    tags: ["\u4EBA\u7DE3", "\u5E73\u8861"],
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
      "\u624B\u570D\u53EF\u9078 13-19 \u516C\u5206\uFF0C\u8ACB\u4F9D\u6DE8\u624B\u570D\u4E0B\u55AE",
      "\u6A19\u6E96\u70BA\u5F48\u529B\u7E69\u7248\u672C\uFF1B\u82E5\u6539\u9F8D\u8766\u6263\u6216\u78C1\u6263\u9700\u52A0\u6536 200 \u5143"
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
    categoryLabel: "\u7642\u7652\u7CFB\u5217",
    categories: ["healing", "love"],
    categoryLabels: ["\u7642\u7652\u7CFB\u5217", "\u611B\u60C5\u6843\u82B1"],
    price: 1580,
    originalPrice: 1580,
    wristSizePriceRules: [
      { maxWristSize: 13.5, price: 1480 },
      { maxWristSize: 17, price: 1580 },
      { maxWristSize: 19, price: 1680 }
    ],
    image: "/images/d-design/d005.jpg",
    tags: ["\u6DE8\u5316", "\u611B\u60C5"],
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
      "\u624B\u570D\u53EF\u9078 13-19 \u516C\u5206\uFF0C\u8ACB\u4F9D\u6DE8\u624B\u570D\u4E0B\u55AE",
      "\u6A19\u6E96\u70BA\u5F48\u529B\u7E69\u7248\u672C\uFF1B\u82E5\u6539\u9F8D\u8766\u6263\u6216\u78C1\u6263\u9700\u52A0\u6536 200 \u5143"
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
    name: "[\u6E2C\u8A66\u7528] \u8F49\u5E33\u6E2C\u8A66\u5546\u54C1 16\u5143",
    subtitle: "\u8F49\u5E33\u6700\u4F4E\u91D1\u984D\u6E2C\u8A66\uFF0C\u8ACB\u52FF\u771F\u5BE6\u8CFC\u8CB7",
    category: "test",
    categoryLabel: "\u6E2C\u8A66",
    price: 16,
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663525376407/HsiMZrubGHyjhN4cohRHuH/product-rose-quartz-Cyp9uT5H6cB8cyt34mmWeU.webp",
    tags: ["\u6E2C\u8A66"],
    description: "\u6E2C\u8A66\u7528\u5546\u54C1\uFF0C\u50C5\u4F9B\u6E2C\u8A66\u8F49\u5E33\u91D1\u6D41\u6D41\u7A0B\u7528\u3002",
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
init_schema();

// shared/chatbotKnowledge.ts
var FAQ_CATEGORIES = ["\u5E38\u898B\u554F\u984C", "\u5BA2\u88FD\u5316", "\u8AB2\u7A0B", "\u9078\u8CFC\u9700\u6C42"];
var FAQ_QUESTION_MAX = 200;
var FAQ_ANSWER_MAX = 2e3;
var FAQ_KEYWORD_MAX = 30;
var FAQ_KEYWORD_LENGTH_MAX = 30;
function parseKeywords(input) {
  const parts = Array.isArray(input) ? input : input.split(/[\s,，、;；\n]+/);
  const seen = /* @__PURE__ */ new Set();
  const keywords = [];
  for (const part of parts) {
    const keyword = part.trim();
    if (!keyword) continue;
    const key = keyword.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    keywords.push(keyword);
  }
  return keywords;
}
function buildFaqEmbedText(question, keywords) {
  return [question.trim(), ...keywords].join(" ");
}

// server/chatbotKnowledgeAdmin.ts
init_schema();
import crypto5 from "node:crypto";
import { and as and8, asc as asc2, eq as eq13, sql as sql9 } from "drizzle-orm";
var KnowledgeAdminError = class extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = "KnowledgeAdminError";
  }
};
async function requireDb2() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await ensureChatbotKnowledgeTable();
  return db;
}
async function listKnowledgeEntries() {
  const db = await requireDb2();
  const rows = await db.select({
    id: chatbotKnowledge.id,
    sourceType: chatbotKnowledge.sourceType,
    sourceId: chatbotKnowledge.sourceId,
    question: chatbotKnowledge.question,
    answer: chatbotKnowledge.answer,
    keywords: chatbotKnowledge.keywords,
    category: chatbotKnowledge.category,
    active: chatbotKnowledge.active,
    hasVector: sql9`${chatbotKnowledge.vector} IS NOT NULL`,
    updatedAt: chatbotKnowledge.updatedAt
  }).from(chatbotKnowledge).orderBy(asc2(chatbotKnowledge.sourceType), asc2(chatbotKnowledge.category), asc2(chatbotKnowledge.createdAt));
  return rows.map(({ hasVector, keywords, ...row }) => ({
    ...row,
    keywords: keywords ?? [],
    hasVector: Number(hasVector) === 1
  }));
}
async function getFaq(id) {
  const db = await requireDb2();
  const [row] = await db.select().from(chatbotKnowledge).where(eq13(chatbotKnowledge.id, id)).limit(1);
  if (!row) throw new KnowledgeAdminError("NOT_FOUND", "\u627E\u4E0D\u5230\u9019\u5247\u554F\u7B54");
  if (row.sourceType !== "faq") {
    throw new KnowledgeAdminError("READ_ONLY", "\u5546\u54C1\u77E5\u8B58\u7531\u5546\u54C1\u8CC7\u6599\u81EA\u52D5\u7522\u751F\uFF0C\u8ACB\u5230\u5546\u54C1\u7BA1\u7406\u4FEE\u6539");
  }
  return row;
}
function newFaqId() {
  return `faq-${Date.now().toString(36)}-${crypto5.randomBytes(3).toString("hex")}`;
}
async function saveFaq(input) {
  const db = await requireDb2();
  const embedText = buildFaqEmbedText(input.question, input.keywords);
  const existing = input.id ? await getFaq(input.id) : null;
  let vector = existing && existing.embedText === embedText ? existing.vector : null;
  if (!vector) vector = await embedKnowledgeText(embedText);
  const values = {
    question: input.question,
    answer: input.answer,
    embedText,
    keywords: input.keywords,
    category: input.category,
    relatedProductIds: null,
    vector,
    active: input.active
  };
  const id = existing?.id ?? newFaqId();
  if (existing) {
    await db.update(chatbotKnowledge).set(values).where(and8(eq13(chatbotKnowledge.id, id), eq13(chatbotKnowledge.sourceType, "faq")));
  } else {
    await db.insert(chatbotKnowledge).values({ id, sourceType: "faq", sourceId: id, ...values });
  }
  return { id, vectorReady: Array.isArray(vector) && vector.length > 0 };
}
async function setFaqActive(id, active) {
  const db = await requireDb2();
  await getFaq(id);
  await db.update(chatbotKnowledge).set({ active }).where(and8(eq13(chatbotKnowledge.id, id), eq13(chatbotKnowledge.sourceType, "faq")));
}
async function deleteFaq(id) {
  const db = await requireDb2();
  await getFaq(id);
  await db.delete(chatbotKnowledge).where(and8(eq13(chatbotKnowledge.id, id), eq13(chatbotKnowledge.sourceType, "faq")));
}
async function refreshKnowledgeVector(id) {
  const db = await requireDb2();
  const [row] = await db.select().from(chatbotKnowledge).where(eq13(chatbotKnowledge.id, id)).limit(1);
  if (!row) throw new KnowledgeAdminError("NOT_FOUND", "\u627E\u4E0D\u5230\u9019\u5247\u77E5\u8B58");
  if (row.sourceType === "product") {
    await syncProductKnowledgeById(row.sourceId);
  } else {
    const vector = await embedKnowledgeText(row.embedText);
    if (vector) await db.update(chatbotKnowledge).set({ vector }).where(eq13(chatbotKnowledge.id, id));
  }
  const [updated] = await db.select({ vector: chatbotKnowledge.vector }).from(chatbotKnowledge).where(eq13(chatbotKnowledge.id, id)).limit(1);
  return { vectorReady: Array.isArray(updated?.vector) && updated.vector.length > 0 };
}

// server/routers/chatbot.ts
var SYSTEM_PROMPT = `\u4F60\u662F\u300C\u691B\u02D9Crystal\u300D\u6C34\u6676\u5E97\u7684 AI \u9867\u554F\u52A9\u7406\uFF0C\u540D\u53EB\u300C\u691B\u5C0F\u52A9\u300D\u3002

\u4F60\u7684\u89D2\u8272\uFF1A
- \u4EE5\u6EAB\u67D4\u3001\u5C08\u696D\u3001\u6709\u89AA\u548C\u529B\u7684\u53E3\u543B\u56DE\u7B54\u554F\u984C
- \u53EA\u6839\u64DA\u63D0\u4F9B\u7684\u53C3\u8003\u8CC7\u6599\u56DE\u7B54\uFF0C\u4E0D\u8981\u7DE8\u9020\u8CC7\u6599\u88E1\u6C92\u6709\u7684\u8CC7\u8A0A
- \u7D55\u5C0D\u4E0D\u8981\u5C0D\u9867\u5BA2\u63D0\u5230\u300C\u77E5\u8B58\u5EAB\u300D\u300C\u8CC7\u6599\u5EAB\u300D\u300C\u7CFB\u7D71\u300D\u300C\u6211\u7684\u8CC7\u6599\u300D\u7B49\u5167\u90E8\u7528\u8A9E\uFF0C\u9867\u5BA2\u4E0D\u9700\u8981\u77E5\u9053\u9019\u4E9B\uFF1B\u4E5F\u4E0D\u8981\u89E3\u91CB\u4F60\u70BA\u4EC0\u9EBC\u7B54\u4E0D\u51FA\u4F86
- \u7576\u9867\u5BA2\u63CF\u8FF0\u80FD\u91CF\u9700\u6C42\uFF08\u5982\u62DB\u6843\u82B1\u3001\u63D0\u5347\u4EBA\u7DE3\u3001\u6539\u5584\u5065\u5EB7\u3001\u5316\u89E3\u5C0F\u4EBA\u7B49\uFF09\uFF0C\u82E5\u53C3\u8003\u8CC7\u6599\u4E2D\u6C92\u6709\u5B8C\u5168\u7B26\u5408\u7684\u73FE\u8CA8\u5546\u54C1\uFF0C\u53EF\u63A8\u85A6\u5BA2\u88FD\u5316\u624B\u934A\u670D\u52D9\uFF0C\u8AAA\u660E\u53EF\u4EE5\u4F9D\u529F\u6548\u9700\u6C42\u91CF\u8EAB\u8A2D\u8A08\uFF0C\u4E26\u9644\u4E0A\u9023\u7D50 https://goodaytarot.com/custom
- \u7576\u9867\u5BA2\u6307\u5B9A\u60F3\u627E\u7684\u6C34\u6676\u7A2E\u985E\uFF0C\u4F46\u53C3\u8003\u8CC7\u6599\u6216\u73FE\u8CA8\u6E05\u55AE\u6C92\u6709\u8A72\u6676\u77F3\u6642\uFF0C\u5FC5\u9808\u8AA0\u5BE6\u8AAA\u300C\u76EE\u524D\u73FE\u8CA8\u6C92\u6709\u9019\u6B3E\u6676\u77F3\u300D\uFF1B\u53EF\u4EE5\u63D0\u4F9B\u529F\u6548\u76F8\u8FD1\u6216\u80FD\u91CF\u65B9\u5411\u76F8\u8FD1\u7684\u73FE\u8CA8\u66FF\u4EE3\u6B3E\u3002\u4E0D\u53EF\u8AAA\u5BA2\u88FD\u5316\u65B9\u6848\u4E00\u5B9A\u6703\u6709\u3001\u4E00\u5B9A\u80FD\u505A\u3001\u53EF\u6307\u5B9A\u53D6\u5F97\u8A72\u6676\u77F3\uFF1B\u82E5\u63D0\u5230\u5BA2\u88FD\u5316\uFF0C\u53EA\u80FD\u8AAA\u53EF\u8207\u5E97\u5BB6\u8A0E\u8AD6\u9700\u6C42\u8207\u53EF\u7528\u6750\u6599
- \u53EA\u8981\u3010\u53EF\u63A8\u85A6\u7684\u76F8\u95DC\u5546\u54C1\u3011\u6E05\u55AE\u88E1\u6709\u6B3E\u5F0F\uFF0C\u5C31\u4E00\u5B9A\u8981\u5148\u63A8\u85A6\u6E05\u55AE\u4E0A\u7684\u6B3E\u5F0F\u4E26\u9644\u9023\u7D50\u3002\u9867\u5BA2\u554F\u7684\u662F\u5206\u985E\uFF08\u4F8B\u5982\u300C\u6709\u540A\u98FE\u55CE\u300D\u300C\u6709\u9805\u934A\u55CE\u300D\uFF09\u6642\u4E5F\u4E00\u6A23\uFF0C\u5148\u628A\u6E05\u55AE\u4E0A\u7684\u6B3E\u5F0F\u4ECB\u7D39\u7D66\u4ED6\uFF0C\u4E0D\u53EF\u4EE5\u8DF3\u904E\u63A8\u85A6\u76F4\u63A5\u628A\u4EBA\u5C0E\u5230 LINE
- \u53EA\u6709\u5728\u6E05\u55AE\u662F\u7A7A\u7684\u3001\u53C3\u8003\u8CC7\u6599\u4E5F\u7B54\u4E0D\u51FA\u4F86\u6642\uFF08\u4F8B\u5982\u5546\u54C1\u898F\u683C\u6578\u5B57\u3001\u532F\u6B3E\u5E33\u865F\u3001\u6298\u6263\u653F\u7B56\u9019\u985E\u71DF\u904B\u7D30\u7BC0\uFF09\uFF0C\u624D\u628A\u9867\u5BA2\u5C0E\u5230\u5B98\u65B9 LINE\uFF1Ahttps://line.me/R/ti/p/@011tymeh
- \u5C0E\u5411 LINE \u6642\uFF1A\u4E0D\u8981\u8AAA\u660E\u81EA\u5DF1\u67E5\u4E0D\u5230\u6216\u6C92\u6709\u8CC7\u6599\uFF0C\u8A9E\u6C23\u50CF\u5728\u5E6B\u5FD9\u8F49\u63A5\u800C\u4E0D\u662F\u63A8\u8A17\uFF1B\u6BCF\u6B21\u7684\u8AAA\u6CD5\u8981\u81EA\u7136\u8B8A\u5316\uFF0C\u4E0D\u8981\u6BCF\u5247\u90FD\u7528\u540C\u4E00\u53E5\u958B\u5834
- \u7576\u9867\u5BA2\u63CF\u8FF0\u9700\u6C42\uFF08\u5982\u60F3\u63D0\u5347\u81EA\u4FE1\u3001\u8CA1\u904B\u3001\u611B\u60C5\u7B49\uFF09\uFF0C\u6216\u6307\u5B9A\u60F3\u627E\u7684\u6C34\u6676\u7A2E\u985E\uFF08\u5982\u7C89\u6676\u3001\u8349\u8393\u6676\u3001\u6708\u5149\u77F3\u7B49\uFF09\uFF0C\u6839\u64DA\u53C3\u8003\u8CC7\u6599\u63A8\u85A6\u9069\u5408\u7684\u73FE\u8CA8\u6B3E\u5F0F\u4E26\u9644\u4E0A\u5546\u54C1\u9023\u7D50
- \u4F7F\u7528\u7E41\u9AD4\u4E2D\u6587\u56DE\u7B54
- \u5B57\u6578\uFF1A\u6574\u5247\u56DE\u7B54\u8ACB\u63A7\u5236\u5728 200 \u5B57\u4EE5\u5167\uFF1B\u4EE5\u8B80\u8005\u770B\u5230\u7684\u5B57\u5143\u70BA\u6E96\uFF0C\u6BCF\u4E00\u884C\u5B8C\u6574\u8CBC\u4E0A\u7684 https \u5546\u54C1\u9023\u7D50\u4E0D\u8A08\u5165 200 \u5B57\uFF0C\u5176\u9918\u8AAA\u660E\u3001\u54C1\u540D\u3001\u6A19\u9EDE\u3001\u63DB\u884C\u7686\u9808\u8A08\u5165
- \u8A9E\u610F\u5B8C\u6574\uFF1A\u6BCF\u53E5\u8A71\u9808\u5BEB\u5230\u81EA\u7136\u7D50\u5C3E\uFF08\u53E5\u865F\u3001\u9A5A\u5606\u865F\u6216\u554F\u865F\u7686\u53EF\uFF09\uFF0C\u7981\u6B62\u505C\u5728\u534A\u53E5\u3001\u7834\u6298\u3001\u6216\u672A\u5BEB\u5B8C\u7684\u8A5E\uFF08\u4F8B\u5982\u300C\u691B\u5C0F\u300D\uFF09
- \u958B\u982D\u7CBE\u7C21\uFF1A\u4E0D\u8981\u300C\u60A8\u597D\u300D\u300C\u611F\u8B1D\u60A8\u7684\u8A62\u554F\u300D\u7B49\u5197\u9577\u5BA2\u5957\uFF1B\u7B2C\u4E00\u53E5\u5C31\u5207\u5165\u91CD\u9EDE\uFF08\u4E5F\u7121\u9808\u518D\u6B21\u81EA\u7A31\u691B\u5C0F\u52A9\uFF09

\u56DE\u7B54\u683C\u5F0F\uFF1A
- \u76F4\u63A5\u56DE\u7B54\u554F\u984C\uFF0C\u4E0D\u9700\u8981\u81EA\u6211\u4ECB\u7D39
- \u63A8\u85A6\u5546\u54C1\u6642\u5217\u51FA\u5546\u54C1\u540D\u7A31\u3001\u7C21\u77ED\u8AAA\u660E\u9069\u5408\u539F\u56E0\u3001\u5546\u54C1\u9023\u7D50
- \u7576\u8A9E\u5883\u4E2D\u51FA\u73FE\u3010\u53EF\u63A8\u85A6\u7684\u76F8\u95DC\u5546\u54C1\u3011\u4E14\u8A3B\u660E\u8207\u4E0B\u65B9\u5546\u54C1\u5361\u4E00\u81F4\u6642\uFF0C\u63A8\u85A6\u73FE\u8CA8\u50C5\u80FD\u4F7F\u7528\u8A72\u6E05\u55AE\u4E0A\u7684\u6B3E\u5F0F\uFF1B\u6B3E\u6578\u3001\u54C1\u540D\u3001\u9023\u7D50\u9808\u8207\u6E05\u55AE\u5B8C\u5168\u4E00\u81F4\uFF0C\u9808\u9010\u6B3E\u5BEB\u51FA\u4E26\u9644\u4E0A\u6E05\u55AE\u4E2D\u7684\u5B8C\u6574 https \u9023\u7D50\uFF0C\u4E0D\u53EF\u53EA\u4ECB\u7D39\u5176\u4E2D\u5E7E\u6B3E\uFF0C\u4E5F\u4E0D\u53EF\u65B0\u589E\u6E05\u55AE\u5916\u7684\u73FE\u8CA8\u54C1\u540D\uFF1B\u8AAA\u660E\u9069\u5408\u539F\u56E0\u6642\u4ECD\u53EF\u4F9D\u9867\u5BA2\u554F\u984C\u81EA\u7531\u767C\u63EE
- \u82E5\u9808\u4ECB\u7D39\u3010\u53EF\u63A8\u85A6\u7684\u76F8\u95DC\u5546\u54C1\u3011\u6E05\u55AE\uFF0C\u8ACB\u5148\u9010\u6B3E\u5BEB\u51FA\u300C\u54C1\u540D\uFF0B\u8A72\u6B3E\u7684\u5B8C\u6574 https \u5546\u54C1\u9023\u7D50\u300D\uFF08\u53EF\u6BCF\u6B3E\u4E00\u884C\uFF09\uFF0C\u518D\u5BEB\u7C21\u77ED\u9069\u5408\u539F\u56E0\uFF0C\u907F\u514D\u56E0\u7BC7\u5E45\u6216\u622A\u65B7\u505C\u5728\u300C\u63A8\u85A6\u300D\u300C\u5982\u4E0B\u300D\u7B49\u672A\u63A5\u54C1\u540D\u3001\u672A\u8CBC\u9023\u7D50\u7684\u534A\u53E5
- \u82E5\u5DF2\u6709\u3010\u53EF\u63A8\u85A6\u7684\u76F8\u95DC\u5546\u54C1\u3011\u6E05\u55AE\uFF0C\u52FF\u5BEB\u300C\u6C92\u6709\u63A8\u85A6\u5546\u54C1\u300D\u300C\u6C92\u6709\u73FE\u8CA8\u53EF\u63A8\u85A6\u300D\u300C\u6C92\u6709\u7B26\u5408\u7684\u73FE\u8CA8\u300D\u7B49\u6982\u62EC\u5426\u5B9A\uFF08\u5F77\u5F7F\u5E97\u5167\u5B8C\u5168\u7121\u73FE\u8CA8\u53EF\u53C3\u8003\uFF09\u3002\u82E5\u9867\u5BA2\u9EDE\u540D\u7684\u4E3B\u77F3\u6216\u6B3E\u5F0F\u4E0D\u5728\u8A72\u6E05\u55AE\u5167\uFF0C\u8ACB\u5148\u7528\u4E00\u5169\u53E5\u8AAA\u660E\u843D\u5DEE\uFF08\u4F8B\u5982\u73FE\u8CA8\u7121\u8A72\u4E3B\u77F3\u70BA\u4E3B\u7684\u6B3E\u5F0F\uFF09\uFF1B\u82E5\u4F60\u63A5\u8457\u8981\u4ECB\u7D39\u6E05\u55AE\u4E0A\u7684\u6B3E\u5F0F\u4F5C\u70BA\u66FF\u4EE3\u53C3\u8003\uFF0C\u9808\u4F9D\u6E05\u55AE\u9010\u6B3E\u5BEB\u51FA\u54C1\u540D\u8207\u6E05\u55AE\u5167\u7684\u5B8C\u6574 https \u9023\u7D50\uFF0C\u8207\u4E0A\u6587\u8AAA\u660E\u929C\u63A5\u81EA\u7136\u5373\u53EF\u3002\u4E0D\u53EF\u88DC\u5145\u300C\u5BA2\u88FD\u5316\u5C31\u6703\u6709\u8A72\u6307\u5B9A\u6676\u77F3\u300D
- \u82E5\u6709\u5217\u51FA\u9023\u7D50\uFF0C\u5FC5\u9808\u9010\u5B57\u8907\u88FD\u8A72\u5B8C\u6574 https \u7DB2\u5740\u5230\u56DE\u7B54\u4E2D\uFF0C\u4E0D\u53EF\u7701\u7565\u3001\u6539\u5BEB\uFF0C\u4E5F\u4E0D\u53EF\u4F7F\u7528\u300C\u8ACB\u63D2\u5165\u9023\u7D50\u300D\u300C\u8CC7\u6599\u672A\u63D0\u4F9B\u300D\u7B49\u5360\u4F4D\u6587\u5B57
- \u4F7F\u7528\u9069\u7576\u7684\u63DB\u884C\u8B93\u56DE\u7B54\u6613\u8B80
- \u4E0D\u4F7F\u7528 markdown \u683C\u5F0F\uFF0C\u4E0D\u4F7F\u7528 **\u7C97\u9AD4**\u3001*\u659C\u9AD4*\u3001# \u6A19\u984C\u7B49\u7B26\u865F`;
var PUBLIC_SITE2 = "https://goodaytarot.com";
var CHATBOT_MAX_MESSAGE_LENGTH = 500;
var CHATBOT_MODEL = "gemini-3.8-flash";
var CHATBOT_TEMPERATURE = 0.3;
var CHATBOT_MAX_OUTPUT_TOKENS = 8192;
var SMALL_TALK_PATTERN = /^(你好|嗨|哈囉|hello|hi|謝謝|感謝|掰掰|再見)[！!。,.，\s]*$/i;
var HUMAN_HANDOFF_PATTERN = /(官方\s*line|聯繫.{0,8}客服|私訊.{0,8}line|洽詢.{0,8}line|透過.{0,8}line)/i;
var EXPLICIT_GAP_PATTERN = /(沒有(?:提供|相關).{0,12}(?:資訊|資料)|無法(?:確認|回答)|不確定|需要.{0,10}(?:客服|店家).{0,8}確認)/i;
var SPECIFIC_FACT_PATTERN = /(珠徑|水晶.{0,6}(?:大小|尺寸)|幾\s*(?:mm|公厘)|最大顆|匯款帳號|優惠碼|折扣碼|庫存數量|到貨日期)/i;
var STRONG_MATCH_SCORE = 0.65;
function classifyChatbotAnswer(input) {
  const topScore = input.chunks[0]?.score ?? null;
  if (SMALL_TALK_PATTERN.test(input.question.trim())) {
    return { status: "complete", reason: "\u4E00\u822C\u5BD2\u6684\uFF0C\u4E0D\u9700\u4F7F\u7528\u77E5\u8B58\u5EAB\u56DE\u7B54", topScore };
  }
  if (HUMAN_HANDOFF_PATTERN.test(input.reply)) {
    return {
      status: "handoff",
      reason: SPECIFIC_FACT_PATTERN.test(input.question) ? "\u8A62\u554F\u7279\u5B9A\u898F\u683C\u6216\u71DF\u904B\u8CC7\u6599\uFF0C\u56DE\u7B54\u5DF2\u8F49\u4ECB\u4EBA\u5DE5\u5BA2\u670D" : "\u56DE\u7B54\u5305\u542B\u660E\u78BA\u7684 LINE\uFF0F\u4EBA\u5DE5\u5BA2\u670D\u8F49\u4ECB",
      topScore
    };
  }
  if (EXPLICIT_GAP_PATTERN.test(input.reply) || input.usedFallback || topScore === null) {
    return {
      status: "knowledge_gap",
      reason: EXPLICIT_GAP_PATTERN.test(input.reply) ? "\u56DE\u7B54\u660E\u78BA\u8868\u793A\u7F3A\u5C11\u53EF\u78BA\u8A8D\u7684\u8CC7\u6599" : "\u6C92\u6709\u9054\u5230\u53EF\u76F4\u63A5\u56DE\u7B54\u7684\u77E5\u8B58\u547D\u4E2D\u5206\u6578",
      topScore
    };
  }
  const hasStrongFaqMatch = input.chunks.some(
    (chunk) => !chunk.id.startsWith("product-") && chunk.score >= STRONG_MATCH_SCORE
  );
  if (SPECIFIC_FACT_PATTERN.test(input.question) && !hasStrongFaqMatch) {
    return {
      status: "low_confidence",
      reason: "\u7279\u5B9A\u898F\u683C\u554F\u984C\u53EA\u547D\u4E2D\u6CDB\u7528\u6216\u5546\u54C1\u77E5\u8B58\uFF0C\u5EFA\u8B70\u4EBA\u5DE5\u78BA\u8A8D",
      topScore
    };
  }
  if (topScore < STRONG_MATCH_SCORE) {
    return {
      status: "low_confidence",
      reason: `\u6700\u9AD8\u77E5\u8B58\u547D\u4E2D\u5206\u6578\u4F4E\u65BC ${STRONG_MATCH_SCORE}`,
      topScore
    };
  }
  return { status: "complete", reason: "\u6709\u8F03\u9AD8\u5206\u77E5\u8B58\u547D\u4E2D\uFF0C\u4E14\u672A\u4F7F\u7528\u5099\u63F4\u6216\u4EBA\u5DE5\u8F49\u4ECB", topScore };
}
function trimIncompleteTail(reply) {
  const text2 = reply.trim();
  if (!text2) return "";
  if (/[。！？!?～~：)」】]$/.test(text2) || /https?:\/\/\S+$/.test(text2)) return text2;
  const lines = text2.split("\n");
  while (lines.length > 0) {
    const last = lines[lines.length - 1].trim();
    if (last && (/[。！？!?～~：)」】]$/.test(last) || /https?:\/\/\S+$/.test(last))) break;
    lines.pop();
  }
  return lines.join("\n").trim();
}
var KNOWLEDGE_CLIP_CHARS = 400;
function extractPriceAndLinkTail(text2) {
  const linkAt = text2.lastIndexOf("https://");
  if (linkAt < 0) return "";
  const priceAt = text2.lastIndexOf("\u50F9\u683C", linkAt);
  const newlineAt = text2.lastIndexOf("\n", linkAt);
  const start = Math.max(priceAt, newlineAt + 1);
  return text2.slice(start > 0 ? start : linkAt).trim();
}
function clipKnowledgeAnswer(text2, maxChars = KNOWLEDGE_CLIP_CHARS) {
  const t2 = text2.trim();
  if (t2.length <= maxChars) return t2;
  const tail = extractPriceAndLinkTail(t2);
  if (!tail || tail.length >= maxChars) return `${t2.slice(0, maxChars)}\u2026\uFF08\u5F8C\u7565\uFF09`;
  const head = t2.slice(0, Math.max(0, maxChars - tail.length - 6)).trim();
  return `${head}\u2026\uFF08\u4E2D\u7565\uFF09${tail}`;
}
function productCitationAliases(name) {
  const n = name.trim();
  const aliases = /* @__PURE__ */ new Set();
  if (n.length >= 2) aliases.add(n);
  if (n.endsWith("\u624B\u934A") && n.length > "\u624B\u934A".length + 1) {
    const base = n.slice(0, -2).trim();
    if (base.length >= 2) aliases.add(base);
  }
  return Array.from(aliases);
}
function filterRelatedProductsCitedInReply(reply, related) {
  return related.filter((p) => {
    const abs = `${PUBLIC_SITE2}/products/${p.id}`;
    if (reply.includes(abs) || reply.includes(`/products/${p.id}`)) return true;
    for (const alias of productCitationAliases(p.name)) {
      if (reply.includes(alias)) return true;
    }
    return false;
  });
}
async function generateAnswer(systemPrompt, history, userMessage, maxTokens = CHATBOT_MAX_OUTPUT_TOKENS) {
  const contents = [
    ...history.map((h) => ({
      role: h.role === "assistant" ? "model" : "user",
      parts: [{ text: h.content }]
    })),
    { role: "user", parts: [{ text: userMessage }] }
  ];
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${CHATBOT_MODEL}:generateContent?key=${ENV.geminiApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: {
          // 思考與回答共用這個額度，放寬的理由見 CHATBOT_MAX_OUTPUT_TOKENS
          maxOutputTokens: maxTokens,
          // 不設的話用模型預設值，客服場景不需要發散
          temperature: CHATBOT_TEMPERATURE
        }
      })
    }
  );
  if (!res.ok) {
    const err = await res.text();
    console.error("[chatbot] generateContent error:", res.status, err);
    throw new Error(`Gemini generateContent failed: ${res.status} \u2013 ${err}`);
  }
  const data = await res.json();
  if (data.promptFeedback?.blockReason) {
    console.warn("[chatbot] promptFeedback blockReason:", data.promptFeedback.blockReason);
  }
  const candidate = data.candidates?.[0];
  if (!candidate) {
    console.warn("[chatbot] empty candidates");
    return "\u62B1\u6B49\uFF0C\u76EE\u524D\u7121\u6CD5\u5B8C\u6210\u56DE\u8986\uFF0C\u8ACB\u7A0D\u5F8C\u518D\u8A66\uFF0C\u6216\u900F\u904E LINE \u806F\u7E6B\u5BA2\u670D\uFF1Ahttps://line.me/R/ti/p/@011tymeh";
  }
  const text2 = candidate.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  if (candidate.finishReason === "MAX_TOKENS" && text2.length > 0) {
    console.warn("[chatbot] reply hit maxOutputTokens (truncated):", text2.length, "chars");
    return trimIncompleteTail(text2) || "\u62B1\u6B49\uFF0C\u6211\u73FE\u5728\u7121\u6CD5\u56DE\u7B54\uFF0C\u8ACB\u7A0D\u5F8C\u518D\u8A66\u3002";
  }
  return text2.trim() || "\u62B1\u6B49\uFF0C\u6211\u73FE\u5728\u7121\u6CD5\u56DE\u7B54\uFF0C\u8ACB\u7A0D\u5F8C\u518D\u8A66\u3002";
}
async function embedQuery(text2) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${ENV.geminiApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/gemini-embedding-001",
        content: { parts: [{ text: text2 }] }
      })
    }
  );
  if (!res.ok) throw new Error(`Gemini embed failed: ${res.status}`);
  const data = await res.json();
  return data.embedding.values;
}
function uniqueProductIdsFromChunks(chunks) {
  return Array.from(new Set(chunks.flatMap((chunk) => chunk.relatedProductIds ?? [])));
}
function isUnavailableCrystalQuestion(chunks) {
  const top = chunks.reduce(
    (best, chunk) => best === null || chunk.score > best.score ? chunk : best,
    null
  );
  return Boolean(top && top.id.endsWith("-unavailable") && top.score >= 0.55);
}
function selectRelatedProductIds(relevantChunks, scoreMin = 0.55, maxProducts = 6) {
  const matchingChunks = relevantChunks.filter(
    (chunk) => chunk.category === "\u5546\u54C1\u63A8\u85A6" && (chunk.relatedProductIds?.length ?? 0) > 0 && chunk.score >= scoreMin
  ).sort((a, b) => b.score - a.score);
  const standaloneProductChunks = matchingChunks.filter((chunk) => chunk.id.startsWith("product-"));
  const fallbackRecommendationChunks = matchingChunks.filter((chunk) => !chunk.id.startsWith("product-"));
  const standaloneProductIds = uniqueProductIdsFromChunks(standaloneProductChunks);
  if (standaloneProductIds.length >= 2) {
    return standaloneProductIds.slice(0, maxProducts);
  }
  return uniqueProductIdsFromChunks([...standaloneProductChunks, ...fallbackRecommendationChunks.slice(0, 2)]).slice(0, maxProducts);
}
function normalizeProductImageUrl2(url) {
  const trimmed = url.trim();
  if (!trimmed.includes("drive.google.com")) return trimmed;
  const fileMatch = trimmed.match(/\/file\/d\/([^/?#]+)/);
  const idMatch = trimmed.match(/[?&]id=([^&#]+)/);
  const id = fileMatch?.[1] ?? idMatch?.[1];
  return id ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1600` : trimmed;
}
async function loadRelatedProducts(productIds) {
  if (productIds.length === 0) return [];
  const byId = /* @__PURE__ */ new Map();
  const db = await getDb();
  let useStaticCatalog = !db;
  if (db) {
    try {
      const rows = await db.select({
        id: dbProducts.id,
        name: dbProducts.name,
        subtitle: dbProducts.subtitle,
        price: dbProducts.price,
        image: dbProducts.image
      }).from(dbProducts).where(and9(
        inArray4(dbProducts.id, productIds),
        eq14(dbProducts.active, true),
        sql10`${dbProducts.category} != 'test'`
      ));
      for (const row of rows) {
        byId.set(row.id, {
          id: row.id,
          name: row.name,
          subtitle: row.subtitle ?? "",
          price: row.price,
          image: normalizeProductImageUrl2(row.image)
        });
      }
    } catch (error) {
      console.warn("[chatbot] failed to load related products from DB:", error);
      useStaticCatalog = true;
    }
  }
  for (const id of useStaticCatalog ? productIds : []) {
    if (byId.has(id)) continue;
    const product = products.find((p) => p.id === id && p.category !== "test");
    if (!product) continue;
    byId.set(id, {
      id: product.id,
      name: product.name,
      subtitle: product.subtitle,
      price: product.price,
      image: normalizeProductImageUrl2(product.image)
    });
  }
  return productIds.map((id) => byId.get(id)).filter((p) => Boolean(p));
}
async function saveChatbotLog(params) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(chatbotLogs).values({
      sessionId: params.sessionId.slice(0, 64),
      userId: params.userId ?? null,
      customerName: params.customerName?.slice(0, 100) ?? null,
      customerEmail: params.customerEmail?.slice(0, 320) ?? null,
      customerQuestion: params.customerQuestion,
      botReply: params.botReply,
      relatedProducts: params.relatedProducts,
      retrievedQuestions: params.retrievedQuestions,
      retrievedKnowledge: params.retrievedKnowledge,
      answerStatus: params.answerStatus,
      answerStatusReason: params.answerStatusReason.slice(0, 255),
      topKnowledgeScore: params.topKnowledgeScore,
      usedFallback: params.usedFallback,
      pagePath: params.pagePath?.slice(0, 255) ?? null
    });
  } catch (error) {
    console.warn("[chatbot] failed to save log:", error);
  }
}
var faqInputSchema = z4.object({
  question: z4.string().trim().min(1, "\u8ACB\u8F38\u5165\u554F\u984C").max(FAQ_QUESTION_MAX, `\u554F\u984C\u6700\u591A ${FAQ_QUESTION_MAX} \u5B57`),
  answer: z4.string().trim().min(1, "\u8ACB\u8F38\u5165\u56DE\u7B54").max(FAQ_ANSWER_MAX, `\u56DE\u7B54\u6700\u591A ${FAQ_ANSWER_MAX} \u5B57`),
  keywords: z4.array(z4.string()).transform((keywords) => parseKeywords(keywords)).pipe(
    z4.array(z4.string().max(FAQ_KEYWORD_LENGTH_MAX, `\u6BCF\u500B\u95DC\u9375\u5B57\u6700\u591A ${FAQ_KEYWORD_LENGTH_MAX} \u5B57`)).max(FAQ_KEYWORD_MAX, `\u95DC\u9375\u5B57\u6700\u591A ${FAQ_KEYWORD_MAX} \u500B`)
  ),
  category: z4.enum(FAQ_CATEGORIES),
  active: z4.boolean()
});
async function withKnowledgeErrors(run2) {
  try {
    return await run2();
  } catch (error) {
    if (error instanceof KnowledgeAdminError) {
      throw new TRPCError6({ code: error.code === "NOT_FOUND" ? "NOT_FOUND" : "BAD_REQUEST", message: error.message });
    }
    throw error;
  }
}
var chatbotRouter = router({
  chat: rateLimitedPublicProcedure({ scope: "chatbot", limit: 20, windowMs: 5 * 6e4 }).input(
    z4.object({
      message: z4.string().min(1).max(CHATBOT_MAX_MESSAGE_LENGTH),
      sessionId: z4.string().min(1).max(64).optional(),
      pagePath: z4.string().max(255).optional(),
      history: z4.array(
        z4.object({
          role: z4.enum(["user", "assistant"]),
          content: z4.string().max(CHATBOT_MAX_MESSAGE_LENGTH * 2)
        })
      ).max(10).default([])
    })
  ).mutation(async ({ input, ctx }) => {
    const sessionId = input.sessionId || `server-${Date.now()}`;
    const baseLog = {
      sessionId,
      userId: ctx.user?.id ?? null,
      customerName: ctx.user?.name ?? null,
      customerEmail: ctx.user?.email ?? null,
      customerQuestion: input.message,
      pagePath: input.pagePath ?? null
    };
    const lastTurn = input.history.slice(-2).map((h) => h.content).join(" ");
    const queryText = lastTurn ? `${lastTurn} ${input.message}` : input.message;
    let queryVector;
    try {
      queryVector = await embedQuery(queryText);
    } catch (e) {
      console.error("[chatbot] embed error:", e);
      throw new TRPCError6({
        code: "SERVICE_UNAVAILABLE",
        message: "AI \u5BA2\u670D\u66AB\u6642\u7121\u6CD5\u4F7F\u7528\uFF0C\u8ACB\u7A0D\u5F8C\u518D\u8A66\uFF0C\u6216\u900F\u904E LINE \u806F\u7E6B\u5BA2\u670D",
        cause: e
      });
    }
    const relevantChunks = await searchKnowledge(queryText, queryVector, 10, 0.45);
    const hasUnavailableCrystalMatch = isUnavailableCrystalQuestion(relevantChunks);
    const chunksForAnswer = hasUnavailableCrystalMatch ? relevantChunks.filter((chunk) => chunk.id.endsWith("-unavailable") || chunk.category !== "\u5546\u54C1\u63A8\u85A6") : relevantChunks;
    const PRODUCT_SCORE_MIN = 0.55;
    const relatedProductIds = hasUnavailableCrystalMatch ? [] : selectRelatedProductIds(
      relevantChunks,
      PRODUCT_SCORE_MIN
    );
    const relatedProducts = await loadRelatedProducts(relatedProductIds);
    let ragContext = "";
    if (chunksForAnswer.length > 0) {
      ragContext = "\n\n\u3010\u76F8\u95DC\u5E38\u898B\u554F\u984C\u3011\n" + chunksForAnswer.map((c) => `Q: ${c.question}
A: ${clipKnowledgeAnswer(c.answer)}`).join("\n\n");
    }
    if (relatedProducts.length > 0) {
      const n = relatedProducts.length;
      ragContext += `

\u3010\u53EF\u63A8\u85A6\u7684\u76F8\u95DC\u5546\u54C1\uFF08\u4EE5\u4E0B ${n} \u6B3E\uFF1B\u50C5\u7576\u4F60\u5728\u56DE\u7B54\u4E2D\u5BEB\u51FA\u8A72\u6B3E\u7684\u54C1\u540D\u6216\u5B8C\u6574\u5546\u54C1 https \u9023\u7D50\u6642\uFF0C\u804A\u5929\u5BA4\u624D\u6703\u986F\u793A\u5C0D\u61C9\u5546\u54C1\u5361\uFF1B\u63A8\u85A6\u7684\u73FE\u8CA8\u5FC5\u9808\u8207\u6B64\u6E05\u55AE\u5B8C\u5168\u4E00\u81F4\uFF09\u3011
` + relatedProducts.map(
        (p, i) => `${i + 1}. ${p.name}\uFF08NT$${p.price}\uFF09
   \u7C21\u8FF0\uFF1A${p.subtitle}
   \u9023\u7D50\uFF08\u8ACB\u65BC\u56DE\u7B54\u4E2D\u9010\u5B57\u4F7F\u7528\uFF09\uFF1A${PUBLIC_SITE2}/products/${p.id}`
      ).join("\n\n");
    }
    const hasGoodMatch = chunksForAnswer.some((c) => c.score >= 0.5);
    if (!hasGoodMatch) {
      ragContext += "\n\n\u3010\u5099\u63F4\u8CC7\u8A0A\u3011\n\u82E5\u9867\u5BA2\u7684\u529F\u6548\u9700\u6C42\u5728\u73FE\u6709\u5546\u54C1\u4E2D\u627E\u4E0D\u5230\u5B8C\u5168\u7B26\u5408\u7684\u6B3E\u5F0F\uFF0C\u53EF\u63A8\u85A6\u300C\u5BA2\u88FD\u5316\u6C34\u6676\u624B\u934A\u300D\u670D\u52D9\u3002\u8A2D\u8A08\u5E2B\u6703\u6839\u64DA\u529F\u6548\u9700\u6C42\uFF08\u5982\u62DB\u6843\u82B1\u3001\u6539\u5584\u5065\u5EB7\u3001\u5316\u89E3\u5C0F\u4EBA\u3001\u63D0\u5347\u67D0\u7A2E\u7279\u5B9A\u904B\u52E2\u7B49\uFF09\u91CF\u8EAB\u8A2D\u8A08\u5C08\u5C6C\u624B\u934A\u3002\u82E5\u9867\u5BA2\u6307\u5B9A\u67D0\u7A2E\u6676\u77F3\u4F46\u53C3\u8003\u8CC7\u6599\u6216\u73FE\u8CA8\u6C92\u6709\uFF0C\u8ACB\u8AA0\u5BE6\u8AAA\u660E\u76EE\u524D\u73FE\u8CA8\u6C92\u6709\uFF0C\u512A\u5148\u63D0\u4F9B\u529F\u6548\u6216\u80FD\u91CF\u65B9\u5411\u76F8\u8FD1\u7684\u66FF\u4EE3\u73FE\u8CA8\uFF1B\u4E0D\u53EF\u627F\u8AFE\u5BA2\u88FD\u5316\u4E00\u5B9A\u6703\u6709\u8A72\u6307\u5B9A\u6676\u77F3\uFF0C\u53EA\u80FD\u8AAA\u53EF\u8207\u5E97\u5BB6\u8A0E\u8AD6\u9700\u6C42\u8207\u53EF\u7528\u6750\u6599\u3002\u5BA2\u88FD\u5316\u65B9\u6848\u9801\u9762\uFF1Ahttps://goodaytarot.com/custom\n\u4E5F\u6B61\u8FCE\u900F\u904E LINE \u8A62\u554F\uFF1Ahttps://line.me/R/ti/p/@011tymeh";
    }
    const reply = await generateAnswer(
      SYSTEM_PROMPT + ragContext,
      input.history.slice(-10),
      input.message
    );
    const productsForClient = filterRelatedProductsCitedInReply(reply, relatedProducts);
    if (relatedProducts.length > 0 && productsForClient.length < relatedProducts.length) {
      console.warn(
        "[chatbot] relatedProducts filtered to reply citations:",
        productsForClient.length,
        "/",
        relatedProducts.length
      );
    }
    const responseProducts = productsForClient.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      href: `/products/${p.id}`
    }));
    const retrievedQuestions = chunksForAnswer.map((c) => c.question);
    const retrievedKnowledge = chunksForAnswer.map((chunk) => ({
      id: chunk.id,
      question: chunk.question,
      category: chunk.category,
      score: Number(chunk.score.toFixed(4))
    }));
    const answerAssessment = classifyChatbotAnswer({
      question: input.message,
      reply,
      chunks: chunksForAnswer,
      usedFallback: !hasGoodMatch
    });
    await saveChatbotLog({
      ...baseLog,
      botReply: reply,
      relatedProducts: responseProducts,
      retrievedQuestions,
      retrievedKnowledge,
      answerStatus: answerAssessment.status,
      answerStatusReason: answerAssessment.reason,
      topKnowledgeScore: answerAssessment.topScore === null ? null : Number(answerAssessment.topScore.toFixed(4)),
      usedFallback: !hasGoodMatch
    });
    return {
      reply,
      relatedProducts: productsForClient.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        image: p.image,
        href: `/products/${p.id}`
      })),
      retrievedChunks: retrievedQuestions
    };
  }),
  listLogs: adminProcedure.input(
    z4.object({
      limit: z4.number().int().min(1).max(100).default(20),
      offset: z4.number().int().min(0).default(0),
      search: z4.string().max(100).optional(),
      answerStatus: z4.enum(["complete", "low_confidence", "knowledge_gap", "handoff", "unclassified"]).optional()
    })
  ).query(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError6({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    }
    const conditions = [];
    const search = input.search?.trim();
    if (search) {
      const term = `%${search}%`;
      conditions.push(
        or4(
          sql10`${chatbotLogs.customerQuestion} LIKE ${term}`,
          sql10`${chatbotLogs.botReply} LIKE ${term}`,
          sql10`${chatbotLogs.customerEmail} LIKE ${term}`,
          sql10`${chatbotLogs.customerName} LIKE ${term}`,
          sql10`CAST(${chatbotLogs.relatedProducts} AS CHAR) LIKE ${term}`,
          sql10`CAST(${chatbotLogs.retrievedQuestions} AS CHAR) LIKE ${term}`
        )
      );
    }
    if (input.answerStatus === "unclassified") {
      conditions.push(isNull2(chatbotLogs.answerStatus));
    } else if (input.answerStatus) {
      conditions.push(eq14(chatbotLogs.answerStatus, input.answerStatus));
    }
    const where = conditions.length > 0 ? and9(...conditions) : void 0;
    const rowsQuery = db.select().from(chatbotLogs).orderBy(desc6(chatbotLogs.createdAt)).limit(input.limit).offset(input.offset);
    const countQuery = db.select({ count: sql10`CAST(COUNT(*) AS SIGNED)` }).from(chatbotLogs);
    const [items, countRows] = await Promise.all([
      where ? rowsQuery.where(where) : rowsQuery,
      where ? countQuery.where(where) : countQuery
    ]);
    return {
      items,
      total: Number(countRows[0]?.count ?? 0)
    };
  }),
  deleteLogs: adminProcedure.input(
    z4.object({
      ids: z4.array(z4.number().int().positive()).min(1).max(100)
    })
  ).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError6({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    }
    const ids = Array.from(new Set(input.ids));
    await db.delete(chatbotLogs).where(inArray4(chatbotLogs.id, ids));
    return { success: true, deletedCount: ids.length };
  }),
  // ─── 後台知識庫管理 ─────────────────────────────────────────────────────────
  knowledgeList: adminProcedure.query(() => listKnowledgeEntries()),
  knowledgeSave: adminProcedure.input(faqInputSchema.extend({ id: z4.string().max(128).optional() })).mutation(({ input }) => withKnowledgeErrors(() => saveFaq(input))),
  knowledgeSetActive: adminProcedure.input(z4.object({ id: z4.string().max(128), active: z4.boolean() })).mutation(({ input }) => withKnowledgeErrors(() => setFaqActive(input.id, input.active))),
  knowledgeDelete: adminProcedure.input(z4.object({ id: z4.string().max(128) })).mutation(({ input }) => withKnowledgeErrors(() => deleteFaq(input.id))),
  knowledgeRefreshVector: adminProcedure.input(z4.object({ id: z4.string().max(128) })).mutation(({ input }) => withKnowledgeErrors(() => refreshKnowledgeVector(input.id))),
  /** 模擬顧客提問，顯示 AI 會讀到哪些知識與分數（不產生回答、不寫入紀錄） */
  knowledgeTestSearch: adminProcedure.input(z4.object({ question: z4.string().trim().min(1).max(CHATBOT_MAX_MESSAGE_LENGTH) })).mutation(async ({ input }) => {
    let vector;
    try {
      vector = await embedQuery(input.question);
    } catch (error) {
      throw new TRPCError6({ code: "SERVICE_UNAVAILABLE", message: "\u66AB\u6642\u7121\u6CD5\u7522\u751F\u5411\u91CF\uFF0C\u8ACB\u7A0D\u5F8C\u518D\u8A66", cause: error });
    }
    const chunks = await searchKnowledge(input.question, vector, 10, 0.45);
    const productIds = selectRelatedProductIds(chunks, 0.55);
    const products2 = await loadRelatedProducts(productIds);
    return {
      results: chunks.map((chunk) => ({
        id: chunk.id,
        question: chunk.question,
        category: chunk.category,
        score: Math.round(chunk.score * 100) / 100
      })),
      products: products2.map((product) => ({ id: product.id, name: product.name })),
      usesFallback: !chunks.some((chunk) => chunk.score >= 0.5)
    };
  })
});

// server/routers/inventory.ts
import { z as z5 } from "zod";
var inventoryRouter = router({
  /**
   * 查詢商品可購買狀態（公開）
   */
  getAvailability: publicProcedure.input(z5.object({ productId: z5.string() })).query(async ({ input }) => {
    return getProductAvailability(input.productId);
  }),
  /**
   * 批次查詢多個商品的庫存狀態
   */
  getBatchAvailability: publicProcedure.input(z5.object({ productIds: z5.array(z5.string()) })).query(async ({ input }) => {
    const results = await Promise.all(
      input.productIds.map(async (id) => ({
        productId: id,
        ...await getProductAvailability(id)
      }))
    );
    return results;
  }),
  /**
   * 管理員設定商品庫存
   */
  setInventory: adminProcedure.input(
    z5.object({
      productId: z5.string(),
      productName: z5.string(),
      stock: z5.number().min(-1),
      // -1 = 無限庫存
      allowPreorder: z5.boolean().optional(),
      preorderNote: z5.string().optional()
    })
  ).mutation(async ({ input }) => {
    const allowPreorder = input.allowPreorder ?? await getDefaultAllowPreorder(input.productId);
    await upsertProductInventory({
      productId: input.productId,
      productName: input.productName,
      stock: input.stock,
      allowPreorder,
      preorderNote: input.preorderNote
    });
    return { success: true };
  }),
  /**
   * 管理員取得商品庫存設定
   */
  getInventory: adminProcedure.input(z5.object({ productId: z5.string() })).query(async ({ input }) => {
    return getProductInventory(input.productId);
  })
});

// server/routers/member.ts
import { TRPCError as TRPCError7 } from "@trpc/server";
import * as bcrypt from "bcryptjs";
import { z as z6 } from "zod";

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
import * as crypto6 from "crypto";

// shared/birthday.ts
var BIRTH_YEAR_MIN = 1900;
function daysInMonth(month, year) {
  return new Date(Date.UTC(year ?? 2e3, month, 0)).getUTCDate();
}
function validateBirthday(birthday, now = /* @__PURE__ */ new Date()) {
  const { year, month, day } = birthday;
  if (!Number.isInteger(month) || month < 1 || month > 12) return "\u8ACB\u9078\u64C7\u751F\u65E5\u6708\u4EFD";
  if (!Number.isInteger(day) || day < 1 || day > daysInMonth(month, year)) return "\u751F\u65E5\u65E5\u671F\u4E0D\u6B63\u78BA";
  if (year != null) {
    const currentYear = now.getFullYear();
    if (!Number.isInteger(year) || year < BIRTH_YEAR_MIN || year > currentYear) {
      return `\u51FA\u751F\u5E74\u4EFD\u9700\u4ECB\u65BC ${BIRTH_YEAR_MIN} \u5230 ${currentYear} \u5E74`;
    }
    if (new Date(year, month - 1, day).getTime() > now.getTime()) return "\u751F\u65E5\u4E0D\u80FD\u665A\u65BC\u4ECA\u5929";
  }
  return null;
}
function birthdayFromUser(user) {
  if (user.birthMonth == null || user.birthDay == null) return null;
  return { year: user.birthYear ?? null, month: user.birthMonth, day: user.birthDay };
}

// server/routers/member.ts
var SALT_ROUNDS = 10;
var BIRTHDAY_LOCKED_MESSAGE = "\u751F\u65E5\u5DF2\u586B\u5BEB\uFF0C\u5982\u9700\u4FEE\u6539\u8ACB\u806F\u7D61\u5BA2\u670D";
var birthdaySchema = z6.object({
  year: z6.number().int().nullable(),
  month: z6.number().int(),
  day: z6.number().int()
}).superRefine((birthday, ctx) => {
  const error = validateBirthday(birthday);
  if (error) ctx.addIssue({ code: "custom", message: error });
});
function trustedSiteOrigin() {
  return process.env.SITE_URL?.trim().replace(/\/$/, "") || "https://goodaytarot.com";
}
var passwordSchema = z6.string().min(8, "\u5BC6\u78BC\u81F3\u5C11\u9700\u8981 8 \u500B\u5B57\u5143");
var memberRouter = router({
  /** 註冊 */
  register: rateLimitedPublicProcedure({ scope: "member-auth", limit: 20, windowMs: 15 * 6e4 }).input(
    z6.object({
      email: z6.string().email("\u8ACB\u8F38\u5165\u6709\u6548\u7684 Email"),
      password: passwordSchema,
      name: z6.string().min(1, "\u8ACB\u8F38\u5165\u59D3\u540D").max(50),
      origin: z6.string().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    const existing = await getUserByEmail(input.email);
    if (existing) {
      throw new TRPCError7({
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
      throw new TRPCError7({ code: "INTERNAL_SERVER_ERROR", message: "\u8A3B\u518A\u5931\u6557\uFF0C\u8ACB\u7A0D\u5F8C\u518D\u8A66" });
    }
    const token = await sdk.createSessionToken(user.openId, { name: user.name ?? "" });
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.cookie(COOKIE_NAME, token, cookieOptions);
    const verifyToken = crypto6.randomBytes(32).toString("hex");
    const verifyExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1e3);
    await setVerifyToken(input.email, verifyToken, verifyExpiresAt);
    const siteOrigin = trustedSiteOrigin();
    const verifyUrl = `${siteOrigin}/verify-email?token=${verifyToken}`;
    let verificationEmailSent = false;
    try {
      await sendVerificationEmail({
        to: input.email,
        name: input.name,
        verifyUrl
      });
      verificationEmailSent = true;
    } catch (err) {
      console.error("[Email] \u9A57\u8B49\u4FE1\u767C\u9001\u5931\u6557:", err);
    }
    return {
      success: true,
      verificationEmailSent,
      user: { id: user.id, name: user.name, email: user.email }
    };
  }),
  /** 登入 */
  login: rateLimitedPublicProcedure({ scope: "member-auth", limit: 20, windowMs: 15 * 6e4 }).input(
    z6.object({
      email: z6.string().email("\u8ACB\u8F38\u5165\u6709\u6548\u7684 Email"),
      password: z6.string().min(1, "\u8ACB\u8F38\u5165\u5BC6\u78BC")
    })
  ).mutation(async ({ input, ctx }) => {
    let user = await getUserByEmail(input.email);
    if (!user || !user.passwordHash) {
      throw new TRPCError7({
        code: "UNAUTHORIZED",
        message: "Email \u6216\u5BC6\u78BC\u932F\u8AA4"
      });
    }
    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new TRPCError7({
        code: "UNAUTHORIZED",
        message: "Email \u6216\u5BC6\u78BC\u932F\u8AA4"
      });
    }
    if (shouldGrantAdminRole(user.openId, user.email, user.emailVerified === true) && user.role !== "admin") {
      const db2 = await getDb();
      if (db2) {
        const { users: users2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
        const { eq: eq20 } = await import("drizzle-orm");
        await db2.update(users2).set({ role: "admin" }).where(eq20(users2.id, user.id));
        user = { ...user, role: "admin" };
      }
    }
    const token = await sdk.createSessionToken(user.openId, { name: user.name ?? "" });
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.cookie(COOKIE_NAME, token, cookieOptions);
    return { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
  }),
  /** 驗證 Email */
  verifyEmail: rateLimitedPublicProcedure({ scope: "member-verify", limit: 20, windowMs: 15 * 6e4 }).input(z6.object({ token: z6.string().min(1) })).mutation(async ({ input }) => {
    const user = await getUserByVerifyToken(input.token);
    if (!user) {
      throw new TRPCError7({
        code: "BAD_REQUEST",
        message: "\u9A57\u8B49\u9023\u7D50\u5DF2\u5931\u6548\u6216\u4E0D\u5B58\u5728\uFF0C\u8ACB\u91CD\u65B0\u767C\u9001\u9A57\u8B49\u4FE1"
      });
    }
    await markEmailVerified(user.id);
    return { success: true, message: "Email \u5DF2\u9A57\u8B49\u6210\u529F" };
  }),
  /** 重新發送驗證信 */
  resendVerification: rateLimitedProtectedProcedure({ scope: "member-verification-email", limit: 5, windowMs: 60 * 6e4 }).input(z6.object({ origin: z6.string().optional() })).mutation(async ({ input, ctx }) => {
    if (!ctx.user.email) {
      throw new TRPCError7({ code: "BAD_REQUEST", message: "\u7121\u6CD5\u53D6\u5F97 Email" });
    }
    const user = await getUserByEmail(ctx.user.email);
    if (!user) throw new TRPCError7({ code: "NOT_FOUND", message: "\u5E33\u865F\u4E0D\u5B58\u5728" });
    if (user.emailVerified) {
      return { success: true, message: "Email \u5DF2\u7D93\u9A57\u8B49\u904E" };
    }
    const verifyToken = crypto6.randomBytes(32).toString("hex");
    const verifyExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1e3);
    await setVerifyToken(ctx.user.email, verifyToken, verifyExpiresAt);
    const siteOrigin = trustedSiteOrigin();
    const verifyUrl = `${siteOrigin}/verify-email?token=${verifyToken}`;
    await sendVerificationEmail({
      to: ctx.user.email,
      name: ctx.user.name ?? ctx.user.email,
      verifyUrl
    });
    return { success: true, message: "\u9A57\u8B49\u4FE1\u5DF2\u91CD\u65B0\u767C\u9001" };
  }),
  /** 申請重設密碼 */
  forgotPassword: rateLimitedPublicProcedure({ scope: "member-password", limit: 5, windowMs: 60 * 6e4 }).input(z6.object({
    email: z6.string().email(),
    origin: z6.string().optional()
  })).mutation(async ({ input }) => {
    const user = await getUserByEmail(input.email);
    if (!user || !user.passwordHash) {
      return { success: true, message: "\u82E5\u6B64 Email \u5DF2\u8A3B\u518A\uFF0C\u91CD\u8A2D\u9023\u7D50\u5DF2\u767C\u9001" };
    }
    const token = crypto6.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1e3);
    await setResetToken(input.email, token, expiresAt);
    const siteOrigin = trustedSiteOrigin();
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
  resetPassword: rateLimitedPublicProcedure({ scope: "member-password", limit: 10, windowMs: 60 * 6e4 }).input(
    z6.object({
      token: z6.string().min(1),
      newPassword: passwordSchema
    })
  ).mutation(async ({ input }) => {
    const user = await getUserByResetToken(input.token);
    if (!user) {
      throw new TRPCError7({
        code: "BAD_REQUEST",
        message: "\u91CD\u8A2D\u9023\u7D50\u5DF2\u5931\u6548\u6216\u4E0D\u5B58\u5728\uFF0C\u8ACB\u91CD\u65B0\u7533\u8ACB"
      });
    }
    const passwordHash = await bcrypt.hash(input.newPassword, SALT_ROUNDS);
    await updatePasswordAndClearToken(user.id, passwordHash);
    return { success: true, message: "\u5BC6\u78BC\u5DF2\u91CD\u8A2D\uFF0C\u8ACB\u91CD\u65B0\u767B\u5165" };
  }),
  /** 更新會員資料：姓名可隨時修改；生日只能填寫一次，之後需由客服（管理員）修改 */
  updateProfile: protectedProcedure.input(
    z6.object({
      name: z6.string().min(1).max(50),
      birthday: birthdaySchema.optional()
    })
  ).mutation(async ({ input, ctx }) => {
    const db2 = await getDb();
    if (!db2) throw new TRPCError7({ code: "INTERNAL_SERVER_ERROR" });
    const { users: users2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const { and: and13, eq: eq20, isNull: isNull3 } = await import("drizzle-orm");
    if (input.birthday) {
      const current = birthdayFromUser(ctx.user);
      const same = current && current.year === input.birthday.year && current.month === input.birthday.month && current.day === input.birthday.day;
      if (current && !same) {
        throw new TRPCError7({ code: "FORBIDDEN", message: BIRTHDAY_LOCKED_MESSAGE });
      }
      if (!current) {
        const result = await db2.update(users2).set({
          name: input.name,
          birthYear: input.birthday.year,
          birthMonth: input.birthday.month,
          birthDay: input.birthday.day
        }).where(and13(eq20(users2.id, ctx.user.id), isNull3(users2.birthMonth)));
        const affected = Array.isArray(result) ? result[0] : result;
        if (!affected?.affectedRows) {
          throw new TRPCError7({ code: "FORBIDDEN", message: BIRTHDAY_LOCKED_MESSAGE });
        }
        return { success: true };
      }
    }
    await db2.update(users2).set({ name: input.name }).where(eq20(users2.id, ctx.user.id));
    return { success: true };
  }),
  /** 查詢自己的訂單 */
  myOrders: protectedProcedure.query(async ({ ctx }) => {
    const identity = await resolveMemberIdentity(ctx.user);
    const memberOrders = await getOrdersForMember({
      userId: identity.userId,
      email: identity.verifiedEmail
    });
    return memberOrders.map(toCustomerFacingOrder);
  })
});

// server/routers/products.ts
import { z as z7 } from "zod";
import { eq as eq15, and as and10, inArray as inArray5, sql as sql11 } from "drizzle-orm";
import { TRPCError as TRPCError8 } from "@trpc/server";
init_schema();

// server/richTextSanitize.ts
import sanitizeHtml from "sanitize-html";
var SANITIZE_OPTIONS = {
  allowedTags: RICH_TEXT_ALLOWED_TAGS,
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt"]
  },
  allowedClasses: RICH_TEXT_ALLOWED_CLASSES,
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["https"] },
  allowProtocolRelative: false,
  // script、style 等標籤連同內容一起移除
  disallowedTagsMode: "discard",
  exclusiveFilter: (frame) => frame.tag === "img" && !isSafeImageSrc(frame.attribs.src ?? ""),
  transformTags: {
    // 不安全的連結保留文字、移除連結
    a: (tagName, attribs) => {
      const href = attribs.href ?? "";
      if (!isSafeLinkHref(href)) return { tagName: "span", attribs: {} };
      return {
        tagName,
        attribs: { href, target: "_blank", rel: "noopener noreferrer nofollow" }
      };
    }
  }
};
function sanitizeRichText(value) {
  if (!isRichTextHtml(value)) return value;
  return sanitizeHtml(value, SANITIZE_OPTIONS);
}
function sanitizeBenefits(values) {
  return values.map(sanitizeRichText).filter((value) => !isRichTextEmpty(value));
}

// server/blobStorage.ts
import crypto7 from "node:crypto";
import { put } from "@vercel/blob";
var UPLOADABLE_IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};
var MAX_UPLOAD_IMAGE_BYTES = 3 * 1024 * 1024;
var BlobUploadError = class extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = "BlobUploadError";
  }
};
function isBlobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}
async function putPublicImage(folder, data, contentType) {
  if (!isBlobConfigured()) {
    throw new BlobUploadError("NOT_CONFIGURED", "\u6B64\u74B0\u5883\u672A\u8A2D\u5B9A\u5716\u7247\u4E0A\u50B3\uFF0C\u8ACB\u6539\u7528\u5716\u7247\u7DB2\u5740");
  }
  if (data.byteLength > MAX_UPLOAD_IMAGE_BYTES) {
    throw new BlobUploadError("TOO_LARGE", "\u5716\u7247\u592A\u5927\uFF0C\u8ACB\u5C0F\u65BC 3MB");
  }
  const pathname = `${folder}/${Date.now()}-${crypto7.randomBytes(4).toString("hex")}.${UPLOADABLE_IMAGE_TYPES[contentType]}`;
  const blob = await put(pathname, data, { access: "public", contentType, addRandomSuffix: false });
  return { url: blob.url, pathname: blob.pathname };
}

// server/routers/products.ts
var ImageUploadInputSchema = z7.object({
  contentType: z7.enum(Object.keys(UPLOADABLE_IMAGE_TYPES)),
  // base64 約為原始大小的 4/3，實際大小由 putPublicImage 檢查
  dataBase64: z7.string().min(1).max(42e5, "\u5716\u7247\u592A\u5927\uFF0C\u8ACB\u5C0F\u65BC 3MB")
});
async function uploadImageToBlob(folder, input) {
  try {
    const { url } = await putPublicImage(folder, Buffer.from(input.dataBase64, "base64"), input.contentType);
    return { url };
  } catch (error) {
    if (error instanceof BlobUploadError) {
      throw new TRPCError8({ code: error.code === "TOO_LARGE" ? "BAD_REQUEST" : "PRECONDITION_FAILED", message: error.message });
    }
    throw error;
  }
}
var tableEnsured = false;
async function trySyncChatbotKnowledge(action, productIds = []) {
  try {
    await action();
  } catch (error) {
    console.warn("[products] failed to sync chatbot product knowledge:", error);
    await recordAuditEventSafely({
      source: "system",
      category: "chatbot",
      action: "chatbot.knowledge.sync",
      outcome: "failed",
      severity: "warning",
      summary: "\u5546\u54C1\u7684 AI \u5BA2\u670D\u77E5\u8B58\u540C\u6B65\u5931\u6557\uFF0CAI \u53EF\u80FD\u67E5\u4E0D\u5230\u6700\u65B0\u7684\u5546\u54C1\u8CC7\u8A0A",
      details: { productIds, error: error instanceof Error ? error.message : String(error) }
    });
  }
}
var CATEGORY_LABELS = {
  love: "\u611B\u60C5\u6843\u82B1",
  wealth: "\u8CA1\u904B\u4E8B\u696D",
  protect: "\u80FD\u91CF\u9632\u8B77",
  healing: "\u7642\u7652\u7CFB\u5217",
  necklace: "\u9805\u934A",
  pendant: "\u540A\u98FE",
  "energy-perfume": "\u80FD\u91CF\u9999\u6C34",
  other: "\u5176\u4ED6",
  custom: "\u5BA2\u88FD\u5316",
  test: "\u6E2C\u8A66"
};
var PRODUCT_CATEGORY_OVERRIDES = {
  "d001-moon-secret": ["healing", "protect", "love"],
  "d002-honey-realm": ["wealth", "love", "protect", "healing"],
  "d003-venus": ["pendant", "wealth", "healing"],
  "d004-morning-whisper": ["love", "healing", "protect"],
  "d005-moon-clear-heart": ["healing", "love"]
};
function labelsForCategories(categories) {
  return categories.map((category) => CATEGORY_LABELS[category] ?? category);
}
function inferProductCategories(p) {
  const override = PRODUCT_CATEGORY_OVERRIDES[p.id];
  if (override) return override;
  const text2 = [
    ...(p.benefits ?? []).map(richTextToPlainText),
    ...p.tags ?? [],
    p.crystalType ?? ""
  ].join(" ");
  const categories = /* @__PURE__ */ new Set([p.category]);
  if (/愛情|桃花|人緣|魅力|關係/.test(text2)) categories.add("love");
  if (/財|招財|事業|行動力|自信|目標/.test(text2)) categories.add("wealth");
  if (/防護|保護|負能量|氣場|淨化/.test(text2)) categories.add("protect");
  if (/療癒|情緒|穩定|平衡|壓力|焦慮|安全感|內在/.test(text2)) categories.add("healing");
  return Array.from(categories);
}
function normalizeProductCategories(p) {
  const categories = p.categories?.length ? p.categories : inferProductCategories(p);
  const categoryLabels = p.categoryLabels?.length ? p.categoryLabels : labelsForCategories(categories);
  return { categories, categoryLabels };
}
async function ensureProductsTable() {
  if (tableEnsured) return;
  const db = await getDb();
  if (!db) return;
  await db.execute(sql11`
    CREATE TABLE IF NOT EXISTS \`products\` (
      \`id\` varchar(64) NOT NULL,
      \`name\` varchar(200) NOT NULL,
      \`subtitle\` varchar(200) NOT NULL DEFAULT '',
      \`category\` varchar(64) NOT NULL,
      \`categoryLabel\` varchar(64) NOT NULL,
      \`categories\` json DEFAULT NULL,
      \`categoryLabels\` json DEFAULT NULL,
      \`price\` int NOT NULL,
      \`originalPrice\` int DEFAULT NULL,
      \`priceRange\` varchar(200) DEFAULT NULL,
      \`depositRange\` varchar(200) DEFAULT NULL,
      \`image\` mediumtext NOT NULL,
      \`images\` json DEFAULT NULL,
      \`tags\` json DEFAULT NULL,
      \`description\` text DEFAULT NULL,
      \`story\` text DEFAULT NULL,
      \`benefits\` json DEFAULT NULL,
      \`suitableFor\` json DEFAULT NULL,
      \`howToUse\` json DEFAULT NULL,
      \`disclaimer\` text DEFAULT NULL,
      \`crystalType\` text DEFAULT NULL,
      \`color\` varchar(100) DEFAULT NULL,
      \`featured\` boolean NOT NULL DEFAULT false,
      \`active\` boolean NOT NULL DEFAULT true,
      \`isMonthlyLimited\` boolean NOT NULL DEFAULT false,
      \`twoItemFreeShippingEligible\` boolean NOT NULL DEFAULT true,
      \`claspOptions\` json DEFAULT NULL,
      \`showWristSize\` boolean NOT NULL DEFAULT true,
      \`showFitPreference\` boolean NOT NULL DEFAULT true,
      \`wristSizeMin\` decimal(4,1) NOT NULL DEFAULT 13.0,
      \`wristSizeMax\` decimal(4,1) NOT NULL DEFAULT 19.0,
      \`wristSizePriceRules\` json DEFAULT NULL,
      \`purchaseOptions\` json DEFAULT NULL,
      \`scheduledPublishAt\` timestamp DEFAULT NULL,
      \`sortOrder\` int NOT NULL DEFAULT 0,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`)
    )
  `);
  try {
    await db.execute(sql11`ALTER TABLE \`products\` MODIFY COLUMN \`image\` mediumtext NOT NULL`);
  } catch {
  }
  try {
    await db.execute(sql11`ALTER TABLE \`products\` ADD COLUMN \`scheduledPublishAt\` timestamp NULL DEFAULT NULL`);
  } catch {
  }
  try {
    await db.execute(sql11`ALTER TABLE \`products\` ADD COLUMN \`isMonthlyLimited\` boolean NOT NULL DEFAULT false`);
  } catch {
  }
  try {
    await db.execute(sql11`ALTER TABLE \`products\` ADD COLUMN \`twoItemFreeShippingEligible\` boolean NOT NULL DEFAULT true`);
  } catch {
  }
  try {
    await db.execute(sql11`ALTER TABLE \`products\` ADD COLUMN \`categories\` json DEFAULT NULL`);
  } catch {
  }
  try {
    await db.execute(sql11`ALTER TABLE \`products\` ADD COLUMN \`categoryLabels\` json DEFAULT NULL`);
  } catch {
  }
  try {
    await db.execute(sql11`ALTER TABLE \`products\` ADD COLUMN \`images\` json DEFAULT NULL`);
  } catch {
  }
  try {
    await db.execute(sql11`ALTER TABLE \`products\` ADD COLUMN \`claspOptions\` json DEFAULT NULL`);
  } catch {
  }
  try {
    await db.execute(sql11`ALTER TABLE \`products\` ADD COLUMN \`showWristSize\` boolean NOT NULL DEFAULT true`);
  } catch {
  }
  try {
    await db.execute(sql11`ALTER TABLE \`products\` ADD COLUMN \`showFitPreference\` boolean NOT NULL DEFAULT true`);
  } catch {
  }
  try {
    await db.execute(sql11`ALTER TABLE \`products\` ADD COLUMN \`wristSizeMin\` decimal(4,1) NOT NULL DEFAULT 13.0`);
  } catch {
  }
  try {
    await db.execute(sql11`ALTER TABLE \`products\` ADD COLUMN \`wristSizeMax\` decimal(4,1) NOT NULL DEFAULT 19.0`);
  } catch {
  }
  try {
    await db.execute(sql11`ALTER TABLE \`products\` ADD COLUMN \`wristSizePriceRules\` json DEFAULT NULL`);
  } catch {
  }
  try {
    await db.execute(sql11`ALTER TABLE \`products\` ADD COLUMN \`purchaseOptions\` json DEFAULT NULL`);
  } catch {
  }
  try {
    const existingProductRules = {
      "d004-morning-whisper": [
        { maxWristSize: 13.5, price: 1700 },
        { maxWristSize: 17, price: 1800 },
        { maxWristSize: 19, price: 1900 }
      ],
      "d005-moon-clear-heart": [
        { maxWristSize: 13.5, price: 1480 },
        { maxWristSize: 17, price: 1580 },
        { maxWristSize: 19, price: 1680 }
      ]
    };
    for (const [id, rules] of Object.entries(existingProductRules)) {
      await db.execute(sql11`
        UPDATE \`products\`
        SET \`wristSizePriceRules\` = ${JSON.stringify(rules)}
        WHERE \`id\` = ${id}
          AND \`wristSizePriceRules\` IS NULL
      `);
    }
  } catch {
  }
  try {
    for (const [id, categories] of Object.entries(PRODUCT_CATEGORY_OVERRIDES)) {
      await db.execute(sql11`
        UPDATE \`products\`
        SET \`categories\` = ${JSON.stringify(categories)},
            \`categoryLabels\` = ${JSON.stringify(labelsForCategories(categories))}
        WHERE \`id\` = ${id}
          AND (\`categories\` IS NULL OR JSON_LENGTH(\`categories\`) = 0)
      `);
    }
  } catch {
  }
  tableEnsured = true;
}
async function publishDueProducts() {
  const db = await getDb();
  if (!db) return;
  const dueWhere = and10(
    eq15(dbProducts.active, false),
    sql11`${dbProducts.scheduledPublishAt} IS NOT NULL AND ${dbProducts.scheduledPublishAt} <= NOW()`
  );
  const due = await db.select({ id: dbProducts.id }).from(dbProducts).where(dueWhere);
  if (due.length === 0) return;
  const ids = due.map((product) => product.id);
  await db.update(dbProducts).set({ active: true, scheduledPublishAt: null }).where(and10(inArray5(dbProducts.id, ids), dueWhere));
  for (const id of ids) {
    await trySyncChatbotKnowledge(() => syncProductKnowledgeById(id), [id]);
  }
}
function toFrontendProduct(p) {
  const { categories, categoryLabels } = normalizeProductCategories(p);
  const normalizeImageUrl = (url) => {
    const trimmed = url.trim();
    if (!trimmed.includes("drive.google.com")) return trimmed;
    const fileMatch = trimmed.match(/\/file\/d\/([^/?#]+)/);
    const idMatch = trimmed.match(/[?&]id=([^&#]+)/);
    const id = fileMatch?.[1] ?? idMatch?.[1];
    return id ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1600` : trimmed;
  };
  const images = (p.images?.length ? p.images : [p.image].filter(Boolean)).map(normalizeImageUrl);
  const image = normalizeImageUrl(p.image);
  return {
    id: p.id,
    name: p.name,
    subtitle: p.subtitle ?? "",
    category: p.category,
    categoryLabel: categoryLabels.join("\u3001"),
    categories,
    categoryLabels,
    price: p.price,
    originalPrice: p.originalPrice ?? void 0,
    priceRange: p.priceRange ?? void 0,
    depositRange: p.depositRange ?? void 0,
    image,
    images,
    tags: p.tags ?? [],
    description: p.description ?? "",
    story: p.story ?? "",
    benefits: p.benefits ?? [],
    suitableFor: p.suitableFor ?? [],
    howToUse: p.howToUse ?? [],
    disclaimer: p.disclaimer ?? "",
    inStock: p.active,
    featured: p.featured,
    isMonthlyLimited: p.isMonthlyLimited,
    twoItemFreeShippingEligible: p.twoItemFreeShippingEligible,
    claspOptions: p.claspOptions ?? void 0,
    showWristSize: p.showWristSize,
    showFitPreference: p.showFitPreference,
    wristSizeMin: p.wristSizeMin ?? 13,
    wristSizeMax: p.wristSizeMax ?? 19,
    wristSizePriceRules: p.wristSizePriceRules ?? void 0,
    purchaseOptions: p.purchaseOptions?.filter((option) => option.active !== false) ?? void 0,
    scheduledPublishAt: p.scheduledPublishAt ?? void 0,
    crystalType: p.crystalType ?? "",
    color: p.color ?? ""
  };
}
var scheduledPublishAtSchema = z7.preprocess(
  (value) => value === "" || value === void 0 ? null : value,
  z7.coerce.date().nullable()
);
var wristSizeSchema = z7.number().min(0).max(99).refine((value) => Number.isInteger(value * 2), {
  message: "\u624B\u570D\u5C3A\u5BF8\u9700\u4EE5 0.5 cm \u70BA\u55AE\u4F4D"
});
var WristSizePriceRuleSchema = z7.object({
  maxWristSize: wristSizeSchema,
  price: z7.number().int().min(0)
});
var PurchaseOptionSchema = z7.object({
  id: z7.string().trim().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/),
  label: z7.string().trim().min(1).max(40),
  type: z7.enum(["single", "combo"]).default("single"),
  price: z7.number().int().min(0),
  originalPrice: z7.number().int().min(0).nullable().optional(),
  description: z7.string().trim().max(120).optional(),
  stock: z7.number().int().min(-1).nullable().optional(),
  active: z7.boolean().default(true),
  image: z7.string().trim().nullable().optional(),
  wristSizePriceRules: z7.array(WristSizePriceRuleSchema).default([]),
  wristSizeGroups: z7.array(z7.object({
    id: z7.string().trim().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/),
    label: z7.string().trim().min(1).max(40),
    wristSizePriceRules: z7.array(WristSizePriceRuleSchema).min(1)
  })).default([])
});
var ProductInputSchema = z7.object({
  name: z7.string().min(1),
  subtitle: z7.string().default(""),
  category: z7.string().min(1),
  categoryLabel: z7.string().min(1),
  categories: z7.array(z7.string()).default([]),
  categoryLabels: z7.array(z7.string()).default([]),
  price: z7.number().int().min(0),
  originalPrice: z7.number().int().min(0).nullable().optional(),
  priceRange: z7.string().nullable().optional(),
  depositRange: z7.string().optional(),
  image: z7.string().min(1),
  images: z7.array(z7.string().min(1)).default([]),
  tags: z7.array(z7.string()).default([]),
  description: z7.string().default(""),
  story: z7.string().default(""),
  // 功效說明可為富文字 HTML，存檔前一律清理
  benefits: z7.array(z7.string().max(RICH_TEXT_MAX_LENGTH, "\u529F\u6548\u8AAA\u660E\u5167\u5BB9\u904E\u9577")).default([]).transform(sanitizeBenefits),
  suitableFor: z7.array(z7.string()).default([]),
  howToUse: z7.array(z7.string()).default([]),
  disclaimer: z7.string().default(""),
  crystalType: z7.string().default(""),
  color: z7.string().default(""),
  featured: z7.boolean().default(false),
  active: z7.boolean().default(true),
  isMonthlyLimited: z7.boolean().default(false),
  twoItemFreeShippingEligible: z7.boolean().default(true),
  claspOptions: z7.array(z7.enum(["elastic", "lobster", "magnetic"])).default([]),
  showWristSize: z7.boolean().default(true),
  showFitPreference: z7.boolean().default(true),
  wristSizeMin: wristSizeSchema.default(13),
  wristSizeMax: wristSizeSchema.default(19),
  wristSizePriceRules: z7.array(WristSizePriceRuleSchema).default([]),
  purchaseOptions: z7.array(PurchaseOptionSchema).default([]),
  scheduledPublishAt: scheduledPublishAtSchema.default(null),
  sortOrder: z7.number().int().default(0)
}).refine((value) => value.wristSizeMin <= value.wristSizeMax, {
  message: "\u624B\u570D\u6700\u5C0F\u503C\u4E0D\u53EF\u5927\u65BC\u6700\u5927\u503C",
  path: ["wristSizeMax"]
}).refine((value) => new Set(value.purchaseOptions.map((option) => option.id)).size === value.purchaseOptions.length, {
  message: "\u65B9\u6848\u4EE3\u78BC\u4E0D\u53EF\u91CD\u8907",
  path: ["purchaseOptions"]
});
var BulkDiscountInputSchema = z7.object({
  productIds: z7.array(z7.string().min(1)).min(1),
  discountRate: z7.number().min(0.1).max(10)
});
var BulkClearDiscountInputSchema = z7.object({
  productIds: z7.array(z7.string().min(1)).min(1)
});
var BulkTwoItemFreeShippingInputSchema = z7.object({
  productIds: z7.array(z7.string().min(1)).min(1),
  eligible: z7.boolean()
});
function rankTopSellers(products2, salesByProductId, limit) {
  return [...products2].sort((a, b) => {
    if (Boolean(b.featured) !== Boolean(a.featured)) return Number(Boolean(b.featured)) - Number(Boolean(a.featured));
    const sales = (salesByProductId.get(b.id) ?? 0) - (salesByProductId.get(a.id) ?? 0);
    if (sales !== 0) return sales;
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  }).slice(0, limit);
}
var productRouter = router({
  topSellers: publicProcedure.input(z7.object({ limit: z7.number().int().min(1).max(12).default(6) }).default({ limit: 6 })).query(async ({ input }) => {
    await ensureProductsTable();
    await publishDueProducts();
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select().from(dbProducts).where(eq15(dbProducts.active, true));
    const sellable = rows.filter((p) => p.category !== "test" && !CUSTOM_PRODUCT_IDS.includes(p.id));
    let salesByProductId = /* @__PURE__ */ new Map();
    try {
      const totals = await getProductSalesTotals();
      salesByProductId = new Map(totals.map((total) => [total.productId, total.totalQty]));
    } catch (error) {
      console.warn("[product.topSellers] failed to load sales totals:", error);
    }
    return rankTopSellers(sellable, salesByProductId, input.limit).map(toFrontendProduct);
  }),
  list: publicProcedure.query(async () => {
    await ensureProductsTable();
    await publishDueProducts();
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select().from(dbProducts).where(and10(eq15(dbProducts.active, true)));
    return rows.filter((p) => p.category !== "test").sort((a, b) => a.sortOrder - b.sortOrder || b.createdAt.getTime() - a.createdAt.getTime()).map(toFrontendProduct);
  }),
  getById: publicProcedure.input(z7.object({ id: z7.string() })).query(async ({ input }) => {
    await ensureProductsTable();
    await publishDueProducts();
    const db = await getDb();
    if (!db) return null;
    const rows = await db.select().from(dbProducts).where(and10(eq15(dbProducts.id, input.id), eq15(dbProducts.active, true))).limit(1);
    return rows[0] ? toFrontendProduct(rows[0]) : null;
  }),
  adminList: adminProcedure.query(async () => {
    await ensureProductsTable();
    await publishDueProducts();
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select().from(dbProducts);
    return rows.filter((p) => p.category !== "test").sort((a, b) => (a.active ? 0 : 1) - (b.active ? 0 : 1) || a.sortOrder - b.sortOrder).map((p) => ({ ...p, ...normalizeProductCategories(p) }));
  }),
  create: adminProcedure.input(ProductInputSchema).mutation(async ({ input }) => {
    await ensureProductsTable();
    await publishDueProducts();
    const db = await getDb();
    if (!db) throw new TRPCError8({ code: "INTERNAL_SERVER_ERROR", message: "\u8CC7\u6599\u5EAB\u7121\u6CD5\u9023\u7DDA" });
    const id = `prod-${Date.now()}`;
    await db.insert(dbProducts).values({ id, ...input });
    await trySyncChatbotKnowledge(() => syncProductKnowledge({ id, ...input }), [id]);
    return { id };
  }),
  update: adminProcedure.input(ProductInputSchema.safeExtend({ id: z7.string() })).mutation(async ({ input }) => {
    await ensureProductsTable();
    await publishDueProducts();
    const db = await getDb();
    if (!db) throw new TRPCError8({ code: "INTERNAL_SERVER_ERROR", message: "\u8CC7\u6599\u5EAB\u7121\u6CD5\u9023\u7DDA" });
    const { id, ...data } = input;
    await db.update(dbProducts).set(data).where(eq15(dbProducts.id, id));
    await trySyncChatbotKnowledge(() => syncProductKnowledgeById(id), [id]);
    return { success: true };
  }),
  toggleActive: adminProcedure.input(z7.object({ id: z7.string(), active: z7.boolean() })).mutation(async ({ input }) => {
    await ensureProductsTable();
    await publishDueProducts();
    const db = await getDb();
    if (!db) throw new TRPCError8({ code: "INTERNAL_SERVER_ERROR", message: "\u8CC7\u6599\u5EAB\u7121\u6CD5\u9023\u7DDA" });
    await db.update(dbProducts).set({ active: input.active, scheduledPublishAt: null }).where(eq15(dbProducts.id, input.id));
    await trySyncChatbotKnowledge(() => syncProductKnowledgeById(input.id), [input.id]);
    return { success: true };
  }),
  bulkApplyDiscount: adminProcedure.input(BulkDiscountInputSchema).mutation(async ({ input }) => {
    await ensureProductsTable();
    await publishDueProducts();
    const db = await getDb();
    if (!db) throw new TRPCError8({ code: "INTERNAL_SERVER_ERROR", message: "\u8CC7\u6599\u5EAB\u7121\u6CD5\u9023\u7DDA" });
    const rows = await db.select().from(dbProducts).where(inArray5(dbProducts.id, input.productIds));
    const products2 = rows.filter((product) => product.category !== "test");
    for (const product of products2) {
      const basePrice = product.originalPrice && product.originalPrice > product.price ? product.originalPrice : product.price;
      const discountedPrice = Math.round(basePrice * (input.discountRate / 10));
      await db.update(dbProducts).set({
        originalPrice: basePrice,
        price: discountedPrice
      }).where(eq15(dbProducts.id, product.id));
    }
    await trySyncChatbotKnowledge(async () => {
      await Promise.all(products2.map((product) => syncProductKnowledgeById(product.id)));
    }, products2.map((product) => product.id));
    return { count: products2.length };
  }),
  bulkClearDiscount: adminProcedure.input(BulkClearDiscountInputSchema).mutation(async ({ input }) => {
    await ensureProductsTable();
    await publishDueProducts();
    const db = await getDb();
    if (!db) throw new TRPCError8({ code: "INTERNAL_SERVER_ERROR", message: "\u8CC7\u6599\u5EAB\u7121\u6CD5\u9023\u7DDA" });
    const rows = await db.select().from(dbProducts).where(inArray5(dbProducts.id, input.productIds));
    const products2 = rows.filter((product) => product.category !== "test" && product.originalPrice);
    for (const product of products2) {
      const originalPrice = product.originalPrice;
      if (!originalPrice) continue;
      await db.update(dbProducts).set({
        price: originalPrice,
        originalPrice: sql11`NULL`
      }).where(eq15(dbProducts.id, product.id));
    }
    await trySyncChatbotKnowledge(async () => {
      await Promise.all(products2.map((product) => syncProductKnowledgeById(product.id)));
    }, products2.map((product) => product.id));
    return { count: products2.length };
  }),
  bulkSetTwoItemFreeShipping: adminProcedure.input(BulkTwoItemFreeShippingInputSchema).mutation(async ({ input }) => {
    await ensureProductsTable();
    await publishDueProducts();
    const db = await getDb();
    if (!db) throw new TRPCError8({ code: "INTERNAL_SERVER_ERROR", message: "\u8CC7\u6599\u5EAB\u7121\u6CD5\u9023\u7DDA" });
    const rows = await db.select({ id: dbProducts.id, category: dbProducts.category }).from(dbProducts).where(inArray5(dbProducts.id, input.productIds));
    const productIds = rows.filter((product) => product.category !== "test").map((product) => product.id);
    if (productIds.length > 0) {
      await db.update(dbProducts).set({ twoItemFreeShippingEligible: input.eligible }).where(inArray5(dbProducts.id, productIds));
    }
    return { count: productIds.length };
  }),
  remove: adminProcedure.input(z7.object({ id: z7.string() })).mutation(async ({ input }) => {
    await ensureProductsTable();
    const db = await getDb();
    if (!db) throw new TRPCError8({ code: "INTERNAL_SERVER_ERROR", message: "\u8CC7\u6599\u5EAB\u7121\u6CD5\u9023\u7DDA" });
    await db.delete(dbProducts).where(eq15(dbProducts.id, input.id));
    await db.delete(productInventory).where(eq15(productInventory.productId, input.id));
    await trySyncChatbotKnowledge(() => removeProductKnowledge(input.id), [input.id]);
    return { success: true };
  }),
  uploadImage: adminProcedure.input(z7.object({
    filename: z7.string(),
    contentType: z7.string(),
    dataBase64: z7.string().max(6e6)
  })).mutation(async ({ input }) => {
    const buf = Buffer.from(input.dataBase64, "base64");
    const ext = input.filename.split(".").pop() ?? "jpg";
    const key = `products/${Date.now()}.${ext}`;
    const result = await storagePut(key, buf, input.contentType);
    return { url: result.url };
  }),
  /** 功效說明富文字內的圖片，上傳到 Vercel Blob（product-benefits/） */
  uploadRichTextImage: adminProcedure.input(ImageUploadInputSchema).mutation(({ input }) => uploadImageToBlob("product-benefits", input)),
  /** 商品主圖、相簿與購買方案圖，上傳到 Vercel Blob（products/） */
  uploadProductImage: adminProcedure.input(ImageUploadInputSchema).mutation(({ input }) => uploadImageToBlob("products", input)),
  seed: adminProcedure.input(z7.array(ProductInputSchema.safeExtend({ id: z7.string() }))).mutation(async ({ input }) => {
    await ensureProductsTable();
    const db = await getDb();
    if (!db) throw new TRPCError8({ code: "INTERNAL_SERVER_ERROR", message: "\u8CC7\u6599\u5EAB\u7121\u6CD5\u9023\u7DDA" });
    let count3 = 0;
    for (const product of input) {
      const existing = await db.select({ id: dbProducts.id }).from(dbProducts).where(eq15(dbProducts.id, product.id)).limit(1);
      if (existing.length === 0) {
        await db.insert(dbProducts).values(product);
        count3++;
      }
    }
    return { count: count3 };
  })
});

// server/routers/reviews.ts
import { TRPCError as TRPCError9 } from "@trpc/server";
import { z as z8 } from "zod";

// server/reviewDb.ts
init_schema();
import { and as and11, asc as asc3, avg, count as count2, desc as desc7, eq as eq16, inArray as inArray6 } from "drizzle-orm";

// server/reviewDisplayName.ts
var ANONYMOUS_DISPLAY_NAME = "\u533F\u540D\u9867\u5BA2";
var FALLBACK_DISPLAY_NAME = "\u6703\u54E1";
var DISPLAY_NAME_MAX_LENGTH = 50;
var CJK_PERSONAL_NAME = /^[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]{2,4}$/;
function tidy(value) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}
function maskPersonalName(rawName) {
  const name = tidy(rawName);
  if (!name) return "";
  if (name.includes("@")) {
    const local = name.split("@")[0];
    return local ? `${Array.from(local)[0]}***` : "";
  }
  if (CJK_PERSONAL_NAME.test(name)) {
    const chars = Array.from(name);
    return `${chars[0]}${"*".repeat(chars.length - 1)}`;
  }
  return name;
}
function resolveReviewDisplayName(user, options) {
  if (options.anonymous) return ANONYMOUS_DISPLAY_NAME;
  const source = tidy(user.lineDisplayName) || tidy(user.name);
  const masked = maskPersonalName(source);
  if (masked) return masked.slice(0, DISPLAY_NAME_MAX_LENGTH);
  return FALLBACK_DISPLAY_NAME;
}

// server/reviewDb.ts
var REVIEW_STATUSES = ["pending", "published", "hidden"];
var REVIEW_MAX_IMAGES = 3;
var REVIEW_CONTENT_MAX_LENGTH = 2e3;
var REVIEW_DISPLAY_NAME_MAX_LENGTH = 50;
var REVIEWABLE_ORDER_STATUSES = ["completed", "picked_up"];
var BLOCKED_PAYMENT_STATUSES = ["failed", "cancelled"];
var ReviewError = class extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = "ReviewError";
  }
};
async function requireDb3() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db;
}
function normalizeReviewImages(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === "string" && item.length > 0);
}
function resolvePublishedAt(current, nextStatus, now = /* @__PURE__ */ new Date()) {
  if (current) return current;
  return nextStatus === "published" ? now : null;
}
function isVerifiedPurchase(row) {
  return row.source === "customer" && row.orderItemId != null;
}
function toPublicReview(row) {
  return {
    id: row.id,
    displayName: row.displayName,
    rating: row.rating,
    content: row.content,
    images: normalizeReviewImages(row.images),
    createdAt: row.createdAt,
    verifiedPurchase: isVerifiedPurchase(row)
  };
}
function compareReviews(a, b) {
  return a.sortOrder - b.sortOrder || b.createdAt.getTime() - a.createdAt.getTime();
}
async function findProduct(db, productId) {
  const rows = await db.select({ id: dbProducts.id, name: dbProducts.name }).from(dbProducts).where(eq16(dbProducts.id, productId)).limit(1);
  return rows[0] ?? null;
}
var REVIEW_PAGE_SIZE = 8;
async function listPublishedReviews(productId, options = {}) {
  const limit = options.limit ?? REVIEW_PAGE_SIZE;
  const cursor = options.cursor ?? 0;
  try {
    const db = await getDb();
    if (!db) return { items: [], nextCursor: null };
    const rows = await db.select().from(productReviews).where(and11(eq16(productReviews.productId, productId), eq16(productReviews.status, "published"))).orderBy(asc3(productReviews.sortOrder), desc7(productReviews.createdAt), desc7(productReviews.id)).limit(limit + 1).offset(cursor);
    const hasMore = rows.length > limit;
    return {
      items: (hasMore ? rows.slice(0, limit) : rows).map(toPublicReview),
      nextCursor: hasMore ? cursor + limit : null
    };
  } catch (error) {
    console.error("[reviews.listByProduct]", error);
    return { items: [], nextCursor: null };
  }
}
async function listAdminReviews(filter = {}) {
  const db = await requireDb3();
  const rows = await db.select().from(productReviews).where(filter.productId ? eq16(productReviews.productId, filter.productId) : void 0).orderBy(desc7(productReviews.createdAt));
  const productIds = Array.from(new Set(rows.map((row) => row.productId)));
  const existing = productIds.length ? await db.select({ id: dbProducts.id }).from(dbProducts).where(inArray6(dbProducts.id, productIds)) : [];
  const existingIds = new Set(existing.map((product) => product.id));
  return rows.sort(compareReviews).map((row) => ({
    ...row,
    images: normalizeReviewImages(row.images),
    productExists: existingIds.has(row.productId)
  }));
}
async function getAdminReview(id) {
  const db = await requireDb3();
  const rows = await db.select().from(productReviews).where(eq16(productReviews.id, id)).limit(1);
  const row = rows[0];
  if (!row) throw new ReviewError("NOT_FOUND", "\u627E\u4E0D\u5230\u9019\u5247\u56DE\u994B");
  const product = await findProduct(db, row.productId);
  return { ...row, images: normalizeReviewImages(row.images), productExists: Boolean(product) };
}
function assertPublishableWithoutProduct(input) {
  if (input.status === "published") {
    throw new ReviewError("PRODUCT_MISSING", "\u9019\u5247\u56DE\u994B\u7D81\u5B9A\u7684\u5546\u54C1\u5DF2\u522A\u9664\uFF0C\u8ACB\u5148\u6539\u7D81\u73FE\u6709\u5546\u54C1\u624D\u80FD\u4E0A\u67B6");
  }
  if (input.isFeatured) {
    throw new ReviewError("PRODUCT_MISSING", "\u9019\u5247\u56DE\u994B\u7D81\u5B9A\u7684\u5546\u54C1\u5DF2\u522A\u9664\uFF0C\u7121\u6CD5\u8A2D\u70BA\u9996\u9801\u7CBE\u9078");
  }
}
function assertFeaturable(input) {
  if (!input.isFeatured) return;
  if (input.status !== "published") {
    throw new ReviewError("INVALID_FEATURED", "\u53EA\u6709\u5DF2\u4E0A\u67B6\u7684\u56DE\u994B\u53EF\u4EE5\u8A2D\u70BA\u9996\u9801\u7CBE\u9078");
  }
  if (!input.productExists) {
    throw new ReviewError("PRODUCT_MISSING", "\u9019\u5247\u56DE\u994B\u7D81\u5B9A\u7684\u5546\u54C1\u5DF2\u522A\u9664\uFF0C\u7121\u6CD5\u8A2D\u70BA\u9996\u9801\u7CBE\u9078");
  }
}
function resolveFeaturedForStatus(currentFeatured, nextStatus) {
  return nextStatus === "published" ? currentFeatured : false;
}
async function createReview(input) {
  const db = await requireDb3();
  const product = await findProduct(db, input.productId);
  if (!product) throw new ReviewError("PRODUCT_NOT_FOUND", "\u627E\u4E0D\u5230\u9019\u500B\u5546\u54C1\uFF0C\u8ACB\u91CD\u65B0\u9078\u64C7");
  assertFeaturable({ status: input.status, isFeatured: input.isFeatured, productExists: true });
  await db.insert(productReviews).values({
    productId: product.id,
    productName: product.name,
    source: "admin",
    displayName: input.displayName,
    rating: input.rating,
    content: input.content,
    images: input.images,
    status: input.status,
    isFeatured: input.isFeatured,
    sortOrder: input.sortOrder,
    publishedAt: resolvePublishedAt(null, input.status)
  });
  return { success: true };
}
async function updateReview(id, input) {
  const db = await requireDb3();
  const rows = await db.select().from(productReviews).where(eq16(productReviews.id, id)).limit(1);
  const existing = rows[0];
  if (!existing) throw new ReviewError("NOT_FOUND", "\u627E\u4E0D\u5230\u9019\u5247\u56DE\u994B");
  const product = await findProduct(db, input.productId);
  if (!product) {
    if (input.productId !== existing.productId) {
      throw new ReviewError("PRODUCT_NOT_FOUND", "\u627E\u4E0D\u5230\u9019\u500B\u5546\u54C1\uFF0C\u8ACB\u91CD\u65B0\u9078\u64C7");
    }
    assertPublishableWithoutProduct(input);
  }
  assertFeaturable({ status: input.status, isFeatured: input.isFeatured, productExists: Boolean(product) });
  await db.update(productReviews).set({
    productId: input.productId,
    // 商品還在就順便更新名稱快照；商品已刪除則保留原本的名稱
    productName: product?.name ?? existing.productName,
    displayName: input.displayName,
    rating: input.rating,
    content: input.content,
    images: input.images,
    status: input.status,
    isFeatured: input.isFeatured,
    sortOrder: input.sortOrder,
    publishedAt: resolvePublishedAt(existing.publishedAt, input.status)
  }).where(eq16(productReviews.id, id));
  return { success: true };
}
async function setReviewStatus(id, status) {
  const db = await requireDb3();
  const rows = await db.select().from(productReviews).where(eq16(productReviews.id, id)).limit(1);
  const existing = rows[0];
  if (!existing) throw new ReviewError("NOT_FOUND", "\u627E\u4E0D\u5230\u9019\u5247\u56DE\u994B");
  if (status === "published" && !await findProduct(db, existing.productId)) {
    throw new ReviewError("PRODUCT_MISSING", "\u9019\u5247\u56DE\u994B\u7D81\u5B9A\u7684\u5546\u54C1\u5DF2\u522A\u9664\uFF0C\u8ACB\u5148\u6539\u7D81\u73FE\u6709\u5546\u54C1\u624D\u80FD\u4E0A\u67B6");
  }
  await db.update(productReviews).set({
    status,
    // 下架時一併取消精選，否則首頁會撈到已隱藏的回饋
    isFeatured: resolveFeaturedForStatus(existing.isFeatured, status),
    publishedAt: resolvePublishedAt(existing.publishedAt, status)
  }).where(eq16(productReviews.id, id));
  return { success: true };
}
async function removeReview(id) {
  const db = await requireDb3();
  await db.delete(productReviews).where(eq16(productReviews.id, id));
  return { success: true };
}
function isOrderReviewable(order) {
  return REVIEWABLE_ORDER_STATUSES.includes(order.orderStatus) && !BLOCKED_PAYMENT_STATUSES.includes(order.paymentStatus);
}
function isReviewableProductId(productId) {
  if (NON_PRODUCT_ORDER_ITEM_IDS.includes(productId)) return false;
  return !CUSTOM_PRODUCT_IDS.includes(productId);
}
function resolveReviewItemState(input) {
  if (input.existingReview) return input.existingReview.status;
  if (!isOrderReviewable(input.order)) return "not_eligible";
  if (!isReviewableProductId(input.productId)) return "not_eligible";
  return "available";
}
async function getOrderItemReviewStates(orderId, identity) {
  const db = await requireDb3();
  const [order] = await db.select({
    id: orders.id,
    userId: orders.userId,
    buyerEmail: orders.buyerEmail,
    orderStatus: orders.orderStatus,
    paymentStatus: orders.paymentStatus
  }).from(orders).where(eq16(orders.id, orderId)).limit(1);
  if (!order) throw new ReviewError("NOT_FOUND", "\u627E\u4E0D\u5230\u9019\u7B46\u8A02\u55AE");
  if (!isOrderOwnedByMember(order, identity)) {
    throw new ReviewError("FORBIDDEN", "\u7121\u6CD5\u67E5\u770B\u9019\u7B46\u8A02\u55AE");
  }
  const items = await db.select({ id: orderItems.id, productId: orderItems.productId }).from(orderItems).where(eq16(orderItems.orderId, orderId));
  if (items.length === 0) return [];
  const reviews = await db.select().from(productReviews).where(inArray6(productReviews.orderItemId, items.map((item) => item.id)));
  const reviewByItemId = new Map(reviews.map((review) => [review.orderItemId, review]));
  return items.map((item) => {
    const review = reviewByItemId.get(item.id) ?? null;
    return {
      orderItemId: item.id,
      state: resolveReviewItemState({ order, productId: item.productId, existingReview: review }),
      review: review ? {
        id: review.id,
        rating: review.rating,
        content: review.content,
        images: normalizeReviewImages(review.images)
      } : null
    };
  });
}
function isDuplicateKeyError2(error) {
  let current = error;
  for (let depth = 0; current && depth < 5; depth += 1) {
    const candidate = current;
    if (candidate.code === "ER_DUP_ENTRY" || candidate.errno === 1062) return true;
    if (typeof candidate.message === "string" && candidate.message.includes("Duplicate entry")) return true;
    current = candidate.cause;
  }
  return false;
}
async function createCustomerReview(input, identity, profile) {
  const db = await requireDb3();
  const [row] = await db.select({
    itemId: orderItems.id,
    productId: orderItems.productId,
    productName: orderItems.productName,
    orderUserId: orders.userId,
    buyerEmail: orders.buyerEmail,
    orderStatus: orders.orderStatus,
    paymentStatus: orders.paymentStatus
  }).from(orderItems).innerJoin(orders, eq16(orders.id, orderItems.orderId)).where(eq16(orderItems.id, input.orderItemId)).limit(1);
  if (!row) throw new ReviewError("NOT_FOUND", "\u627E\u4E0D\u5230\u9019\u7B46\u8A02\u55AE\u5546\u54C1");
  const order = {
    userId: row.orderUserId,
    buyerEmail: row.buyerEmail,
    orderStatus: row.orderStatus,
    paymentStatus: row.paymentStatus
  };
  if (!isOrderOwnedByMember(order, identity)) {
    throw new ReviewError("FORBIDDEN", "\u7121\u6CD5\u8A55\u50F9\u9019\u7B46\u8A02\u55AE\u5546\u54C1");
  }
  if (!isOrderReviewable(order)) {
    throw new ReviewError("NOT_ELIGIBLE", "\u9019\u7B46\u8A02\u55AE\u76EE\u524D\u9084\u4E0D\u80FD\u8A55\u50F9");
  }
  if (!isReviewableProductId(row.productId)) {
    throw new ReviewError("NOT_ELIGIBLE", "\u9019\u500B\u54C1\u9805\u4E0D\u958B\u653E\u8A55\u50F9");
  }
  const existing = await db.select({ id: productReviews.id }).from(productReviews).where(eq16(productReviews.orderItemId, input.orderItemId)).limit(1);
  if (existing.length > 0) {
    throw new ReviewError("ALREADY_REVIEWED", "\u6B64\u5546\u54C1\u5DF2\u7D93\u7559\u4E0B\u904E\u8A55\u50F9");
  }
  const displayName = resolveReviewDisplayName(profile, { anonymous: input.anonymous });
  try {
    await db.insert(productReviews).values({
      productId: row.productId,
      // 保留購買當下的品名（含手圍、款式等規格），商品之後改名或刪除都還原得回來
      productName: row.productName,
      source: "customer",
      userId: identity.userId,
      orderItemId: input.orderItemId,
      displayName,
      rating: input.rating,
      content: input.content,
      images: input.images,
      // 顧客投稿一律等後台審核，不會自己上架
      status: "pending",
      isFeatured: false,
      sortOrder: 0,
      publishedAt: null
    });
  } catch (error) {
    if (isDuplicateKeyError2(error)) {
      throw new ReviewError("ALREADY_REVIEWED", "\u6B64\u5546\u54C1\u5DF2\u7D93\u7559\u4E0B\u904E\u8A55\u50F9");
    }
    throw error;
  }
  return { success: true };
}
async function getProductReviewSummary(productId) {
  try {
    const db = await getDb();
    if (!db) return { count: 0, average: null };
    const [row] = await db.select({ total: count2(), average: avg(productReviews.rating) }).from(productReviews).where(and11(eq16(productReviews.productId, productId), eq16(productReviews.status, "published")));
    const total = Number(row?.total ?? 0);
    if (total === 0) return { count: 0, average: null };
    const raw = Number(row?.average ?? 0);
    return { count: total, average: Math.round(raw * 10) / 10 };
  } catch (error) {
    console.error("[reviews.summaryByProduct]", error);
    return { count: 0, average: null };
  }
}

// server/routers/reviews.ts
var reviewInputSchema = z8.object({
  productId: z8.string().trim().min(1, "\u8ACB\u9078\u64C7\u5546\u54C1").max(64, "\u5546\u54C1\u4EE3\u865F\u904E\u9577"),
  displayName: z8.string().trim().min(1, "\u8ACB\u8F38\u5165\u986F\u793A\u540D\u7A31").max(REVIEW_DISPLAY_NAME_MAX_LENGTH, `\u986F\u793A\u540D\u7A31\u6700\u591A ${REVIEW_DISPLAY_NAME_MAX_LENGTH} \u5B57`),
  rating: z8.number().int("\u8A55\u5206\u9700\u70BA\u6574\u6578").min(1, "\u8A55\u5206\u81F3\u5C11 1 \u661F").max(5, "\u8A55\u5206\u6700\u591A 5 \u661F"),
  content: z8.string().trim().min(1, "\u8ACB\u8F38\u5165\u56DE\u994B\u5167\u5BB9").max(REVIEW_CONTENT_MAX_LENGTH, `\u56DE\u994B\u5167\u5BB9\u6700\u591A ${REVIEW_CONTENT_MAX_LENGTH} \u5B57`),
  images: z8.array(
    z8.string().trim().max(1024, "\u5716\u7247\u7DB2\u5740\u904E\u9577").refine(isSafeImageSrc, "\u5716\u7247\u7DB2\u5740\u9700\u70BA https:// \u6216\u7AD9\u5167\u8DEF\u5F91")
  ).max(REVIEW_MAX_IMAGES, `\u6700\u591A ${REVIEW_MAX_IMAGES} \u5F35\u5716\u7247`).default([]),
  status: z8.enum(REVIEW_STATUSES),
  isFeatured: z8.boolean().default(false),
  sortOrder: z8.number().int("\u6392\u5E8F\u9700\u70BA\u6574\u6578").min(-9999).max(9999)
});
var imageUploadInputSchema = z8.object({
  contentType: z8.enum(Object.keys(UPLOADABLE_IMAGE_TYPES)),
  // base64 約為原始大小的 4/3，實際大小由 putPublicImage 檢查
  dataBase64: z8.string().min(1).max(42e5, "\u5716\u7247\u592A\u5927\uFF0C\u8ACB\u5C0F\u65BC 3MB")
});
var REVIEW_ERROR_CODES = {
  NOT_FOUND: "NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
  PRODUCT_NOT_FOUND: "BAD_REQUEST",
  PRODUCT_MISSING: "BAD_REQUEST",
  NOT_ELIGIBLE: "BAD_REQUEST",
  ALREADY_REVIEWED: "CONFLICT",
  INVALID_FEATURED: "BAD_REQUEST"
};
function toTrpcError(error) {
  if (error instanceof ReviewError) {
    throw new TRPCError9({ code: REVIEW_ERROR_CODES[error.code], message: error.message });
  }
  throw error;
}
async function run(action) {
  try {
    return await action();
  } catch (error) {
    toTrpcError(error);
  }
}
var customerReviewInputSchema = z8.object({
  orderItemId: z8.number().int("\u8A02\u55AE\u54C1\u9805\u4E0D\u6B63\u78BA").positive("\u8A02\u55AE\u54C1\u9805\u4E0D\u6B63\u78BA"),
  rating: z8.number().int("\u8A55\u5206\u9700\u70BA\u6574\u6578").min(1, "\u8ACB\u7D66 1 \u5230 5 \u661F").max(5, "\u8ACB\u7D66 1 \u5230 5 \u661F"),
  content: z8.string().trim().min(1, "\u8ACB\u8F38\u5165\u5546\u54C1\u5FC3\u5F97").max(REVIEW_CONTENT_MAX_LENGTH, `\u5546\u54C1\u5FC3\u5F97\u6700\u591A ${REVIEW_CONTENT_MAX_LENGTH} \u5B57`),
  images: z8.array(
    z8.string().trim().max(1024, "\u5716\u7247\u7DB2\u5740\u904E\u9577").refine(isSafeImageSrc, "\u5716\u7247\u7DB2\u5740\u9700\u70BA https:// \u6216\u7AD9\u5167\u8DEF\u5F91")
  ).max(REVIEW_MAX_IMAGES, `\u6700\u591A ${REVIEW_MAX_IMAGES} \u5F35\u5716\u7247`).default([]),
  anonymous: z8.boolean().default(false)
});
async function uploadReviewImage(input) {
  try {
    const { url } = await putPublicImage("product-reviews", Buffer.from(input.dataBase64, "base64"), input.contentType);
    return { url };
  } catch (error) {
    if (error instanceof BlobUploadError) {
      throw new TRPCError9({
        code: error.code === "TOO_LARGE" ? "BAD_REQUEST" : "PRECONDITION_FAILED",
        message: error.message
      });
    }
    throw error;
  }
}
var reviewRouter = router({
  /**
   * 商品頁：只回已上架的回饋，分批取（捲到底才撈下一批）。
   * 查詢失敗時回空陣列（錯誤已在 reviewDb 記錄）。
   */
  listByProduct: publicProcedure.input(
    z8.object({
      productId: z8.string().trim().min(1).max(64),
      limit: z8.number().int().min(1).max(24).default(REVIEW_PAGE_SIZE),
      cursor: z8.number().int().min(0).nullish()
    })
  ).query(
    ({ input }) => listPublishedReviews(input.productId, { limit: input.limit, cursor: input.cursor ?? 0 })
  ),
  adminList: adminProcedure.input(z8.object({ productId: z8.string().trim().max(64).optional() }).default({})).query(({ input }) => run(() => listAdminReviews({ productId: input.productId || void 0 }))),
  adminGet: adminProcedure.input(z8.object({ id: z8.number().int().positive() })).query(({ input }) => run(() => getAdminReview(input.id))),
  adminCreate: adminProcedure.input(reviewInputSchema).mutation(({ input }) => run(() => createReview(input))),
  adminUpdate: adminProcedure.input(reviewInputSchema.safeExtend({ id: z8.number().int().positive() })).mutation(({ input }) => run(() => updateReview(input.id, input))),
  adminSetStatus: adminProcedure.input(z8.object({ id: z8.number().int().positive(), status: z8.enum(REVIEW_STATUSES) })).mutation(({ input }) => run(() => setReviewStatus(input.id, input.status))),
  adminRemove: adminProcedure.input(z8.object({ id: z8.number().int().positive() })).mutation(({ input }) => run(() => removeReview(input.id))),
  /** 商品頁的評分摘要；只算已上架 */
  summaryByProduct: publicProcedure.input(z8.object({ productId: z8.string().trim().min(1).max(64) })).query(({ input }) => getProductReviewSummary(input.productId)),
  /**
   * 會員端：一次取得整張訂單每個品項的評價狀態。
   * 權限在 reviewDb 內驗證，知道 orderId 不等於看得到。
   */
  statusByOrder: protectedProcedure.input(z8.object({ orderId: z8.number().int().positive() })).query(
    ({ ctx, input }) => run(async () => {
      const identity = await resolveMemberIdentity(ctx.user);
      return getOrderItemReviewStates(input.orderId, identity);
    })
  ),
  /**
   * 會員端：告訴顧客「不勾匿名時會顯示成什麼」。
   * 遮罩規則只有伺服器有一份，前端不重做，避免兩邊走偏。
   */
  customerDisplayName: protectedProcedure.query(async ({ ctx }) => {
    const profile = await getUserByOpenId(ctx.user.openId);
    return {
      displayName: resolveReviewDisplayName(
        { name: profile?.name ?? ctx.user.name ?? null, lineDisplayName: profile?.lineDisplayName ?? null },
        { anonymous: false }
      ),
      anonymousName: ANONYMOUS_DISPLAY_NAME
    };
  }),
  /**
   * 會員端：留下商品評價。
   * client 只能給這五個欄位，其餘（source / status / userId / productId /
   * productName / displayName / isFeatured）全部由伺服器決定。
   */
  customerCreate: rateLimitedProtectedProcedure({ scope: "customer-review", limit: 20, windowMs: 15 * 6e4 }).input(customerReviewInputSchema).mutation(
    ({ ctx, input }) => run(async () => {
      const identity = await resolveMemberIdentity(ctx.user);
      const profile = await getUserByOpenId(ctx.user.openId);
      return createCustomerReview(input, identity, {
        name: profile?.name ?? ctx.user.name ?? null,
        lineDisplayName: profile?.lineDisplayName ?? null
      });
    })
  ),
  /** 會員端圖片上傳；不可開放給未登入者 */
  customerUploadImage: rateLimitedProtectedProcedure({ scope: "customer-review-upload", limit: 40, windowMs: 15 * 6e4 }).input(imageUploadInputSchema).mutation(({ input }) => uploadReviewImage(input)),
  /** 回饋圖片，上傳到 Vercel Blob（product-reviews/） */
  uploadImage: adminProcedure.input(imageUploadInputSchema).mutation(({ input }) => uploadReviewImage(input))
});

// server/routers/adminMembers.ts
init_schema();
import { TRPCError as TRPCError10 } from "@trpc/server";
import { and as and12, asc as asc4, desc as desc8, eq as eq17, or as or5, sql as sql12 } from "drizzle-orm";
import { z as z9 } from "zod";
var VIP_TIERS = ["none", "vip", "vvip"];
async function ensureMemberVipColumns() {
  const db = await getDb();
  if (!db) throw new TRPCError10({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  try {
    await db.execute(sql12`ALTER TABLE \`users\` ADD COLUMN \`vipTier\` varchar(32) NOT NULL DEFAULT 'none'`);
  } catch (error) {
    if (!String(error).includes("Duplicate column")) console.warn("[adminMembers] ensure vipTier column:", error);
  }
  try {
    await db.execute(sql12`ALTER TABLE \`users\` ADD COLUMN \`vipNote\` text NULL`);
  } catch (error) {
    if (!String(error).includes("Duplicate column")) console.warn("[adminMembers] ensure vipNote column:", error);
  }
  return db;
}
var MAX_SEARCH_TOKENS = 5;
function buildMemberSearchWhere(search) {
  const tokens = (search ?? "").trim().toLowerCase().split(/\s+/).filter(Boolean).slice(0, MAX_SEARCH_TOKENS);
  if (tokens.length === 0) return void 0;
  return and12(
    ...tokens.map((token) => {
      const pattern = `%${token.replace(/[!%_]/g, (char) => `!${char}`)}%`;
      return or5(
        sql12`LOWER(${users.name}) LIKE ${pattern} ESCAPE '!'`,
        sql12`LOWER(${users.email}) LIKE ${pattern} ESCAPE '!'`,
        sql12`LOWER(${users.lineEmail}) LIKE ${pattern} ESCAPE '!'`,
        sql12`CAST(${users.id} AS CHAR) LIKE ${pattern} ESCAPE '!'`
      );
    })
  );
}
function memberOrderMatch(userId, email) {
  const conditions = [eq17(orders.userId, userId)];
  const normalizedEmail = email?.trim().toLowerCase();
  if (normalizedEmail) {
    conditions.push(sql12`LOWER(TRIM(${orders.buyerEmail})) = ${normalizedEmail}`);
  }
  return or5(...conditions);
}
var paidValueSql = sql12`
  SUM(
    CASE
      WHEN ${orders.paymentStatus} IN ('paid', 'confirmed')
        OR ${orders.orderStatus} IN ('deposit_paid', 'paid', 'processing', 'shipped', 'arrived', 'picked_up', 'completed')
      THEN ${orders.totalAmount}
      ELSE 0
    END
  )
`;
var adminMembersRouter = router({
  list: adminProcedure.input(
    z9.object({
      search: z9.string().trim().max(100).optional(),
      limit: z9.number().int().min(1).max(100).default(50),
      offset: z9.number().int().min(0).default(0)
    }).default({ limit: 50, offset: 0 })
  ).query(async ({ input }) => {
    const db = await ensureMemberVipColumns();
    const where = buildMemberSearchWhere(input.search);
    const [totalRow] = where ? await db.select({ count: sql12`CAST(COUNT(*) AS SIGNED)` }).from(users).where(where) : await db.select({ count: sql12`CAST(COUNT(*) AS SIGNED)` }).from(users);
    const rows = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      loginMethod: users.loginMethod,
      lineBound: sql12`CASE WHEN ${users.openId} LIKE 'line:%' THEN 1 ELSE 0 END`,
      lineDisplayName: users.lineDisplayName,
      linePictureUrl: users.linePictureUrl,
      role: users.role,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
      vipTier: sql12`COALESCE(\`vipTier\`, 'none')`,
      vipNote: sql12`${sql12.raw("`vipNote`")}`,
      orderCount: sql12`CAST(COUNT(DISTINCT ${orders.id}) AS SIGNED)`,
      totalSpent: sql12`CAST(COALESCE(${paidValueSql}, 0) AS SIGNED)`,
      latestOrderAt: sql12`MAX(${orders.createdAt})`
    }).from(users).leftJoin(
      orders,
      or5(
        eq17(orders.userId, users.id),
        and12(
          sql12`${users.email} IS NOT NULL`,
          sql12`${users.email} != ''`,
          sql12`LOWER(TRIM(${orders.buyerEmail})) = LOWER(TRIM(${users.email}))`
        )
      )
    ).where(where).groupBy(
      users.id,
      users.name,
      users.email,
      users.loginMethod,
      users.openId,
      users.lineDisplayName,
      users.linePictureUrl,
      users.role,
      users.createdAt,
      users.lastSignedIn,
      sql12.raw("`vipTier`"),
      sql12.raw("`vipNote`")
    ).orderBy(desc8(sql12`MAX(${orders.createdAt})`), desc8(users.createdAt)).limit(input.limit).offset(input.offset);
    return {
      items: rows.map((row) => {
        const lineBound = Number(row.lineBound) === 1;
        return {
          ...row,
          lineBound,
          lineDisplayName: lineBound ? row.lineDisplayName : null,
          linePictureUrl: lineBound ? row.linePictureUrl : null
        };
      }),
      total: Number(totalRow?.count ?? 0)
    };
  }),
  /** 指定月份的壽星名單，以及該年度生日優惠是否已發放。 */
  birthdays: adminProcedure.input(
    z9.object({
      month: z9.number().int().min(1).max(12),
      year: z9.number().int().min(2020).max(2100),
      search: z9.string().trim().max(100).optional(),
      limit: z9.number().int().min(1).max(200).default(100),
      offset: z9.number().int().min(0).default(0)
    })
  ).query(async ({ input }) => {
    const db = await ensureMemberVipColumns();
    const searchWhere = buildMemberSearchWhere(input.search);
    const where = and12(eq17(users.birthMonth, input.month), sql12`${users.birthDay} IS NOT NULL`, searchWhere);
    const campaignKey = `birthday:${input.year}`;
    const issuedSql = sql12`EXISTS(
        SELECT 1 FROM \`memberCoupons\` mc
        WHERE mc.\`userId\` = ${users.id}
          AND mc.\`source\` = 'BIRTHDAY'
          AND mc.\`campaignKey\` = ${campaignKey}
      )`;
    const lineBoundSql = sql12`${users.openId} LIKE 'line:%'`;
    const [totalRow] = await db.select({
      count: sql12`CAST(COUNT(*) AS SIGNED)`,
      issued: sql12`CAST(COALESCE(SUM(CASE WHEN ${issuedSql} THEN 1 ELSE 0 END), 0) AS SIGNED)`,
      lineBound: sql12`CAST(COALESCE(SUM(CASE WHEN ${lineBoundSql} THEN 1 ELSE 0 END), 0) AS SIGNED)`
    }).from(users).where(where);
    const rows = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      birthYear: users.birthYear,
      birthMonth: users.birthMonth,
      birthDay: users.birthDay,
      lineBound: sql12`CASE WHEN ${lineBoundSql} THEN 1 ELSE 0 END`,
      lineDisplayName: users.lineDisplayName,
      birthdayCouponIssued: sql12`${issuedSql}`
    }).from(users).where(where).orderBy(asc4(users.birthDay), asc4(users.name), asc4(users.id)).limit(input.limit).offset(input.offset);
    return {
      campaignKey,
      total: Number(totalRow?.count ?? 0),
      issuedTotal: Number(totalRow?.issued ?? 0),
      lineBoundTotal: Number(totalRow?.lineBound ?? 0),
      items: rows.map((row) => ({
        ...row,
        lineBound: Number(row.lineBound) === 1,
        birthdayCouponIssued: Number(row.birthdayCouponIssued) === 1
      }))
    };
  }),
  detail: adminProcedure.input(z9.object({ userId: z9.number().int().positive() })).query(async ({ input }) => {
    const db = await ensureMemberVipColumns();
    const [member] = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      loginMethod: users.loginMethod,
      openId: users.openId,
      lineEmail: users.lineEmail,
      lineDisplayName: users.lineDisplayName,
      linePictureUrl: users.linePictureUrl,
      birthYear: users.birthYear,
      birthMonth: users.birthMonth,
      birthDay: users.birthDay,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      lastSignedIn: users.lastSignedIn,
      vipTier: sql12`COALESCE(\`vipTier\`, 'none')`,
      vipNote: sql12`${sql12.raw("`vipNote`")}`
    }).from(users).where(eq17(users.id, input.userId)).limit(1);
    if (!member) throw new TRPCError10({ code: "NOT_FOUND", message: "\u627E\u4E0D\u5230\u6703\u54E1" });
    const history = await db.select({
      id: orders.id,
      merchantTradeNo: orders.merchantTradeNo,
      paymentStatus: orders.paymentStatus,
      paymentMethod: orders.paymentMethod,
      shippingMethod: orders.shippingMethod,
      orderStatus: orders.orderStatus,
      isPreorder: orders.isPreorder,
      isCustomOrder: orders.isCustomOrder,
      totalAmount: orders.totalAmount,
      buyerName: orders.buyerName,
      buyerEmail: orders.buyerEmail,
      buyerPhone: orders.buyerPhone,
      createdAt: orders.createdAt,
      paidAt: orders.paidAt,
      itemCount: sql12`CAST(COUNT(${orderItems.id}) AS SIGNED)`
    }).from(orders).leftJoin(orderItems, eq17(orderItems.orderId, orders.id)).where(memberOrderMatch(member.id, member.email)).groupBy(
      orders.id,
      orders.merchantTradeNo,
      orders.paymentStatus,
      orders.paymentMethod,
      orders.shippingMethod,
      orders.orderStatus,
      orders.isPreorder,
      orders.isCustomOrder,
      orders.totalAmount,
      orders.buyerName,
      orders.buyerEmail,
      orders.buyerPhone,
      orders.createdAt,
      orders.paidAt
    ).orderBy(desc8(orders.createdAt)).limit(100);
    const { openId, ...memberFields } = member;
    const lineBound = openId.startsWith("line:");
    return {
      member: {
        ...memberFields,
        lineBound,
        lineDisplayName: lineBound ? memberFields.lineDisplayName : null,
        linePictureUrl: lineBound ? memberFields.linePictureUrl : null
      },
      orders: history
    };
  }),
  /** 客服代會員修改生日；birthday 為 null 表示清除，讓會員重新填寫 */
  updateBirthday: adminProcedure.input(z9.object({ userId: z9.number().int().positive(), birthday: birthdaySchema.nullable() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError10({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const [member] = await db.select({ id: users.id }).from(users).where(eq17(users.id, input.userId)).limit(1);
    if (!member) throw new TRPCError10({ code: "NOT_FOUND", message: "\u627E\u4E0D\u5230\u6703\u54E1" });
    await db.update(users).set({
      birthYear: input.birthday?.year ?? null,
      birthMonth: input.birthday?.month ?? null,
      birthDay: input.birthday?.day ?? null
    }).where(eq17(users.id, input.userId));
    return { success: true };
  }),
  updateVip: adminProcedure.input(
    z9.object({
      userId: z9.number().int().positive(),
      vipTier: z9.enum(VIP_TIERS),
      vipNote: z9.string().trim().max(1e3).nullable().optional()
    })
  ).mutation(async ({ input }) => {
    const db = await ensureMemberVipColumns();
    await db.execute(sql12`
        UPDATE \`users\`
        SET \`vipTier\` = ${input.vipTier},
            \`vipNote\` = ${input.vipNote?.trim() || null},
            \`updatedAt\` = NOW()
        WHERE \`id\` = ${input.userId}
      `);
    return { success: true };
  }),
  deleteMember: adminProcedure.input(z9.object({ userId: z9.number().int().positive() })).mutation(async ({ ctx, input }) => {
    if (input.userId === ctx.user.id) {
      throw new TRPCError10({ code: "BAD_REQUEST", message: "\u4E0D\u80FD\u522A\u9664\u76EE\u524D\u767B\u5165\u7684\u7BA1\u7406\u54E1\u5E33\u865F" });
    }
    const db = await ensureMemberVipColumns();
    const [member] = await db.select({
      id: users.id,
      role: users.role
    }).from(users).where(eq17(users.id, input.userId)).limit(1);
    if (!member) throw new TRPCError10({ code: "NOT_FOUND", message: "\u627E\u4E0D\u5230\u6703\u54E1" });
    if (member.role === "admin") {
      throw new TRPCError10({ code: "BAD_REQUEST", message: "\u4E0D\u80FD\u5F9E\u6703\u54E1\u7BA1\u7406\u522A\u9664\u7BA1\u7406\u54E1\u5E33\u865F" });
    }
    await db.execute(sql12`UPDATE \`orders\` SET \`userId\` = NULL WHERE \`userId\` = ${input.userId}`);
    await db.execute(sql12`UPDATE \`chatbotLogs\` SET \`userId\` = NULL WHERE \`userId\` = ${input.userId}`);
    await db.execute(sql12`DELETE FROM \`memberCoupons\` WHERE \`userId\` = ${input.userId} AND \`status\` <> 'used'`);
    await db.execute(sql12`DELETE FROM \`users\` WHERE \`id\` = ${input.userId}`);
    return { success: true, deletedUserId: input.userId };
  })
});

// server/routers/siteSettings.ts
import { z as z10 } from "zod";
import { eq as eq18, sql as sql13 } from "drizzle-orm";
import { TRPCError as TRPCError11 } from "@trpc/server";
init_schema();
var DEFAULT_ANNOUNCEMENT_TEXT = "\u4EFB\u9078 2 \u4EF6\u5373\u514D\u904B \xB7";
var ANNOUNCEMENT_TEXT_KEY = "announcementText";
var ANNOUNCEMENT_ENABLED_KEY = "announcementEnabled";
var tableEnsured2 = false;
async function ensureSiteSettingsTable() {
  if (tableEnsured2) return;
  const db = await getDb();
  if (!db) return;
  await db.execute(sql13`
    CREATE TABLE IF NOT EXISTS \`siteSettings\` (
      \`key\` varchar(64) NOT NULL,
      \`value\` text NOT NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`key\`)
    )
  `);
  tableEnsured2 = true;
}
async function getSettingValue(key) {
  const db = await getDb();
  if (!db) return null;
  await ensureSiteSettingsTable();
  const rows = await db.select().from(siteSettings).where(eq18(siteSettings.key, key)).limit(1);
  return rows[0]?.value ?? null;
}
async function upsertSettingValue(key, value) {
  const db = await getDb();
  if (!db) {
    throw new TRPCError11({ code: "INTERNAL_SERVER_ERROR", message: "\u8CC7\u6599\u5EAB\u5C1A\u672A\u9023\u7DDA\uFF0C\u7121\u6CD5\u5132\u5B58\u7DB2\u7AD9\u8A2D\u5B9A" });
  }
  await ensureSiteSettingsTable();
  await db.insert(siteSettings).values({ key, value }).onDuplicateKeyUpdate({ set: { value } });
}
var siteSettingsRouter = router({
  public: publicProcedure.query(async () => {
    const [announcementText, announcementEnabled] = await Promise.all([
      getSettingValue(ANNOUNCEMENT_TEXT_KEY),
      getSettingValue(ANNOUNCEMENT_ENABLED_KEY)
    ]);
    return {
      announcementText: announcementText ?? DEFAULT_ANNOUNCEMENT_TEXT,
      announcementEnabled: announcementEnabled == null ? true : announcementEnabled === "true"
    };
  }),
  admin: adminProcedure.query(async () => {
    const [announcementText, announcementEnabled] = await Promise.all([
      getSettingValue(ANNOUNCEMENT_TEXT_KEY),
      getSettingValue(ANNOUNCEMENT_ENABLED_KEY)
    ]);
    return {
      announcementText: announcementText ?? DEFAULT_ANNOUNCEMENT_TEXT,
      announcementEnabled: announcementEnabled == null ? true : announcementEnabled === "true"
    };
  }),
  update: adminProcedure.input(z10.object({
    announcementText: z10.string().trim().max(200, "\u516C\u544A\u6587\u5B57\u6700\u591A 200 \u5B57"),
    announcementEnabled: z10.boolean()
  })).mutation(async ({ input }) => {
    await Promise.all([
      upsertSettingValue(ANNOUNCEMENT_TEXT_KEY, input.announcementText),
      upsertSettingValue(ANNOUNCEMENT_ENABLED_KEY, String(input.announcementEnabled))
    ]);
    return {
      announcementText: input.announcementText,
      announcementEnabled: input.announcementEnabled
    };
  })
});

// server/routers/audit.ts
import { z as z11 } from "zod";
var auditRouter = router({
  list: adminProcedure.input(z11.object({
    limit: z11.number().int().min(1).max(200).optional().default(50),
    orderId: z11.number().int().positive().optional(),
    outcome: z11.enum(["success", "rejected", "failed", "duplicate"]).optional(),
    source: z11.enum(["admin", "ecpay", "paypal", "logistics", "system", "coupon", "line"]).optional(),
    hours: z11.number().int().min(1).max(720).optional().default(24)
  }).optional()).query(({ input }) => {
    const { hours = 24, ...filters } = input ?? {};
    return listAuditEvents({
      ...filters,
      since: new Date(Date.now() - hours * 60 * 6e4)
    });
  }),
  summary: adminProcedure.input(z11.object({ hours: z11.number().int().min(1).max(720).optional().default(24) }).optional()).query(({ input }) => getAuditSummary(input?.hours ?? 24))
});

// server/routers/coupons.ts
init_schema();
import { TRPCError as TRPCError12 } from "@trpc/server";
import { eq as eq19, inArray as inArray7 } from "drizzle-orm";
import { z as z12 } from "zod";

// server/lineFriendship.ts
var LINE_API_TIMEOUT_MS = 8e3;
async function fetchWithTimeout(url, init) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LINE_API_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
async function checkWithLoginAccessToken(accessToken) {
  try {
    const res = await fetchWithTimeout("https://api.line.me/friendship/v1/status", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!res.ok) {
      console.warn("[LINE Friendship] friendship status API failed", res.status);
      return null;
    }
    const json2 = await res.json();
    return typeof json2.friendFlag === "boolean" ? json2.friendFlag : null;
  } catch (error) {
    console.warn("[LINE Friendship] friendship status API error", error);
    return null;
  }
}
async function checkWithMessagingApi(lineUserId) {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  if (!channelAccessToken) return null;
  try {
    const res = await fetchWithTimeout(`https://api.line.me/v2/bot/profile/${encodeURIComponent(lineUserId)}`, {
      headers: { Authorization: `Bearer ${channelAccessToken}` }
    });
    await res.arrayBuffer();
    if (res.status === 200) return true;
    if (res.status === 404) return false;
    console.warn("[LINE Friendship] messaging API profile check failed", res.status);
    return null;
  } catch (error) {
    console.warn("[LINE Friendship] messaging API profile check error", error);
    return null;
  }
}
async function checkLineFriendship(opts) {
  if (opts.loginAccessToken) {
    const friendFlag = await checkWithLoginAccessToken(opts.loginAccessToken);
    if (friendFlag === true) return { status: "friend", via: "friendship_api" };
    if (friendFlag === false) {
      const viaMessaging2 = await checkWithMessagingApi(opts.lineUserId);
      if (viaMessaging2 === true) return { status: "friend", via: "messaging_api" };
      return { status: "not_friend", via: "friendship_api" };
    }
  }
  const viaMessaging = await checkWithMessagingApi(opts.lineUserId);
  if (viaMessaging === true) return { status: "friend", via: "messaging_api" };
  if (viaMessaging === false) return { status: "not_friend", via: "messaging_api" };
  return { status: "unknown", reason: "\u7121\u6CD5\u5411 LINE \u78BA\u8A8D\u597D\u53CB\u72C0\u614B" };
}
function lineUserIdFromOpenId(openId) {
  return openId?.startsWith("line:") ? openId.slice("line:".length) : null;
}

// server/routers/coupons.ts
var DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
function parseFixedExpiresOn(value) {
  if (!DATE_ONLY.test(value)) return null;
  const date = /* @__PURE__ */ new Date(`${value}T23:59:59+08:00`);
  if (Number.isNaN(date.getTime())) return null;
  const roundTrip = new Date(date.getTime() + 8 * 60 * 60 * 1e3).toISOString().slice(0, 10);
  return roundTrip === value ? date : null;
}
var templateInputSchema = z12.object({
  name: z12.string().trim().min(1, "\u8ACB\u8F38\u5165\u512A\u60E0\u5238\u540D\u7A31").max(100, "\u512A\u60E0\u5238\u540D\u7A31\u6700\u591A 100 \u5B57"),
  discountAmount: z12.number().int("\u6298\u62B5\u91D1\u984D\u9700\u70BA\u6574\u6578").min(1, "\u6298\u62B5\u91D1\u984D\u81F3\u5C11 1 \u5143").max(1e5, "\u6298\u62B5\u91D1\u984D\u904E\u5927"),
  minOrderAmount: z12.number().int("\u6700\u4F4E\u6D88\u8CBB\u9700\u70BA\u6574\u6578").min(0, "\u6700\u4F4E\u6D88\u8CBB\u4E0D\u53EF\u70BA\u8CA0\u6578").max(1e7, "\u6700\u4F4E\u6D88\u8CBB\u904E\u5927"),
  validityType: z12.enum(["days_after_issue", "fixed_date"]),
  validDays: z12.number().int("\u5929\u6578\u9700\u70BA\u6574\u6578").min(1, "\u6709\u6548\u5929\u6578\u81F3\u5C11 1 \u5929").max(3650, "\u6709\u6548\u5929\u6578\u6700\u591A 3650 \u5929").nullable(),
  fixedExpiresOn: z12.string().nullable(),
  maxPerUser: z12.number().int("\u9818\u53D6\u4E0A\u9650\u9700\u70BA\u6574\u6578").min(1, "\u6BCF\u4F4D\u6703\u54E1\u81F3\u5C11\u53EF\u9818 1 \u5F35").max(100, "\u6BCF\u4F4D\u6703\u54E1\u6700\u591A 100 \u5F35"),
  isActive: z12.boolean()
}).superRefine((data, ctx) => {
  if (data.validityType === "days_after_issue" && data.validDays == null) {
    ctx.addIssue({ code: "custom", message: "\u8ACB\u8F38\u5165\u767C\u653E\u5F8C\u6709\u6548\u5929\u6578", path: ["validDays"] });
  }
  if (data.validityType === "fixed_date") {
    const date = data.fixedExpiresOn ? parseFixedExpiresOn(data.fixedExpiresOn) : null;
    if (!date) {
      ctx.addIssue({ code: "custom", message: "\u8ACB\u8F38\u5165\u6709\u6548\u7684\u622A\u6B62\u65E5\u671F", path: ["fixedExpiresOn"] });
    } else if (date.getTime() <= Date.now()) {
      ctx.addIssue({ code: "custom", message: "\u622A\u6B62\u65E5\u671F\u9700\u665A\u65BC\u4ECA\u5929", path: ["fixedExpiresOn"] });
    }
  }
});
function toTemplateInput(input) {
  return {
    name: input.name,
    discountAmount: input.discountAmount,
    minOrderAmount: input.minOrderAmount,
    validityType: input.validityType,
    validDays: input.validityType === "days_after_issue" ? input.validDays : null,
    fixedExpiresAt: input.validityType === "fixed_date" && input.fixedExpiresOn ? parseFixedExpiresOn(input.fixedExpiresOn) : null,
    maxPerUser: input.maxPerUser,
    isActive: input.isActive
  };
}
function toTrpcError2(error) {
  if (error instanceof CouponError) {
    throw new TRPCError12({ code: error.code === "NOT_FOUND" ? "NOT_FOUND" : "BAD_REQUEST", message: error.message });
  }
  throw error;
}
async function withCouponErrors(run2) {
  try {
    return await run2();
  } catch (error) {
    toTrpcError2(error);
  }
}
async function getUserById(userId) {
  const db = await getDb();
  if (!db) throw new TRPCError12({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  const [user] = await db.select({ id: users.id, openId: users.openId }).from(users).where(eq19(users.id, userId)).limit(1);
  return user ?? null;
}
var lineRewardMessages = {
  granted: "LINE \u597D\u53CB\u512A\u60E0\u5238\u5DF2\u653E\u5165\u6703\u54E1\u5E33\u6236",
  already: "\u60A8\u5DF2\u7D93\u9818\u53D6\u904E LINE \u597D\u53CB\u79AE",
  disabled: "\u76EE\u524D\u6C92\u6709 LINE \u597D\u53CB\u79AE\u6D3B\u52D5"
};
var couponRouter = router({
  // ─── 後台 ─────────────────────────────────────────────────────────────────
  adminList: adminProcedure.query(() => listCouponTemplatesWithStats()),
  adminGet: adminProcedure.input(z12.object({ id: z12.number().int().positive() })).query(async ({ input }) => {
    const detail = await getCouponTemplateDetail(input.id);
    if (!detail) throw new TRPCError12({ code: "NOT_FOUND", message: "\u627E\u4E0D\u5230\u512A\u60E0\u5238" });
    return detail;
  }),
  adminCreate: adminProcedure.input(templateInputSchema).mutation(({ input }) => withCouponErrors(() => createCouponTemplate(toTemplateInput(input)))),
  adminUpdate: adminProcedure.input(z12.object({ id: z12.number().int().positive(), data: templateInputSchema })).mutation(({ input }) => withCouponErrors(() => updateCouponTemplate(input.id, toTemplateInput(input.data)))),
  adminSetActive: adminProcedure.input(z12.object({ id: z12.number().int().positive(), isActive: z12.boolean() })).mutation(
    ({ input }) => withCouponErrors(async () => {
      const template = await getCouponTemplate(input.id);
      if (!template) throw new CouponError("NOT_FOUND", "\u627E\u4E0D\u5230\u512A\u60E0\u5238");
      return updateCouponTemplate(input.id, { ...template, isActive: input.isActive });
    })
  ),
  adminActiveTemplates: adminProcedure.query(() => listActiveCouponTemplates()),
  adminMemberCoupons: adminProcedure.input(z12.object({ userId: z12.number().int().positive() })).query(({ input }) => listMemberCoupons(input.userId)),
  adminIssue: adminProcedure.input(z12.object({ userId: z12.number().int().positive(), templateId: z12.number().int().positive() })).mutation(
    ({ input, ctx }) => withCouponErrors(async () => {
      const member = await getUserById(input.userId);
      if (!member) throw new CouponError("NOT_FOUND", "\u627E\u4E0D\u5230\u6703\u54E1");
      const coupon = await issueCoupon({
        templateId: input.templateId,
        userId: member.id,
        source: "ADMIN_GIFT",
        issuedByUserId: ctx.user.id
      });
      return { id: coupon.id, name: coupon.name, expiresAt: coupon.expiresAt };
    })
  ),
  /** 第一版生日優惠：由管理員選取當月壽星後人工批次發放，不含自動排程或通知。 */
  adminIssueBirthdayBatch: adminProcedure.input(
    z12.object({
      userIds: z12.array(z12.number().int().positive()).min(1).max(200),
      templateId: z12.number().int().positive(),
      birthdayMonth: z12.number().int().min(1).max(12),
      campaignYear: z12.number().int().min(2020).max(2100)
    })
  ).mutation(async ({ input, ctx }) => {
    const template = await getCouponTemplate(input.templateId);
    if (!template) throw new TRPCError12({ code: "NOT_FOUND", message: "\u627E\u4E0D\u5230\u512A\u60E0\u5238" });
    if (!template.isActive) throw new TRPCError12({ code: "BAD_REQUEST", message: "\u6B64\u512A\u60E0\u5238\u5DF2\u505C\u7528\uFF0C\u7121\u6CD5\u767C\u653E" });
    const db = await getDb();
    if (!db) throw new TRPCError12({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const userIds = Array.from(new Set(input.userIds));
    const members = await db.select({ id: users.id, birthMonth: users.birthMonth }).from(users).where(inArray7(users.id, userIds));
    const memberById = new Map(members.map((member) => [member.id, member]));
    const campaignKey = `birthday:${input.campaignYear}`;
    const results = [];
    for (const userId of userIds) {
      const member = memberById.get(userId);
      if (!member) {
        results.push({ userId, status: "failed", message: "\u627E\u4E0D\u5230\u6703\u54E1" });
        continue;
      }
      if (member.birthMonth !== input.birthdayMonth) {
        results.push({ userId, status: "failed", message: "\u6703\u54E1\u4E0D\u5C6C\u65BC\u6240\u9078\u751F\u65E5\u6708\u4EFD" });
        continue;
      }
      try {
        await issueCoupon({
          templateId: input.templateId,
          userId,
          source: "BIRTHDAY",
          campaignKey,
          issuedByUserId: ctx.user.id
        });
        results.push({ userId, status: "issued" });
      } catch (error) {
        if (error instanceof CouponError && error.code === "LIMIT_REACHED") {
          results.push({ userId, status: "skipped", message: error.message });
        } else {
          console.error("[birthdayCoupon] issue failed", { userId, campaignKey, error });
          results.push({
            userId,
            status: "failed",
            message: error instanceof CouponError ? error.message : "\u767C\u653E\u5931\u6557\uFF0C\u8ACB\u7A0D\u5F8C\u91CD\u8A66"
          });
        }
      }
    }
    return {
      campaignKey,
      templateName: template.name,
      issued: results.filter((result) => result.status === "issued").length,
      skipped: results.filter((result) => result.status === "skipped").length,
      failed: results.filter((result) => result.status === "failed").length,
      results
    };
  }),
  adminLineRewardSettings: adminProcedure.query(() => getLineFriendRewardSettings()),
  adminSaveLineRewardSettings: adminProcedure.input(z12.object({ enabled: z12.boolean(), templateId: z12.number().int().positive().nullable() })).mutation(({ input }) => withCouponErrors(() => saveLineFriendRewardSettings(input))),
  // ─── 會員 ─────────────────────────────────────────────────────────────────
  mine: protectedProcedure.query(({ ctx }) => listMemberCoupons(ctx.user.id)),
  lineRewardStatus: protectedProcedure.query(async ({ ctx }) => {
    const [offer, reward] = await Promise.all([
      getLineFriendRewardOffer(),
      getLineFriendRewardForUser(ctx.user.id)
    ]);
    return {
      offer,
      lineBound: lineUserIdFromOpenId(ctx.user.openId) != null,
      claimed: reward != null
    };
  }),
  /** 已綁定 LINE 的會員加入好友後，主動領取好友禮（由伺服器向 LINE 確認好友狀態） */
  claimLineFriendReward: rateLimitedProtectedProcedure({
    scope: "line-friend-reward",
    limit: 10,
    windowMs: 15 * 6e4
  }).mutation(async ({ ctx }) => {
    const lineUserId = lineUserIdFromOpenId(ctx.user.openId);
    if (!lineUserId) {
      throw new TRPCError12({ code: "BAD_REQUEST", message: "\u8ACB\u5148\u7D81\u5B9A LINE \u5E33\u865F" });
    }
    const existing = await getLineFriendRewardForUser(ctx.user.id);
    if (existing) return { status: "already", message: lineRewardMessages.already };
    const friendship = await checkLineFriendship({ lineUserId });
    if (friendship.status === "unknown") {
      throw new TRPCError12({ code: "SERVICE_UNAVAILABLE", message: "\u66AB\u6642\u7121\u6CD5\u5411 LINE \u78BA\u8A8D\u597D\u53CB\u72C0\u614B\uFF0C\u8ACB\u7A0D\u5F8C\u518D\u8A66" });
    }
    if (friendship.status === "not_friend") {
      return { status: "not_friend", message: "\u5C1A\u672A\u52A0\u5165\u5B98\u65B9 LINE \u597D\u53CB\uFF0C\u52A0\u5165\u5F8C\u518D\u6309\u4E00\u6B21\u5373\u53EF\u9818\u53D6" };
    }
    const result = await grantLineFriendReward({ userId: ctx.user.id, lineUserId });
    if (result.status === "unavailable") {
      return { status: "unavailable", message: result.message };
    }
    return { status: result.status, message: lineRewardMessages[result.status] };
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
  member: memberRouter,
  product: productRouter,
  reviews: reviewRouter,
  adminMembers: adminMembersRouter,
  siteSettings: siteSettingsRouter,
  audit: auditRouter,
  coupons: couponRouter,
  promotions: promotionRouter
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

// server/lineOAuthRoutes.ts
import * as crypto8 from "node:crypto";
import { parse as parseCookieHeader2 } from "cookie";
var LINE_STATE_COOKIE = "line_oauth_state";
var LINE_RETURN_TO_COOKIE = "line_oauth_return_to";
var LINE_MODE_COOKIE = "line_oauth_mode";
function lineConfig() {
  const channelId = process.env.LINE_CHANNEL_ID?.trim();
  const channelSecret = process.env.LINE_CHANNEL_SECRET?.trim();
  return { channelId, channelSecret };
}
function readCookie(req, name) {
  const raw = req.headers.cookie;
  if (!raw) return void 0;
  const parsed = parseCookieHeader2(raw);
  return typeof parsed[name] === "string" ? parsed[name] : void 0;
}
function safeReturnTo(value) {
  if (typeof value !== "string") return void 0;
  if (!value.startsWith("/") || value.startsWith("//")) return void 0;
  return value.slice(0, 255);
}
function siteBaseUrl2(req) {
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
  return `${siteBaseUrl2(req)}/api/trpc/line-oauth-callback`;
}
async function lineExchangeCode(code, redirectUri, clientId, clientSecret) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret
  });
  const res = await fetch("https://api.line.me/oauth2/v2.1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });
  const json2 = await res.json();
  if (!res.ok) {
    console.error("[LINE OAuth] token error", json2);
    throw new Error(String(json2.error_description || json2.error || "line_token_failed"));
  }
  return json2;
}
async function lineGetProfile(accessToken) {
  const res = await fetch("https://api.line.me/v2/profile", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const json2 = await res.json();
  if (!res.ok) {
    console.error("[LINE OAuth] profile error", json2);
    throw new Error(json2.message || "line_profile_failed");
  }
  return json2;
}
async function lineVerifyIdToken(idToken, clientId) {
  const body = new URLSearchParams({ id_token: idToken, client_id: clientId });
  const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });
  const json2 = await res.json();
  if (!res.ok || !json2.sub) {
    console.error("[LINE OAuth] verify error", json2);
    throw new Error(json2.error || "line_verify_failed");
  }
  return json2;
}
function lineOAuthStart(req, res) {
  const { channelId, channelSecret } = lineConfig();
  if (!channelId || !channelSecret) {
    res.status(503).send(
      "LINE \u767B\u5165\u5C1A\u672A\u8A2D\u5B9A\uFF1A\u8ACB\u5728\u74B0\u5883\u8B8A\u6578\u8A2D\u5B9A LINE_CHANNEL_ID\u3001LINE_CHANNEL_SECRET\uFF0C\u4E26\u65BC LINE Developers \u767B\u9304 Callback URL\u3002"
    );
    return;
  }
  const state = crypto8.randomBytes(24).toString("hex");
  const callback = lineCallbackUrl(req);
  const returnTo = safeReturnTo(req.query.returnTo);
  const cookieOpts = { ...getSessionCookieOptions(req), maxAge: 6e5 };
  res.cookie(LINE_STATE_COOKIE, state, cookieOpts);
  if (returnTo) {
    res.cookie(LINE_RETURN_TO_COOKIE, returnTo, cookieOpts);
  }
  if (req.query.mode === "link") {
    res.cookie(LINE_MODE_COOKIE, "link", cookieOpts);
  } else {
    res.clearCookie(LINE_MODE_COOKIE, { path: "/", ...getSessionCookieOptions(req) });
  }
  const authorize = new URL("https://access.line.me/oauth2/v2.1/authorize");
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("client_id", channelId);
  authorize.searchParams.set("redirect_uri", callback);
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("scope", "profile openid email");
  authorize.searchParams.set("bot_prompt", "aggressive");
  res.redirect(302, authorize.toString());
}
async function lineOAuthCallback(req, res) {
  const clearStateCookie = () => {
    res.clearCookie(LINE_STATE_COOKIE, { path: "/", ...getSessionCookieOptions(req) });
    res.clearCookie(LINE_RETURN_TO_COOKIE, { path: "/", ...getSessionCookieOptions(req) });
    res.clearCookie(LINE_MODE_COOKIE, { path: "/", ...getSessionCookieOptions(req) });
  };
  const isLinkMode = readCookie(req, LINE_MODE_COOKIE) === "link";
  try {
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";
    const cookieState = readCookie(req, LINE_STATE_COOKIE);
    if (!code || !state || !cookieState || state !== cookieState) {
      clearStateCookie();
      res.status(400).send("\u767B\u5165\u72C0\u614B\u9A57\u8B49\u5931\u6557\uFF0C\u8ACB\u95DC\u9589\u8996\u7A97\u5F8C\u5F9E\u767B\u5165\u9801\u518D\u8A66\u4E00\u6B21\u3002");
      return;
    }
    const { channelId, channelSecret } = lineConfig();
    if (!channelId || !channelSecret) {
      clearStateCookie();
      res.status(503).send("LINE \u767B\u5165\u5C1A\u672A\u8A2D\u5B9A\u3002");
      return;
    }
    const redirectUri = lineCallbackUrl(req);
    const tokenJson = await lineExchangeCode(code, redirectUri, channelId, channelSecret);
    const profile = await lineGetProfile(tokenJson.access_token);
    let email = null;
    if (tokenJson.id_token) {
      try {
        const verify = await lineVerifyIdToken(tokenJson.id_token, channelId);
        if (verify.email) {
          email = normalizeOrderEmail(verify.email);
        }
      } catch {
      }
    }
    const openId = `line:${profile.userId}`;
    const name = profile.displayName?.trim() || null;
    const returnTo = safeReturnTo(readCookie(req, LINE_RETURN_TO_COOKIE));
    if (isLinkMode) {
      let currentUser;
      try {
        currentUser = await sdk.authenticateRequest(req);
      } catch {
        clearStateCookie();
        res.redirect(302, `/login?returnTo=${encodeURIComponent(returnTo ?? "/member")}`);
        return;
      }
      const bindResult = await bindLineToUser({
        userId: currentUser.id,
        lineOpenId: openId,
        lineEmail: email,
        lineDisplayName: profile.displayName,
        linePictureUrl: profile.pictureUrl
      });
      if (bindResult === "line_in_use" || bindResult === "user_has_other_line") {
        clearStateCookie();
        res.redirect(302, withQuery(returnTo ?? "/member", { line: bindResult }));
        return;
      }
    } else {
      await upsertLineUserAsPrimary({
        openId,
        name: name ?? void 0,
        email: email ?? void 0,
        lineDisplayName: profile.displayName,
        linePictureUrl: profile.pictureUrl,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
    }
    let user = await getUserByOpenId(openId);
    if (!user) {
      throw new Error("user_missing_after_upsert");
    }
    if (shouldGrantAdminRole(user.openId, user.email, user.emailVerified === true) && user.role !== "admin") {
      const db2 = await getDb();
      if (db2) {
        const { users: users2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
        const { eq: eq20 } = await import("drizzle-orm");
        await db2.update(users2).set({ role: "admin" }).where(eq20(users2.id, user.id));
        user = await getUserByOpenId(openId);
      }
    }
    const rewardStatus = await tryGrantLineFriendReward({
      userId: user.id,
      lineUserId: profile.userId,
      loginAccessToken: tokenJson.access_token
    });
    const sessionToken = await sdk.createSessionToken(openId, {
      name: user.name ?? "",
      expiresInMs: ONE_YEAR_MS
    });
    clearStateCookie();
    const sessionCookieOpts = { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS };
    res.cookie(COOKIE_NAME, sessionToken, sessionCookieOpts);
    const destination = isLinkMode ? returnTo ?? "/member" : returnTo ?? (user.role === "admin" ? "/admin/orders" : "/products");
    const query = {};
    if (isLinkMode) query.line = "bound";
    if (rewardStatus && (isLinkMode || rewardStatus === "granted")) query.lineReward = rewardStatus;
    res.redirect(302, withQuery(destination, query));
  } catch (err) {
    console.error("[LINE OAuth] callback failed", err);
    clearStateCookie();
    res.status(500).send("LINE \u767B\u5165\u5931\u6557\uFF0C\u8ACB\u7A0D\u5F8C\u518D\u8A66\u3002");
  }
}
function withQuery(path2, params) {
  if (Object.keys(params).length === 0) return path2;
  const url = new URL(path2, "https://placeholder.local");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return `${url.pathname}${url.search}${url.hash}`;
}
async function tryGrantLineFriendReward(opts) {
  try {
    const offer = await getLineFriendRewardOffer();
    if (!offer) return null;
    if (await getLineFriendRewardForUser(opts.userId)) return "already";
    const friendship = await checkLineFriendship({
      lineUserId: opts.lineUserId,
      loginAccessToken: opts.loginAccessToken
    });
    if (friendship.status === "not_friend") return "not_friend";
    if (friendship.status !== "friend") return "unavailable";
    const result = await grantLineFriendReward({ userId: opts.userId, lineUserId: opts.lineUserId });
    return result.status === "disabled" ? null : result.status;
  } catch (error) {
    console.error("[LINE OAuth] friend reward failed", error);
    return "unavailable";
  }
}
function registerLineOAuthRoutes(app2) {
  app2.get("/api/trpc/line-oauth-start", lineOAuthStart);
  app2.get("/api/trpc/line-oauth-callback", lineOAuthCallback);
}

// server/lineWebhookRoutes.ts
import express from "express";
import * as crypto9 from "node:crypto";
function getMessagingChannelSecret() {
  return process.env.LINE_MESSAGING_CHANNEL_SECRET?.trim() || process.env.LINE_WEBHOOK_CHANNEL_SECRET?.trim();
}
function timingSafeEqualString(a, b) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return crypto9.timingSafeEqual(aBuffer, bBuffer);
}
function verifyLineSignature(rawBody, signature, channelSecret) {
  const expected = crypto9.createHmac("sha256", channelSecret).update(rawBody).digest("base64");
  return timingSafeEqualString(expected, signature);
}
function parseLineWebhookBody(rawBody) {
  if (rawBody.length === 0) return {};
  const parsed = JSON.parse(rawBody.toString("utf8"));
  if (!parsed || typeof parsed !== "object") return {};
  return parsed;
}
function lineWebhookHandler(req, res) {
  const channelSecret = getMessagingChannelSecret();
  if (!channelSecret) {
    res.status(503).json({
      ok: false,
      error: "LINE_MESSAGING_CHANNEL_SECRET is not configured"
    });
    return;
  }
  const signature = req.get("x-line-signature") || "";
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");
  if (!signature || !verifyLineSignature(rawBody, signature, channelSecret)) {
    res.status(401).json({ ok: false, error: "invalid LINE signature" });
    return;
  }
  try {
    const body = parseLineWebhookBody(rawBody);
    const events = Array.isArray(body.events) ? body.events : [];
    for (const event of events) {
      console.info("[LINE Webhook] event received", {
        type: event.type,
        sourceType: event.source?.type,
        userId: event.source?.userId,
        timestamp: event.timestamp
      });
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[LINE Webhook] failed to parse body", err);
    res.status(400).json({ ok: false, error: "invalid webhook body" });
  }
}
function registerLineWebhookRoutes(app2) {
  app2.get(["/api/line/webhook", "/api/trpc/line-webhook"], (_req, res) => {
    res.json({
      ok: true,
      endpoint: "LINE Messaging API webhook",
      configured: Boolean(getMessagingChannelSecret())
    });
  });
  app2.post(
    ["/api/line/webhook", "/api/trpc/line-webhook"],
    express.raw({ type: "application/json", limit: "2mb" }),
    lineWebhookHandler
  );
}

// server/_core/httpSecurity.ts
function setSecurityHeaders(_req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
}
function requestOrigin(req) {
  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto || req.protocol;
  const host = (req.get("x-forwarded-host") || req.get("host") || "").trim();
  return host ? `${protocol}://${host}` : null;
}
function enforceTrustedOrigin(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("origin");
  if (!origin) return next();
  const configured = process.env.SITE_URL?.trim().replace(/\/$/, "");
  const allowed = new Set([configured, requestOrigin(req)].filter((value) => Boolean(value)));
  if (allowed.has(origin.replace(/\/$/, ""))) return next();
  res.status(403).json({ error: { code: "INVALID_ORIGIN", message: "\u4E0D\u5141\u8A31\u7684\u8ACB\u6C42\u4F86\u6E90" } });
}
function publicServerError(err) {
  if (process.env.NODE_ENV === "development") {
    return err instanceof Error ? err.stack || err.message : String(err);
  }
  return "Internal Server Error";
}

// server/_entry/trpcHandler.ts
var app = express2();
app.use(setSecurityHeaders);
registerLineWebhookRoutes(app);
app.use(express2.json({ limit: "10mb" }));
app.use(express2.urlencoded({ limit: "10mb", extended: true }));
app.get(["/api/trpc/ping", "/ping"], (_req, res) => {
  res.json({ ok: true, at: (/* @__PURE__ */ new Date()).toISOString() });
});
registerLineOAuthRoutes(app);
app.use(enforceTrustedOrigin);
app.use(
  createExpressMiddleware({
    router: appRouter,
    createContext,
    onError: logTrpcError
  })
);
app.use((req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", path: req.url } });
});
app.use(
  (err, _req, res, _next) => {
    const message = publicServerError(err);
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
    const message = publicServerError(err);
    console.error("[api/trpc] handler threw:", err);
    writeJson(res, 500, { error: { code: "HANDLER_THREW", message } });
  }
}
export {
  handler as default
};
