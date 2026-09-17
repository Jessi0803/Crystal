import { describe, expect, it } from "vitest";
import {
  classifyECPayLogisticsStatus,
  LOGISTICS_STATUS_ALLOWED_FROM,
  ORDER_STATUS_ALLOWED_FROM,
  orderStatusForLogistics,
  parseECPayStatusDate,
} from "./logisticsStatus";

const statusOf = (data: Parameters<typeof classifyECPayLogisticsStatus>[0]) => {
  const result = classifyECPayLogisticsStatus(data);
  return result.kind === "status" ? result.status : result.kind;
};

describe("classifyECPayLogisticsStatus", () => {
  it("maps 7-ELEVEN C2C logistics status codes", () => {
    expect(statusOf({ LogisticsSubType: "UNIMARTC2C", RtnCode: "2073" })).toBe("arrived");
    expect(statusOf({ LogisticsSubType: "UNIMARTC2C", RtnCode: "2098" })).toBe("arrived");
    expect(statusOf({ LogisticsSubType: "UNIMARTC2C", RtnCode: "2067" })).toBe("picked_up");
    expect(statusOf({ LogisticsSubType: "UNIMARTC2C", RtnCode: "2074" })).toBe("returned");
  });

  it("maps FamilyMart C2C logistics status codes", () => {
    expect(statusOf({ LogisticsSubType: "FAMIC2C", RtnCode: "3018" })).toBe("arrived");
    expect(statusOf({ LogisticsSubType: "FAMIC2C", RtnCode: "3022" })).toBe("picked_up");
    expect(statusOf({ LogisticsSubType: "FAMIC2C", RtnCode: "3020" })).toBe("returned");
  });

  it("keeps logistics-center updates in transit", () => {
    expect(statusOf({ LogisticsSubType: "FAMIC2C", RtnCode: "3024" })).toBe("in_transit");
    expect(statusOf({ LogisticsSubType: "UNIMARTC2C", RtnCode: "300" })).toBe("in_transit");
    expect(statusOf({ LogisticsSubType: "UNIMARTC2C", RtnCode: "2062" })).toBe("in_transit");
  });

  it("marks expired seller-unshipped CVS orders as failed and needing attention", () => {
    expect(classifyECPayLogisticsStatus({ LogisticsType: "CVS_UNIMARTC2C", RtnCode: "7013" })).toEqual({
      kind: "status",
      status: "failed",
      needsAttention: true,
    });
  });

  describe("black cat (TCAT) home delivery", () => {
    it("treats 3003 配完 as delivered, not failed", () => {
      expect(statusOf({ LogisticsSubType: "TCAT", RtnCode: "3003" })).toBe("picked_up");
      expect(statusOf({ LogisticsType: "HOME_TCAT", RtnCode: "3003" })).toBe("picked_up");
      expect(statusOf({ LogisticsType: "HOME", RtnCode: "3003" })).toBe("picked_up");
    });

    it.each([
      ["3002", "不在家"],
      ["3004", "送錯營業所"],
      ["3006", "配送中"],
      ["3122", "另約時間"],
      ["310", "訂單上傳物流中"],
      ["7013", "CVS-only code"],
    ])("keeps %s (%s) in transit", (code) => {
      expect(statusOf({ LogisticsSubType: "TCAT", RtnCode: code })).toBe("in_transit");
    });

    it.each(["5004", "5005", "5008"])("maps return code %s to returned", (code) => {
      expect(statusOf({ LogisticsSubType: "TCAT", RtnCode: code })).toBe("returned");
    });

    it.each(["5001", "5002", "5006", "5007", "7005"])("flags %s for manual follow-up", (code) => {
      expect(classifyECPayLogisticsStatus({ LogisticsSubType: "TCAT", RtnCode: code })).toEqual({
        kind: "status",
        status: "failed",
        needsAttention: true,
      });
    });

    it.each(["3016", "3017"])("only records reversal code %s", (code) => {
      expect(classifyECPayLogisticsStatus({ LogisticsSubType: "TCAT", RtnCode: code })).toEqual({ kind: "record_only" });
    });
  });
});

describe("status transition rules", () => {
  it("never lets a finished logistics status move backwards", () => {
    expect(LOGISTICS_STATUS_ALLOWED_FROM.arrived).not.toContain("picked_up");
    expect(LOGISTICS_STATUS_ALLOWED_FROM.in_transit).not.toContain("arrived");
    expect(LOGISTICS_STATUS_ALLOWED_FROM.failed).not.toContain("picked_up");
    expect(LOGISTICS_STATUS_ALLOWED_FROM.picked_up).toContain("failed");
  });

  it("never overwrites orders finished or cancelled by admins", () => {
    for (const allowed of Object.values(ORDER_STATUS_ALLOWED_FROM)) {
      expect(allowed).not.toContain("completed");
      expect(allowed).not.toContain("cancelled");
      expect(allowed).not.toContain("picked_up");
      expect(allowed).not.toContain("not_picked");
    }
    expect(ORDER_STATUS_ALLOWED_FROM.arrived).not.toContain("arrived");
  });

  it("syncs only arrival, pickup and return to the order", () => {
    expect(orderStatusForLogistics("arrived")).toBe("arrived");
    expect(orderStatusForLogistics("picked_up")).toBe("picked_up");
    expect(orderStatusForLogistics("returned")).toBe("not_picked");
    expect(orderStatusForLogistics("in_transit")).toBeNull();
    expect(orderStatusForLogistics("failed")).toBeNull();
  });
});

describe("parseECPayStatusDate", () => {
  it("reads ECPay dates as Taiwan time", () => {
    expect(parseECPayStatusDate("2026/09/17 14:05:33")?.toISOString()).toBe("2026-09-17T06:05:33.000Z");
  });

  it("returns null for missing or malformed dates", () => {
    expect(parseECPayStatusDate(undefined)).toBeNull();
    expect(parseECPayStatusDate("2026-09-17")).toBeNull();
    expect(parseECPayStatusDate("2026/13/45 99:99:99")).toBeNull();
  });
});
