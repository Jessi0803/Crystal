import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ getDb: vi.fn() }));

import { getDb } from "./db";
import { createLogisticsOrder, recordLogisticsEvent } from "./orderDb";

const getDbMock = vi.mocked(getDb);

describe("logistics event persistence", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses a deterministic unique key and an idempotent upsert for repeated callbacks", async () => {
    const written: Record<string, unknown>[] = [];
    const onDuplicateKeyUpdate = vi.fn().mockResolvedValue(undefined);
    const db = {
      insert: vi.fn(() => ({
        values: vi.fn((value: Record<string, unknown>) => {
          written.push(value);
          return { onDuplicateKeyUpdate };
        }),
      })),
    };
    getDbMock.mockResolvedValue(db as any);

    const event = {
      logisticsOrderId: 91,
      orderId: 501,
      logisticsMerchantTradeNo: "L1789600000000",
      eventKind: "status" as const,
      normalizedStatus: "arrived" as const,
      rawCode: "2073",
      message: "包裹配達取件門市",
      occurredAt: new Date("2026-09-17T06:05:33.000Z"),
      rawData: { RtnCode: "2073" },
    };

    await recordLogisticsEvent(event);
    await recordLogisticsEvent(event);

    expect(written).toHaveLength(2);
    expect(written[0].eventKey).toMatch(/^[a-f0-9]{64}$/);
    expect(written[1].eventKey).toBe(written[0].eventKey);
    expect(onDuplicateKeyUpdate).toHaveBeenCalledTimes(2);
    expect(onDuplicateKeyUpdate).toHaveBeenLastCalledWith({
      set: { eventKey: written[0].eventKey },
    });
  });

  it("creates the logistics order and initial history event in one transaction", async () => {
    const inserted: Record<string, unknown>[] = [];
    const createdAt = new Date("2026-10-05T01:02:03.000Z");
    const created = {
      id: 91,
      orderId: 501,
      logisticsMerchantTradeNo: "L1789600000000",
      createdAt,
    };
    const tx = {
      insert: vi.fn(() => ({
        values: vi.fn((value: Record<string, unknown>) => {
          inserted.push(value);
          return Promise.resolve(undefined);
        }),
      })),
      select: vi.fn(() => {
        const chain: any = {
          from: () => chain,
          where: () => chain,
          limit: () => Promise.resolve([created]),
        };
        return chain;
      }),
    };
    const db = {
      transaction: vi.fn(async (callback: (transaction: typeof tx) => unknown) => callback(tx)),
    };
    getDbMock.mockResolvedValue(db as any);

    await expect(createLogisticsOrder({
      orderId: 501,
      logisticsMerchantTradeNo: "L1789600000000",
      logisticsType: "CVS",
      logisticsSubType: "UNIMARTC2C",
    })).resolves.toEqual(created);

    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(inserted).toHaveLength(2);
    expect(inserted[1]).toMatchObject({
      logisticsOrderId: 91,
      orderId: 501,
      eventKind: "synthetic",
      normalizedStatus: "created",
      occurredAt: createdAt,
    });
  });
});
