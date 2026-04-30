import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { logisticsOrders, orderItems, orders, users } from "../drizzle/schema";

type LinePushResult =
  | { sent: true }
  | { sent: false; reason: "missing_token" | "missing_line_user" | "missing_order" | "line_api_error" };

function getLineAccessToken(): string | undefined {
  return (
    process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim() ||
    process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN?.trim()
  );
}

function getSiteUrl(): string {
  return process.env.SITE_URL?.trim().replace(/\/$/, "") || "https://goodaytarot.com";
}

function extractLineUserId(openId?: string | null): string | null {
  if (!openId?.startsWith("line:")) return null;
  return openId.slice("line:".length);
}

function formatCurrency(amount: number): string {
  return `NT$ ${amount.toLocaleString("zh-TW")}`;
}

async function pushLineTextMessage(to: string, text: string): Promise<LinePushResult> {
  const token = getLineAccessToken();
  if (!token) {
    console.warn("[LINE Message] LINE_CHANNEL_ACCESS_TOKEN is not configured");
    return { sent: false, reason: "missing_token" };
  }

  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to,
      messages: [{ type: "text", text }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[LINE Message] push failed", { status: res.status, body });
    return { sent: false, reason: "line_api_error" };
  }

  return { sent: true };
}

async function getLineUserIdForOrder(orderId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [order] = await db
    .select({ userId: orders.userId })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order?.userId) return null;

  const [user] = await db
    .select({ openId: users.openId })
    .from(users)
    .where(eq(users.id, order.userId))
    .limit(1);

  return extractLineUserId(user?.openId);
}

export async function notifyLineOrderPlaced(orderId: number): Promise<LinePushResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const lineUserId = await getLineUserIdForOrder(orderId);
  if (!lineUserId) return { sent: false, reason: "missing_line_user" };

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return { sent: false, reason: "missing_order" };

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const productLines = items
    .filter((item) => !["shipping-fee", "payment-fee"].includes(item.productId))
    .slice(0, 6)
    .map((item) => `・${item.productName} x${item.quantity}`)
    .join("\n");

  const paymentLabel =
    order.paymentMethod === "atm"
      ? "銀行轉帳"
      : order.paymentMethod === "paypal"
        ? "PayPal"
        : "信用卡";

  const text = [
    `${order.buyerName} 您好，已收到您的訂單。`,
    "",
    `訂單編號：${order.merchantTradeNo}`,
    `付款方式：${paymentLabel}`,
    `訂單金額：${formatCurrency(order.totalAmount)}`,
    productLines ? `商品：\n${productLines}` : "",
    "",
    `查看訂單：${getSiteUrl()}/order/${encodeURIComponent(order.merchantTradeNo)}`,
  ]
    .filter(Boolean)
    .join("\n");

  return pushLineTextMessage(lineUserId, text);
}

export async function notifyLineOrderShipped(orderId: number): Promise<LinePushResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const lineUserId = await getLineUserIdForOrder(orderId);
  if (!lineUserId) return { sent: false, reason: "missing_line_user" };

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return { sent: false, reason: "missing_order" };

  const [logistics] = await db
    .select()
    .from(logisticsOrders)
    .where(eq(logisticsOrders.orderId, orderId))
    .limit(1);

  const shippingLabel =
    order.shippingMethod === "home"
      ? "黑貓宅急便"
      : order.shippingMethod === "cvs_711"
        ? "7-11 店到店"
        : "全家店到店";
  const trackingNo = logistics?.bookingNote || logistics?.allPayLogisticsId || logistics?.logisticsMerchantTradeNo;

  const text = [
    `${order.buyerName} 您好，您的訂單已出貨。`,
    "",
    `訂單編號：${order.merchantTradeNo}`,
    `配送方式：${shippingLabel}`,
    trackingNo ? `物流編號：${trackingNo}` : "",
    "",
    `查看訂單：${getSiteUrl()}/order/${encodeURIComponent(order.merchantTradeNo)}`,
  ]
    .filter(Boolean)
    .join("\n");

  return pushLineTextMessage(lineUserId, text);
}

export async function notifyLineSafely(
  label: string,
  notify: () => Promise<LinePushResult>
): Promise<void> {
  try {
    const result = await notify();
    if (!result.sent) {
      console.info("[LINE Message] skipped", { label, reason: result.reason });
    }
  } catch (err) {
    console.error("[LINE Message] failed", { label, err });
  }
}
