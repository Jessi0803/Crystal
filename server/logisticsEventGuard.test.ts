/**
 * 物流事件寫入的防護
 *
 * 事件歷史是附加功能；綠界回呼真正要做的是更新訂單與物流狀態。
 * 寫歷史失敗時不可以把例外往上丟，否則後面的狀態更新整段不會執行。
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const insertMock = vi.fn();
vi.mock("./db", () => ({
  getDb: vi.fn(async () => ({
    insert: () => ({
      values: (v: unknown) => ({
        onDuplicateKeyUpdate: () => insertMock(v),
      }),
    }),
  })),
}));

const { recordLogisticsEvent, recordLogisticsEventSafely } = await import("./orderDb");

const base = {
  logisticsOrderId: 1,
  orderId: 2,
  logisticsMerchantTradeNo: "L20261005001",
  eventKind: "status" as const,
  normalizedStatus: "arrived" as const,
  occurredAt: new Date("2026-10-05T06:30:00.000Z"),
};

afterEach(() => {
  insertMock.mockReset();
  vi.restoreAllMocks();
});

describe("欄位長度截斷", () => {
  it("message 超過 255 字會被截斷，不會讓整筆寫入失敗", async () => {
    insertMock.mockResolvedValue(undefined);
    await recordLogisticsEvent({ ...base, message: "綠".repeat(400) });
    const values = insertMock.mock.calls[0][0];
    expect(values.message).toHaveLength(255);
  });

  it("rawCode 超過 20 字會被截斷", async () => {
    insertMock.mockResolvedValue(undefined);
    await recordLogisticsEvent({ ...base, rawCode: "3".repeat(50) });
    expect(insertMock.mock.calls[0][0].rawCode).toHaveLength(20);
  });

  it("長度在範圍內的照原樣寫入", async () => {
    insertMock.mockResolvedValue(undefined);
    await recordLogisticsEvent({ ...base, rawCode: "3001", message: "已到店" });
    const values = insertMock.mock.calls[0][0];
    expect(values.rawCode).toBe("3001");
    expect(values.message).toBe("已到店");
  });

  it("null 與 undefined 都存成 null", async () => {
    insertMock.mockResolvedValue(undefined);
    await recordLogisticsEvent({ ...base, rawCode: null, message: undefined });
    const values = insertMock.mock.calls[0][0];
    expect(values.rawCode).toBeNull();
    expect(values.message).toBeNull();
  });
});

describe("recordLogisticsEventSafely", () => {
  it("寫入成功回 true", async () => {
    insertMock.mockResolvedValue(undefined);
    await expect(recordLogisticsEventSafely({ ...base })).resolves.toBe(true);
  });

  it("寫入失敗時吞掉例外並回 false，呼叫端才能繼續更新狀態", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    insertMock.mockRejectedValue(new Error("Data too long for column 'message'"));
    await expect(recordLogisticsEventSafely({ ...base })).resolves.toBe(false);
  });

  it("失敗時會留下 log，方便事後追查", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    insertMock.mockRejectedValue(new Error("boom"));
    await recordLogisticsEventSafely({ ...base });
    expect(spy).toHaveBeenCalled();
    expect(String(spy.mock.calls[0][1])).toContain("L20261005001");
  });
});
