import { beforeEach, describe, expect, it, vi } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";

vi.mock("./ecpay", () => ({ verifyCheckMacValue: vi.fn() }));
vi.mock("./ecpayLogistics", () => ({
  verifyLogisticsCheckMacValue: vi.fn(),
  buildCVSMapParams: vi.fn(),
  ECPAY_LOGISTICS_CONFIG: { MapURL: "https://logistics-stage.ecpay.com.tw/Express/map" },
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
vi.mock("./customerOrderNotification", () => ({ notifyCustomerOrderPlacedSafely: vi.fn() }));
vi.mock("./couponDb", () => ({ markCouponUsedForOrderSafely: vi.fn(), releaseCouponsForOrdersSafely: vi.fn() }));
vi.mock("./db", () => ({ getDb: vi.fn() }));
vi.mock("./auditDb", () => ({ recordAuditEventSafely: vi.fn() }));

import { handleECPayLogisticsNotify } from "./ecpayRoutes";
import { verifyLogisticsCheckMacValue } from "./ecpayLogistics";
import { updateLogisticsStatus } from "./orderDb";
import { getDb } from "./db";
import { recordAuditEventSafely } from "./auditDb";

const dialect = new MySqlDialect();
const verifyMock = vi.mocked(verifyLogisticsCheckMacValue);
const updateLogisticsStatusMock = vi.mocked(updateLogisticsStatus);
const getDbMock = vi.mocked(getDb);
const auditMock = vi.mocked(recordAuditEventSafely);

type Logistics = {
  orderId: number;
  logisticsType: "CVS" | "HOME";
  logisticsSubType: string | null;
  logisticsStatus: string;
};

function setupDb(logistics: Logistics | null, orderAffectedRows = 1) {
  const orderUpdates: { values: Record<string, unknown>; sql: string; params: unknown[] }[] = [];
  const db = {
    select: () => {
      const chain: any = {
        from: () => chain,
        where: () => chain,
        limit: () => Promise.resolve(logistics ? [logistics] : []),
      };
      return chain;
    },
    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: (condition: Parameters<typeof dialect.sqlToQuery>[0]) => {
          const query = dialect.sqlToQuery(condition);
          orderUpdates.push({ values, sql: query.sql, params: query.params });
          return Promise.resolve([{ affectedRows: orderAffectedRows }]);
        },
      }),
    }),
  };
  getDbMock.mockResolvedValue(db as any);
  return orderUpdates;
}

const tcat: Logistics = { orderId: 501, logisticsType: "HOME", logisticsSubType: "TCAT", logisticsStatus: "in_transit" };

function payload(overrides: Record<string, string> = {}) {
  return {
    MerchantTradeNo: "L1789600000000",
    RtnCode: "3003",
    RtnMsg: "配完",
    LogisticsType: "HOME_TCAT",
    UpdateStatusDate: "2026/09/17 14:05:33",
    CheckMacValue: "VALID",
    ...overrides,
  };
}

function lastAudit() {
  return auditMock.mock.calls.at(-1)?.[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  verifyMock.mockReturnValue(true);
  updateLogisticsStatusMock.mockResolvedValue(true);
});

