import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

vi.mock("./lineMessage", () => ({
  notifyLineOrderPlaced: vi.fn(),
  notifyLineOrderShipped: vi.fn(),
}));

vi.mock("./orderDb", () => ({
  getOrderWithItems: vi.fn(),
}));

vi.mock("./email", () => ({
  sendOrderConfirmEmail: vi.fn(),
  sendOrderShippedEmail: vi.fn(),
}));

import { getDb } from "./db";
import { sendOrderConfirmEmail, sendOrderShippedEmail } from "./email";
import { notifyLineOrderPlaced, notifyLineOrderShipped } from "./lineMessage";
import { getOrderWithItems } from "./orderDb";
import {
  notifyCustomerOrderPlacedSafely,
  notifyCustomerOrderShippedSafely,
} from "./customerOrderNotification";

const getDbMock = vi.mocked(getDb);
const getOrderWithItemsMock = vi.mocked(getOrderWithItems);
const notifyLineOrderPlacedMock = vi.mocked(notifyLineOrderPlaced);
const notifyLineOrderShippedMock = vi.mocked(notifyLineOrderShipped);
const sendOrderConfirmEmailMock = vi.mocked(sendOrderConfirmEmail);
const sendOrderShippedEmailMock = vi.mocked(sendOrderShippedEmail);

function createMockDb(merchantTradeNo = "ORDER123") {
  return {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => [{ merchantTradeNo }]),
        })),
      })),
    })),
  };
}

function createOrder() {
  return {
    merchantTradeNo: "ORDER123",
    buyerName: "測試顧客",
    buyerEmail: "buyer@example.com",
    totalAmount: 1680,
    shippingMethod: "home",
    paymentMethod: "atm",
    cvsStoreName: null,
    shippingAddress: "台北市測試路 1 號",
    items: [
      {
        productName: "能量手鍊",
        quantity: 1,
        unitPrice: 1680,
        subtotal: 1680,
      },
    ],
  };
}

describe("customer order notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDbMock.mockResolvedValue(createMockDb() as Awaited<ReturnType<typeof getDb>>);
    getOrderWithItemsMock.mockResolvedValue(createOrder() as Awaited<ReturnType<typeof getOrderWithItems>>);
  });

  it("does not send email when the LINE order placed notification is sent", async () => {
    notifyLineOrderPlacedMock.mockResolvedValue({ sent: true });

    await notifyCustomerOrderPlacedSafely(101);

    expect(sendOrderConfirmEmailMock).not.toHaveBeenCalled();
  });

  it("sends an order confirmation email when the order is not linked to a LINE user", async () => {
    notifyLineOrderPlacedMock.mockResolvedValue({ sent: false, reason: "missing_line_user" });

    await notifyCustomerOrderPlacedSafely(101);

    expect(sendOrderConfirmEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "buyer@example.com",
        buyerName: "測試顧客",
        merchantTradeNo: "ORDER123",
        paymentMethod: "atm",
      })
    );
  });

  it("sends a shipped email when the shipped LINE notification cannot find a LINE user", async () => {
    notifyLineOrderShippedMock.mockResolvedValue({ sent: false, reason: "missing_line_user" });

    await notifyCustomerOrderShippedSafely(101);

    expect(sendOrderShippedEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "buyer@example.com",
        merchantTradeNo: "ORDER123",
      })
    );
  });
});
