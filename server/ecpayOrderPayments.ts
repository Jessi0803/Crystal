import { randomBytes } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { operationAuditEvents, orderECPayPayments, orders } from "../drizzle/schema";
import { getDb } from "./db";
import { deductOrderInventory } from "./inventoryDb";

type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export const ECPAY_RETRY_INTERVAL_MS = 60_000;

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db;
}

function lockOrder(tx: Transaction, orderId: number) {
  return tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
}

function replacements(db: Database | Transaction, orderId: number, originalTradeNo: string) {
  return db.select().from(orderECPayPayments).where(and(
    eq(orderECPayPayments.orderId, orderId),
    ne(orderECPayPayments.merchantTradeNo, originalTradeNo)
  )).orderBy(desc(orderECPayPayments.id));
}

export async function listECPayOrderReplacements(orderId: number, originalTradeNo: string) {
  return replacements(await requireDb(), orderId, originalTradeNo);
}

export async function listECPayPaymentsForReview(orderId: number) {
  const db = await requireDb();
  return db.select({
    merchantTradeNo: orderECPayPayments.merchantTradeNo,
    tradeNo: orderECPayPayments.tradeNo,
    totalAmount: orderECPayPayments.totalAmount,
    status: orderECPayPayments.status,
  }).from(orderECPayPayments).where(and(
    eq(orderECPayPayments.orderId, orderId),
    inArray(orderECPayPayments.status, ["duplicate_paid", "review_paid"])
  )).orderBy(desc(orderECPayPayments.id));
}

export async function findECPayOrderReplacement(merchantTradeNo: string) {
  const db = await requireDb();
  const [payment] = await db.select({
    orderId: orders.id,
    originalTradeNo: orders.merchantTradeNo,
  }).from(orderECPayPayments).innerJoin(orders, eq(orders.id, orderECPayPayments.orderId))
    .where(eq(orderECPayPayments.merchantTradeNo, merchantTradeNo)).limit(1);
  return payment;
}

export async function createECPayOrderReplacement(input: {
  orderId: number;
  totalAmount: number;
  previousTradeNo: string;
  previousWasNeverSubmitted: boolean;
}) {
  const db = await requireDb();
  return db.transaction(async tx => {
    const [order] = await lockOrder(tx, input.orderId);
    if (!order || order.paymentMethod !== "credit" || order.orderStatus !== "pending_payment" ||
        order.paymentStatus !== "pending" || order.totalAmount !== input.totalAmount) {
      throw new TRPCError({ code: "CONFLICT", message: "訂單狀態已更新，請重新確認。" });
    }
    const [latest] = await replacements(tx, order.id, order.merchantTradeNo).limit(1).for("update");
    if ((latest?.merchantTradeNo ?? order.merchantTradeNo) !== input.previousTradeNo) {
      throw new TRPCError({ code: "CONFLICT", message: "此訂單已有新的付款頁，請先確認最新付款狀態。" });
    }
    if (latest?.status === "pending") {
      if (input.previousWasNeverSubmitted) return latest.merchantTradeNo;
      if (Date.now() - latest.createdAt.getTime() < ECPAY_RETRY_INTERVAL_MS) {
        throw new TRPCError({ code: "CONFLICT", message: "剛開啟新的付款頁，請稍候再確認付款狀態。" });
      }
    }

    // 與原單 CA、尾款 CB 分開，避免不同金流路徑出現相同編號。
    const merchantTradeNo = `CR${randomBytes(9).toString("hex").toUpperCase()}`;
    await tx.insert(orderECPayPayments).values({
      orderId: order.id,
      merchantTradeNo,
      totalAmount: order.totalAmount,
    });
    return merchantTradeNo;
  });
}

export async function settleECPayOrderPayment(orderId: number, data: Record<string, string>) {
  const db = await requireDb();
  return db.transaction(async tx => {
    const [order] = await lockOrder(tx, orderId);
    if (!order || order.paymentMethod !== "credit") return "not_found";
    const [payment] = await tx.select().from(orderECPayPayments).where(and(
      eq(orderECPayPayments.orderId, order.id),
      eq(orderECPayPayments.merchantTradeNo, data.MerchantTradeNo)
    )).limit(1).for("update");
    const isOriginal = data.MerchantTradeNo === order.merchantTradeNo;
    if (!isOriginal && !payment) return "not_found";
    const totalAmount = payment?.totalAmount ?? order.totalAmount;
    if (!/^\d+$/.test(data.TradeAmt ?? "") || Number(data.TradeAmt) !== totalAmount) return "amount_mismatch";

    const paid = data.RtnCode === "1";
    if (paid && !data.TradeNo) return "not_found";
    if (payment && (["paid", "duplicate_paid", "review_paid"].includes(payment.status) ||
        (payment.status === "failed" && !paid))) return "replayed";

    const alreadyPaid = order.paymentStatus === "paid" || order.paymentStatus === "confirmed";
    if (paid && alreadyPaid && order.tradeNo === data.TradeNo) return "replayed";
    const claimOrder = order.paymentStatus === "pending" && order.orderStatus === "pending_payment";
    const status = paid
      ? alreadyPaid && order.tradeNo ? "duplicate_paid" : claimOrder ? "paid" : "review_paid"
      : "failed";

    const values = {
      orderId: order.id,
      merchantTradeNo: data.MerchantTradeNo,
      totalAmount,
      status,
      tradeNo: data.TradeNo || null,
    } as const;
    if (payment) {
      await tx.update(orderECPayPayments).set({ status, tradeNo: values.tradeNo })
        .where(eq(orderECPayPayments.id, payment.id));
    } else {
      await tx.insert(orderECPayPayments).values(values);
    }

    if (status === "duplicate_paid" || status === "review_paid") {
      await tx.insert(operationAuditEvents).values({
        source: "ecpay",
        category: "payment",
        action: status === "duplicate_paid" ? "ecpay.order.duplicate_payment" : "ecpay.order.payment_review",
        outcome: "failed",
        severity: "error",
        orderId: order.id,
        merchantTradeNo: order.merchantTradeNo,
        summary: status === "duplicate_paid" ? "綠界重複收款，請核對並處理退款" : "綠界收到非待付款訂單的款項，請核對",
        details: {
          originalMerchantTradeNo: order.merchantTradeNo,
          settledTradeNo: order.tradeNo,
          merchantTradeNo: data.MerchantTradeNo,
          tradeNo: data.TradeNo,
          amount: totalAmount,
        },
      });
      return status;
    }

    if (status === "paid") {
      await tx.update(orders).set({
        paymentStatus: "paid",
        orderStatus: order.isCustomOrder ? "deposit_paid" : "paid",
        tradeNo: data.TradeNo,
        ecpayNotifyData: data,
        paidAt: new Date(),
      }).where(eq(orders.id, order.id));
      if (!order.inventoryDeducted) await deductOrderInventory(order.id, tx);
      return "paid";
    }

    // 開過新付款後，任一筆失敗都不能取消整張訂單，其他付款仍可能成功。
    if (!claimOrder || !isOriginal || (await replacements(tx, order.id, order.merchantTradeNo).limit(1).for("update")).length) {
      return "attempt_failed";
    }
    await tx.update(orders).set({
      paymentStatus: "failed",
      orderStatus: "cancelled",
      tradeNo: data.TradeNo || null,
      ecpayNotifyData: data,
    }).where(eq(orders.id, order.id));
    return "order_failed";
  });
}
