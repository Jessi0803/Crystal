import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./couponDb", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./couponDb")>();
  return {
    ...actual,
    createCouponTemplate: vi.fn(),
    updateCouponTemplate: vi.fn(),
    getCouponTemplate: vi.fn(),
    issueCoupon: vi.fn(),
    listMemberCoupons: vi.fn(),
    saveLineFriendRewardSettings: vi.fn(),
  };
});

vi.mock("./db", () => ({ getDb: vi.fn() }));
vi.mock("./auditDb", () => ({ recordAuditEventSafely: vi.fn() }));

import { couponRouter, parseFixedExpiresOn } from "./routers/coupons";
import {
  computeCouponExpiresAt,
  CouponError,
  createCouponTemplate,
  getCouponTemplate,
  isReservationReleasable,
  issueCoupon,
  markCouponUsedForOrderSafely,
  releaseCouponsForOrdersSafely,
  listMemberCoupons,
  saveLineFriendRewardSettings,
  updateCouponTemplate,
} from "./couponDb";
import { getDb } from "./db";
import { recordAuditEventSafely } from "./auditDb";
import { calcCouponDiscount, getMemberCouponDisplayStatus } from "@shared/coupons";

const createCouponTemplateMock = vi.mocked(createCouponTemplate);
const updateCouponTemplateMock = vi.mocked(updateCouponTemplate);
const getCouponTemplateMock = vi.mocked(getCouponTemplate);
const issueCouponMock = vi.mocked(issueCoupon);
const listMemberCouponsMock = vi.mocked(listMemberCoupons);
const saveLineFriendRewardSettingsMock = vi.mocked(saveLineFriendRewardSettings);
const getDbMock = vi.mocked(getDb);

function caller(user: { id: number; role: string } | null) {
  return couponRouter.createCaller({ user: user as any, req: { headers: {} } as any, res: {} as any });
}

const admin = caller({ id: 1, role: "admin" });

function templateInput(overrides: Record<string, unknown> = {}) {
  return {
    name: "LINE 好友禮",
    discountAmount: 50,
    minOrderAmount: 0,
    validityType: "days_after_issue" as const,
    validDays: 30,
    fixedExpiresOn: null,
    maxPerUser: 1,
    isActive: true,
    ...overrides,
  };
}

