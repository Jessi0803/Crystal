/**
 * 網域憑證到期監控。
 *
 * 由來：www.goodaytarot.com 的憑證在 2026-09-09 過期，直到 10-13 才被發現，
 * 顧客整整 34 天看到「你的連線不是私人連線」的紅色警告。憑證是 Vercel 自動
 * 續期的，但網域沒綁在專案底下時就沒人續，而且沒有任何地方會告警。
 *
 * 這支每天檢查一次，快到期或已過期就寄信給後台。
 *
 * 刻意用 Node 內建的 tls 直接連線量測，而不是打自家 API：
 * 要驗證的正是「外面的人看到的憑證」，繞過應用層才測得到真實狀況。
 */
import tls from "node:tls";

/** 剩餘天數低於這個值就告警 */
export const CERT_EXPIRY_WARNING_DAYS = 14;

/** 要監控的網域。新增網域時記得加進來。 */
export const MONITORED_HOSTNAMES = ["goodaytarot.com", "www.goodaytarot.com"] as const;

export type CertificateCheck =
  | {
      hostname: string;
      ok: true;
      validTo: Date;
      daysRemaining: number;
      issuer: string;
    }
  | {
      hostname: string;
      ok: false;
      /** 連不上或交握失敗時的原因 */
      error: string;
    };

/**
 * 取得單一網域目前對外提供的憑證。
 *
 * rejectUnauthorized: false 是刻意的——憑證已經過期時仍要能讀到它的日期，
 * 否則交握會直接失敗，我們就拿不到「過期多久」這個最重要的資訊。
 */
export function fetchCertificate(
  hostname: string,
  opts: { timeoutMs?: number } = {}
): Promise<CertificateCheck> {
  const timeoutMs = opts.timeoutMs ?? 10_000;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: CertificateCheck) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    const socket = tls.connect(
      { host: hostname, port: 443, servername: hostname, rejectUnauthorized: false, timeout: timeoutMs },
      () => {
        const cert = socket.getPeerCertificate();
        if (!cert || !cert.valid_to) {
          finish({ hostname, ok: false, error: "沒有取得憑證資訊" });
          return;
        }
        const validTo = new Date(cert.valid_to);
        if (Number.isNaN(validTo.getTime())) {
          finish({ hostname, ok: false, error: `無法解析到期日：${cert.valid_to}` });
          return;
        }
        finish({
          hostname,
          ok: true,
          validTo,
          daysRemaining: daysUntil(validTo),
          issuer: typeof cert.issuer?.O === "string" ? cert.issuer.O : "未知",
        });
      }
    );

    socket.on("timeout", () => finish({ hostname, ok: false, error: `連線逾時（${timeoutMs}ms）` }));
    socket.on("error", (error: Error) => finish({ hostname, ok: false, error: error.message }));
  });
}

/**
 * 無條件捨去到天，已過期回負數。
 *
 * 刻意用 floor 而不是 ceil，兩端的誤差方向才會站在「早點告警」那一邊：
 * - 還剩 6 小時 → 0 天（ceil 會報成 1 天，低估急迫性）
 * - 已過期 33.9 天 → -34（ceil 會報成 33，少報一天）
 */
export function daysUntil(validTo: Date, now: Date = new Date()) {
  return Math.floor((validTo.getTime() - now.getTime()) / 86_400_000);
}

export type CertificateAlert = {
  level: "expired" | "expiring" | "unreachable";
  check: CertificateCheck;
};

/** 挑出需要告警的項目。沒有問題時回空陣列，呼叫端就不用寄信。 */
export function collectCertificateAlerts(
  checks: CertificateCheck[],
  warningDays = CERT_EXPIRY_WARNING_DAYS
): CertificateAlert[] {
  const alerts: CertificateAlert[] = [];
  for (const check of checks) {
    if (!check.ok) {
      alerts.push({ level: "unreachable", check });
      continue;
    }
    if (check.daysRemaining < 0) alerts.push({ level: "expired", check });
    else if (check.daysRemaining <= warningDays) alerts.push({ level: "expiring", check });
  }
  return alerts;
}

export function describeAlert(alert: CertificateAlert): string {
  const { check } = alert;
  if (!check.ok) return `${check.hostname}：無法連線取得憑證（${check.error}）`;
  const date = check.validTo.toISOString().slice(0, 10);
  if (alert.level === "expired") {
    return `${check.hostname}：憑證已於 ${date} 過期，已過 ${Math.abs(check.daysRemaining)} 天`;
  }
  return `${check.hostname}：憑證將於 ${date} 到期，剩 ${check.daysRemaining} 天`;
}

/**
 * 排程進入點：檢查所有監控網域，有問題才寄信。
 *
 * 寄信失敗不會讓整個 job 失敗——告警管道壞掉時，至少要在 log 留下檢查結果，
 * 而且 cron 回 500 會讓 Vercel 一直重試，反而掩蓋真正的問題。
 */
export async function runCertificateExpiryJob(opts: { warningDays?: number } = {}) {
  const warningDays = opts.warningDays ?? CERT_EXPIRY_WARNING_DAYS;
  const checks = await Promise.all(MONITORED_HOSTNAMES.map((hostname) => fetchCertificate(hostname)));
  const alerts = collectCertificateAlerts(checks, warningDays);

  const summary = checks.map((check) =>
    check.ok
      ? `${check.hostname}=${check.daysRemaining}天`
      : `${check.hostname}=無法連線`
  );
  console.log(`[certificate-monitor] ${summary.join(" ")}`);

  if (alerts.length === 0) return { checked: checks.length, alerts: 0, notified: false };

  const lines = alerts.map(describeAlert);
  for (const line of lines) console.warn(`[certificate-monitor] ${line}`);

  let notified = false;
  try {
    const { sendCertificateExpiryAlertEmail } = await import("./email");
    await sendCertificateExpiryAlertEmail({ lines, warningDays });
    notified = true;
  } catch (error) {
    console.error("[certificate-monitor] 告警信寄送失敗（檢查結果仍記在上面）:", error);
  }

  return { checked: checks.length, alerts: alerts.length, notified, lines };
}
