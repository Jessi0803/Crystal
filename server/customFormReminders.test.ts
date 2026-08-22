import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

vi.mock("./email", () => ({
  sendCustomFormReminderEmail: vi.fn(),
}));

vi.mock("./lineMessage", () => ({
  notifyLineCustomFormReminder: vi.fn(),
}));

vi.mock("./orderDb", () => ({
  getOrderWithItems: vi.fn(),
}));

import { getDb } from "./db";
import { sendCustomFormReminderEmail } from "./email";
import { notifyLineCustomFormReminder } from "./lineMessage";
import { getOrderWithItems } from "./orderDb";
import { runCustomFormReminderJob } from "./customFormReminders";

const getDbMock = vi.mocked(getDb);
const sendCustomFormReminderEmailMock = vi.mocked(sendCustomFormReminderEmail);
const notifyLineCustomFormReminderMock = vi.mocked(notifyLineCustomFormReminder);
const getOrderWithItemsMock = vi.mocked(getOrderWithItems);
const now = new Date("2026-08-22T12:00:00Z");

function createCandidate(overrides: Partial<{
  id: number;
  merchantTradeNo: string;
  buyerName: string;
  buyerEmail: string;
  paidAt: Date;
  customFormReminder3mSentAt: Date | null;
  customFormReminder24hSentAt: Date | null;
  customFormReminder72hSentAt: Date | null;
}> = {}) {
  return {
    id: 101,
    merchantTradeNo: "CUSTOM001",
    buyerName: "測試顧客",
    buyerEmail: "buyer@example.com",
    paidAt: new Date("2026-08-21T10:00:00Z"),
    customFormReminder3mSentAt: null,
    customFormReminder24hSentAt: null,
    customFormReminder72hSentAt: null,
    ...overrides,
  };
}

function createMockDb(candidates: unknown[]) {
  const execute = vi
    .fn()
    .mockResolvedValueOnce([[{ columnName: "customFormReminder3mSentAt" }, { columnName: "customFormReminder24hSentAt" }, { columnName: "customFormReminder72hSentAt" }]])
    .mockResolvedValueOnce([candidates])
    .mockResolvedValue([[]]);
  return {
    execute,
  };
}

function createOrderWithPendingCustomNote(customerNote: string | null = null) {
  return {
    customerNote,
    items: [
      {
        id: 501,
        productId: "custom-deposit-product",
        quantity: 1,
      },
    ],
  };
}

describe("custom form reminders", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    vi.clearAllMocks();
    process.env.SITE_URL = "https://lafleur.test/";
    getOrderWithItemsMock.mockResolvedValue(createOrderWithPendingCustomNote() as Awaited<ReturnType<typeof getOrderWithItems>>);
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.SITE_URL;
  });

  it("sends the 24-hour reminder by LINE and marks it sent", async () => {
    const db = createMockDb([createCandidate()]);
    getDbMock.mockResolvedValue(db as Awaited<ReturnType<typeof getDb>>);
    notifyLineCustomFormReminderMock.mockResolvedValue({ sent: true });

    const result = await runCustomFormReminderJob();

    expect(result).toEqual({ scanned: 1, sent3m: 0, sent24h: 1, sent72h: 0, skipped: 0, failed: 0 });
    expect(notifyLineCustomFormReminderMock).toHaveBeenCalledWith(101, "24h");
    expect(sendCustomFormReminderEmailMock).not.toHaveBeenCalled();
    expect(db.execute).toHaveBeenCalledTimes(3);
  });

  it("falls back to email when the order is not linked to a LINE user", async () => {
    const db = createMockDb([createCandidate()]);
    getDbMock.mockResolvedValue(db as Awaited<ReturnType<typeof getDb>>);
    notifyLineCustomFormReminderMock.mockResolvedValue({ sent: false, reason: "missing_line_user" });

    const result = await runCustomFormReminderJob();

    expect(result.sent24h).toBe(1);
    expect(sendCustomFormReminderEmailMock).toHaveBeenCalledWith({
      to: "buyer@example.com",
      buyerName: "測試顧客",
      merchantTradeNo: "CUSTOM001",
      reminderStage: "24h",
      formUrl: "https://lafleur.test/order/CUSTOM001",
    });
  });

  it("sends the 3-minute test reminder before the formal 24-hour reminder is due", async () => {
    const db = createMockDb([
      createCandidate({
        paidAt: new Date("2026-08-22T11:56:00Z"),
      }),
    ]);
    getDbMock.mockResolvedValue(db as Awaited<ReturnType<typeof getDb>>);
    notifyLineCustomFormReminderMock.mockResolvedValue({ sent: true });

    const result = await runCustomFormReminderJob();

    expect(result).toEqual({ scanned: 1, sent3m: 1, sent24h: 0, sent72h: 0, skipped: 0, failed: 0 });
    expect(notifyLineCustomFormReminderMock).toHaveBeenCalledWith(101, "3m");
    expect(db.execute).toHaveBeenCalledTimes(3);
  });

  it("still reminds when only one of two identical custom items has been submitted", async () => {
    const db = createMockDb([createCandidate()]);
    getDbMock.mockResolvedValue(db as Awaited<ReturnType<typeof getDb>>);
    notifyLineCustomFormReminderMock.mockResolvedValue({ sent: true });
    getOrderWithItemsMock.mockResolvedValue({
      customerNote: "【客製需求開始：custom-deposit-product:501:1】\n第一件\n【客製需求結束：custom-deposit-product:501:1】",
      items: [
        {
          id: 501,
          productId: "custom-deposit-product",
          quantity: 2,
        },
      ],
    } as Awaited<ReturnType<typeof getOrderWithItems>>);

    const result = await runCustomFormReminderJob();

    expect(result.sent24h).toBe(1);
    expect(notifyLineCustomFormReminderMock).toHaveBeenCalledWith(101, "24h");
  });

  it("treats a legacy product-level note as the first submitted item only", async () => {
    const db = createMockDb([createCandidate()]);
    getDbMock.mockResolvedValue(db as Awaited<ReturnType<typeof getDb>>);
    notifyLineCustomFormReminderMock.mockResolvedValue({ sent: true });
    getOrderWithItemsMock.mockResolvedValue({
      customerNote: "【客製需求開始：custom-deposit-product】\n舊版需求\n【客製需求結束：custom-deposit-product】",
      items: [
        {
          id: 501,
          productId: "custom-deposit-product",
          quantity: 2,
        },
      ],
    } as Awaited<ReturnType<typeof getOrderWithItems>>);

    const result = await runCustomFormReminderJob();

    expect(result.sent24h).toBe(1);
    expect(notifyLineCustomFormReminderMock).toHaveBeenCalledWith(101, "24h");
  });

  it("sends the 72-hour reminder only after the 24-hour reminder was already sent", async () => {
    const db = createMockDb([
      createCandidate({
        paidAt: new Date("2026-08-19T10:00:00Z"),
        customFormReminder24hSentAt: new Date("2026-08-20T10:30:00Z"),
      }),
    ]);
    getDbMock.mockResolvedValue(db as Awaited<ReturnType<typeof getDb>>);
    notifyLineCustomFormReminderMock.mockResolvedValue({ sent: true });

    const result = await runCustomFormReminderJob();

    expect(result).toEqual({ scanned: 1, sent3m: 0, sent24h: 0, sent72h: 1, skipped: 0, failed: 0 });
    expect(notifyLineCustomFormReminderMock).toHaveBeenCalledWith(101, "72h");
    expect(db.execute).toHaveBeenCalledTimes(3);
  });
});
