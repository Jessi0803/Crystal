import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleECPayPaymentNotify } from "./ecpayRoutes";
import { verifyCheckMacValue } from "./ecpay";
import {
  getBalancePaymentByMerchantTradeNo,
  getBalancePaymentAttemptByMerchantTradeNo,
  getOrderByMerchantTradeNo,
  updateOrderPaymentStatus,
  updateBalancePaymentAttemptStatus,
} from "./orderDb";
import { deductInventoryAfterBalancePayment, deductInventoryAfterPayment } from "./inventoryDb";
import { notifyCustomerOrderPlacedSafely } from "./customerOrderNotification";

vi.mock("./ecpay", () => ({
  verifyCheckMacValue: vi.fn(),
}));

vi.mock("./ecpayLogistics", () => ({
  verifyLogisticsCheckMacValue: vi.fn(),
  buildCVSMapParams: vi.fn(),
  createCVSLogisticsOrder: vi.fn(),
  createHomeLogisticsOrder: vi.fn(),
  ECPAY_LOGISTICS_CONFIG: {
    MapURL: "https://logistics-stage.ecpay.com.tw/Express/map",
  },
}));

vi.mock("./orderDb", () => ({
  getOrderByMerchantTradeNo: vi.fn(),
  updateOrderPaymentStatus: vi.fn(),
  getBalancePaymentByMerchantTradeNo: vi.fn(),
  getBalancePaymentAttemptByMerchantTradeNo: vi.fn(),
  updateBalancePaymentStatus: vi.fn(),
  updateBalancePaymentAttemptStatus: vi.fn(),
  updateLogisticsStatus: vi.fn(),
}));

vi.mock("./inventoryDb", () => ({
  deductInventoryAfterPayment: vi.fn(),
  deductInventoryAfterBalancePayment: vi.fn(),
}));

vi.mock("./customerOrderNotification", () => ({
  notifyCustomerOrderPlacedSafely: vi.fn(),
  notifyCustomerOrderShippedSafely: vi.fn(),
}));

vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

const verifyCheckMacValueMock = vi.mocked(verifyCheckMacValue);
const getOrderByMerchantTradeNoMock = vi.mocked(getOrderByMerchantTradeNo);
const getBalancePaymentByMerchantTradeNoMock = vi.mocked(getBalancePaymentByMerchantTradeNo);
const getBalancePaymentAttemptByMerchantTradeNoMock = vi.mocked(getBalancePaymentAttemptByMerchantTradeNo);
const updateBalancePaymentAttemptStatusMock = vi.mocked(updateBalancePaymentAttemptStatus);
const updateOrderPaymentStatusMock = vi.mocked(updateOrderPaymentStatus);
const deductInventoryAfterPaymentMock = vi.mocked(deductInventoryAfterPayment);
const deductInventoryAfterBalancePaymentMock = vi.mocked(deductInventoryAfterBalancePayment);
const notifyCustomerOrderPlacedSafelyMock = vi.mocked(notifyCustomerOrderPlacedSafely);

function ecpayPaidPayload() {
  return {
    MerchantTradeNo: "CREDIT001",
    RtnCode: "1",
    TradeNo: "TRADE001",
    TradeAmt: "1880",
    CheckMacValue: "VALID",
  };
}

describe("ECPay order placed notification timing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyCheckMacValueMock.mockReturnValue(true);
    getBalancePaymentByMerchantTradeNoMock.mockResolvedValue(null);
    getBalancePaymentAttemptByMerchantTradeNoMock.mockResolvedValue(null);
    updateOrderPaymentStatusMock.mockResolvedValue(true);
  });

  it("notifies the customer when a pending credit-card order is paid", async () => {
    getOrderByMerchantTradeNoMock.mockResolvedValue({
      id: 301,
      merchantTradeNo: "CREDIT001",
      paymentStatus: "pending",
      totalAmount: 1880,
    } as Awaited<ReturnType<typeof getOrderByMerchantTradeNo>>);

    await expect(handleECPayPaymentNotify(ecpayPaidPayload())).resolves.toBe("1|OK");

    expect(updateOrderPaymentStatusMock).toHaveBeenCalledWith(
      "CREDIT001",
      "paid",
      "TRADE001",
      expect.objectContaining({ MerchantTradeNo: "CREDIT001" })
    );
    expect(deductInventoryAfterPaymentMock).toHaveBeenCalledWith("CREDIT001");
    expect(notifyCustomerOrderPlacedSafelyMock).toHaveBeenCalledWith(301);
  });

  it("does not send the placed notification again for an already-paid order", async () => {
    getOrderByMerchantTradeNoMock.mockResolvedValue({
      id: 302,
      merchantTradeNo: "CREDIT001",
      paymentStatus: "paid",
      totalAmount: 1880,
    } as Awaited<ReturnType<typeof getOrderByMerchantTradeNo>>);

    updateOrderPaymentStatusMock.mockResolvedValue(false);

    await expect(handleECPayPaymentNotify(ecpayPaidPayload())).resolves.toBe("1|OK");

    expect(updateOrderPaymentStatusMock).toHaveBeenCalled();
    expect(deductInventoryAfterPaymentMock).not.toHaveBeenCalled();
    expect(notifyCustomerOrderPlacedSafelyMock).not.toHaveBeenCalled();
  });
});

