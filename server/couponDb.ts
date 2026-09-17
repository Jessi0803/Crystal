/**
 * 會員專屬優惠券
 *
 * 生命週期（memberCoupons.status）：
 * - available：可使用
 * - reserved：已套用在待付款訂單（建立訂單時以條件式 UPDATE 取得，避免同一張券同時被兩筆訂單使用）
 * - used：訂單付款成功（僅對 reserved 且 orderId 相符的券生效，重複的付款通知不會重複核銷）
 *
 * 付款失敗、訂單取消、刪除訂單時退回 available。
 * 信用卡／PayPal 訂單保留超過 COUPON_RESERVATION_TTL_MS 仍未付款，會員可把券用在新訂單。
 */
import { and, count, desc, eq, gt, inArray, isNull, lt, or, sql } from "drizzle-orm";
import {
  couponTemplates,
  lineFriendRewards,
  memberCoupons,
  orderItems,
  orders,
  siteSettings,
  users,
  type CouponTemplate,
  type MemberCoupon,
} from "../drizzle/schema";
import {
  COUPON_DISCOUNT_PRODUCT_ID,
  COUPON_RESERVATION_TTL_MS,
  getMemberCouponDisplayStatus,
  type CouponSource,
  type MemberCouponDisplayStatus,
} from "@shared/coupons";
import { getDb } from "./db";
import { recordAuditEventSafely } from "./auditDb";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export type CouponErrorCode = "NOT_FOUND" | "INACTIVE" | "LIMIT_REACHED" | "EXPIRED" | "UNAVAILABLE";

export class CouponError extends Error {
  constructor(
    public readonly code: CouponErrorCode,
    message: string
  ) {
    super(message);
    this.name = "CouponError";
  }
}

const LINE_REWARD_ENABLED_KEY = "lineFriendRewardEnabled";
const LINE_REWARD_TEMPLATE_KEY = "lineFriendRewardTemplateId";
const RESERVABLE_PAYMENT_METHODS = ["credit", "paypal"] as const;
const DAY_MS = 24 * 60 * 60 * 1000;

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db;
}

function getAffectedRows(result: unknown) {
  const candidate = Array.isArray(result) ? result[0] : result;
  if (!candidate || typeof candidate !== "object") return 0;
  const affectedRows = (candidate as { affectedRows?: unknown }).affectedRows;
  return typeof affectedRows === "number" ? affectedRows : 0;
}

/** 與 drizzle timestamp 欄位相同的 UTC 字串格式，供 raw SQL 使用 */
function toDbTimestamp(date: Date) {
  return date.toISOString().slice(0, -1).replace("T", " ");
}

/** timestamp 欄位只存到秒，寫入前去掉毫秒，之後才能用等值比對 */
function nowInSeconds() {
  return new Date(Math.floor(Date.now() / 1000) * 1000);
}

function isDuplicateKeyError(error: unknown): boolean {
  for (let current: unknown = error, depth = 0; current && depth < 4; depth++) {
    const candidate = current as { code?: unknown; errno?: unknown; message?: unknown; cause?: unknown };
    if (candidate.code === "ER_DUP_ENTRY" || candidate.errno === 1062) return true;
    if (typeof candidate.message === "string" && candidate.message.includes("Duplicate entry")) return true;
    current = candidate.cause;
  }
  return false;
}

// 待付款訂單的保留可以被釋放：沒有關聯訂單，或關聯訂單仍是未付款的信用卡／PayPal 訂單
const reservationOrderReleasableSql = sql`(
  ${memberCoupons.orderId} IS NULL OR NOT EXISTS (
    SELECT 1 FROM \`orders\` o
    WHERE o.\`id\` = ${memberCoupons.orderId}
      AND (o.\`paymentStatus\` <> 'pending' OR o.\`paymentMethod\` NOT IN ('credit', 'paypal'))
  )
)`;