function userLookupDb(rows: unknown[]) {
  const chain: any = {
    from: () => chain,
    where: () => chain,
    limit: () => Promise.resolve(rows),
  };
  return { select: () => chain } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("coupon admin authorization", () => {
  it.each([
    ["a guest", null],
    ["a normal member", { id: 2, role: "user" }],
  ])("rejects %s on every admin procedure", async (_label, user) => {
    const c = caller(user);
    await expect(c.adminList()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(c.adminCreate(templateInput())).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(c.adminUpdate({ id: 1, data: templateInput() })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(c.adminSetActive({ id: 1, isActive: false })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(c.adminIssue({ userId: 3, templateId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(c.adminMemberCoupons({ userId: 3 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(c.adminSaveLineRewardSettings({ enabled: true, templateId: 1 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(createCouponTemplateMock).not.toHaveBeenCalled();
    expect(issueCouponMock).not.toHaveBeenCalled();
    expect(saveLineFriendRewardSettingsMock).not.toHaveBeenCalled();
  });
});

describe("coupons.adminCreate / adminUpdate", () => {
  it("creates a fixed-amount template", async () => {
    createCouponTemplateMock.mockResolvedValue({ id: 1 } as any);
    await admin.adminCreate(templateInput());

    expect(createCouponTemplateMock).toHaveBeenCalledWith({
      name: "LINE 好友禮",
      discountAmount: 50,
      minOrderAmount: 0,
      validityType: "days_after_issue",
      validDays: 30,
      fixedExpiresAt: null,
      maxPerUser: 1,
      isActive: true,
    });
  });

  it("stores a fixed end date as the end of that day in Taiwan", async () => {
    await admin.adminCreate(templateInput({ validityType: "fixed_date", validDays: null, fixedExpiresOn: "2099-12-31" }));

    expect(createCouponTemplateMock).toHaveBeenCalledWith(expect.objectContaining({
      validDays: null,
      fixedExpiresAt: new Date("2099-12-31T15:59:59.000Z"),
    }));
  });

  it.each([
    ["zero discount", { discountAmount: 0 }],
    ["negative discount", { discountAmount: -50 }],
    ["fractional discount", { discountAmount: 10.5 }],
    ["negative minimum", { minOrderAmount: -1 }],
    ["missing valid days", { validDays: null }],
    ["zero per-user limit", { maxPerUser: 0 }],
    ["empty name", { name: "   " }],
    ["past fixed date", { validityType: "fixed_date", validDays: null, fixedExpiresOn: "2020-01-01" }],
    ["invalid fixed date", { validityType: "fixed_date", validDays: null, fixedExpiresOn: "2099-02-30" }],
  ])("rejects %s", async (_label, overrides) => {
    await expect(admin.adminCreate(templateInput(overrides))).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(createCouponTemplateMock).not.toHaveBeenCalled();
  });

  it("updates only the template", async () => {
    updateCouponTemplateMock.mockResolvedValue({ id: 5 } as any);
    await admin.adminUpdate({ id: 5, data: templateInput({ discountAmount: 100 }) });

    expect(updateCouponTemplateMock).toHaveBeenCalledWith(5, expect.objectContaining({ discountAmount: 100 }));
  });

  it("disables a template without changing its rules", async () => {
    const template = {
      id: 5,
      name: "LINE 好友禮",
      discountAmount: 50,
      minOrderAmount: 0,
      validityType: "days_after_issue",
      validDays: 30,
      fixedExpiresAt: null,
      maxPerUser: 1,
      isActive: true,
    };
    getCouponTemplateMock.mockResolvedValue(template as any);

    await admin.adminSetActive({ id: 5, isActive: false });

    expect(updateCouponTemplateMock).toHaveBeenCalledWith(5, expect.objectContaining({
      discountAmount: 50,
      isActive: false,
    }));
  });
});

describe("coupons.adminIssue", () => {
  it("issues an admin gift to an existing member", async () => {
    getDbMock.mockResolvedValue(userLookupDb([{ id: 3, openId: "email:c@example.com" }]));
    issueCouponMock.mockResolvedValue({ id: 77, name: "客服補償券", expiresAt: new Date() } as any);

    await admin.adminIssue({ userId: 3, templateId: 2 });

    expect(issueCouponMock).toHaveBeenCalledWith({
      templateId: 2,
      userId: 3,
      source: "ADMIN_GIFT",
      issuedByUserId: 1,
    });
  });

  it("rejects an unknown member", async () => {
    getDbMock.mockResolvedValue(userLookupDb([]));
    await expect(admin.adminIssue({ userId: 999, templateId: 2 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(issueCouponMock).not.toHaveBeenCalled();
  });

  it("rejects a disabled template", async () => {
    getDbMock.mockResolvedValue(userLookupDb([{ id: 3, openId: "email:c@example.com" }]));
    issueCouponMock.mockRejectedValue(new CouponError("INACTIVE", "此優惠券已停用，無法發放"));

    await expect(admin.adminIssue({ userId: 3, templateId: 2 })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "此優惠券已停用，無法發放",
    });
  });
});

describe("coupons.mine", () => {
  it("only lists the signed-in member's coupons", async () => {
    listMemberCouponsMock.mockResolvedValue([]);
    await caller({ id: 8, role: "user" }).mine();
    expect(listMemberCouponsMock).toHaveBeenCalledWith(8);
  });

  it("requires sign-in", async () => {
    await expect(caller(null).mine()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("coupon rules", () => {
  it("parses only real calendar dates", () => {
    expect(parseFixedExpiresOn("2026-12-31")?.toISOString()).toBe("2026-12-31T15:59:59.000Z");
    expect(parseFixedExpiresOn("2026-02-30")).toBeNull();
    expect(parseFixedExpiresOn("2026/12/31")).toBeNull();
  });

  it("computes expiry from the issue date or the fixed date", () => {
    const issuedAt = new Date("2026-09-17T00:00:00.000Z");
    expect(
      computeCouponExpiresAt({ validityType: "days_after_issue", validDays: 30, fixedExpiresAt: null }, issuedAt)
    ).toEqual(new Date("2026-10-17T00:00:00.000Z"));
    const fixed = new Date("2026-12-31T15:59:59.000Z");
    expect(computeCouponExpiresAt({ validityType: "fixed_date", validDays: null, fixedExpiresAt: fixed }, issuedAt)).toEqual(fixed);
    expect(computeCouponExpiresAt({ validityType: "days_after_issue", validDays: null, fixedExpiresAt: null }, issuedAt)).toBeNull();
  });

  it("discounts the product subtotal only and keeps shipping", () => {
    expect(calcCouponDiscount({ subtotal: 1000, shippingFee: 60, coupon: { discountAmount: 50, minOrderAmount: 0 } }))
      .toEqual({ ok: true, discount: 50, total: 1010 });
  });

  it("enforces the minimum order amount", () => {
    expect(calcCouponDiscount({ subtotal: 999, shippingFee: 60, coupon: { discountAmount: 50, minOrderAmount: 1000 } }))
      .toMatchObject({ ok: false });
    expect(calcCouponDiscount({ subtotal: 1000, shippingFee: 60, coupon: { discountAmount: 50, minOrderAmount: 1000 } }))
      .toMatchObject({ ok: true });
  });

  it("never produces a zero or negative payable amount", () => {
    expect(calcCouponDiscount({ subtotal: 30, shippingFee: 0, coupon: { discountAmount: 50, minOrderAmount: 0 } }))
      .toMatchObject({ ok: false });
    expect(calcCouponDiscount({ subtotal: 30, shippingFee: 60, coupon: { discountAmount: 50, minOrderAmount: 0 } }))
      .toEqual({ ok: true, discount: 30, total: 60 });
  });

  it("derives the display status", () => {
    const now = new Date("2026-09-17T00:00:00.000Z");
    const future = new Date("2026-10-17T00:00:00.000Z");
    const past = new Date("2026-09-01T00:00:00.000Z");
    expect(getMemberCouponDisplayStatus({ status: "available", expiresAt: future }, { reservationReleasable: false, now })).toBe("available");
    expect(getMemberCouponDisplayStatus({ status: "available", expiresAt: past }, { reservationReleasable: false, now })).toBe("expired");
    expect(getMemberCouponDisplayStatus({ status: "used", expiresAt: past }, { reservationReleasable: false, now })).toBe("used");
    expect(getMemberCouponDisplayStatus({ status: "reserved", expiresAt: future }, { reservationReleasable: false, now })).toBe("pending");
    expect(getMemberCouponDisplayStatus({ status: "reserved", expiresAt: future }, { reservationReleasable: true, now })).toBe("available");
  });

  it("releases only stale reservations of unpaid card orders", () => {
    const now = new Date("2026-09-17T01:00:00.000Z");
    const recent = new Date("2026-09-17T00:45:00.000Z");
    const stale = new Date("2026-09-17T00:29:00.000Z");
    const pendingCard = { paymentStatus: "pending", paymentMethod: "credit" };

    expect(isReservationReleasable({ status: "reserved", reservedAt: recent, orderId: 1 }, pendingCard, now)).toBe(false);
    expect(isReservationReleasable({ status: "reserved", reservedAt: stale, orderId: 1 }, pendingCard, now)).toBe(true);
    expect(isReservationReleasable({ status: "reserved", reservedAt: stale, orderId: 1 }, { paymentStatus: "pending", paymentMethod: "paypal" }, now)).toBe(true);
    // 已送出轉帳資料的訂單不釋放
    expect(isReservationReleasable({ status: "reserved", reservedAt: stale, orderId: 1 }, { paymentStatus: "transfer_pending", paymentMethod: "atm" }, now)).toBe(false);
    expect(isReservationReleasable({ status: "reserved", reservedAt: stale, orderId: 1 }, { paymentStatus: "paid", paymentMethod: "credit" }, now)).toBe(false);
    expect(isReservationReleasable({ status: "reserved", reservedAt: stale, orderId: null }, null, now)).toBe(true);
    expect(isReservationReleasable({ status: "used", reservedAt: stale, orderId: 1 }, pendingCard, now)).toBe(false);
  });
});

describe("coupon lifecycle hooks never break the order flow", () => {
  it("records an audit error instead of throwing when the database fails", async () => {
    getDbMock.mockResolvedValue(null as any);

    await expect(markCouponUsedForOrderSafely(10, { merchantTradeNo: "T10" })).resolves.toBeNull();
    await expect(
      releaseCouponsForOrdersSafely([10], { includeUsed: true, reason: "test" })
    ).resolves.toBeNull();

    expect(vi.mocked(recordAuditEventSafely)).toHaveBeenCalledWith(expect.objectContaining({
      action: "coupon.use",
      outcome: "failed",
      severity: "error",
      orderId: 10,
    }));
    expect(vi.mocked(recordAuditEventSafely)).toHaveBeenCalledWith(expect.objectContaining({
      action: "coupon.release",
      outcome: "failed",
      severity: "error",
    }));
  });
});
