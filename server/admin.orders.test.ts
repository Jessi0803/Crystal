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
  createBalancePaymentAttempt: vi.fn(),
  getBalancePaymentDetail: vi.fn(),
  updateBalancePaymentTransferCode: vi.fn(),
  confirmBalanceTransfer: vi.fn(),
  settleZeroBalancePayment: vi.fn(),
}));

vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

vi.mock("./ecpay", () => ({
  generateMerchantTradeNo: vi.fn().mockReturnValue("MOCK001"),
  buildCreditPaymentParams: vi.fn().mockReturnValue({}),
  ECPAY_CONFIG: { PaymentURL: "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5" },
  usePaymentSandbox: false,
}));

vi.mock("./inventoryDb", () => ({
  deductInventoryAfterBalancePayment: vi.fn(),
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
  getBalancePaymentDetail,
  createBalancePaymentAttempt,
  confirmBalanceTransfer,
  settleZeroBalancePayment,
} from "./orderDb";
import { getDb } from "./db";
import { appRouter } from "./appRouter";
import { deductInventoryAfterBalancePayment, getProductAvailability } from "./inventoryDb";
import {
  capturePayPalOrder,
  verifyPayPalOrderBelongsToMerchant,
} from "./_core/paypal";
import { buildCreditPaymentParams } from "./ecpay";
import { storagePut } from "./storage";
import { notifyCustomerOrderPlacedSafely, notifyCustomerOrderShippedSafely } from "./customerOrderNotification";

const getAdminOrderSummariesMock = vi.mocked(getAdminOrderSummaries);
const createOrderMock = vi.mocked(createOrder);
const getOrderWithItemsMock = vi.mocked(getOrderWithItems);
const getBalancePaymentDetailMock = vi.mocked(getBalancePaymentDetail);
const createBalancePaymentAttemptMock = vi.mocked(createBalancePaymentAttempt);
const buildCreditPaymentParamsMock = vi.mocked(buildCreditPaymentParams);
const confirmBalanceTransferMock = vi.mocked(confirmBalanceTransfer);
const settleZeroBalancePaymentMock = vi.mocked(settleZeroBalancePayment);
const getDbMock = vi.mocked(getDb);
const getProductAvailabilityMock = vi.mocked(getProductAvailability);
const verifyPayPalOrderBelongsToMerchantMock = vi.mocked(verifyPayPalOrderBelongsToMerchant);
const capturePayPalOrderMock = vi.mocked(capturePayPalOrder);
const storagePutMock = vi.mocked(storagePut);
const notifyCustomerOrderPlacedSafelyMock = vi.mocked(notifyCustomerOrderPlacedSafely);
const notifyCustomerOrderShippedSafelyMock = vi.mocked(notifyCustomerOrderShippedSafely);
const deductInventoryAfterBalancePaymentMock = vi.mocked(deductInventoryAfterBalancePayment);

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
    leftJoin: vi.fn(() => chain),
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

  const db: any = {
    select: vi.fn(() => createQueryChain(queue.shift() ?? [])),
    delete: vi.fn(() => deleteChain),
  };
  db.transaction = vi.fn(async (callback: (tx: typeof db) => unknown) => callback(db));
  return db;
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
  const deleteChain = {
    where: vi.fn().mockResolvedValue(undefined),
  };

  return {
    select: vi.fn(() => createQueryChain(queue.shift() ?? [])),
    insert: vi.fn(() => insertChain),
    update: vi.fn(() => updateChain),
    delete: vi.fn(() => deleteChain),
    insertChain,
    updateChain,
    deleteChain,
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
    getDbMock.mockResolvedValue(createMutationMockDb([
      [{
        id: "bracelet-1",
        name: "通知測試手鍊",
        price: 1280,
        image: "",
        active: true,
        wristSizePriceRules: [],
        purchaseOptions: [],
      }],
      [{ id: "bracelet-1", twoItemFreeShippingEligible: true }],
    ]) as any);
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

describe("order.createAndPay security regression coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createOrderMock.mockResolvedValue(101);
    mockAvailableProducts();
  });

  it("does not trust a client-supplied price for a normal product", async () => {
    const db = createMutationMockDb([
      [{
        id: "bracelet-1",
        name: "通知測試手鍊",
        price: 1280,
        image: "",
        active: true,
        wristSizePriceRules: [],
        purchaseOptions: [],
      }],
      [{ id: "bracelet-1", twoItemFreeShippingEligible: true }],
    ]);
    getDbMock.mockResolvedValue(db as any);

    const input = checkoutInput("credit");
    input.items[0].price = 1;

    await createPublicCaller().order.createAndPay(input);

    expect(createOrderMock).toHaveBeenCalledWith(
      expect.objectContaining({ totalAmount: 1410 }),
      expect.arrayContaining([
        expect.objectContaining({ productId: "bracelet-1", unitPrice: 1280, subtotal: 1280 }),
      ])
    );
  });

  it("recalculates wrist-size tiers and clasp surcharge from server product settings", async () => {
    const db = createMutationMockDb([
      [{
        id: "bracelet-1",
        name: "通知測試手鍊",
        price: 1580,
        image: "",
        active: true,
        category: "healing",
        claspOptions: ["elastic", "lobster", "magnetic"],
        wristSizeMin: 13,
        wristSizeMax: 19,
        wristSizePriceRules: [
          { maxWristSize: 13.5, price: 1480 },
          { maxWristSize: 17, price: 1580 },
          { maxWristSize: 19, price: 1680 },
        ],
        purchaseOptions: [],
      }],
      [{ id: "bracelet-1", twoItemFreeShippingEligible: true }],
    ]);
    getDbMock.mockResolvedValue(db as any);

    const input = checkoutInput("credit");
    input.items = [
      {
        id: "bracelet-1-small",
        baseProductId: "bracelet-1",
        name: "偽造商品名稱（任意前端文字）",
        price: 1,
        quantity: 1,
        image: "",
        wristSize: "13",
        claspType: "elastic",
        fitPreference: "loose",
      },
      {
        id: "bracelet-1-medium-lobster",
        baseProductId: "bracelet-1",
        name: "通知測試手鍊（手圍 14cm）（龍蝦扣）",
        price: 999999,
        quantity: 1,
        image: "",
        wristSize: "14",
        claspType: "lobster",
        fitPreference: "just-right",
      },
      {
        id: "bracelet-1-large-magnetic",
        baseProductId: "bracelet-1",
        name: "通知測試手鍊（手圍 18cm）（磁扣）",
        price: 1,
        quantity: 1,
        image: "",
        wristSize: "18",
        claspType: "magnetic",
        fitPreference: "loose",
      },
    ] as typeof input.items;

    await createPublicCaller().order.createAndPay(input);

    expect(createOrderMock).toHaveBeenCalledWith(
      expect.objectContaining({ totalAmount: 5140 }),
      expect.arrayContaining([
        expect.objectContaining({
          productId: "bracelet-1",
          productName: "通知測試手鍊（手圍 13cm）（微鬆）",
          unitPrice: 1480,
          subtotal: 1480,
          configurationSnapshot: {
            version: 1,
            baseProductName: "通知測試手鍊",
            purchaseOption: null,
            wristSizes: [{ key: "wrist", label: "手圍", value: 13, unit: "cm" }],
            clasp: { code: "elastic", label: "彈力繩", surcharge: 0 },
            fitPreference: { code: "loose", label: "微鬆" },
            pricing: { basePrice: 1480, claspSurcharge: 0, unitPrice: 1480 },
          },
        }),
        expect.objectContaining({
          productId: "bracelet-1",
          productName: "通知測試手鍊（手圍 14cm）（龍蝦扣）（剛好）",
          unitPrice: 1780,
          subtotal: 1780,
        }),
        expect.objectContaining({
          productId: "bracelet-1",
          productName: "通知測試手鍊（手圍 18cm）（磁扣）（微鬆）",
          unitPrice: 1880,
          subtotal: 1880,
        }),
      ])
    );
    expect(buildCreditPaymentParamsMock).toHaveBeenCalledWith(
      expect.objectContaining({ totalAmount: 5140 })
    );
  });

  it("builds a purchase-option item name only from server labels and validated selections", async () => {
    const db = createMutationMockDb([
      [{
        id: "bracelet-1",
        name: "通知測試手鍊",
        price: 1000,
        image: "",
        active: true,
        category: "healing",
        claspOptions: ["elastic", "lobster", "magnetic"],
        wristSizeMin: 13,
        wristSizeMax: 19,
        showFitPreference: true,
        wristSizePriceRules: [],
        purchaseOptions: [{
          id: "single",
          label: "單條方案",
          price: 1200,
          active: true,
          wristSizePriceRules: [
            { maxWristSize: 13.5, price: 1100 },
            { maxWristSize: 19, price: 1300 },
          ],
        }],
      }],
      [{ id: "bracelet-1", twoItemFreeShippingEligible: true }],
    ]);
    getDbMock.mockResolvedValue(db as any);

    const input = checkoutInput("credit");
    input.items = [{
      id: "forged-cart-id",
      baseProductId: "bracelet-1",
      purchaseOptionId: "single",
      purchaseOptionLabel: "偽造方案名稱",
      name: "偽造商品名稱（偽造規格）",
      price: 1,
      quantity: 1,
      image: "",
      wristSize: "13.5",
      claspType: "lobster",
      fitPreference: "loose",
    }] as typeof input.items;

    await createPublicCaller().order.createAndPay(input);

    expect(createOrderMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.arrayContaining([
        expect.objectContaining({
          productId: "bracelet-1",
          productName: "通知測試手鍊（單條方案）（手圍 13.5cm）（龍蝦扣）（微鬆）",
          unitPrice: 1300,
        }),
      ])
    );
  });

  it("uses server group labels when building a combo item name", async () => {
    const db = createMutationMockDb([
      [{
        id: "bracelet-1",
        name: "通知測試手鍊",
        price: 1000,
        image: "",
        active: true,
        category: "healing",
        claspOptions: ["elastic", "lobster", "magnetic"],
        wristSizeMin: 13,
        wristSizeMax: 19,
        showFitPreference: true,
        wristSizePriceRules: [],
        purchaseOptions: [{
          id: "pair",
          label: "雙人方案",
          type: "combo",
          price: 2200,
          active: true,
          wristSizeGroups: [
            { id: "first", label: "第一條手圍", wristSizePriceRules: [{ maxWristSize: 19, price: 1100 }] },
            { id: "second", label: "第二條手圍", wristSizePriceRules: [{ maxWristSize: 19, price: 1200 }] },
          ],
        }],
      }],
      [{ id: "bracelet-1", twoItemFreeShippingEligible: true }],
    ]);
    getDbMock.mockResolvedValue(db as any);

    const input = checkoutInput("credit");
    input.items = [{
      id: "forged-combo-id",
      baseProductId: "bracelet-1",
      purchaseOptionId: "pair",
      purchaseOptionLabel: "偽造雙人方案",
      name: "偽造商品名稱",
      price: 1,
      quantity: 1,
      image: "",
      wristSizeSelections: [
        { id: "first", label: "偽造欄位一", value: "13" },
        { id: "second", label: "偽造欄位二", value: "14.5" },
      ],
      claspType: "elastic",
      fitPreference: "just-right",
    }] as typeof input.items;

    await createPublicCaller().order.createAndPay(input);

    expect(createOrderMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.arrayContaining([
        expect.objectContaining({
          productId: "bracelet-1",
          productName: "通知測試手鍊（雙人方案）（第一條手圍 13cm）（第二條手圍 14.5cm）（剛好）",
          unitPrice: 2300,
        }),
      ])
    );
  });

  it("rejects zero, negative, fractional, and unreasonably large quantities", async () => {
    getDbMock.mockResolvedValue(null as any);
    const caller = createPublicCaller();

    for (const quantity of [0, -1, 1.5, 10_001]) {
      const input = checkoutInput("credit");
      input.items[0].quantity = quantity;
      await expect(caller.order.createAndPay(input)).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
    }

    expect(createOrderMock).not.toHaveBeenCalled();
  });
});