describe("ECPay balance payment retry attempts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyCheckMacValueMock.mockReturnValue(true);
    getOrderByMerchantTradeNoMock.mockResolvedValue(null);
    getBalancePaymentByMerchantTradeNoMock.mockResolvedValue(null);
    getBalancePaymentAttemptByMerchantTradeNoMock.mockResolvedValue({
      id: 8,
      balancePaymentId: 3,
      merchantTradeNo: "CBATTEMPT001",
      amount: 1150,
      shippingFee: 0,
      paymentFee: 0,
      totalAmount: 1150,
      paymentMethod: "credit",
      paymentStatus: "pending",
      checkoutData: null,
      tradeNo: null,
      ecpayNotifyData: null,
      paidAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      balancePayment: {
        id: 3,
        orderId: 88,
        merchantTradeNo: "CBSTABLELINK001",
        amount: 1150,
        shippingFee: 0,
        paymentFee: 0,
        totalAmount: 1150,
        paymentMethod: "credit",
        paymentStatus: "pending",
        transferLastFive: null,
        transferReceiptUrl: null,
        tradeNo: null,
        ecpayNotifyData: null,
        paidAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  });

  it("records a failed card attempt without invalidating the stable balance link", async () => {
    updateBalancePaymentAttemptStatusMock.mockResolvedValue({
      merchantTradeNo: "CBATTEMPT001",
      balancePayment: { merchantTradeNo: "CBSTABLELINK001" },
    } as any);

    await expect(handleECPayPaymentNotify({
      MerchantTradeNo: "CBATTEMPT001",
      RtnCode: "10100058",
      TradeNo: "FAILED001",
      TradeAmt: "1150",
      CheckMacValue: "VALID",
    })).resolves.toBe("1|OK");

    expect(updateBalancePaymentAttemptStatusMock).toHaveBeenCalledWith(
      "CBATTEMPT001",
      "failed",
      "FAILED001",
      expect.objectContaining({ RtnCode: "10100058" }),
    );
  });

  it("validates callback amount against the individual attempt snapshot", async () => {
    await expect(handleECPayPaymentNotify({
      MerchantTradeNo: "CBATTEMPT001",
      RtnCode: "1",
      TradeNo: "TRADE001",
      TradeAmt: "1",
      CheckMacValue: "VALID",
    })).resolves.toBe("0|TradeAmt Error");

    expect(updateBalancePaymentAttemptStatusMock).not.toHaveBeenCalled();
  });

  it("deducts inventory only once when the same paid attempt callback arrives concurrently", async () => {
    const claimed = {
      merchantTradeNo: "CBATTEMPT001",
      balancePayment: { merchantTradeNo: "CBSTABLELINK001" },
    } as any;
    updateBalancePaymentAttemptStatusMock
      .mockResolvedValueOnce(claimed)
      .mockResolvedValueOnce(null);
    const payload = {
      MerchantTradeNo: "CBATTEMPT001",
      RtnCode: "1",
      TradeNo: "TRADE001",
      TradeAmt: "1150",
      CheckMacValue: "VALID",
    };

    await Promise.all([
      handleECPayPaymentNotify(payload),
      handleECPayPaymentNotify(payload),
    ]);

    expect(deductInventoryAfterBalancePaymentMock).toHaveBeenCalledTimes(1);
    expect(deductInventoryAfterBalancePaymentMock).toHaveBeenCalledWith("CBSTABLELINK001");
  });
});
