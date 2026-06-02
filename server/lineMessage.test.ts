import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "./db";
import {
  notifyLineOrderPlaced,
  notifyLineOrderShipped,
  notifyLineSafely,
} from "./lineMessage";

const getDbMock = vi.mocked(getDb);
const originalLineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const originalLineMessagingToken = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;
const originalSiteUrl = process.env.SITE_URL;

type QueryResult = unknown[];

function createQueryResult(result: QueryResult) {
  return {
    limit: vi.fn(async () => result),
    then: (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
}

function createMockDb(results: QueryResult[]) {
  const queue = [...results];
  return {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => createQueryResult(queue.shift() ?? [])),
      })),
    })),
  };
}

describe("LINE customer notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.LINE_CHANNEL_ACCESS_TOKEN = "test-line-token";
    delete process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;
    process.env.SITE_URL = "https://example.test/";
    global.fetch = vi.fn(async () => new Response("{}", { status: 200 })) as typeof fetch;
  });

  afterEach(() => {
    if (originalLineToken === undefined) {
      delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
    } else {
      process.env.LINE_CHANNEL_ACCESS_TOKEN = originalLineToken;
    }

    if (originalLineMessagingToken === undefined) {
      delete process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;
    } else {
      process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN = originalLineMessagingToken;
    }

    if (originalSiteUrl === undefined) {
      delete process.env.SITE_URL;
    } else {
      process.env.SITE_URL = originalSiteUrl;
    }
    vi.restoreAllMocks();
  });

  it("pushes an order placed message to the LINE user linked to the order", async () => {
    getDbMock.mockResolvedValue(
      createMockDb([
        [{ userId: 9 }],
        [{ openId: "line:U_TEST_BUYER" }],
        [
          {
            id: 101,
            merchantTradeNo: "ORDER123",
            buyerName: "測試顧客",
            paymentMethod: "atm",
            totalAmount: 1680,
          },
        ],
        [
          { productId: "bracelet-1", productName: "能量手鍊", quantity: 1 },
          { productId: "shipping-fee", productName: "運費", quantity: 1 },
        ],
      ]) as Awaited<ReturnType<typeof getDb>>
    );

    const result = await notifyLineOrderPlaced(101);

    expect(result).toEqual({ sent: true });
    expect(fetch).toHaveBeenCalledWith(
      "https://api.line.me/v2/bot/message/push",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-line-token",
          "Content-Type": "application/json",
        }),
      })
    );

    const [, request] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(String((request as RequestInit).body)) as {
      to: string;
      messages: { type: string; text: string }[];
    };
    expect(body.to).toBe("U_TEST_BUYER");
    expect(body.messages[0].text).toContain("已收到您的訂單");
    expect(body.messages[0].text).toContain("訂單編號：ORDER123");
    expect(body.messages[0].text).toContain("付款方式：銀行轉帳");
    expect(body.messages[0].text).toContain("訂單金額：NT$ 1,680");
    expect(body.messages[0].text).toContain("・能量手鍊 x1");
    expect(body.messages[0].text).not.toContain("運費");
    expect(body.messages[0].text).toContain("https://example.test/order/ORDER123");
  });

  it("pushes a shipped message with logistics information", async () => {
    getDbMock.mockResolvedValue(
      createMockDb([
        [{ userId: 9 }],
        [{ openId: "line:U_TEST_BUYER" }],
        [
          {
            id: 101,
            merchantTradeNo: "ORDER123",
            buyerName: "測試顧客",
            shippingMethod: "cvs_711",
          },
        ],
        [
          {
            allPayLogisticsId: "LG123",
            logisticsMerchantTradeNo: "LORDER123",
            bookingNote: null,
          },
        ],
      ]) as Awaited<ReturnType<typeof getDb>>
    );

    const result = await notifyLineOrderShipped(101);

    expect(result).toEqual({ sent: true });
    const [, request] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(String((request as RequestInit).body)) as {
      to: string;
      messages: { text: string }[];
    };
    expect(body.to).toBe("U_TEST_BUYER");
    expect(body.messages[0].text).toContain("您的訂單已出貨");
    expect(body.messages[0].text).toContain("配送方式：7-11 店到店");
    expect(body.messages[0].text).toContain("物流編號：LG123");
  });

  it("skips safely when the order is not linked to a LINE login user", async () => {
    getDbMock.mockResolvedValue(createMockDb([[{ userId: 9 }], [{ openId: "email:buyer@example.com" }]]) as Awaited<
      ReturnType<typeof getDb>
    >);

    const result = await notifyLineOrderPlaced(101);

    expect(result).toEqual({ sent: false, reason: "missing_line_user" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("skips safely when the Messaging API token is missing", async () => {
    delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
    delete process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    getDbMock.mockResolvedValue(
      createMockDb([
        [{ userId: 9 }],
        [{ openId: "line:U_TEST_BUYER" }],
        [
          {
            id: 101,
            merchantTradeNo: "ORDER123",
            buyerName: "測試顧客",
            paymentMethod: "credit",
            totalAmount: 1680,
          },
        ],
        [],
      ]) as Awaited<ReturnType<typeof getDb>>
    );

    const result = await notifyLineOrderPlaced(101);

    expect(result).toEqual({ sent: false, reason: "missing_token" });
    expect(fetch).not.toHaveBeenCalled();
    expect(consoleWarn).toHaveBeenCalledWith("[LINE Message] LINE_CHANNEL_ACCESS_TOKEN is not configured");
  });

  it("does not throw when a LINE notification fails inside the safe wrapper", async () => {
    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => undefined);

    await expect(
      notifyLineSafely("order_placed", async () => ({ sent: false, reason: "line_api_error" }))
    ).resolves.toBeUndefined();

    expect(consoleInfo).toHaveBeenCalledWith("[LINE Message] skipped", {
      label: "order_placed",
      reason: "line_api_error",
    });
  });
});
