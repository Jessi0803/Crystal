/**
 * 商品顧客回饋
 *
 * 第一階段只有後台人工建立（source=admin，userId / orderItemId 恆為 null）。
 * 第二階段顧客投稿沿用同一張表，差別只在 source=customer 並從 pending 起算。
 *
 * 兩個刻意的設計：
 * - productName 是建立／改綁商品時寫入的快照。商品之後被硬刪，回饋仍保留為歷史資料，
 *   後台也還看得出它原本屬於哪個商品（同 orderItems.productName 的做法）。
 * - 商品已不存在的回饋可以查看、編輯、隱藏、刪除，但不能 published、不能設為首頁精選；
 *   要重新上架必須先改綁到目前存在的商品。
 */
import { and, avg, count, desc, eq, inArray } from "drizzle-orm";
import { dbProducts, orderItems, orders, productReviews, type ProductReview } from "../drizzle/schema";
import { getDb } from "./db";
import { CUSTOM_PRODUCT_IDS } from "@shared/const";
import { NON_PRODUCT_ORDER_ITEM_IDS } from "@shared/coupons";
import { isOrderOwnedByMember, type MemberIdentity } from "./memberOrderAccess";
import { resolveReviewDisplayName } from "./reviewDisplayName";

export const REVIEW_STATUSES = ["pending", "published", "hidden"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const REVIEW_MAX_IMAGES = 3;
export const REVIEW_CONTENT_MAX_LENGTH = 2000;
export const REVIEW_DISPLAY_NAME_MAX_LENGTH = 50;

/** 只有這些訂單狀態代表商品已經實際到顧客手上 */
export const REVIEWABLE_ORDER_STATUSES = ["completed", "picked_up"] as const;
/** 付款失敗或取消的訂單不得評價 */
export const BLOCKED_PAYMENT_STATUSES = ["failed", "cancelled"] as const;

/** 會員端看到的評價狀態；由訂單 + 回饋推算，不存 DB */
export type ReviewItemState = "not_eligible" | "available" | "pending" | "published" | "hidden";

export type ReviewErrorCode =
  | "NOT_FOUND"
  | "PRODUCT_NOT_FOUND"
  | "PRODUCT_MISSING"
  | "NOT_ELIGIBLE"
  | "ALREADY_REVIEWED"
  | "FORBIDDEN"
  | "INVALID_FEATURED";

export class ReviewError extends Error {
  constructor(
    public readonly code: ReviewErrorCode,
    message: string
  ) {
    super(message);
    this.name = "ReviewError";
  }
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db;
}

export type ReviewInput = {
  productId: string;
  displayName: string;
  rating: number;
  content: string;
  images: string[];
  status: ReviewStatus;
  isFeatured: boolean;
  sortOrder: number;
};

/** 商品頁看得到的欄位；userId / orderItemId / source / status 等內部欄位一律不出前台 */
export type PublicReview = {
  id: number;
  displayName: string;
  rating: number;
  content: string;
  images: string[];
  createdAt: Date;
  /** 由伺服器計算：來自顧客投稿且綁得到訂單明細才是 true */
  verifiedPurchase: boolean;
};

export type AdminReview = ProductReview & {
  images: string[];
  /** 綁定的商品目前是否還存在；false 代表商品已被刪除 */
  productExists: boolean;
};

/** images 欄位允許 null（舊資料）與非陣列（手動改壞），一律收斂成字串陣列 */
export function normalizeReviewImages(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

/**
 * publishedAt 只記錄「第一次上架」的時間：
 * 已經有值就不覆寫，之後隱藏再上架都維持原本的時間。
 */
export function resolvePublishedAt(current: Date | null, nextStatus: ReviewStatus, now = new Date()) {
  if (current) return current;
  return nextStatus === "published" ? now : null;
}

/**
 * 「已購買」只有系統驗證過的顧客投稿才成立。
 * 第一階段後台人工建立的回饋沒有購買驗證，不能掛這個標示。
 */
export function isVerifiedPurchase(row: Pick<ProductReview, "source" | "orderItemId">) {
  return row.source === "customer" && row.orderItemId != null;
}

export function toPublicReview(row: ProductReview): PublicReview {
  return {
    id: row.id,
    displayName: row.displayName,
    rating: row.rating,
    content: row.content,
    images: normalizeReviewImages(row.images),
    createdAt: row.createdAt,
    verifiedPurchase: isVerifiedPurchase(row),
  };
}

/** sortOrder 小的在前，同序再以建立時間新的在前 */
export function compareReviews(a: Pick<ProductReview, "sortOrder" | "createdAt">, b: Pick<ProductReview, "sortOrder" | "createdAt">) {
  return a.sortOrder - b.sortOrder || b.createdAt.getTime() - a.createdAt.getTime();
}

async function findProduct(db: Awaited<ReturnType<typeof requireDb>>, productId: string) {
  const rows = await db
    .select({ id: dbProducts.id, name: dbProducts.name })
    .from(dbProducts)
    .where(eq(dbProducts.id, productId))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * 商品頁用：只回 published。
 *
 * 查詢失敗時回空陣列讓商品頁照常顯示，但一定要留下 log —— 這是防護，
 * 不是「application 可以早於 migration 部署」的理由。
 */
export async function listPublishedReviews(productId: string): Promise<PublicReview[]> {
  try {
    const db = await getDb();
    if (!db) return [];
    const rows = await db
      .select()
      .from(productReviews)
      .where(and(eq(productReviews.productId, productId), eq(productReviews.status, "published")));
    return rows.sort(compareReviews).map(toPublicReview);
  } catch (error) {
    console.error("[reviews.listByProduct]", error);
    return [];
  }
}

/** 後台用：回全部狀態，並標記綁定的商品是否還存在 */
export async function listAdminReviews(filter: { productId?: string } = {}): Promise<AdminReview[]> {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(productReviews)
    .where(filter.productId ? eq(productReviews.productId, filter.productId) : undefined)
    .orderBy(desc(productReviews.createdAt));

  const productIds = Array.from(new Set(rows.map((row) => row.productId)));
  const existing = productIds.length
    ? await db.select({ id: dbProducts.id }).from(dbProducts).where(inArray(dbProducts.id, productIds))
    : [];
  const existingIds = new Set(existing.map((product) => product.id));

  return rows
    .sort(compareReviews)
    .map((row) => ({
      ...row,
      images: normalizeReviewImages(row.images),
      productExists: existingIds.has(row.productId),
    }));
}

export async function getAdminReview(id: number): Promise<AdminReview> {
  const db = await requireDb();
  const rows = await db.select().from(productReviews).where(eq(productReviews.id, id)).limit(1);
  const row = rows[0];
  if (!row) throw new ReviewError("NOT_FOUND", "找不到這則回饋");
  const product = await findProduct(db, row.productId);
  return { ...row, images: normalizeReviewImages(row.images), productExists: Boolean(product) };
}

/** 商品不存在時不允許上架或設為首頁精選 */
function assertPublishableWithoutProduct(input: Pick<ReviewInput, "status" | "isFeatured">) {
  if (input.status === "published") {
    throw new ReviewError("PRODUCT_MISSING", "這則回饋綁定的商品已刪除，請先改綁現有商品才能上架");
  }
  if (input.isFeatured) {
    throw new ReviewError("PRODUCT_MISSING", "這則回饋綁定的商品已刪除，無法設為首頁精選");
  }
}

/**
 * 首頁精選只能掛在「已上架而且商品還在」的回饋上。
 * 首頁未來會直接撈 isFeatured，所以這條規則一定要在伺服器端擋，不能只靠後台 UI。
 */
export function assertFeaturable(input: { status: ReviewStatus; isFeatured: boolean; productExists: boolean }) {
  if (!input.isFeatured) return;
  if (input.status !== "published") {
    throw new ReviewError("INVALID_FEATURED", "只有已上架的回饋可以設為首頁精選");
  }
  if (!input.productExists) {
    throw new ReviewError("PRODUCT_MISSING", "這則回饋綁定的商品已刪除，無法設為首頁精選");
  }
}

/** 下架或轉成待審核時，精選必須一起取消，避免首頁撈到不該公開的內容 */
export function resolveFeaturedForStatus(currentFeatured: boolean, nextStatus: ReviewStatus) {
  return nextStatus === "published" ? currentFeatured : false;
}

export async function createReview(input: ReviewInput) {
  const db = await requireDb();
  const product = await findProduct(db, input.productId);
  if (!product) throw new ReviewError("PRODUCT_NOT_FOUND", "找不到這個商品，請重新選擇");
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
    publishedAt: resolvePublishedAt(null, input.status),
  });
  return { success: true as const };
}

export async function updateReview(id: number, input: ReviewInput) {
  const db = await requireDb();
  const rows = await db.select().from(productReviews).where(eq(productReviews.id, id)).limit(1);
  const existing = rows[0];
  if (!existing) throw new ReviewError("NOT_FOUND", "找不到這則回饋");

  const product = await findProduct(db, input.productId);
  if (!product) {
    // 改綁到不存在的商品是操作錯誤；商品維持原綁定但已被刪除才走降級規則
    if (input.productId !== existing.productId) {
      throw new ReviewError("PRODUCT_NOT_FOUND", "找不到這個商品，請重新選擇");
    }
    assertPublishableWithoutProduct(input);
  }
  assertFeaturable({ status: input.status, isFeatured: input.isFeatured, productExists: Boolean(product) });

  await db
    .update(productReviews)
    .set({
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
      publishedAt: resolvePublishedAt(existing.publishedAt, input.status),
    })
    .where(eq(productReviews.id, id));
  return { success: true as const };
}

export async function setReviewStatus(id: number, status: ReviewStatus) {
  const db = await requireDb();
  const rows = await db.select().from(productReviews).where(eq(productReviews.id, id)).limit(1);
  const existing = rows[0];
  if (!existing) throw new ReviewError("NOT_FOUND", "找不到這則回饋");

  if (status === "published" && !(await findProduct(db, existing.productId))) {
    throw new ReviewError("PRODUCT_MISSING", "這則回饋綁定的商品已刪除，請先改綁現有商品才能上架");
  }

  await db
    .update(productReviews)
    .set({
      status,
      // 下架時一併取消精選，否則首頁會撈到已隱藏的回饋
      isFeatured: resolveFeaturedForStatus(existing.isFeatured, status),
      publishedAt: resolvePublishedAt(existing.publishedAt, status),
    })
    .where(eq(productReviews.id, id));
  return { success: true as const };
}

export async function removeReview(id: number) {
  const db = await requireDb();
  await db.delete(productReviews).where(eq(productReviews.id, id));
  return { success: true as const };
}

// ─── 顧客評價（第二階段） ─────────────────────────────────────────────────────

export type ReviewableOrder = {
  userId: number | null;
  buyerEmail: string;
  orderStatus: string;
  paymentStatus: string;
};

/** 訂單本身是否走到「商品已到顧客手上」且付款沒有失敗／取消 */
export function isOrderReviewable(order: Pick<ReviewableOrder, "orderStatus" | "paymentStatus">) {
  return (
    (REVIEWABLE_ORDER_STATUSES as readonly string[]).includes(order.orderStatus) &&
    !(BLOCKED_PAYMENT_STATUSES as readonly string[]).includes(order.paymentStatus)
  );
}

/**
 * 哪些訂單品項可以評價。兩種要排除，都沿用既有常數，不另外維護清單：
 * - 運費、手續費、優惠券折抵等非商品列（NON_PRODUCT_ORDER_ITEM_IDS）
 * - 客製訂金／流程入口商品（CUSTOM_PRODUCT_IDS）：它們是下單入口，不是完成品
 */
export function isReviewableProductId(productId: string) {
  if (NON_PRODUCT_ORDER_ITEM_IDS.includes(productId)) return false;
  return !CUSTOM_PRODUCT_IDS.includes(productId);
}

/**
 * 單一 orderItem 的評價狀態。純函式，資料都由呼叫端準備好，方便測試。
 * 已經有評價就直接回該評價的狀態，沒有才判斷能不能評。
 */
export function resolveReviewItemState(input: {
  order: Pick<ReviewableOrder, "orderStatus" | "paymentStatus">;
  productId: string;
  existingReview: { status: ReviewStatus } | null;
}): ReviewItemState {
  if (input.existingReview) return input.existingReview.status;
  if (!isOrderReviewable(input.order)) return "not_eligible";
  if (!isReviewableProductId(input.productId)) return "not_eligible";
  return "available";
}

export type OrderItemReviewState = {
  orderItemId: number;
  state: ReviewItemState;
  /** 已經留過評價時才有；給「查看我的評價」用 */
  review: { id: number; rating: number; content: string; images: string[] } | null;
};

/**
 * 一次取得整張訂單所有品項的評價狀態，避免每個品項各打一支 API。
 * 會自行驗證這張訂單屬於目前登入會員，不能靠知道 orderId 就查別人的訂單。
 */
export async function getOrderItemReviewStates(
  orderId: number,
  identity: MemberIdentity
): Promise<OrderItemReviewState[]> {
  const db = await requireDb();

  const [order] = await db
    .select({
      id: orders.id,
      userId: orders.userId,
      buyerEmail: orders.buyerEmail,
      orderStatus: orders.orderStatus,
      paymentStatus: orders.paymentStatus,
    })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) throw new ReviewError("NOT_FOUND", "找不到這筆訂單");
  if (!isOrderOwnedByMember(order, identity)) {
    throw new ReviewError("FORBIDDEN", "無法查看這筆訂單");
  }

  const items = await db
    .select({ id: orderItems.id, productId: orderItems.productId })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));
  if (items.length === 0) return [];

  const reviews = await db
    .select()
    .from(productReviews)
    .where(inArray(productReviews.orderItemId, items.map((item) => item.id)));
  const reviewByItemId = new Map(reviews.map((review) => [review.orderItemId, review]));

  return items.map((item) => {
    const review = reviewByItemId.get(item.id) ?? null;
    return {
      orderItemId: item.id,
      state: resolveReviewItemState({ order, productId: item.productId, existingReview: review }),
      review: review
        ? {
            id: review.id,
            rating: review.rating,
            content: review.content,
            images: normalizeReviewImages(review.images),
          }
        : null,
    };
  });
}