export function isReservationReleasable(
  coupon: Pick<MemberCoupon, "status" | "reservedAt" | "orderId">,
  order: { paymentStatus: string | null; paymentMethod: string | null } | null,
  now = new Date()
) {
  if (coupon.status !== "reserved") return false;
  if (coupon.reservedAt && coupon.reservedAt.getTime() > now.getTime() - COUPON_RESERVATION_TTL_MS) return false;
  if (coupon.orderId == null || !order) return true;
  return (
    order.paymentStatus === "pending" &&
    RESERVABLE_PAYMENT_METHODS.includes(order.paymentMethod as (typeof RESERVABLE_PAYMENT_METHODS)[number])
  );
}

export function computeCouponExpiresAt(
  template: Pick<CouponTemplate, "validityType" | "validDays" | "fixedExpiresAt">,
  issuedAt: Date
): Date | null {
  if (template.validityType === "fixed_date") return template.fixedExpiresAt ?? null;
  if (!template.validDays || template.validDays < 1) return null;
  return new Date(issuedAt.getTime() + template.validDays * DAY_MS);
}

// ─── 模板 ───────────────────────────────────────────────────────────────────

export type CouponTemplateInput = {
  name: string;
  discountAmount: number;
  minOrderAmount: number;
  validityType: "days_after_issue" | "fixed_date";
  validDays: number | null;
  fixedExpiresAt: Date | null;
  maxPerUser: number;
  isActive: boolean;
};

function normalizeTemplateInput(input: CouponTemplateInput) {
  return {
    name: input.name,
    discountAmount: input.discountAmount,
    minOrderAmount: input.minOrderAmount,
    validityType: input.validityType,
    validDays: input.validityType === "days_after_issue" ? input.validDays : null,
    fixedExpiresAt: input.validityType === "fixed_date" ? input.fixedExpiresAt : null,
    maxPerUser: input.maxPerUser,
    isActive: input.isActive,
  };
}

export async function createCouponTemplate(input: CouponTemplateInput) {
  const db = await requireDb();
  const [created] = await db.insert(couponTemplates).values(normalizeTemplateInput(input)).$returningId();
  return getCouponTemplate(created.id);
}

export async function updateCouponTemplate(id: number, input: CouponTemplateInput) {
  const db = await requireDb();
  const existing = await getCouponTemplate(id);
  if (!existing) throw new CouponError("NOT_FOUND", "找不到優惠券");
  // 只更新模板本身；已發出的 memberCoupons 保留發放當下的 snapshot
  await db.update(couponTemplates).set(normalizeTemplateInput(input)).where(eq(couponTemplates.id, id));
  return getCouponTemplate(id);
}

export async function getCouponTemplate(id: number) {
  const db = await requireDb();
  const [template] = await db.select().from(couponTemplates).where(eq(couponTemplates.id, id)).limit(1);
  return template ?? null;
}

export async function listActiveCouponTemplates() {
  const db = await requireDb();
  return db
    .select()
    .from(couponTemplates)
    .where(eq(couponTemplates.isActive, true))
    .orderBy(desc(couponTemplates.createdAt));
}

function couponStatsSelect(now: Date) {
  const nowSql = toDbTimestamp(now);
  return {
    issued: sql<number>`CAST(COUNT(*) AS SIGNED)`,
    used: sql<number>`CAST(COALESCE(SUM(CASE WHEN ${memberCoupons.status} = 'used' THEN 1 ELSE 0 END), 0) AS SIGNED)`,
    reserved: sql<number>`CAST(COALESCE(SUM(CASE WHEN ${memberCoupons.status} = 'reserved' THEN 1 ELSE 0 END), 0) AS SIGNED)`,
    expired: sql<number>`CAST(COALESCE(SUM(CASE WHEN ${memberCoupons.status} = 'available' AND ${memberCoupons.expiresAt} <= ${nowSql} THEN 1 ELSE 0 END), 0) AS SIGNED)`,
    unused: sql<number>`CAST(COALESCE(SUM(CASE WHEN ${memberCoupons.status} = 'available' AND ${memberCoupons.expiresAt} > ${nowSql} THEN 1 ELSE 0 END), 0) AS SIGNED)`,
  };
}

