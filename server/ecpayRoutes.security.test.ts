import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleECPayPaymentNotify } from "./ecpayRoutes";
import { verifyCheckMacValue } from "./ecpay";
import {
  getBalancePaymentByMerchantTradeNo,
  getOrderByMerchantTradeNo,
  updateOrderPaymentStatus,
} from "./orderDb";
import { deductInventoryAfterPayment } from "./inventoryDb";
import { notifyCustomerOrderPlacedSafely } from "./customerOrderNotification";

vi.mock("./ecpay", () => ({
  verifyCheckMacValue: vi.fn(),
}));

vi.mock("./ecpayLogistics", () => ({
  verifyLogisticsCheckMacValue: vi.fn(),
  buildCVSMapParams: vi.fn(),
  createCVSLogisticsOrder: vi.fn(),
  createHomeLogisticsOrder: vi.fn(),
  ECPAY_LOGISTICS_CONFIG: { MapURL: "https://example.test/ecpay-map" },
}));

vi.mock("./orderDb", () => ({
  getOrderByMerchantTradeNo: vi.fn(),
  updateOrderPaymentStatus: vi.fn(),
  getBalancePaymentByMerchantTradeNo: vi.fn(),
  updateBalancePaymentStatus: vi.fn(),
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

vi.mock("./db", () => ({ getDb: vi.fn() }));

const verifyCheckMacValueMock = vi.mocked(verifyCheckMacValue);
const getOrderByMerchantTradeNoMock = vi.mocked(getOrderByMerchantTradeNo);
const getBalancePaymentByMerchantTradeNoMock = vi.mocked(getBalancePaymentByMerchantTradeNo);
const updateOrderPaymentStatusMock = vi.mocked(updateOrderPaymentStatus);
const deductInventoryAfterPaymentMock = vi.mocked(deductInventoryAfterPayment);
const notifyCustomerOrderPlacedSafelyMock = vi.mocked(notifyCustomerOrderPlacedSafely);

function paidPayload(overrides: Record<string, string> = {}) {
  return {
    MerchantID: "MERCHANT001",
    MerchantTradeNo: "CREDIT001",
    RtnCode: "1",
    TradeNo: "TRADE001",
    TradeAmt: "1880",
    CheckMacValue: "VALID",
    ...overrides,
  };
}

describe("ECPay callback security regression coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyCheckMacValueMock.mockReturnValue(true);
    getBalancePaymentByMerchantTradeNoMock.mockResolvedValue(null);
    getOrderByMerchantTradeNoMock.mockResolvedValue({
      id: 301,
      merchantTradeNo: "CREDIT001",
      paymentMethod: "credit",
      paymentStatus: "pending",
      totalAmount: 1880,
    } as Awaited<ReturnType<typeof getOrderByMerchantTradeNo>>);
  });

  it("rejects a signed callback whose amount differs from the stored order total", async () => {
    await expect(
      handleECPayPaymentNotify(paidPayload({ TradeAmt: "1" }))
    ).resolves.toBe("0|TradeAmt Error");

    expect(updateOrderPaymentStatusMock).not.toHaveBeenCalled();
    expect(deductInventoryAfterPaymentMock).not.toHaveBeenCalled();
  });

  it("claims a simultaneous paid callback only once", async () => {
    updateOrderPaymentStatusMock
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    await Promise.all([
      handleECPayPaymentNotify(paidPayload()),
      handleECPayPaymentNotify(paidPayload()),
    ]);

    expect(updateOrderPaymentStatusMock).toHaveBeenCalledTimes(2);
    expect(deductInventoryAfterPaymentMock).toHaveBeenCalledTimes(1);
    expect(notifyCustomerOrderPlacedSafelyMock).toHaveBeenCalledTimes(1);
  });
});
