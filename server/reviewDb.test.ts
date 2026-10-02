/**
 * 商品回饋的純函式與輸入驗證（不連資料庫）
 */
import { describe, expect, it } from "vitest";
import {
  assertFeaturable,
  compareReviews,
  isOrderReviewable,
  isReviewableProductId,
  isVerifiedPurchase,
  normalizeReviewImages,
  resolveFeaturedForStatus,
  resolvePublishedAt,
  resolveReviewItemState,
  toPublicReview,
  type ReviewStatus,
} from "./reviewDb";
import { isOrderOwnedByMember } from "./memberOrderAccess";
import { customerReviewInputSchema, reviewInputSchema } from "./routers/reviews";
import { CUSTOM_PRODUCT_IDS } from "@shared/const";
import { NON_PRODUCT_ORDER_ITEM_IDS } from "@shared/coupons";

const baseRow = {
  id: 1,
  productId: "prod-1",
  productName: "月光石手鍊",
  source: "admin" as const,
  userId: null,
  orderItemId: null,
  displayName: "Yuki",
  rating: 5,
  content: "實體比照片漂亮",
  images: ["https://example.com/a.jpg"],
  status: "published" as ReviewStatus,
  isFeatured: false,
  sortOrder: 0,
  publishedAt: new Date("2026-01-01"),
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const validInput = {
  productId: "prod-1",
  displayName: "Yuki",
  rating: 5,
  content: "實體比照片漂亮",
  images: ["https://example.com/a.jpg"],
  status: "published" as const,
  isFeatured: false,
  sortOrder: 0,
};

describe("normalizeReviewImages", () => {
  it("非陣列與空值一律收斂成空陣列", () => {
    expect(normalizeReviewImages(null)).toEqual([]);
    expect(normalizeReviewImages(undefined)).toEqual([]);
    expect(normalizeReviewImages("https://a.jpg")).toEqual([]);
  });

  it("只留下非空字串", () => {
    expect(normalizeReviewImages(["a", "", null, 3, "b"])).toEqual(["a", "b"]);
  });
});

describe("resolvePublishedAt", () => {
  const now = new Date("2026-03-01");

  it("第一次上架才寫入時間", () => {
    expect(resolvePublishedAt(null, "published", now)).toEqual(now);
  });

  it("尚未上架維持 null", () => {
    expect(resolvePublishedAt(null, "hidden", now)).toBeNull();
    expect(resolvePublishedAt(null, "pending", now)).toBeNull();
  });

  it("已經有值就不覆寫，隱藏再上架仍是原本的時間", () => {
    const first = new Date("2026-01-01");
    expect(resolvePublishedAt(first, "hidden", now)).toEqual(first);
    expect(resolvePublishedAt(first, "published", now)).toEqual(first);
  });
});

describe("toPublicReview", () => {
  it("只輸出商品頁需要的欄位", () => {
    expect(Object.keys(toPublicReview(baseRow)).sort()).toEqual(
      ["content", "createdAt", "displayName", "id", "images", "rating", "verifiedPurchase"]
    );
  });

  it("不會洩漏 userId、orderItemId、status 等內部欄位", () => {
    const review = toPublicReview({ ...baseRow, userId: 42, orderItemId: 7, status: "published" }) as Record<string, unknown>;
    expect(review.userId).toBeUndefined();
    expect(review.orderItemId).toBeUndefined();
    expect(review.status).toBeUndefined();
    expect(review.isFeatured).toBeUndefined();
    expect(review.productId).toBeUndefined();
  });

  it("images 壞資料不會讓商品頁拿到非陣列", () => {
    expect(toPublicReview({ ...baseRow, images: null }).images).toEqual([]);
  });
});

describe("compareReviews", () => {
  it("sortOrder 小的在前，同序再以建立時間新的在前", () => {
    const rows = [
      { sortOrder: 2, createdAt: new Date("2026-01-03") },
      { sortOrder: 1, createdAt: new Date("2026-01-01") },
      { sortOrder: 1, createdAt: new Date("2026-01-02") },
    ];
    expect([...rows].sort(compareReviews)).toEqual([rows[2], rows[1], rows[0]]);
  });
});

describe("reviewInputSchema", () => {
  it("接受合法輸入", () => {
    expect(reviewInputSchema.safeParse(validInput).success).toBe(true);
  });

  it("rating 只接受 1～5 的整數", () => {
    for (const rating of [0, -1, 6, 10, 4.5]) {
      expect(reviewInputSchema.safeParse({ ...validInput, rating }).success).toBe(false);
    }
    for (const rating of [1, 2, 3, 4, 5]) {
      expect(reviewInputSchema.safeParse({ ...validInput, rating }).success).toBe(true);
    }
  });

  it("必須選商品", () => {
    expect(reviewInputSchema.safeParse({ ...validInput, productId: "" }).success).toBe(false);
    expect(reviewInputSchema.safeParse({ ...validInput, productId: "   " }).success).toBe(false);
  });

  it("顯示名稱與內容不可為空、不可過長", () => {
    expect(reviewInputSchema.safeParse({ ...validInput, displayName: "" }).success).toBe(false);
    expect(reviewInputSchema.safeParse({ ...validInput, displayName: "名".repeat(51) }).success).toBe(false);
    expect(reviewInputSchema.safeParse({ ...validInput, content: "   " }).success).toBe(false);
    expect(reviewInputSchema.safeParse({ ...validInput, content: "字".repeat(2001) }).success).toBe(false);
  });

  it("圖片最多 3 張，且必須是 https 或站內路徑", () => {
    const image = "https://example.com/a.jpg";
    expect(reviewInputSchema.safeParse({ ...validInput, images: [image, image, image] }).success).toBe(true);
    expect(reviewInputSchema.safeParse({ ...validInput, images: [image, image, image, image] }).success).toBe(false);
    expect(reviewInputSchema.safeParse({ ...validInput, images: ["/reviews/a.jpg"] }).success).toBe(true);
    expect(reviewInputSchema.safeParse({ ...validInput, images: ["http://example.com/a.jpg"] }).success).toBe(false);
    expect(reviewInputSchema.safeParse({ ...validInput, images: ["javascript:alert(1)"] }).success).toBe(false);
  });

  it("status 只接受三種狀態", () => {
    expect(reviewInputSchema.safeParse({ ...validInput, status: "deleted" }).success).toBe(false);
    for (const status of ["pending", "published", "hidden"]) {
      expect(reviewInputSchema.safeParse({ ...validInput, status }).success).toBe(true);
    }
  });

  it("sortOrder 必須是整數", () => {
    expect(reviewInputSchema.safeParse({ ...validInput, sortOrder: 1.5 }).success).toBe(false);
    expect(reviewInputSchema.safeParse({ ...validInput, sortOrder: -3 }).success).toBe(true);
  });
});

describe("isVerifiedPurchase", () => {
  it("只有顧客投稿且綁得到訂單明細才算已購買", () => {
    expect(isVerifiedPurchase({ source: "customer", orderItemId: 12 })).toBe(true);
  });

  it("後台建立的回饋不算已購買", () => {
    expect(isVerifiedPurchase({ source: "admin", orderItemId: null })).toBe(false);
    // 就算資料被改成有 orderItemId，來源不是 customer 一樣不算
    expect(isVerifiedPurchase({ source: "admin", orderItemId: 12 })).toBe(false);
    expect(isVerifiedPurchase({ source: "customer", orderItemId: null })).toBe(false);
  });

  it("公開 DTO 會輸出 verifiedPurchase", () => {
    expect(toPublicReview({ ...baseRow, source: "customer", orderItemId: 5 }).verifiedPurchase).toBe(true);
    expect(toPublicReview(baseRow).verifiedPurchase).toBe(false);
  });
});

describe("isOrderReviewable", () => {
  it("只有 completed 與 picked_up 可以評價", () => {
    for (const orderStatus of ["completed", "picked_up"]) {
      expect(isOrderReviewable({ orderStatus, paymentStatus: "paid" })).toBe(true);
    }
    for (const orderStatus of ["pending_payment", "deposit_paid", "paid", "processing", "shipped", "arrived", "not_picked", "cancelled"]) {
      expect(isOrderReviewable({ orderStatus, paymentStatus: "paid" })).toBe(false);
    }
  });

  it("付款失敗或取消的訂單不能評價", () => {
    expect(isOrderReviewable({ orderStatus: "completed", paymentStatus: "failed" })).toBe(false);
    expect(isOrderReviewable({ orderStatus: "completed", paymentStatus: "cancelled" })).toBe(false);
    expect(isOrderReviewable({ orderStatus: "completed", paymentStatus: "confirmed" })).toBe(true);
  });
});

describe("isReviewableProductId", () => {
  it("客製訂金／流程入口商品不開放評價", () => {
    for (const productId of CUSTOM_PRODUCT_IDS) {
      expect(isReviewableProductId(productId)).toBe(false);
    }
  });

  it("運費、手續費、優惠券折抵等非商品列不開放評價", () => {
    for (const productId of NON_PRODUCT_ORDER_ITEM_IDS) {
      expect(isReviewableProductId(productId)).toBe(false);
    }
  });

  it("一般商品可以評價", () => {
    expect(isReviewableProductId("prod-1780815864301")).toBe(true);
  });
});

describe("resolveReviewItemState", () => {
  const completed = { orderStatus: "completed", paymentStatus: "paid" };

  it("訂單完成且沒評價過 → available", () => {
    expect(resolveReviewItemState({ order: completed, productId: "prod-1", existingReview: null })).toBe("available");
  });

  it("訂單還沒完成 → not_eligible", () => {
    expect(
      resolveReviewItemState({
        order: { orderStatus: "paid", paymentStatus: "paid" },
        productId: "prod-1",
        existingReview: null,
      })
    ).toBe("not_eligible");
  });

  it("取消的訂單 → not_eligible", () => {
    expect(
      resolveReviewItemState({
        order: { orderStatus: "cancelled", paymentStatus: "cancelled" },
        productId: "prod-1",
        existingReview: null,
      })
    ).toBe("not_eligible");
  });

  it("客製訂金商品 → not_eligible", () => {
    expect(
      resolveReviewItemState({ order: completed, productId: CUSTOM_PRODUCT_IDS[0], existingReview: null })
    ).toBe("not_eligible");
  });

  it("運費這類非商品列 → not_eligible", () => {
    expect(
      resolveReviewItemState({ order: completed, productId: "shipping-fee", existingReview: null })
    ).toBe("not_eligible");
  });

  it("已經評價過就直接回那則評價的狀態", () => {
    for (const status of ["pending", "published", "hidden"] as const) {
      expect(resolveReviewItemState({ order: completed, productId: "prod-1", existingReview: { status } })).toBe(status);
    }
  });

  it("訂單還沒完成但已經有評價時，仍回評價狀態（不會倒退成 not_eligible）", () => {
    expect(
      resolveReviewItemState({
        order: { orderStatus: "processing", paymentStatus: "paid" },
        productId: "prod-1",
        existingReview: { status: "published" },
      })
    ).toBe("published");
  });
});

describe("isOrderOwnedByMember", () => {
  const identity = { userId: 7, verifiedEmail: "member@example.com" };

  it("A：訂單綁在自己身上 → 可以", () => {
    expect(isOrderOwnedByMember({ userId: 7, buyerEmail: "other@example.com" }, identity)).toBe(true);
  });

  it("B：訪客單 + 已驗證 email 相符 → 可以", () => {
    expect(isOrderOwnedByMember({ userId: null, buyerEmail: "Member@Example.com " }, identity)).toBe(true);
  });

  it("C：訪客單但會員 email 未驗證 → 不行", () => {
    expect(
      isOrderOwnedByMember({ userId: null, buyerEmail: "member@example.com" }, { userId: 7, verifiedEmail: null })
    ).toBe(false);
  });

  it("D：訪客單且 email 不符 → 不行", () => {
    expect(isOrderOwnedByMember({ userId: null, buyerEmail: "stranger@example.com" }, identity)).toBe(false);
  });

  it("訂單綁在別人身上，就算 email 相同也不行", () => {
    expect(isOrderOwnedByMember({ userId: 99, buyerEmail: "member@example.com" }, identity)).toBe(false);
  });
});

describe("isFeatured 規則", () => {
  it("只有已上架才能設為精選", () => {
    expect(() => assertFeaturable({ status: "published", isFeatured: true, productExists: true })).not.toThrow();
    expect(() => assertFeaturable({ status: "pending", isFeatured: true, productExists: true })).toThrow(/已上架/);
    expect(() => assertFeaturable({ status: "hidden", isFeatured: true, productExists: true })).toThrow(/已上架/);
  });

  it("商品已刪除不能設為精選", () => {
    expect(() => assertFeaturable({ status: "published", isFeatured: true, productExists: false })).toThrow(/已刪除/);
  });

  it("沒有要設精選時不檢查", () => {
    expect(() => assertFeaturable({ status: "hidden", isFeatured: false, productExists: false })).not.toThrow();
  });

  it("下架或轉待審核時精選自動取消", () => {
    expect(resolveFeaturedForStatus(true, "hidden")).toBe(false);
    expect(resolveFeaturedForStatus(true, "pending")).toBe(false);
    expect(resolveFeaturedForStatus(true, "published")).toBe(true);
    expect(resolveFeaturedForStatus(false, "published")).toBe(false);
  });
});

describe("customerReviewInputSchema", () => {
  const valid = { orderItemId: 12, rating: 5, content: "很喜歡", images: [], anonymous: false };

  it("接受合法輸入", () => {
    expect(customerReviewInputSchema.safeParse(valid).success).toBe(true);
  });

  it("rating 只接受 1～5", () => {
    for (const rating of [0, -1, 6, 4.5]) {
      expect(customerReviewInputSchema.safeParse({ ...valid, rating }).success).toBe(false);
    }
    for (const rating of [1, 5]) {
      expect(customerReviewInputSchema.safeParse({ ...valid, rating }).success).toBe(true);
    }
  });

  it("心得不可為空、不可超過 2000 字", () => {
    expect(customerReviewInputSchema.safeParse({ ...valid, content: "   " }).success).toBe(false);
    expect(customerReviewInputSchema.safeParse({ ...valid, content: "字".repeat(2000) }).success).toBe(true);
    expect(customerReviewInputSchema.safeParse({ ...valid, content: "字".repeat(2001) }).success).toBe(false);
  });

  it("圖片最多 3 張且必須是 https 或站內路徑", () => {
    const image = "https://example.com/a.jpg";
    expect(customerReviewInputSchema.safeParse({ ...valid, images: [image, image, image] }).success).toBe(true);
    expect(customerReviewInputSchema.safeParse({ ...valid, images: [image, image, image, image] }).success).toBe(false);
    expect(customerReviewInputSchema.safeParse({ ...valid, images: ["javascript:alert(1)"] }).success).toBe(false);
  });

  it("orderItemId 必須是正整數", () => {
    for (const orderItemId of [0, -1, 1.5]) {
      expect(customerReviewInputSchema.safeParse({ ...valid, orderItemId }).success).toBe(false);
    }
  });

  it("不接受顧客偽造的欄位：多傳的 key 會被 zod 丟掉", () => {
    const parsed = customerReviewInputSchema.safeParse({
      ...valid,
      userId: 999,
      productId: "prod-fake",
      productName: "偽造商品",
      displayName: "官方設計師",
      source: "admin",
      status: "published",
      isFeatured: true,
      verifiedPurchase: true,
    });
    expect(parsed.success).toBe(true);
    expect(Object.keys(parsed.data!).sort()).toEqual(
      ["anonymous", "content", "images", "orderItemId", "rating"]
    );
  });
});