function normalizeStats(row?: { issued: unknown; used: unknown; reserved: unknown; expired: unknown; unused: unknown }) {
  return {
    issued: Number(row?.issued ?? 0),
    used: Number(row?.used ?? 0),
    reserved: Number(row?.reserved ?? 0),
    expired: Number(row?.expired ?? 0),
    unused: Number(row?.unused ?? 0),
  };
}

export async function listCouponTemplatesWithStats(now = new Date()) {
  const db = await requireDb();
  const templates = await db.select().from(couponTemplates).orderBy(desc(couponTemplates.createdAt));
  const stats = await db
    .select({ templateId: memberCoupons.couponTemplateId, ...couponStatsSelect(now) })
    .from(memberCoupons)
    .groupBy(memberCoupons.couponTemplateId);
  const statsByTemplate = new Map(stats.map((row) => [row.templateId, normalizeStats(row)]));
  return templates.map((template) => ({
    ...template,
    stats: statsByTemplate.get(template.id) ?? normalizeStats(),
  }));
}

export async function getCouponTemplateDetail(id: number, now = new Date()) {
  const db = await requireDb();
  const template = await getCouponTemplate(id);
  if (!template) return null;

  const [statsRow] = await db
    .select(couponStatsSelect(now))
    .from(memberCoupons)
    .where(eq(memberCoupons.couponTemplateId, id));

  const rows = await db
    .select({
      coupon: memberCoupons,
      userName: users.name,
      userEmail: users.email,
      orderMerchantTradeNo: orders.merchantTradeNo,
      orderPaymentStatus: orders.paymentStatus,
      orderPaymentMethod: orders.paymentMethod,
    })
    .from(memberCoupons)
    .leftJoin(users, eq(users.id, memberCoupons.userId))
    .leftJoin(orders, eq(orders.id, memberCoupons.orderId))
    .where(eq(memberCoupons.couponTemplateId, id))
    .orderBy(desc(memberCoupons.issuedAt))
    .limit(500);

  return {
    template,
    stats: normalizeStats(statsRow),
    records: rows.map((row) => ({
      ...toMemberCouponView(row.coupon, orderFromRow(row), now),
      userName: row.userName,
      userEmail: row.userEmail,
    })),
  };
}

// ─── 發放 ───────────────────────────────────────────────────────────────────

export async function issueCouponInTx(
  tx: Tx,
  opts: { templateId: number; userId: number; source: CouponSource; issuedByUserId?: number | null }
): Promise<MemberCoupon> {
  // 鎖住模板列，讓同一模板的發放依序進行，每位會員的領取上限才不會被並行請求突破
  const [template] = await tx
    .select()
    .from(couponTemplates)
    .where(eq(couponTemplates.id, opts.templateId))
    .limit(1)
    .for("update");
  if (!template) throw new CouponError("NOT_FOUND", "找不到優惠券");
  if (!template.isActive) throw new CouponError("INACTIVE", "此優惠券已停用，無法發放");

  const issuedAt = nowInSeconds();
  const expiresAt = computeCouponExpiresAt(template, issuedAt);
  if (!expiresAt || expiresAt.getTime() <= issuedAt.getTime()) {
    throw new CouponError("EXPIRED", "此優惠券已超過截止日期，無法發放");
  }

  const [{ issuedCount }] = await tx
    .select({ issuedCount: count() })
    .from(memberCoupons)
    .where(and(eq(memberCoupons.couponTemplateId, template.id), eq(memberCoupons.userId, opts.userId)));
  if (issuedCount >= template.maxPerUser) {
    throw new CouponError("LIMIT_REACHED", `此會員已達這張優惠券的領取上限（${template.maxPerUser} 張）`);
  }

  const [created] = await tx
    .insert(memberCoupons)
    .values({
      couponTemplateId: template.id,
      userId: opts.userId,
      name: template.name,
      discountAmount: template.discountAmount,
      minOrderAmount: template.minOrderAmount,
      issuedAt,
      expiresAt,
      status: "available",
      source: opts.source,
      issuedByUserId: opts.issuedByUserId ?? null,
    })
    .$returningId();

  const [coupon] = await tx.select().from(memberCoupons).where(eq(memberCoupons.id, created.id)).limit(1);
  return coupon;
}

