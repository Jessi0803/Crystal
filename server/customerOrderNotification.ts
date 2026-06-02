import { eq } from "drizzle-orm";
import { orders } from "../drizzle/schema";
import { getDb } from "./db";
import { sendOrderConfirmEmail, sendOrderShippedEmail } from "./email";
import { notifyLineOrderPlaced, notifyLineOrderShipped } from "./lineMessage";
import { getOrderWithItems } from "./orderDb";

async function getMerchantTradeNoByOrderId(orderId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [order] = await db
    .select({ merchantTradeNo: orders.merchantTradeNo })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  return order?.merchantTradeNo ?? null;
}

async function getOrderEmailPayload(orderId: number) {
  const merchantTradeNo = await getMerchantTradeNoByOrderId(orderId);
  if (!merchantTradeNo) return null;

  const order = await getOrderWithItems(merchantTradeNo);
  if (!order) return null;

  return {
    to: order.buyerEmail,
    buyerName: order.buyerName,
    merchantTradeNo: order.merchantTradeNo,
    totalAmount: order.totalAmount,
    shippingMethod: order.shippingMethod,
    paymentMethod: order.paymentMethod,
    cvsStoreName: order.cvsStoreName,
    receiverAddress: order.shippingAddress,
    items: order.items.map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
    })),
  };
}

export async function notifyCustomerOrderPlacedSafely(orderId: number) {
  try {
    const lineResult = await notifyLineOrderPlaced(orderId);
    if (lineResult.sent) return;
    if (lineResult.reason === "missing_order") return;

    const emailPayload = await getOrderEmailPayload(orderId);
    if (!emailPayload) return;

    await sendOrderConfirmEmail(emailPayload);
  } catch (error) {
    console.error("[CustomerOrderNotification] order placed failed:", error);
  }
}

export async function notifyCustomerOrderShippedSafely(orderId: number) {
  try {
    const lineResult = await notifyLineOrderShipped(orderId);
    if (lineResult.sent) return;
    if (lineResult.reason === "missing_order") return;

    const emailPayload = await getOrderEmailPayload(orderId);
    if (!emailPayload) return;

    await sendOrderShippedEmail(emailPayload);
  } catch (error) {
    console.error("[CustomerOrderNotification] order shipped failed:", error);
  }
}