describe("handleECPayLogisticsNotify", () => {
  it("marks a delivered black-cat parcel as picked up with ECPay's status time", async () => {
    const orderUpdates = setupDb(tcat);

    await expect(handleECPayLogisticsNotify(payload())).resolves.toBe("1|OK");

    expect(updateLogisticsStatusMock).toHaveBeenCalledWith(
      "L1789600000000",
      "picked_up",
      expect.arrayContaining(["in_transit", "arrived"]),
      expect.objectContaining({ pickedUpAt: new Date("2026-09-17T06:05:33.000Z") })
    );
    expect(orderUpdates).toHaveLength(1);
    expect(orderUpdates[0].values).toEqual({ orderStatus: "picked_up" });
    expect(orderUpdates[0].params).toEqual([501, "paid", "processing", "shipped", "arrived"]);
    expect(lastAudit()).toMatchObject({ outcome: "success", severity: "info", orderId: 501 });
  });

  it("uses the stored logistics type when the callback omits it", async () => {
    setupDb(tcat);

    await handleECPayLogisticsNotify(payload({ LogisticsType: "", LogisticsSubType: "" }));

    expect(updateLogisticsStatusMock).toHaveBeenCalledWith("L1789600000000", "picked_up", expect.anything(), expect.anything());
  });

  it("leaves completed or cancelled orders untouched", async () => {
    const orderUpdates = setupDb(tcat, 0);

    await handleECPayLogisticsNotify(payload());

    // 條件只允許出貨前後的狀態，已完成的訂單不會符合
    expect(orderUpdates[0].params).not.toContain("completed");
    expect(orderUpdates[0].params).not.toContain("cancelled");
    expect(lastAudit()?.summary).toContain("訂單狀態未變更");
  });

  it("ignores a late or duplicate callback without touching the order", async () => {
    const orderUpdates = setupDb({ ...tcat, logisticsStatus: "picked_up" });
    updateLogisticsStatusMock.mockResolvedValue(false);

    await expect(handleECPayLogisticsNotify(payload({ RtnCode: "3006", RtnMsg: "配送中" }))).resolves.toBe("1|OK");

    expect(orderUpdates).toHaveLength(0);
    expect(lastAudit()).toMatchObject({ outcome: "duplicate" });
  });

  it("does not sync in-transit updates to the order", async () => {
    const orderUpdates = setupDb(tcat);

    await handleECPayLogisticsNotify(payload({ RtnCode: "3002", RtnMsg: "不在家" }));

    expect(updateLogisticsStatusMock).toHaveBeenCalledWith("L1789600000000", "in_transit", ["created"], expect.anything());
    expect(orderUpdates).toHaveLength(0);
  });

  it("maps black-cat returns to not picked up", async () => {
    const orderUpdates = setupDb(tcat);

    await handleECPayLogisticsNotify(payload({ RtnCode: "5008", RtnMsg: "退貨配完" }));

    expect(orderUpdates[0].values).toEqual({ orderStatus: "not_picked" });
  });

  it("flags lost parcels for manual follow-up without changing the order", async () => {
    const orderUpdates = setupDb(tcat);

    await handleECPayLogisticsNotify(payload({ RtnCode: "5002", RtnMsg: "遺失" }));

    expect(updateLogisticsStatusMock).toHaveBeenCalledWith("L1789600000000", "failed", expect.anything(), expect.anything());
    expect(orderUpdates).toHaveLength(0);
    expect(lastAudit()).toMatchObject({ outcome: "failed", severity: "warning" });
    expect(lastAudit()?.summary).toContain("請人工確認");
  });

  it("only records reversal codes", async () => {
    const orderUpdates = setupDb({ ...tcat, logisticsStatus: "picked_up" });

    await handleECPayLogisticsNotify(payload({ RtnCode: "3016", RtnMsg: "配完狀態刪除" }));

    expect(updateLogisticsStatusMock).not.toHaveBeenCalled();
    expect(orderUpdates).toHaveLength(0);
    expect(lastAudit()).toMatchObject({ severity: "warning", orderId: 501 });
  });

  it("keeps syncing 7-ELEVEN arrivals", async () => {
    const orderUpdates = setupDb({ orderId: 502, logisticsType: "CVS", logisticsSubType: "UNIMARTC2C", logisticsStatus: "in_transit" });

    await handleECPayLogisticsNotify(
      payload({ RtnCode: "2073", RtnMsg: "包裹配達取件門市", LogisticsType: "CVS", LogisticsSubType: "UNIMARTC2C" })
    );

    expect(updateLogisticsStatusMock).toHaveBeenCalledWith(
      "L1789600000000",
      "arrived",
      ["created", "in_transit"],
      expect.objectContaining({ arrivedAt: new Date("2026-09-17T06:05:33.000Z") })
    );
    expect(orderUpdates[0].values).toEqual({ orderStatus: "arrived" });
    expect(orderUpdates[0].params).toEqual([502, "paid", "processing", "shipped"]);
  });

  it("rejects callbacks with an invalid signature", async () => {
    verifyMock.mockReturnValue(false);
    const orderUpdates = setupDb(tcat);

    await expect(handleECPayLogisticsNotify(payload())).resolves.toBe("0|CheckMacValue Error");

    expect(getDbMock).not.toHaveBeenCalled();
    expect(updateLogisticsStatusMock).not.toHaveBeenCalled();
    expect(orderUpdates).toHaveLength(0);
  });

  it("acknowledges callbacks for unknown logistics orders", async () => {
    setupDb(null);

    await expect(handleECPayLogisticsNotify(payload())).resolves.toBe("1|OK");

    expect(updateLogisticsStatusMock).not.toHaveBeenCalled();
    expect(lastAudit()).toMatchObject({ outcome: "rejected" });
  });
});
