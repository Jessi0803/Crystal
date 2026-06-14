import { existsSync } from "node:fs";
import dotenv from "dotenv";

for (const path of [".env", ".env.test.local", ".env.resend.local", ".env.notification-test.local"]) {
  if (existsSync(path)) {
    dotenv.config({ path, override: true, quiet: true });
  }
}

const RESEND_API_KEY = process.env.RESEND_API_KEY?.trim();
const LINE_TOKEN = (
  process.env.LINE_CHANNEL_ACCESS_TOKEN ||
  process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN
)?.trim();
const TEST_EMAIL = process.env.NOTIFICATION_TEST_EMAIL?.trim();
const LINE_TEST_USER_ID = process.env.LINE_TEST_USER_ID?.trim()?.replace(/^line:/, "");
const FROM_ADDRESS = process.env.NOTIFICATION_TEST_FROM?.trim() || "service@goodaytarot.com";
const DATABASE_URL = process.env.DATABASE_URL?.trim();

type CheckResult = {
  ok: boolean;
  skipped?: boolean;
  status?: number;
  message: string;
};

function mask(value?: string | null) {
  if (!value) return "(missing)";
  if (value.length <= 10) return `${value.slice(0, 2)}...`;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

async function readJsonOrText(response: Response) {
  const text = await response.text().catch(() => "");
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function messageFromBody(body: unknown) {
  if (body && typeof body === "object" && "message" in body) {
    return String((body as { message?: unknown }).message);
  }
  return typeof body === "string" ? body : JSON.stringify(body);
}

async function checkResend(): Promise<CheckResult> {
  if (!RESEND_API_KEY) {
    return { ok: false, skipped: true, message: "RESEND_API_KEY is not set" };
  }

  const response = await fetch("https://api.resend.com/domains", {
    headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
  });
  const body = await readJsonOrText(response);
  if (!response.ok) {
    return { ok: false, status: response.status, message: messageFromBody(body) };
  }

  return { ok: true, status: response.status, message: `Resend API key accepted (${mask(RESEND_API_KEY)})` };
}

async function sendResendTestEmail(): Promise<CheckResult> {
  if (!RESEND_API_KEY || !TEST_EMAIL) {
    return {
      ok: true,
      skipped: true,
      message: "Set NOTIFICATION_TEST_EMAIL in .env.notification-test.local to send a real test email",
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `椛 · Crystal <${FROM_ADDRESS}>`,
      to: [TEST_EMAIL],
      subject: "【椛 · Crystal】通知測試信",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.7;color:#222">
          <h2>通知測試成功</h2>
          <p>如果你收到這封信，代表 Resend 真實寄信設定可用。</p>
          <p>測試時間：${new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}</p>
        </div>
      `,
    }),
  });
  const body = await readJsonOrText(response);
  if (!response.ok) {
    return { ok: false, status: response.status, message: messageFromBody(body) };
  }

  const id = body && typeof body === "object" && "id" in body ? String((body as { id?: unknown }).id) : "(no id)";
  return { ok: true, status: response.status, message: `Test email accepted by Resend: ${id}` };
}

async function checkLine(): Promise<CheckResult> {
  if (!LINE_TOKEN) {
    return { ok: false, skipped: true, message: "LINE_CHANNEL_ACCESS_TOKEN is not set" };
  }

  const response = await fetch("https://api.line.me/v2/bot/info", {
    headers: { Authorization: `Bearer ${LINE_TOKEN}` },
  });
  const body = await readJsonOrText(response);
  if (!response.ok) {
    return { ok: false, status: response.status, message: messageFromBody(body) };
  }

  const info = body as { displayName?: string; basicId?: string };
  return {
    ok: true,
    status: response.status,
    message: `LINE bot accepted: ${info.displayName ?? "(no name)"} ${info.basicId ?? ""}`.trim(),
  };
}

async function sendLineTestMessage(): Promise<CheckResult> {
  if (!LINE_TOKEN || !LINE_TEST_USER_ID) {
    return {
      ok: true,
      skipped: true,
      message: "Set LINE_TEST_USER_ID in .env.notification-test.local to send a real LINE push",
    };
  }

  const text = `訂單通知測試：LINE 推播設定成功。\n測試時間：${new Date().toLocaleString("zh-TW", {
    timeZone: "Asia/Taipei",
  })}`;
  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LINE_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: LINE_TEST_USER_ID,
      messages: [{ type: "text", text }],
    }),
  });
  const body = await readJsonOrText(response);
  if (!response.ok) {
    return { ok: false, status: response.status, message: messageFromBody(body) };
  }

  return { ok: true, status: response.status, message: `LINE test push accepted for ${mask(LINE_TEST_USER_ID)}` };
}

function makeMerchantTradeNo(prefix: string) {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}${stamp}${rand}`.slice(0, 32);
}

async function createOrderAndNotify(channel: "line" | "email"): Promise<CheckResult> {
  if (!DATABASE_URL) {
    return { ok: true, skipped: true, message: "DATABASE_URL is not set; skipped real order creation" };
  }
  if (channel === "line" && !LINE_TEST_USER_ID) {
    return { ok: true, skipped: true, message: "LINE_TEST_USER_ID is not set; skipped LINE-linked test order" };
  }
  if (channel === "email" && !TEST_EMAIL) {
    return { ok: true, skipped: true, message: "NOTIFICATION_TEST_EMAIL is not set; skipped email fallback test order" };
  }

  const [{ createOrder }, { notifyCustomerOrderPlacedSafely }, { getUserByOpenId, upsertUser }] = await Promise.all([
    import("../server/orderDb"),
    import("../server/customerOrderNotification"),
    import("../server/db"),
  ]);

  let userId: number | undefined;
  if (channel === "line") {
    const openId = `line:${LINE_TEST_USER_ID}`;
    let user = await getUserByOpenId(openId);
    if (!user) {
      await upsertUser({
        openId,
        name: "LINE 通知測試會員",
        email: "line-notification-test@example.com",
        loginMethod: "line",
        emailVerified: true,
        role: "user",
      });
      user = await getUserByOpenId(openId);
    }
    if (!user) {
      return { ok: false, message: "Unable to create or find LINE test user" };
    }
    userId = user.id;
  }

  const merchantTradeNo = makeMerchantTradeNo(channel === "line" ? "TLN" : "TEM");
  const buyerEmail = channel === "email" ? TEST_EMAIL! : "line-notification-test@example.com";
  const orderId = await createOrder(
    {
      userId,
      merchantTradeNo,
      paymentStatus: "transfer_pending",
      paymentMethod: "atm",
      deliveryRegion: "domestic",
      shippingMethod: "home",
      orderStatus: "pending_payment",
      isPreorder: false,
      isCustomOrder: false,
      totalAmount: 99,
      buyerName: channel === "line" ? "LINE 通知測試顧客" : "Email 通知測試顧客",
      buyerEmail,
      buyerPhone: "0912345678",
      shippingAddress: "台北市中正區通知測試路 1 號",
      receiverZipCode: "100",
      transferLastFive: "99999",
      transferReceiptUrl: "notification-test://transfer-receipt",
      customerNote: "這是 pnpm run test:notifications 建立的通知測試訂單。",
    },
    [
      {
        orderId: 0,
        productId: "notification-test-product",
        productName: channel === "line" ? "LINE 通知測試商品" : "Email 通知測試商品",
        productImage: "",
        quantity: 1,
        unitPrice: 99,
        subtotal: 99,
        isPreorder: false,
      },
    ]
  );

  await notifyCustomerOrderPlacedSafely(orderId);

  return {
    ok: true,
    message:
      channel === "line"
        ? `Created LINE-linked test order ${merchantTradeNo} and triggered order notification`
        : `Created email fallback test order ${merchantTradeNo} and triggered order notification`,
  };
}

const checks: [string, () => Promise<CheckResult>][] = [
  ["Resend key", checkResend],
  ["Resend email", sendResendTestEmail],
  ["LINE token", checkLine],
  ["LINE push", sendLineTestMessage],
  ["Real order LINE notification", () => createOrderAndNotify("line")],
  ["Real order email notification", () => createOrderAndNotify("email")],
];

if (DATABASE_URL) {
  const url = new URL(DATABASE_URL);
  console.log(`[INFO] Test orders will use database: ${url.hostname}${url.pathname}`);
}

let failed = false;
for (const [label, run] of checks) {
  const result = await run();
  const icon = result.ok ? (result.skipped ? "SKIP" : "OK") : "FAIL";
  console.log(`[${icon}] ${label}: ${result.message}`);
  if (!result.ok) failed = true;
}

process.exit(failed ? 1 : 0);