export type CustomerReviewInput = {
  orderItemId: number;
  rating: number;
  content: string;
  images: string[];
  anonymous: boolean;
};

/** drizzle 會把 driver 的錯誤包一層，所以要沿著 cause 往下找 */
function isDuplicateKeyError(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; current && depth < 5; depth += 1) {
    const candidate = current as { code?: string; errno?: number; message?: string; cause?: unknown };
    if (candidate.code === "ER_DUP_ENTRY" || candidate.errno === 1062) return true;
    if (typeof candidate.message === "string" && candidate.message.includes("Duplicate entry")) return true;
    current = candidate.cause;
  }
  return false;
}

/**
 * 顧客投稿。所有會影響可信度的欄位都由伺服器決定，
 * client 只能給 orderItemId / rating / content / images / anonymous。
 *
 * 商品可能早就被刪掉（正式站約兩成的 orderItem 都是如此），
 * 所以用 orderItem 的 productId / productName 快照建立，不要求商品仍存在。
 */
export async function createCustomerReview(
  input: CustomerReviewInput,
  identity: MemberIdentity,
  profile: { name?: string | null; lineDisplayName?: string | null }
) {
  const db = await requireDb();

  const [row] = await db
    .select({
      itemId: orderItems.id,
      productId: orderItems.productId,
      productName: orderItems.productName,
      orderUserId: orders.userId,
      buyerEmail: orders.buyerEmail,
      orderStatus: orders.orderStatus,
      paymentStatus: orders.paymentStatus,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(eq(orderItems.id, input.orderItemId))
    .limit(1);

  if (!row) throw new ReviewError("NOT_FOUND", "找不到這筆訂單商品");

  const order = {
    userId: row.orderUserId,
    buyerEmail: row.buyerEmail,
    orderStatus: row.orderStatus,
    paymentStatus: row.paymentStatus,
  };
  // 不是自己的訂單時回同一種錯誤，不透露這個 orderItemId 是否存在
  if (!isOrderOwnedByMember(order, identity)) {
    throw new ReviewError("FORBIDDEN", "無法評價這筆訂單商品");
  }
  if (!isOrderReviewable(order)) {
    throw new ReviewError("NOT_ELIGIBLE", "這筆訂單目前還不能評價");
  }
  if (!isReviewableProductId(row.productId)) {
    throw new ReviewError("NOT_ELIGIBLE", "這個品項不開放評價");
  }

  // 先查一次給友善訊息；真正的防重複是 productReviews 的 UNIQUE(orderItemId)
  const existing = await db
    .select({ id: productReviews.id })
    .from(productReviews)
    .where(eq(productReviews.orderItemId, input.orderItemId))
    .limit(1);
  if (existing.length > 0) {
    throw new ReviewError("ALREADY_REVIEWED", "此商品已經留下過評價");
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
      publishedAt: null,
    });
  } catch (error) {
    // 兩個請求同時進來時，UNIQUE 會擋掉後到的那個
    if (isDuplicateKeyError(error)) {
      throw new ReviewError("ALREADY_REVIEWED", "此商品已經留下過評價");
    }
    throw error;
  }

  return { success: true as const };
}

export type ProductReviewSummary = { count: number; average: number | null };

/** 商品頁的評分摘要；只計算已上架的回饋 */
export async function getProductReviewSummary(productId: string): Promise<ProductReviewSummary> {
  try {
    const db = await getDb();
    if (!db) return { count: 0, average: null };
    const [row] = await db
      .select({ total: count(), average: avg(productReviews.rating) })
      .from(productReviews)
      .where(and(eq(productReviews.productId, productId), eq(productReviews.status, "published")));

    const total = Number(row?.total ?? 0);
    if (total === 0) return { count: 0, average: null };
    const raw = Number(row?.average ?? 0);
    return { count: total, average: Math.round(raw * 10) / 10 };
  } catch (error) {
    console.error("[reviews.summaryByProduct]", error);
    return { count: 0, average: null };
  }
}
