/**
 * Admin order procedure tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

vi.mock("./orderDb", () => ({
  markOrderPaidPayPal: vi.fn(),
  getAdminOrderSummaries: vi.fn().mockResolvedValue({
    items: [
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
    ],
    total: 1,
  }),
  createOrder: vi.fn(),
  getOrderWithItems: vi.fn(),
  getAdminOrderDetail: vi.fn(),
  updateOrderTransferLastFive: vi.fn(),
  confirmTransferPayment: vi.fn(),
  getOrderStats: vi.fn(),
  getMonthlyRevenue: vi.fn(),
  getTopProducts: vi.fn(),
  getProductSalesTotals: vi.fn(),
  updateOrderStatus: vi.fn(),
  createLogisticsOrder: vi.fn(),
  isCustomDepositProduct: vi.fn(),
  createOrReplaceBalancePayment: vi.fn(),
  getBalancePaymentDetail: vi.fn(),
  updateBalancePaymentTransferCode: vi.fn(),
  confirmBalanceTransfer: vi.fn(),
}));

vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

vi.mock("./ecpay", () => ({
  generateMerchantTradeNo: vi.fn().mockReturnValue("MOCK001"),
  buildCreditPaymentParams: vi.fn().mockReturnValue({}),
  ECPAY_CONFIG: { PaymentURL: "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5" },
}));

vi.mock("./inventoryDb", () => ({
  deductInventoryAfterPayment: vi.fn(),
  restoreInventoryOnCancel: vi.fn(),
  ensureOrdersColumns: vi.fn(),
  getProductAvailability: vi.fn(),
}));

vi.mock("./ecpayLogistics", () => ({
  buildPrintTradeDocURL: vi.fn(),
  createCVSLogisticsOrder: vi.fn(),
  createHomeLogisticsOrder: vi.fn(),
  useLogisticsSandbox: true,
}));

vi.mock("./_core/paypal", () => ({
  createPayPalCheckoutOrder: vi.fn(),
  verifyPayPalOrderBelongsToMerchant: vi.fn(),
  capturePayPalOrder: vi.fn(),
}));

vi.mock("./customerOrderNotification", () => ({
  notifyCustomerOrderPlacedSafely: vi.fn(),
  notifyCustomerOrderShippedSafely: vi.fn(),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn(),
}));

import { getAdminOrderSummaries } from "./orderDb";
import { getDb } from "./db";
import { appRouter } from "./appRouter";

const getAdminOrderSummariesMock = vi.mocked(getAdminOrderSummaries);
const getDbMock = vi.mocked(getDb);

function createCaller(user: { id: number; role: string } | null) {
  return appRouter.createCaller({
    user: user as any,
    req: {} as any,
    res: {} as any,
  });
}

function createQueryChain<T>(result: T) {
  const chain: any = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    then: (resolve: (value: T) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
    catch: (reject: (reason: unknown) => unknown) => Promise.resolve(result).catch(reject),
    finally: (handler: () => unknown) => Promise.resolve(result).finally(handler),
  };
  return chain;
}

function createMockDb(selectResults: unknown[]) {
  const queue = [...selectResults];
  const deleteChain = {
    where: vi.fn().mockResolvedValue(undefined),
  };

  return {
    select: vi.fn(() => createQueryChain(queue.shift() ?? [])),
    delete: vi.fn(() => deleteChain),
  };
}

describe("order.listOrders (admin procedure)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未登入時應拋出 FORBIDDEN（adminProcedure 統一以 FORBIDDEN 拒絕）", async () => {
    const caller = createCaller(null);
    await expect(caller.order.listOrders({ status: "all" })).rejects.toThrow(TRPCError);
    await expect(caller.order.listOrders({ status: "all" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("非 admin 角色應拋出 FORBIDDEN", async () => {
    const caller = createCaller({ id: 2, role: "user" });
    await expect(caller.order.listOrders({ status: "all" })).rejects.toThrow(TRPCError);
    await expect(caller.order.listOrders({ status: "all" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("admin 角色可正常取得訂單列表", async () => {
    const caller = createCaller({ id: 1, role: "admin" });
    const result = await caller.order.listOrders({ status: "all" });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.items[0].merchantTradeNo).toBe("TEST001");
    expect(result.items[0].paymentStatus).toBe("paid");
  });

  it("admin 可依狀態篩選訂單", async () => {
    const caller = createCaller({ id: 1, role: "admin" });
    await caller.order.listOrders({ status: "paid" });

    expect(getAdminOrderSummariesMock).toHaveBeenCalledWith(100, 0, "paid");
  });

  it("admin 可指定 limit 數量", async () => {
    const caller = createCaller({ id: 1, role: "admin" });
    await caller.order.listOrders({ status: "all", limit: 50 });

    expect(getAdminOrderSummariesMock).toHaveBeenCalledWith(50, 0, "all");
  });
});

describe("order.deleteCancelledOrders (admin procedure)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("批次刪除已取消訂單與相關資料", async () => {
    const db = createMockDb([
      [
        { id: 10, orderStatus: "cancelled", merchantTradeNo: "CANCEL001" },
        { id: 11, orderStatus: "cancelled", merchantTradeNo: "CANCEL002" },
      ],
    ]);
    getDbMock.mockResolvedValue(db as any);

    const caller = createCaller({ id: 1, role: "admin" });
    const result = await caller.order.deleteCancelledOrders({ orderIds: [10, 11] });

    expect(result).toEqual({ success: true, deletedCount: 2 });
    expect(db.select).toHaveBeenCalledTimes(1);
    expect(db.delete).toHaveBeenCalledTimes(4);
  });

  it("混入非已取消訂單時不刪除", async () => {
    const db = createMockDb([
      [
        { id: 10, orderStatus: "cancelled", merchantTradeNo: "CANCEL001" },
        { id: 12, orderStatus: "paid", merchantTradeNo: "PAID001" },
      ],
    ]);
    getDbMock.mockResolvedValue(db as any);

    const caller = createCaller({ id: 1, role: "admin" });

    await expect(caller.order.deleteCancelledOrders({ orderIds: [10, 12] })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(db.delete).not.toHaveBeenCalled();
  });
});
