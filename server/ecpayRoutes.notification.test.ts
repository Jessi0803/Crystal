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
  ECPAY_LOGISTICS_CONFIG: {
    MapURL: "https://logistics-stage.ecpay.com.tw/Express/map",
  },
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

vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

const verifyCheckMacValueMock = vi.mocked(verifyCheckMacValue);
const getOrderByMerchantTradeNoMock = vi.mocked(getOrderByMerchantTradeNo);
const getBalancePaymentByMerchantTradeNoMock = vi.mocked(getBalancePaymentByMerchantTradeNo);
const updateOrderPaymentStatusMock = vi.mocked(updateOrderPaymentStatus);
const deductInventoryAfterPaymentMock = vi.mocked(deductInventoryAfterPayment);
const notifyCustomerOrderPlacedSafelyMock = vi.mocked(notifyCustomerOrderPlacedSafely);

function ecpayPaidPayload() {
  return {
    MerchantTradeNo: "CREDIT001",
    RtnCode: "1",
    TradeNo: "TRADE001",
    CheckMacValue: "VALID",
  };
}

describe("ECPay order placed notification timing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyCheckMacValueMock.mockReturnValue(true);
    getBalancePaymentByMerchantTradeNoMock.mockResolvedValue(null);
  });

  it("notifies the customer when a pending credit-card order is paid", async () => {
    getOrderByMerchantTradeNoMock.mockResolvedValue({
      id: 301,
      merchantTradeNo: "CREDIT001",
      paymentStatus: "pending",
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
    } as Awaited<ReturnType<typeof getOrderByMerchantTradeNo>>);

    await expect(handleECPayPaymentNotify(ecpayPaidPayload())).resolves.toBe("1|OK");

    expect(updateOrderPaymentStatusMock).toHaveBeenCalled();
    expect(deductInventoryAfterPaymentMock).toHaveBeenCalledWith("CREDIT001");
    expect(notifyCustomerOrderPlacedSafelyMock).not.toHaveBeenCalled();
  });
});
