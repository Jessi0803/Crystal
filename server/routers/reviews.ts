/**
 * 商品顧客回饋 API
 *
 * - listByProduct：商品頁用，只回 published，且不回任何內部欄位
 * - 其餘全部是 adminProcedure（已內建角色檢查與 audit log）
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  adminProcedure,
  protectedProcedure,
  publicProcedure,
  rateLimitedProtectedProcedure,
  router,
} from "../_core/trpc";
import { BlobUploadError, UPLOADABLE_IMAGE_TYPES, putPublicImage } from "../blobStorage";
import {
  REVIEW_CONTENT_MAX_LENGTH,
  REVIEW_DISPLAY_NAME_MAX_LENGTH,
  REVIEW_MAX_IMAGES,
  REVIEW_PAGE_SIZE,
  REVIEW_STATUSES,
  ReviewError,
  createReview,
  createCustomerReview,
  getAdminReview,
  getOrderItemReviewStates,
  getProductReviewSummary,
  listAdminReviews,
  listPublishedReviews,
  removeReview,
  setReviewStatus,
  updateReview,
} from "../reviewDb";
import { resolveMemberIdentity } from "../memberOrderAccess";
import { getUserByOpenId } from "../db";
import { ANONYMOUS_DISPLAY_NAME, resolveReviewDisplayName } from "../reviewDisplayName";
import { isSafeImageSrc } from "@shared/richText";

export const reviewInputSchema = z.object({
  productId: z.string().trim().min(1, "請選擇商品").max(64, "商品代號過長"),
  displayName: z
    .string()
    .trim()
    .min(1, "請輸入顯示名稱")
    .max(REVIEW_DISPLAY_NAME_MAX_LENGTH, `顯示名稱最多 ${REVIEW_DISPLAY_NAME_MAX_LENGTH} 字`),
  rating: z.number().int("評分需為整數").min(1, "評分至少 1 星").max(5, "評分最多 5 星"),
  content: z
    .string()
    .trim()
    .min(1, "請輸入回饋內容")
    .max(REVIEW_CONTENT_MAX_LENGTH, `回饋內容最多 ${REVIEW_CONTENT_MAX_LENGTH} 字`),
  images: z
    .array(
      z
        .string()
        .trim()
        .max(1024, "圖片網址過長")
        .refine(isSafeImageSrc, "圖片網址需為 https:// 或站內路徑")
    )
    .max(REVIEW_MAX_IMAGES, `最多 ${REVIEW_MAX_IMAGES} 張圖片`)
    .default([]),
  status: z.enum(REVIEW_STATUSES),
  isFeatured: z.boolean().default(false),
  sortOrder: z.number().int("排序需為整數").min(-9999).max(9999),
});

const imageUploadInputSchema = z.object({
  contentType: z.enum(Object.keys(UPLOADABLE_IMAGE_TYPES) as [keyof typeof UPLOADABLE_IMAGE_TYPES]),
  // base64 約為原始大小的 4/3，實際大小由 putPublicImage 檢查
  dataBase64: z.string().min(1).max(4_200_000, "圖片太大，請小於 3MB"),
});

/** ReviewError 轉成對管理員有意義的 tRPC 錯誤 */
const REVIEW_ERROR_CODES = {
  NOT_FOUND: "NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
  PRODUCT_NOT_FOUND: "BAD_REQUEST",
  PRODUCT_MISSING: "BAD_REQUEST",
  NOT_ELIGIBLE: "BAD_REQUEST",
  ALREADY_REVIEWED: "CONFLICT",
  INVALID_FEATURED: "BAD_REQUEST",
} as const;

function toTrpcError(error: unknown): never {
  if (error instanceof ReviewError) {
    // 一律用自己的訊息，不把資料庫錯誤原文丟給前端
    throw new TRPCError({ code: REVIEW_ERROR_CODES[error.code], message: error.message });
  }
  throw error;
}

async function run<T>(action: () => Promise<T>) {
  try {
    return await action();
  } catch (error) {
    toTrpcError(error);
  }
}

export const customerReviewInputSchema = z.object({
  orderItemId: z.number().int("訂單品項不正確").positive("訂單品項不正確"),
  rating: z.number().int("評分需為整數").min(1, "請給 1 到 5 星").max(5, "請給 1 到 5 星"),
  content: z
    .string()
    .trim()
    .min(1, "請輸入商品心得")
    .max(REVIEW_CONTENT_MAX_LENGTH, `商品心得最多 ${REVIEW_CONTENT_MAX_LENGTH} 字`),
  images: z
    .array(
      z
        .string()
        .trim()
        .max(1024, "圖片網址過長")
        .refine(isSafeImageSrc, "圖片網址需為 https:// 或站內路徑")
    )
    .max(REVIEW_MAX_IMAGES, `最多 ${REVIEW_MAX_IMAGES} 張圖片`)
    .default([]),
  anonymous: z.boolean().default(false),
});