export async function issueCoupon(opts: {
  templateId: number;
  userId: number;
  source: CouponSource;
  issuedByUserId?: number | null;
}) {
  const db = await requireDb();
  return db.transaction((tx) => issueCouponInTx(tx, opts));
}

// ─── 會員持有的券 ───────────────────────────────────────────────────────────

type CouponOrder = {
  merchantTradeNo: string | null;
  paymentStatus: string | null;
  paymentMethod: string | null;
} | null;

function orderFromRow(row: {
  orderMerchantTradeNo: string | null;
  orderPaymentStatus: string | null;
  orderPaymentMethod: string | null;
}): CouponOrder {
  if (!row.orderMerchantTradeNo) return null;
  return {
    merchantTradeNo: row.orderMerchantTradeNo,
    paymentStatus: row.orderPaymentStatus,
    paymentMethod: row.orderPaymentMethod,
  };
}

export type MemberCouponView = {
  id: number;
  couponTemplateId: number;
  userId: number;
  name: string;
  discountAmount: number;
  minOrderAmount: number;
  issuedAt: Date;
  expiresAt: Date;
  usedAt: Date | null;
  source: string;
  displayStatus: MemberCouponDisplayStatus;
  orderMerchantTradeNo: string | null;
};

function toMemberCouponView(coupon: MemberCoupon, order: CouponOrder, now: Date): MemberCouponView {
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
    orderMerchantTradeNo: displayStatus === "available" ? null : order?.merchantTradeNo ?? null,
  };
}

export async function listMemberCoupons(userId: number, now = new Date()): Promise<MemberCouponView[]> {
  const db = await requireDb();
  const rows = await db
    .select({
      coupon: memberCoupons,
      orderMerchantTradeNo: orders.merchantTradeNo,
      orderPaymentStatus: orders.paymentStatus,
      orderPaymentMethod: orders.paymentMethod,
    })
    .from(memberCoupons)
    .leftJoin(orders, eq(orders.id, memberCoupons.orderId))
    .where(eq(memberCoupons.userId, userId))
    .orderBy(desc(memberCoupons.issuedAt));
  return rows.map((row) => toMemberCouponView(row.coupon, orderFromRow(row), now));
}

// ─── 結帳：驗證、保留、核銷、退回 ───────────────────────────────────────────

/** 由伺服器重新查詢並檢查：存在、屬於本人、未使用、未被其他待付款訂單保留、未過期 */
export async function getCouponForCheckout(memberCouponId: number, userId: number, now = new Date()) {
  const db = await requireDb();
  const [row] = await db
    .select({
      coupon: memberCoupons,
      orderMerchantTradeNo: orders.merchantTradeNo,
      orderPaymentStatus: orders.paymentStatus,
      orderPaymentMethod: orders.paymentMethod,
    })
    .from(memberCoupons)
    .leftJoin(orders, eq(orders.id, memberCoupons.orderId))
    .where(eq(memberCoupons.id, memberCouponId))
    .limit(1);

  if (!row || row.coupon.userId !== userId) {
    throw new CouponError("NOT_FOUND", "找不到這張優惠券");
  }
  const view = toMemberCouponView(row.coupon, orderFromRow(row), now);
  if (view.displayStatus === "used") throw new CouponError("UNAVAILABLE", "這張優惠券已使用");
  if (view.displayStatus === "pending") {
    throw new CouponError("UNAVAILABLE", "這張優惠券已套用在另一筆待付款訂單，請完成付款或 30 分鐘後再試");
  }
  if (view.displayStatus === "expired") throw new CouponError("EXPIRED", "這張優惠券已過期");
  return row.coupon;
}

