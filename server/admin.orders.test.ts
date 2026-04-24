/**
 * Admin listOrders procedure 測試
 * 驗證：
 * 1. 未登入時拋出 UNAUTHORIZED
 * 2. 非 admin 角色時拋出 FORBIDDEN
 * 3. admin 角色可正常查詢（不實際連 DB，mock getAllOrders）
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// Mock orderDb module
vi.mock("./orderDb", () => ({
  markOrderPaidPayPal: vi.fn(),
  getAllOrders: vi.fn().mockResolvedValue([
    {
      id: 1,
      merchantTradeNo: "TEST001",
      paymentStatus: "paid",
      paymentMethod: "credit",
      totalAmount: 1280,
      buyerName: "Test User",
      buyerEmail: "test@example.com",
      buyerPhone: "0912345678",
      shippingAddress: "台北市",
      tradeNo: "ECPay001",
      paidAt: new Date("2026-04-11T10:00:00Z"),
      createdAt: new Date("2026-04-11T09:00:00Z"),
      updatedAt: new Date("2026-04-11T10:00:00Z"),
      items: [],
    },
  ]),
  createOrder: vi.fn(),
  getOrderByMerchantTradeNo: vi.fn(),
  getOrderWithItems: vi.fn(),
  updateOrderPaymentStatus: vi.fn(),
}));

// Mock ecpay module
vi.mock("./ecpay", () => ({
  generateMerchantTradeNo: vi.fn().mockReturnValue("MOCK001"),
  buildCreditPaymentParams: vi.fn().mockReturnValue({}),
  buildCVSPaymentParams: vi.fn().mockReturnValue({}),
  ECPAY_CONFIG: { PaymentURL: "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5" },
}));

import { appRouter } from "./appRouter";

function createCaller(user: { id: number; role: string } | null) {
  return appRouter.createCaller({
    user: user as any,
    req: {} as any,
    res: {} as any,
  });
}

describe("order.listOrders (admin procedure)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未登入時應拋出 FORBIDDEN（adminProcedure 統一以 FORBIDDEN 拒絕）", async () => {
    const caller = createCaller(null);
    await expect(caller.order.listOrders({ status: "all" })).rejects.toThrow(
      TRPCError
    );
    await expect(caller.order.listOrders({ status: "all" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("非 admin 角色應拋出 FORBIDDEN", async () => {
    const caller = createCaller({ id: 2, role: "user" });
    await expect(caller.order.listOrders({ status: "all" })).rejects.toThrow(
      TRPCError
    );
    await expect(caller.order.listOrders({ status: "all" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("admin 角色可正常取得訂單列表", async () => {
    const caller = createCaller({ id: 1, role: "admin" });
    const result = await caller.order.listOrders({ status: "all" });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].merchantTradeNo).toBe("TEST001");
    expect(result[0].paymentStatus).toBe("paid");
  });

  it("admin 可依狀態篩選訂單", async () => {
    const { getAllOrders } = await import("./orderDb");
    const caller = createCaller({ id: 1, role: "admin" });
    await caller.order.listOrders({ status: "paid" });
    expect(getAllOrders).toHaveBeenCalledWith(100, 0, "paid");
  });

  it("admin 可指定 limit 數量", async () => {
    const { getAllOrders } = await import("./orderDb");
    const caller = createCaller({ id: 1, role: "admin" });
    await caller.order.listOrders({ status: "all", limit: 50 });
    expect(getAllOrders).toHaveBeenCalledWith(50, 0, "all");
  });
});