/** 後台與會員端共用同一段上傳實作，只是外層的權限不同 */
async function uploadReviewImage(input: z.infer<typeof imageUploadInputSchema>) {
  try {
    const { url } = await putPublicImage("product-reviews", Buffer.from(input.dataBase64, "base64"), input.contentType);
    return { url };
  } catch (error) {
    if (error instanceof BlobUploadError) {
      throw new TRPCError({
        code: error.code === "TOO_LARGE" ? "BAD_REQUEST" : "PRECONDITION_FAILED",
        message: error.message,
      });
    }
    throw error;
  }
}

export const reviewRouter = router({
  /**
   * 商品頁：只回已上架的回饋，分批取（捲到底才撈下一批）。
   * 查詢失敗時回空陣列（錯誤已在 reviewDb 記錄）。
   */
  listByProduct: publicProcedure
    .input(
      z.object({
        productId: z.string().trim().min(1).max(64),
        limit: z.number().int().min(1).max(24).default(REVIEW_PAGE_SIZE),
        cursor: z.number().int().min(0).nullish(),
      })
    )
    .query(({ input }) =>
      listPublishedReviews(input.productId, { limit: input.limit, cursor: input.cursor ?? 0 })
    ),

  adminList: adminProcedure
    .input(z.object({ productId: z.string().trim().max(64).optional() }).default({}))
    .query(({ input }) => run(() => listAdminReviews({ productId: input.productId || undefined }))),

  adminGet: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(({ input }) => run(() => getAdminReview(input.id))),

  adminCreate: adminProcedure
    .input(reviewInputSchema)
    .mutation(({ input }) => run(() => createReview(input))),

  adminUpdate: adminProcedure
    .input(reviewInputSchema.safeExtend({ id: z.number().int().positive() }))
    .mutation(({ input }) => run(() => updateReview(input.id, input))),

  adminSetStatus: adminProcedure
    .input(z.object({ id: z.number().int().positive(), status: z.enum(REVIEW_STATUSES) }))
    .mutation(({ input }) => run(() => setReviewStatus(input.id, input.status))),

  adminRemove: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(({ input }) => run(() => removeReview(input.id))),

  /** 商品頁的評分摘要；只算已上架 */
  summaryByProduct: publicProcedure
    .input(z.object({ productId: z.string().trim().min(1).max(64) }))
    .query(({ input }) => getProductReviewSummary(input.productId)),

  /**
   * 會員端：一次取得整張訂單每個品項的評價狀態。
   * 權限在 reviewDb 內驗證，知道 orderId 不等於看得到。
   */
  statusByOrder: protectedProcedure
    .input(z.object({ orderId: z.number().int().positive() }))
    .query(({ ctx, input }) =>
      run(async () => {
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
      anonymousName: ANONYMOUS_DISPLAY_NAME,
    };
  }),

  /**
   * 會員端：留下商品評價。
   * client 只能給這五個欄位，其餘（source / status / userId / productId /
   * productName / displayName / isFeatured）全部由伺服器決定。
   */
  customerCreate: rateLimitedProtectedProcedure({ scope: "customer-review", limit: 20, windowMs: 15 * 60_000 })
    .input(customerReviewInputSchema)
    .mutation(({ ctx, input }) =>
      run(async () => {
        const identity = await resolveMemberIdentity(ctx.user);
        const profile = await getUserByOpenId(ctx.user.openId);
        return createCustomerReview(input, identity, {
          name: profile?.name ?? ctx.user.name ?? null,
          lineDisplayName: profile?.lineDisplayName ?? null,
        });
      })
    ),

  /** 會員端圖片上傳；不可開放給未登入者 */
  customerUploadImage: rateLimitedProtectedProcedure({ scope: "customer-review-upload", limit: 40, windowMs: 15 * 60_000 })
    .input(imageUploadInputSchema)
    .mutation(({ input }) => uploadReviewImage(input)),

  /** 回饋圖片，上傳到 Vercel Blob（product-reviews/） */
  uploadImage: adminProcedure.input(imageUploadInputSchema).mutation(({ input }) => uploadReviewImage(input)),
});