/**
 * 以單一條件式 UPDATE 取得優惠券；並行的兩個請求只有一個會成功。
 * 回傳保留時間（用於後續綁定訂單），失敗回傳 null。
 */
export async function reserveCoupon(memberCouponId: number, userId: number): Promise<Date | null> {
  const db = await requireDb();
  const reservedAt = nowInSeconds();
  const cutoff = new Date(reservedAt.getTime() - COUPON_RESERVATION_TTL_MS);

  const [previous] = await db
    .select({ status: memberCoupons.status, orderId: memberCoupons.orderId })
    .from(memberCoupons)
    .where(eq(memberCoupons.id, memberCouponId))
    .limit(1);

  const result = await db
    .update(memberCoupons)
    .set({ status: "reserved", orderId: null, reservedAt, usedAt: null })
    .where(
      and(
        eq(memberCoupons.id, memberCouponId),
        eq(memberCoupons.userId, userId),
        gt(memberCoupons.expiresAt, reservedAt),
        or(
          eq(memberCoupons.status, "available"),
          and(
            eq(memberCoupons.status, "reserved"),
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
      summary: "待付款訂單逾時，優惠券改用於新訂單",
      details: { memberCouponId, previousOrderId: previous.orderId },
    });
  }
  return reservedAt;
}

export async function attachReservedCouponToOrder(memberCouponId: number, reservedAt: Date, orderId: number) {
  const db = await requireDb();
  const result = await db
    .update(memberCoupons)
    .set({ orderId })
    .where(
      and(
        eq(memberCoupons.id, memberCouponId),
        eq(memberCoupons.status, "reserved"),
        eq(memberCoupons.reservedAt, reservedAt),
        isNull(memberCoupons.orderId)
      )
    );
  return getAffectedRows(result) > 0;
}

/** 建立訂單失敗時，退回剛取得但尚未綁定訂單的保留 */
export async function cancelCouponReservation(memberCouponId: number, reservedAt: Date) {
  const db = await requireDb();
  await db
    .update(memberCoupons)
    .set({ status: "available", reservedAt: null })
    .where(
      and(
        eq(memberCoupons.id, memberCouponId),
        eq(memberCoupons.status, "reserved"),
        eq(memberCoupons.reservedAt, reservedAt),
        isNull(memberCoupons.orderId)
      )
    );
}

/** 訂單付款成功：reserved → used。重複呼叫不會有副作用。 */
export async function markCouponUsedForOrder(orderId: number, context: { merchantTradeNo?: string | null } = {}) {
  const db = await requireDb();
  const result = await db
    .update(memberCoupons)
    .set({ status: "used", usedAt: nowInSeconds() })
    .where(and(eq(memberCoupons.orderId, orderId), eq(memberCoupons.status, "reserved")));
  const affected = getAffectedRows(result);
  if (affected > 0) return affected;

  // 訂單有折抵但找不到對應的保留：券已被逾時改用或已退回，需要人工確認
  const [discountRow] = await db
    .select({ id: orderItems.id })
    .from(orderItems)
    .where(and(eq(orderItems.orderId, orderId), eq(orderItems.productId, COUPON_DISCOUNT_PRODUCT_ID)))
    .limit(1);
  if (!discountRow) return 0;
  const [usedCoupon] = await db
    .select({ id: memberCoupons.id })
    .from(memberCoupons)
    .where(and(eq(memberCoupons.orderId, orderId), eq(memberCoupons.status, "used")))
    .limit(1);
  if (!usedCoupon) {
    await recordAuditEventSafely({
      source: "coupon",
      category: "coupon",
      action: "coupon.use.missing_reservation",
      outcome: "failed",
      severity: "error",
      orderId,
      merchantTradeNo: context.merchantTradeNo ?? null,
      summary: "訂單已付款並折抵優惠券，但該券已被其他訂單使用或已退回，請人工確認",
    });
  }
  return 0;
}

/**
 * 付款失敗、訂單取消、刪除訂單時退回優惠券。
 * includeUsed：已付款訂單取消時也退回（依目前商業規則，取消一律退回）。
 */
export async function releaseCouponsForOrders(
  orderIds: number[],
  opts: { includeUsed: boolean; reason: string; actorUserId?: number | null }
) {
  if (orderIds.length === 0) return 0;
  const db = await requireDb();
  const statuses: ("reserved" | "used")[] = opts.includeUsed ? ["reserved", "used"] : ["reserved"];
  const affectedCoupons = await db
    .select({ id: memberCoupons.id, orderId: memberCoupons.orderId, status: memberCoupons.status })
    .from(memberCoupons)
    .where(and(inArray(memberCoupons.orderId, orderIds), inArray(memberCoupons.status, statuses)));
  if (affectedCoupons.length === 0) return 0;

  const result = await db
    .update(memberCoupons)
    .set({ status: "available", orderId: null, reservedAt: null, usedAt: null })
    .where(and(inArray(memberCoupons.orderId, orderIds), inArray(memberCoupons.status, statuses)));

  await recordAuditEventSafely({
    source: "coupon",
    category: "coupon",
    action: "coupon.release",
    outcome: "success",
    orderId: orderIds.length === 1 ? orderIds[0] : null,
    actorUserId: opts.actorUserId ?? null,
    summary: `已退回 ${getAffectedRows(result)} 張優惠券（${opts.reason}）`,
    details: { orderIds, coupons: affectedCoupons },
  });
  return getAffectedRows(result);
}

/**
 * 付款回呼、取消、刪除訂單時使用：優惠券處理失敗不可中斷原本的付款／訂單流程，
 * 改記錄錯誤事件供人工處理。
 */
export async function markCouponUsedForOrderSafely(orderId: number, context: { merchantTradeNo?: string | null } = {}) {
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
      summary: "訂單已付款，但優惠券核銷失敗，請人工確認",
      details: { error: error instanceof Error ? error.message : String(error) },
    });
    return null;
  }
}