describe("order public access security regression coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not expose an order to an anonymous caller holding only its order number", async () => {
    getOrderWithItemsMock.mockResolvedValue({
      id: 501,
      userId: 77,
      merchantTradeNo: "PRIVATE001",
      buyerName: "Private Customer",
      buyerEmail: "private@example.com",
      buyerPhone: "0912345678",
      shippingAddress: "台北市測試地址",
      customerNote: "private custom consultation",
      items: [],
      logistics: null,
      balancePayment: null,
    } as Awaited<ReturnType<typeof getOrderWithItems>>);

    await expect(
      createPublicCaller().order.getOrder({ merchantTradeNo: "PRIVATE001" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("keeps legacy guest orders accessible after the buyer verifies the order email", async () => {
    getOrderWithItemsMock.mockResolvedValue({
      id: 502,
      userId: null,
      merchantTradeNo: "GUEST001",
      buyerName: "Guest Customer",
      buyerEmail: "guest@example.com",
      buyerPhone: "0912345678",
      shippingAddress: "台北市測試地址",
      customerNote: null,
      items: [],
      logistics: null,
      balancePayment: null,
    } as Awaited<ReturnType<typeof getOrderWithItems>>);

    await expect(
      createPublicCaller().order.getOrder({
        merchantTradeNo: "GUEST001",
        buyerEmail: " Guest@Example.com ",
      })
    ).resolves.toMatchObject({ merchantTradeNo: "GUEST001" });
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
      [{ groupId: 7 }],
    ]);
    getDbMock.mockResolvedValue(db as any);

    const caller = createCaller({ id: 1, role: "admin" });
    const result = await caller.order.deleteCancelledOrders({ orderIds: [10, 11] });

    expect(result).toEqual({ success: true, deletedCount: 2 });
    expect(db.select).toHaveBeenCalledTimes(2);
    expect(db.delete).toHaveBeenCalledTimes(6);
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

describe("order fulfillment first-phase rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks logistics creation when a custom order has no explicit balance settlement", async () => {
    const db = createMutationMockDb([
      [{ id: 91, merchantTradeNo: "CUSTOM-NO-BALANCE", shippingMethod: "home" }],
      [],
      [{
        id: 91,
        merchantTradeNo: "CUSTOM-NO-BALANCE",
        paymentStatus: "paid",
        orderStatus: "deposit_paid",
        isCustomOrder: true,
      }],
      [],
    ]);
    getDbMock.mockResolvedValue(db as any);

    await expect(
      createCaller({ id: 1, role: "admin" }).order.createLogistics({ orderId: 91 })
    ).rejects.toThrow("尚未設定尾款");
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("records an explicit zero-balance settlement with the acting admin", async () => {
    const db = createMutationMockDb([[]]);
    getDbMock.mockResolvedValue(db as any);
    settleZeroBalancePaymentMock.mockResolvedValue({ merchantTradeNo: "CZZERO001" });

    const result = await createCaller({ id: 7, role: "admin" }).order.settleZeroBalance({
      orderId: 91,
      note: "設計師確認無尾款",
    });

    expect(result).toEqual({ success: true, merchantTradeNo: "CZZERO001" });
    expect(settleZeroBalancePaymentMock).toHaveBeenCalledWith(91, {
      adminUserId: 7,
      note: "設計師確認無尾款",
    });
  });

  it("allows an admin to confirm a pending balance without a receipt or last-five code", async () => {
    confirmBalanceTransferMock.mockResolvedValue(undefined);

    await createCaller({ id: 8, role: "admin" }).order.confirmBalanceTransfer({
      merchantTradeNo: "CBLINE001",
      note: "LINE 管理員確認",
    });

    expect(confirmBalanceTransferMock).toHaveBeenCalledWith("CBLINE001", {
      adminUserId: 8,
      note: "LINE 管理員確認",
    });
    expect(deductInventoryAfterBalancePaymentMock).toHaveBeenCalledWith("CBLINE001");
  });

  it("blocks a manual shipped status while a custom balance is still pending", async () => {
    const db = createMutationMockDb([
      [{ id: 92, merchantTradeNo: "CUSTOM-PENDING-BALANCE" }],
      [],
      [{
        id: 92,
        merchantTradeNo: "CUSTOM-PENDING-BALANCE",
        paymentStatus: "confirmed",
        orderStatus: "deposit_paid",
        isCustomOrder: true,
      }],
      [{ orderId: 92, paymentStatus: "pending" }],
    ]);
    getDbMock.mockResolvedValue(db as any);

    await expect(
      createCaller({ id: 1, role: "admin" }).order.updateOrderStatus({ orderId: 92, status: "shipped" })
    ).rejects.toThrow("尾款尚未完成");
    expect(db.update).not.toHaveBeenCalled();
  });

  it("allows fulfillment after an explicit zero balance has been marked paid", async () => {
    const db = createMutationMockDb([
      [{ id: 93, merchantTradeNo: "CUSTOM-ZERO-BALANCE" }],
      [],
      [{
        id: 93,
        merchantTradeNo: "CUSTOM-ZERO-BALANCE",
        paymentStatus: "confirmed",
        orderStatus: "paid",
        isCustomOrder: true,
      }],
      [{ orderId: 93, paymentStatus: "paid" }],
    ]);
    getDbMock.mockResolvedValue(db as any);

    await createCaller({ id: 1, role: "admin" }).order.updateOrderStatus({ orderId: 93, status: "shipped" });

    expect(db.updateChain.set).toHaveBeenCalledWith({ orderStatus: "shipped" });
    expect(notifyCustomerOrderShippedSafelyMock).toHaveBeenCalledWith(93);
  });

  it("syncs a manually shipped merged order group after all payments are settled", async () => {
    const db = createMutationMockDb([
      [{ id: 1, merchantTradeNo: "MERGE-MAIN" }],
      [{ groupId: 50, mainOrderId: 1 }],
      [{ orderId: 1 }, { orderId: 2 }],
      [
        { id: 1, merchantTradeNo: "MERGE-MAIN", paymentStatus: "paid", orderStatus: "paid", isCustomOrder: true },
        { id: 2, merchantTradeNo: "MERGE-MEMBER", paymentStatus: "paid", orderStatus: "paid", isCustomOrder: false },
      ],
      [{ orderId: 1, paymentStatus: "paid" }],
    ]);
    getDbMock.mockResolvedValue(db as any);

    await createCaller({ id: 1, role: "admin" }).order.updateOrderStatus({ orderId: 1, status: "shipped" });

    expect(db.updateChain.set).toHaveBeenCalledWith({ orderStatus: "shipped" });
    expect(notifyCustomerOrderShippedSafelyMock).toHaveBeenCalledTimes(2);
    expect(notifyCustomerOrderShippedSafelyMock).toHaveBeenCalledWith(1);
    expect(notifyCustomerOrderShippedSafelyMock).toHaveBeenCalledWith(2);
  });

  it("uses only the merged main order balance when an old member balance is still pending", async () => {
    const db = createMutationMockDb([
      [{ id: 1, merchantTradeNo: "MERGE-MAIN" }],
      [{ groupId: 50, mainOrderId: 1 }],
      [{ orderId: 1 }, { orderId: 2 }],
      [
        { id: 1, merchantTradeNo: "MERGE-MAIN", paymentStatus: "paid", orderStatus: "paid", isCustomOrder: true },
        { id: 2, merchantTradeNo: "MERGE-MEMBER", paymentStatus: "paid", orderStatus: "paid", isCustomOrder: true },
      ],
      [
        { orderId: 1, paymentStatus: "paid" },
        { orderId: 2, paymentStatus: "pending" },
      ],
    ]);
    getDbMock.mockResolvedValue(db as any);

    await createCaller({ id: 1, role: "admin" }).order.updateOrderStatus({ orderId: 1, status: "shipped" });

    expect(db.updateChain.set).toHaveBeenCalledWith({ orderStatus: "shipped" });
    expect(notifyCustomerOrderShippedSafelyMock).toHaveBeenCalledTimes(2);
  });

  it("allows a paid overseas order to be marked shipped without a logistics record", async () => {
    const db = createMutationMockDb([
      [{ id: 71, merchantTradeNo: "OVERSEAS001" }],
      [],
      [{
        id: 71,
        merchantTradeNo: "OVERSEAS001",
        paymentStatus: "paid",
        orderStatus: "paid",
        isCustomOrder: false,
      }],
    ]);
    getDbMock.mockResolvedValue(db as any);

    await createCaller({ id: 1, role: "admin" }).order.updateOrderStatus({ orderId: 71, status: "shipped" });

    expect(db.updateChain.set).toHaveBeenCalledWith({ orderStatus: "shipped" });
    expect(notifyCustomerOrderShippedSafelyMock).toHaveBeenCalledWith(71);
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

  it("多筆客製化訂單合併時以第一個選取的客製化訂單作為主訂單", async () => {
    const db = createMutationMockDb([
      [
        {
          id: 40,
          merchantTradeNo: "CUSTOM001",
          buyerEmail: "same@example.com",
          orderStatus: "deposit_paid",
          isCustomOrder: true,
        },
        {
          id: 41,
          merchantTradeNo: "CUSTOM002",
          buyerEmail: "same@example.com",
          orderStatus: "deposit_paid",
          isCustomOrder: true,
        },
      ],
      [],
      [],
      [{ id: 8, mergeCode: "OMTEST2", mainOrderId: 41 }],
    ]);
    getDbMock.mockResolvedValue(db as any);

    const caller = createCaller({ id: 1, role: "admin" });
    const result = await caller.order.mergeOrders({ orderIds: [41, 40] });

    expect(result.success).toBe(true);
    expect(result.mainOrderId).toBe(41);
    expect(result.mainOrderMerchantTradeNo).toBe("CUSTOM002");
  });

  it("純一般商品合併時以最晚建立的訂單作為主訂單", async () => {
    const db = createMutationMockDb([
      [
        {
          id: 30,
          merchantTradeNo: "NORMAL001",
          buyerEmail: "same@example.com",
          orderStatus: "paid",
          isCustomOrder: false,
          createdAt: new Date("2026-07-01T10:00:00Z"),
        },
        {
          id: 31,
          merchantTradeNo: "NORMAL002",
          buyerEmail: "same@example.com",
          orderStatus: "paid",
          isCustomOrder: false,
          createdAt: new Date("2026-07-01T10:05:00Z"),
        },
      ],
      [],
      [],
      [{ id: 9, mergeCode: "OMNORMAL", mainOrderId: 31 }],
    ]);
    getDbMock.mockResolvedValue(db as any);

    const caller = createCaller({ id: 1, role: "admin" });
    const result = await caller.order.mergeOrders({ orderIds: [30, 31] });

    expect(result.success).toBe(true);
    expect(result.mainOrderId).toBe(31);
    expect(result.mainOrderMerchantTradeNo).toBe("NORMAL002");
  });
});

describe("order.updateFreeShippingOverride (admin procedure)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("主訂單調整合併尾款運費時同步更新整組訂單", async () => {
    const db = createMutationMockDb([
      [{ id: 20 }],
      [{ groupId: 7, mainOrderId: 20 }],
      [{ orderId: 20 }, { orderId: 21 }],
    ]);
    getDbMock.mockResolvedValue(db as any);

    const caller = createCaller({ id: 1, role: "admin" });
    const result = await caller.order.updateFreeShippingOverride({
      orderId: 20,
      freeShippingOverride: false,
    });

    expect(result).toEqual({ success: true, freeShippingOverride: false });
    expect(db.update).toHaveBeenCalledTimes(1);
    expect(db.updateChain.set).toHaveBeenCalledWith({ freeShippingOverride: false });
  });

  it("被併入訂單不能直接調整免運設定", async () => {
    const db = createMutationMockDb([
      [{ id: 21 }],
      [{ groupId: 7, mainOrderId: 20 }],
    ]);
    getDbMock.mockResolvedValue(db as any);

    const caller = createCaller({ id: 1, role: "admin" });

    await expect(caller.order.updateFreeShippingOverride({
      orderId: 21,
      freeShippingOverride: false,
    })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(db.update).not.toHaveBeenCalled();
  });
});

describe("order.getBalancePaymentCheckout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createBalancePaymentAttemptMock.mockResolvedValue({ merchantTradeNo: "CBATTEMPT001" });
  });

  it("rejects a cancelled legacy member balance before changing checkout data", async () => {
    getBalancePaymentDetailMock.mockResolvedValue({
      id: 2,
      orderId: 4170001,
      merchantTradeNo: "CANCELLED-BALANCE",
      paymentStatus: "cancelled",
      order: { id: 4170001 },
    } as any);
    const db = createMutationMockDb([]);
    getDbMock.mockResolvedValue(db as any);

    await expect(createPublicCaller().order.getBalancePaymentCheckout({
      merchantTradeNo: "CANCELLED-BALANCE",
      paymentMethod: "credit",
      checkoutRegion: "domestic",
      receiverPhone: "0912345678",
      shippingMethod: "home",
      shippingAddress: "台北市測試路 1 號",
      receiverZipCode: "100",
      origin: "https://example.test",
    })).rejects.toThrow("此尾款連結目前不可付款");

    expect(db.update).not.toHaveBeenCalled();
  });

  it("waives balance-payment shipping when the original order already qualifies for domestic free shipping", async () => {
    getBalancePaymentDetailMock.mockResolvedValue({
      id: 1,
      orderId: 99,
      merchantTradeNo: "CBALANCE001",
      amount: 1300,
      shippingFee: 60,
      paymentFee: 0,
      totalAmount: 1360,
      paymentMethod: "credit",
      paymentStatus: "pending",
      transferLastFive: null,
      transferReceiptUrl: null,
      tradeNo: null,
      ecpayNotifyData: null,
      paidAt: null,
      createdAt: new Date("2026-08-01T00:00:00Z"),
      updatedAt: new Date("2026-08-01T00:00:00Z"),
      clearQuartzChipsItem: null,
      orderMergeInfo: null,
      order: {
        id: 99,
        merchantTradeNo: "CORDER001",
        buyerEmail: "customer@example.com",
        freeShippingOverride: false,
        totalAmount: 4020,
      },
    } as any);
    const db = createMutationMockDb([
      [
        { id: "d002-honey-realm", name: "蜜光之境手鍊", price: 1580, quantity: 1 },
        { id: "chakra-crystal-deposit-product", name: "脈輪檢測 × 水晶手鍊客製化商品", price: 1000, quantity: 1 },
      ],
      [
        { id: "d002-honey-realm", twoItemFreeShippingEligible: true },
        { id: "chakra-crystal-deposit-product", twoItemFreeShippingEligible: true },
      ],
      [],
    ]);
    getDbMock.mockResolvedValue(db as any);

    const caller = createPublicCaller();
    const result = await caller.order.getBalancePaymentCheckout({
      merchantTradeNo: "CBALANCE001",
      paymentMethod: "credit",
      checkoutRegion: "domestic",
      receiverPhone: "0912345678",
      shippingMethod: "cvs_711",
      cvsStoreId: "123456",
      cvsStoreName: "測試門市",
      cvsType: "UNIMART",
      origin: "https://example.test",
    });

    expect(result).toMatchObject({
      kind: "credit",
      amount: 1300,
      shippingFee: 0,
      paymentFee: 0,
    });
    expect(createBalancePaymentAttemptMock).toHaveBeenCalledWith(expect.objectContaining({
      balancePaymentId: 1,
      amount: 1300,
      shippingFee: 0,
      paymentFee: 0,
      totalAmount: 1300,
    }));
    expect(buildCreditPaymentParamsMock).toHaveBeenCalledWith(expect.objectContaining({
      merchantTradeNo: "CBATTEMPT001",
      clientBackURL: expect.stringContaining("/balance/CBALANCE001"),
    }));
    expect(db.update).not.toHaveBeenCalled();
  });

  it("keeps an original clear-quartz chips item when balance checkout does not add another one", async () => {
    getBalancePaymentDetailMock.mockResolvedValue({
      id: 1,
      orderId: 99,
      merchantTradeNo: "CBALANCE001",
      amount: 1300,
      shippingFee: 60,
      paymentFee: 0,
      totalAmount: 1360,
      paymentMethod: "credit",
      paymentStatus: "pending",
      transferLastFive: null,
      transferReceiptUrl: null,
      tradeNo: null,
      ecpayNotifyData: null,
      paidAt: null,
      createdAt: new Date("2026-08-01T00:00:00Z"),
      updatedAt: new Date("2026-08-01T00:00:00Z"),
      clearQuartzChipsItem: {
        id: 10,
        orderId: 99,
        productId: "prod-1781070485343",
        productName: "白水晶碎石｜淨化能量首選",
        quantity: 1,
        unitPrice: 80,
        subtotal: 80,
      },
      orderMergeInfo: null,
      order: {
        id: 99,
        merchantTradeNo: "CORDER001",
        buyerEmail: "customer@example.com",
        freeShippingOverride: false,
        totalAmount: 4020,
      },
    } as any);
    const db = createMutationMockDb([
      [
        { id: "d002-honey-realm", name: "蜜光之境手鍊", price: 1580, quantity: 1 },
        { id: "chakra-crystal-deposit-product", name: "脈輪檢測 × 水晶手鍊客製化商品", price: 1000, quantity: 1 },
        { id: "prod-1781070485343", name: "白水晶碎石｜淨化能量首選", price: 80, quantity: 1 },
      ],
      [
        { id: "d002-honey-realm", twoItemFreeShippingEligible: true },
        { id: "chakra-crystal-deposit-product", twoItemFreeShippingEligible: true },
        { id: "prod-1781070485343", twoItemFreeShippingEligible: true },
      ],
      [
        {
          id: 10,
          orderId: 99,
          productId: "prod-1781070485343",
          productName: "白水晶碎石｜淨化能量首選",
          quantity: 1,
          unitPrice: 80,
          subtotal: 80,
        },
      ],
    ]);
    getDbMock.mockResolvedValue(db as any);

    const caller = createPublicCaller();
    await caller.order.getBalancePaymentCheckout({
      merchantTradeNo: "CBALANCE001",
      paymentMethod: "credit",
      checkoutRegion: "domestic",
      receiverPhone: "0912345678",
      shippingMethod: "cvs_711",
      cvsStoreId: "123456",
      cvsStoreName: "測試門市",
      cvsType: "UNIMART",
      includeClearQuartzChips: false,
      origin: "https://example.test",
    });

    expect(db.delete).not.toHaveBeenCalled();
  });
});
