import { beforeEach, describe, expect, it, vi } from "vitest";

const getDb = vi.fn();

vi.mock("./db", () => ({
  getDb,
}));

function createQueryResult<T>(rows: T[]) {
  const builder = {
    from: vi.fn(() => builder),
    where: vi.fn(() => builder),
    leftJoin: vi.fn(() => builder),
    orderBy: vi.fn(() => builder),
    groupBy: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    offset: vi.fn(() => builder),
    then: (resolve: (value: T[]) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(rows).then(resolve, reject),
    catch: (reject: (reason: unknown) => unknown) => Promise.resolve(rows).catch(reject),
    finally: (handler: () => unknown) => Promise.resolve(rows).finally(handler),
  };
  return builder;
}

function createMockDb(selectResults: unknown[][]) {
  const queue = [...selectResults];
  return {
    execute: vi.fn().mockResolvedValue(undefined),
    select: vi.fn(() => {
      const rows = queue.shift();
      if (!rows) throw new Error("Unexpected select call");
      return createQueryResult(rows);
    }),
  };
}

describe("admin order product thumbnails", () => {
  beforeEach(() => {
    vi.resetModules();
    getDb.mockReset();
  });

  it("returns fallback product images in admin order summaries for existing orders", async () => {
    const order = {
      id: 1,
      merchantTradeNo: "TEST001",
      paymentStatus: "paid",
      paymentMethod: "credit",
      shippingMethod: "home",
      orderStatus: "paid",
      isPreorder: false,
      isCustomOrder: false,
      totalAmount: 1280,
      buyerName: "Test User",
      createdAt: new Date("2026-06-01T08:00:00Z"),
    };
    const mockDb = createMockDb([
      [order],
      [{ count: 1 }],
      [{ orderId: 1, itemCount: 1 }],
      [],
      [
        {
          id: 11,
          orderId: 1,
          productName: "舊訂單商品",
          productImage: "/images/products/fallback.jpg",
        },
      ],
    ]);
    getDb.mockResolvedValue(mockDb);

    const { getAdminOrderSummaries } = await import("./orderDb");
    const result = await getAdminOrderSummaries(50, 0, "all");

    expect(result.items).toHaveLength(1);
    expect(result.items[0].productThumbnails).toEqual([
      {
        id: 11,
        productName: "舊訂單商品",
        productImage: "/images/products/fallback.jpg",
      },
    ]);
  });

  it("omits empty and base64 thumbnails from admin order summaries", async () => {
    const order = {
      id: 1,
      merchantTradeNo: "TEST001",
      paymentStatus: "paid",
      paymentMethod: "credit",
      shippingMethod: "home",
      orderStatus: "paid",
      isPreorder: false,
      isCustomOrder: false,
      totalAmount: 1280,
      buyerName: "Test User",
      createdAt: new Date("2026-06-01T08:00:00Z"),
    };
    const mockDb = createMockDb([
      [order],
      [{ count: 1 }],
      [{ orderId: 1, itemCount: 2 }],
      [],
      [
        { id: 11, orderId: 1, productName: "空圖商品", productImage: "" },
        { id: 12, orderId: 1, productName: "Base64 商品", productImage: "data:image/png;base64,abc" },
      ],
    ]);
    getDb.mockResolvedValue(mockDb);

    const { getAdminOrderSummaries } = await import("./orderDb");
    const result = await getAdminOrderSummaries(50, 0, "all");

    expect(result.items[0].productThumbnails).toEqual([]);
  });

  it("returns fallback product images in expanded admin order details", async () => {
    const order = {
      id: 1,
      merchantTradeNo: "TEST001",
      paymentStatus: "paid",
      paymentMethod: "credit",
      shippingMethod: "home",
      orderStatus: "paid",
      isPreorder: false,
      isCustomOrder: false,
      totalAmount: 1280,
      buyerName: "Test User",
      buyerEmail: "test@example.com",
      buyerPhone: "0912345678",
      createdAt: new Date("2026-06-01T08:00:00Z"),
      updatedAt: new Date("2026-06-01T08:00:00Z"),
    };
    const item = {
      id: 11,
      orderId: 1,
      productId: "old-product",
      productName: "舊訂單商品",
      productImage: "/images/products/fallback.jpg",
      quantity: 1,
      unitPrice: 1280,
      subtotal: 1280,
      isPreorder: false,
    };
    const mockDb = createMockDb([
      [order],
      [item],
      [],
      [],
    ]);
    getDb.mockResolvedValue(mockDb);

    const { getAdminOrderDetail } = await import("./orderDb");
    const result = await getAdminOrderDetail(1);

    expect(result?.items).toHaveLength(1);
    expect(result?.items[0].productImage).toBe("/images/products/fallback.jpg");
  });
});