export async function releaseCouponsForOrdersSafely(
  orderIds: number[],
  opts: { includeUsed: boolean; reason: string; actorUserId?: number | null }
) {
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
      summary: `優惠券退回失敗（${opts.reason}），請人工確認`,
      details: { orderIds, error: error instanceof Error ? error.message : String(error) },
    });
    return null;
  }
}

// ─── LINE 好友綁定禮 ─────────────────────────────────────────────────────────

async function getSetting(db: Db, key: string) {
  const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, key)).limit(1);
  return row?.value ?? null;
}

export async function getLineFriendRewardSettings() {
  const db = await requireDb();
  const [enabled, templateId] = await Promise.all([
    getSetting(db, LINE_REWARD_ENABLED_KEY),
    getSetting(db, LINE_REWARD_TEMPLATE_KEY),
  ]);
  const parsedTemplateId = templateId ? Number(templateId) : null;
  return {
    enabled: enabled === "true",
    templateId: parsedTemplateId && Number.isInteger(parsedTemplateId) ? parsedTemplateId : null,
  };
}

export async function saveLineFriendRewardSettings(input: { enabled: boolean; templateId: number | null }) {
  const db = await requireDb();
  if (input.enabled) {
    if (!input.templateId) throw new CouponError("NOT_FOUND", "請選擇好友綁定後要贈送的優惠券");
    const template = await getCouponTemplate(input.templateId);
    if (!template) throw new CouponError("NOT_FOUND", "找不到優惠券");
    if (!template.isActive) throw new CouponError("INACTIVE", "請選擇啟用中的優惠券");
  }
  const values = [
    { key: LINE_REWARD_ENABLED_KEY, value: String(input.enabled) },
    { key: LINE_REWARD_TEMPLATE_KEY, value: input.templateId ? String(input.templateId) : "" },
  ];
  for (const value of values) {
    await db.insert(siteSettings).values(value).onDuplicateKeyUpdate({ set: { value: value.value } });
  }
  return getLineFriendRewardSettings();
}

