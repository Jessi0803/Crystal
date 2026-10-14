import { describe, expect, it } from "vitest";
import {
  CERT_EXPIRY_WARNING_DAYS,
  collectCertificateAlerts,
  daysUntil,
  describeAlert,
  type CertificateCheck,
} from "./certificateMonitor";

const NOW = new Date("2026-10-13T00:00:00Z");

function ok(hostname: string, validTo: string): CertificateCheck {
  const date = new Date(validTo);
  return { hostname, ok: true, validTo: date, daysRemaining: daysUntil(date, NOW), issuer: "Let's Encrypt" };
}

describe("daysUntil", () => {
  it("還沒到期回正數，已過期回負數", () => {
    expect(daysUntil(new Date("2026-10-20T00:00:00Z"), NOW)).toBe(7);
    expect(daysUntil(new Date("2026-10-13T00:00:00Z"), NOW)).toBe(0);
    expect(daysUntil(new Date("2026-09-09T00:00:00Z"), NOW)).toBe(-34);
  });

  it("不足一天捨去成 0，不會把剩 6 小時說成剩 1 天", () => {
    expect(daysUntil(new Date("2026-10-13T06:00:00Z"), NOW)).toBe(0);
  });

  it("已過期時誤差往「過更久」的方向走，不會少報", () => {
    // 實際案例：2026-09-09 01:15:23 過期，10-13 00:00 時已過 33 天 22 小時
    expect(daysUntil(new Date("2026-09-09T01:15:23Z"), NOW)).toBe(-34);
  });
});

describe("collectCertificateAlerts", () => {
  it("都還很久的時候不告警", () => {
    const checks = [ok("goodaytarot.com", "2027-01-11T00:00:00Z")];
    expect(collectCertificateAlerts(checks)).toEqual([]);
  });

  it("剩餘天數落在門檻內就告警", () => {
    const checks = [ok("goodaytarot.com", "2026-10-20T00:00:00Z")];
    const alerts = collectCertificateAlerts(checks);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].level).toBe("expiring");
  });

  it("剛好等於門檻也要告警（邊界要含在內，否則會剛好漏掉）", () => {
    const validTo = new Date(NOW.getTime() + CERT_EXPIRY_WARNING_DAYS * 86_400_000);
    const checks = [ok("goodaytarot.com", validTo.toISOString())];
    expect(collectCertificateAlerts(checks)[0]?.level).toBe("expiring");
  });

  it("已過期標成 expired，不是 expiring", () => {
    // 這就是 2026-09-09 那次實際發生的狀況
    const checks = [ok("www.goodaytarot.com", "2026-09-09T01:15:23Z")];
    const alerts = collectCertificateAlerts(checks);
    expect(alerts[0].level).toBe("expired");
  });

  it("連不上也要告警——憑證壞到連交握都失敗時更該通知", () => {
    const checks: CertificateCheck[] = [{ hostname: "www.goodaytarot.com", ok: false, error: "連線逾時" }];
    expect(collectCertificateAlerts(checks)[0].level).toBe("unreachable");
  });

  it("多個網域各自判斷，只回有問題的", () => {
    const checks = [
      ok("goodaytarot.com", "2027-01-11T00:00:00Z"),
      ok("www.goodaytarot.com", "2026-09-09T00:00:00Z"),
    ];
    const alerts = collectCertificateAlerts(checks);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].check.hostname).toBe("www.goodaytarot.com");
  });
});

describe("describeAlert", () => {
  it("過期的要講已經過幾天，這是判斷嚴重性的關鍵", () => {
    const [alert] = collectCertificateAlerts([ok("www.goodaytarot.com", "2026-09-09T01:15:23Z")]);
    expect(describeAlert(alert)).toBe("www.goodaytarot.com：憑證已於 2026-09-09 過期，已過 34 天");
  });

  it("快到期的要講剩幾天", () => {
    const [alert] = collectCertificateAlerts([ok("goodaytarot.com", "2026-10-20T00:00:00Z")]);
    expect(describeAlert(alert)).toBe("goodaytarot.com：憑證將於 2026-10-20 到期，剩 7 天");
  });

  it("連不上的要帶出原因", () => {
    const [alert] = collectCertificateAlerts([
      { hostname: "www.goodaytarot.com", ok: false, error: "連線逾時（10000ms）" },
    ]);
    expect(describeAlert(alert)).toContain("無法連線取得憑證（連線逾時（10000ms））");
  });
});
