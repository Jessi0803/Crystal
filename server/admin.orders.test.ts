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
  fetchPrintTradeDocument: vi.fn(),
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

import {
  createOrder,
  getAdminOrderSummaries,
  getOrderWithItems,
} from "./orderDb";
import { getDb } from "./db";
import { appRouter } from "./appRouter";
import { getProductAvailability } from "./inventoryDb";
import {
  capturePayPalOrder,
  verifyPayPalOrderBelongsToMerchant,
} from "./_core/paypal";
import { storagePut } from "./storage";
import { notifyCustomerOrderPlacedSafely } from "./customerOrderNotification";

const getAdminOrderSummariesMock = vi.mocked(getAdminOrderSummaries);
const createOrderMock = vi.mocked(createOrder);
const getOrderWithItemsMock = vi.mocked(getOrderWithItems);
const getDbMock = vi.mocked(getDb);
const getProductAvailabilityMock = vi.mocked(getProductAvailability);
const verifyPayPalOrderBelongsToMerchantMock = vi.mocked(verifyPayPalOrderBelongsToMerchant);
const capturePayPalOrderMock = vi.mocked(capturePayPalOrder);
const storagePutMock = vi.mocked(storagePut);
const notifyCustomerOrderPlacedSafelyMock = vi.mocked(notifyCustomerOrderPlacedSafely);

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

function createMutationMockDb(selectResults: unknown[]) {
  const queue = [...selectResults];
  const insertChain = {
    values: vi.fn().mockResolvedValue(undefined),
  };
  const updateChain = {
    set: vi.fn(() => updateChain),
    where: vi.fn().mockResolvedValue(undefined),
  };

  return {
    select: vi.fn(() => createQueryChain(queue.shift() ?? [])),
    insert: vi.fn(() => insertChain),
    update: vi.fn(() => updateChain),
    insertChain,
    updateChain,
  };
}

function createPublicCaller() {
  return appRouter.createCaller({
    user: null,
    req: {
      get: (name: string) => (name === "host" ? "example.test" : undefined),
      protocol: "https",
    } as any,
    res: {} as any,
  });
}

const receiptBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lZn+7QAAAABJRU5ErkJggg==";

function checkoutInput(paymentMethod: "atm" | "credit" = "atm") {
  return {
    buyerName: "通知測試顧客",
    buyerEmail: "notify@example.com",
    buyerPhone: "0912345678",
    checkoutRegion: "domestic" as const,
    paymentMethod,
    shippingMethod: "home" as const,
    shippingAddress: "台北市中正區測試路 1 號",
    receiverZipCode: "100",
    ...(paymentMethod === "atm"
      ? {
          transferLastFive: "54321",
          transferReceiptImageBase64: receiptBase64,
          transferReceiptImageContentType: "image/png",
          transferReceiptImageFilename: "receipt.png",
        }
      : {}),
    items: [
      {
        id: "bracelet-1",
        name: "通知測試手鍊",
        price: 1280,
        quantity: 1,
        image: "",
      },
    ],
    origin: "https://example.test",
  };
}

function mockAvailableProducts() {
  getProductAvailabilityMock.mockResolvedValue({
    available: true,
    stock: 10,
    isPreorder: false,
    preorderNote: null,
    isMonthlyLimited: false,
  });
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

describe("order notification timing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDbMock.mockResolvedValue(null as any);
    createOrderMock.mockResolvedValue(101);
    storagePutMock.mockResolvedValue({ url: "https://example.test/receipt.png", key: "receipt.png" });
    mockAvailableProducts();
  });

  it("ATM checkout notifies after the customer submits transfer code and receipt", async () => {
    const caller = createPublicCaller();

    await caller.order.createAndPay(checkoutInput("atm"));

    expect(createOrderMock).toHaveBeenCalled();
    expect(notifyCustomerOrderPlacedSafelyMock).toHaveBeenCalledWith(101);
  });

  it("credit-card checkout creates the order without sending the placed notification immediately", async () => {
    const caller = createPublicCaller();

    await caller.order.createAndPay(checkoutInput("credit"));

    expect(createOrderMock).toHaveBeenCalled();
    expect(notifyCustomerOrderPlacedSafelyMock).not.toHaveBeenCalled();
  });

  it("PayPal checkout notifies only after capture succeeds", async () => {
    const caller = createPublicCaller();
    getOrderWithItemsMock.mockResolvedValue({
      id: 202,
      merchantTradeNo: "PAYPAL001",
      paymentMethod: "paypal",
      paymentStatus: "pending",
      buyerName: "PayPal 顧客",
      buyerEmail: "paypal@example.com",
      buyerPhone: "0912345678",
      shippingMethod: "home",
      deliveryRegion: "overseas",
      orderStatus: "pending_payment",
      totalAmount: 1880,
      items: [],
      logistics: null,
      balancePayment: null,
    } as Awaited<ReturnType<typeof getOrderWithItems>>);
    verifyPayPalOrderBelongsToMerchantMock.mockResolvedValue(undefined);
    capturePayPalOrderMock.mockResolvedValue({
      status: "completed",
      captureId: "CAPTURE001",
      raw: { id: "PAYPAL-ORDER-001" },
    });

    await caller.order.capturePayPal({
      merchantTradeNo: "PAYPAL001",
      paypalOrderId: "PAYPAL-ORDER-001",
    });

    expect(notifyCustomerOrderPlacedSafelyMock).toHaveBeenCalledWith(202);
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

describe("order.mergeOrders (admin procedure)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("合併訂單時以客製化訂單作為主訂單並套用免運覆寫", async () => {
    const db = createMutationMockDb([
      [
        {
          id: 20,
          merchantTradeNo: "CUSTOM001",
          buyerEmail: "same@example.com",
          orderStatus: "deposit_paid",
          isCustomOrder: true,
        },
        {
          id: 21,
          merchantTradeNo: "NORMAL001",
          buyerEmail: "same@example.com",
          orderStatus: "paid",
          isCustomOrder: false,
        },
      ],
      [],
      [],
      [{ id: 7, mergeCode: "OMTEST", mainOrderId: 20 }],
    ]);
    getDbMock.mockResolvedValue(db as any);

    const caller = createCaller({ id: 1, role: "admin" });
    const result = await caller.order.mergeOrders({ orderIds: [20, 21] });

    expect(result.success).toBe(true);
    expect(result.mainOrderId).toBe(20);
    expect(result.mainOrderMerchantTradeNo).toBe("CUSTOM001");
    expect(db.insert).toHaveBeenCalledTimes(2);
    expect(db.update).toHaveBeenCalledTimes(1);
    expect(db.updateChain.set).toHaveBeenCalledWith({ freeShippingOverride: true });
  });

  it("沒有剛好一筆客製化訂單時拒絕合併", async () => {
    const db = createMutationMockDb([
      [
        {
          id: 30,
          merchantTradeNo: "NORMAL001",
          buyerEmail: "same@example.com",
          orderStatus: "paid",
          isCustomOrder: false,
        },
        {
          id: 31,
          merchantTradeNo: "NORMAL002",
          buyerEmail: "same@example.com",
          orderStatus: "paid",
          isCustomOrder: false,
        },
      ],
    ]);
    getDbMock.mockResolvedValue(db as any);

    const caller = createCaller({ id: 1, role: "admin" });

    await expect(caller.order.mergeOrders({ orderIds: [30, 31] })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(db.insert).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });
});