/** 前台顯示用：目前是否有可領取的好友禮 */
export async function getLineFriendRewardOffer() {
  const settings = await getLineFriendRewardSettings();
  if (!settings.enabled || !settings.templateId) return null;
  const template = await getCouponTemplate(settings.templateId);
  if (!template || !template.isActive) return null;
  return {
    name: template.name,
    discountAmount: template.discountAmount,
    minOrderAmount: template.minOrderAmount,
  };
}

export async function getLineFriendRewardForUser(userId: number) {
  const db = await requireDb();
  const [reward] = await db.select().from(lineFriendRewards).where(eq(lineFriendRewards.userId, userId)).limit(1);
  return reward ?? null;
}

export type LineFriendRewardResult =
  | { status: "granted"; coupon: MemberCoupon }
  | { status: "already" }
  | { status: "disabled" }
  | { status: "unavailable"; message: string };

/**
 * 發放 LINE 好友禮。呼叫前必須由伺服器向 LINE 確認好友狀態。
 * 先寫入 lineFriendRewards（userId、lineUserId 皆 UNIQUE）再發券，兩者同一個 transaction：
 * 重複請求、並行請求、解除後重新綁定、同一個 LINE 換會員綁定，都只會成功一次。
 */
export async function grantLineFriendReward(opts: { userId: number; lineUserId: string }): Promise<LineFriendRewardResult> {
  const db = await requireDb();
  const settings = await getLineFriendRewardSettings();
  if (!settings.enabled || !settings.templateId) return { status: "disabled" };
  const templateId = settings.templateId;

  const [existing] = await db
    .select({ id: lineFriendRewards.id })
    .from(lineFriendRewards)
    .where(or(eq(lineFriendRewards.userId, opts.userId), eq(lineFriendRewards.lineUserId, opts.lineUserId)))
    .limit(1);
  if (existing) return { status: "already" };

  try {
    const result = await db.transaction(async (tx): Promise<LineFriendRewardResult> => {
      await tx.insert(lineFriendRewards).values({
        userId: opts.userId,
        lineUserId: opts.lineUserId,
        couponTemplateId: templateId,
      });
      let coupon: MemberCoupon;
      try {
        coupon = await issueCouponInTx(tx, { templateId, userId: opts.userId, source: "LINE_FRIEND" });
      } catch (error) {
        // 會員已持有這張券（例如管理員先人工發過）：視為已領取，保留領取紀錄
        if (error instanceof CouponError && error.code === "LIMIT_REACHED") return { status: "already" };
        throw error;
      }
      await tx
        .update(lineFriendRewards)
        .set({ memberCouponId: coupon.id })
        .where(eq(lineFriendRewards.userId, opts.userId));
      return { status: "granted", coupon };
    });

    await recordAuditEventSafely({
      source: "line",
      category: "coupon",
      action: "coupon.line_friend_reward",
      outcome: result.status === "granted" ? "success" : "duplicate",
      actorUserId: opts.userId,
      summary: result.status === "granted" ? "LINE 好友禮已發放" : "會員已持有 LINE 好友禮優惠券，未重複發放",
      details: {
        userId: opts.userId,
        templateId,
        memberCouponId: result.status === "granted" ? result.coupon.id : null,
      },
    });
    return result;
  } catch (error) {
    if (isDuplicateKeyError(error)) return { status: "already" };
    if (error instanceof CouponError) return { status: "unavailable", message: error.message };
    throw error;
  }
}
