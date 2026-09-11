import { beforeEach, describe, expect, it, vi } from "vitest";

const getDb = vi.fn();

vi.mock("./db", () => ({
  getDb,
}));

function createQueryResult<T>(rows: T[]) {
  const builder = {
    from: vi.fn(() => builder),
    where: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    then: (resolve: (value: T[]) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(rows).then(resolve, reject),
    catch: (reject: (reason: unknown) => unknown) => Promise.resolve(rows).catch(reject),
    finally: (handler: () => unknown) => Promise.resolve(rows).finally(handler),
  };
  return builder;
}

function createMockDb(selectResults: unknown[][]) {
  const queue = [...selectResults];
  const updateSetCalls: unknown[] = [];
  const updateResults: Array<unknown> = [];
  const updateChain = {
    set: vi.fn((values: unknown) => {
      updateSetCalls.push(values);
      return updateChain;
    }),
    where: vi.fn(() => Promise.resolve(updateResults.shift() ?? [{ affectedRows: 1 }])),
  };

  const mockDb = {
    execute: vi.fn().mockResolvedValue(undefined),
    select: vi.fn(() => {
      const rows = queue.shift();
      if (!rows) throw new Error("Unexpected select call");
      return createQueryResult(rows);
    }),
    update: vi.fn(() => updateChain),
    transaction: vi.fn(async (callback: (tx: unknown) => unknown) => callback(mockDb)),
    updateSetCalls,
    updateResults,
  };
  return mockDb;
}

describe("updateBalancePaymentStatus", () => {
  beforeEach(() => {
    vi.resetModules();
    getDb.mockReset();
  });

  it("marks the parent order paid with paidAt when a credit-card balance payment succeeds", async () => {
    const mockDb = createMockDb([
      [{
        id: 3,
        orderId: 88,
        merchantTradeNo: "CBALANCE001",
        amount: 2500,
        paymentMethod: "credit",
        paymentStatus: "pending",
        transferLastFive: null,
        transferReceiptUrl: null,
        tradeNo: null,
        ecpayNotifyData: null,
        paidAt: null,
        createdAt: new Date("2026-07-01T00:00:00Z"),
        updatedAt: new Date("2026-07-01T00:00:00Z"),
      }],
    ]);
    getDb.mockResolvedValue(mockDb);

    const { updateBalancePaymentStatus } = await import("./orderDb");
    await updateBalancePaymentStatus("CBALANCE001", "paid", "TRADE001", { RtnCode: "1" });

    expect(mockDb.update).toHaveBeenCalledTimes(2);
    expect(mockDb.updateSetCalls[1]).toMatchObject({
      orderStatus: "paid",
      paymentStatus: "paid",
    });
    expect((mockDb.updateSetCalls[1] as { paidAt?: unknown }).paidAt).toBeInstanceOf(Date);
    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
  });

  it("fails the transaction when the parent order cannot be updated", async () => {
    const mockDb = createMockDb([
      [{
        id: 4,
        orderId: 999,
        merchantTradeNo: "CBALANCE002",
        amount: 1800,
        paymentMethod: "credit",
        paymentStatus: "pending",
        transferLastFive: null,
        transferReceiptUrl: null,
        tradeNo: null,
        ecpayNotifyData: null,
        paidAt: null,
        createdAt: new Date("2026-07-01T00:00:00Z"),
        updatedAt: new Date("2026-07-01T00:00:00Z"),
      }],
    ]);
    mockDb.updateResults.push([{ affectedRows: 1 }], [{ affectedRows: 0 }]);
    getDb.mockResolvedValue(mockDb);

    const { updateBalancePaymentStatus } = await import("./orderDb");
    await expect(
      updateBalancePaymentStatus("CBALANCE002", "paid", "TRADE002", { RtnCode: "1" })
    ).rejects.toThrow("Balance payment parent order not found");

    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
    expect(mockDb.update).toHaveBeenCalledTimes(2);
  });
});
