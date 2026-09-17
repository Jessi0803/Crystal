/**
 * 綠界 ECPay 路由
 * POST /api/ecpay/notify         — 金流付款結果通知
 * POST /api/ecpay/cvs-map-reply  — 超商選店結果回調
 * POST /api/ecpay/logistics-notify — 物流狀態通知
 * GET  /api/ecpay/cvs-map        — 啟動超商選店地圖（回傳 HTML 表單自動提交）
 */
import { Application, Request, Response } from "express";
import { verifyCheckMacValue } from "./ecpay";
import {
  verifyLogisticsCheckMacValue,
  buildCVSMapParams,
  ECPAY_LOGISTICS_CONFIG,
} from "./ecpayLogistics";
import {
  updateOrderPaymentStatus,
  getOrderByMerchantTradeNo,
  updateLogisticsStatus,
  getBalancePaymentByMerchantTradeNo,
  getBalancePaymentAttemptByMerchantTradeNo,
  updateBalancePaymentStatus,
  updateBalancePaymentAttemptStatus,
} from "./orderDb";
import { deductInventoryAfterBalancePayment, deductInventoryAfterPayment } from "./inventoryDb";
import {
  notifyCustomerOrderPlacedSafely,
} from "./customerOrderNotification";
import { getDb } from "./db";
import { orders, logisticsOrders } from "../drizzle/schema";
import { and, eq, inArray } from "drizzle-orm";
import {
  classifyECPayLogisticsStatus,
  LOGISTICS_STATUS_ALLOWED_FROM,
  ORDER_STATUS_ALLOWED_FROM,
  orderStatusForLogistics,
  parseECPayStatusDate,
  type LogisticsStatus,
} from "./logisticsStatus";

type OrderStatus = (typeof orders.orderStatus.enumValues)[number];
import { recordAuditEventSafely } from "./auditDb";
import { markCouponUsedForOrderSafely, releaseCouponsForOrdersSafely } from "./couponDb";

// 只允許導回本站的相對路徑（必須以單一 "/" 開頭），避免開放轉址。
// 不合法時退回結帳頁。
function safeReturnPath(p: unknown): string {
  if (typeof p !== "string") return "/checkout";
  // 去掉可能夾帶的 query/hash，只留路徑本身
  const path = p.split(/[?#]/)[0];
  if (!path.startsWith("/") || path.startsWith("//")) return "/checkout";
  if (path.includes(":")) return "/checkout";
  return path;
}

export async function handleECPayPaymentNotify(notifyData: Record<string, string>) {
  const merchantTradeNo = notifyData.MerchantTradeNo || null;
  const callbackDetails = {
    rtnCode: notifyData.RtnCode ?? null,
    tradeNo: notifyData.TradeNo ?? null,
    tradeAmount: notifyData.TradeAmt ?? null,
    paymentType: notifyData.PaymentType ?? null,
  };
  console.log("[ECPay Notify]", { merchantTradeNo, ...callbackDetails });

  const isValid = verifyCheckMacValue(notifyData);
  if (!isValid) {
    console.error("[ECPay Notify] CheckMacValue verification failed");
    await recordAuditEventSafely({
      source: "ecpay", category: "payment", action: "ecpay.payment.callback",
      outcome: "rejected", severity: "warning", merchantTradeNo,
      summary: "綠界付款回呼簽章驗證失敗", details: callbackDetails,
    });
    return "0|CheckMacValue Error";
  }

  if (!merchantTradeNo) {
    await recordAuditEventSafely({
      source: "ecpay", category: "payment", action: "ecpay.payment.callback",
      outcome: "rejected", severity: "warning",
      summary: "綠界付款回呼缺少交易編號", details: callbackDetails,
    });
    return "0|Order Not Found";
  }
  const rtnCode = notifyData.RtnCode;
  const tradeNo = notifyData.TradeNo ?? "";

  const status = rtnCode === "1" ? "paid" : "failed";
  const order = await getOrderByMerchantTradeNo(merchantTradeNo);
  if (order) {
    if (!matchesECPayAmount(notifyData.TradeAmt, order.totalAmount)) {
      console.error(`[ECPay Notify] TradeAmt mismatch for ${merchantTradeNo}`);
      await recordAuditEventSafely({
        source: "ecpay", category: "payment", action: "ecpay.order.callback",
        outcome: "rejected", severity: "error", orderId: order.id, merchantTradeNo,
        summary: "綠界訂單回呼金額與訂單不符",
        details: { ...callbackDetails, expectedAmount: order.totalAmount },
      });
      return "0|TradeAmt Error";
    }
    const claimed = await updateOrderPaymentStatus(merchantTradeNo, status, tradeNo, notifyData);
    if (claimed && status === "paid") {
      await markCouponUsedForOrderSafely(order.id, { merchantTradeNo });
      await deductInventoryAfterPayment(merchantTradeNo);
      await notifyCustomerOrderPlacedSafely(order.id);
    }
    if (claimed && status === "failed") {
      await releaseCouponsForOrdersSafely([order.id], { includeUsed: false, reason: "綠界回報付款失敗" });
    }
    console.log(`[ECPay Notify] Order ${merchantTradeNo} → ${status}`);
    await recordAuditEventSafely({
      source: "ecpay", category: "payment", action: "ecpay.order.callback",
      outcome: claimed ? (status === "paid" ? "success" : "failed") : "duplicate",
      severity: status === "paid" ? "info" : "warning", orderId: order.id, merchantTradeNo,
      summary: claimed
        ? status === "paid" ? "綠界訂單付款成功" : "綠界回報訂單付款失敗"
        : "已處理過的綠界訂單回呼已忽略",
      details: callbackDetails,
    });
    return "1|OK";
  }

  const balanceAttempt = await getBalancePaymentAttemptByMerchantTradeNo(merchantTradeNo);
  if (balanceAttempt) {
    if (!matchesECPayAmount(notifyData.TradeAmt, balanceAttempt.totalAmount)) {
      console.error(`[ECPay Notify] Balance attempt TradeAmt mismatch for ${merchantTradeNo}`);
      await recordAuditEventSafely({
        source: "ecpay", category: "balance", action: "ecpay.balance.callback",
        outcome: "rejected", severity: "error", orderId: balanceAttempt.balancePayment.orderId, merchantTradeNo,
        summary: "綠界尾款付款嘗試回呼金額不符",
        details: { ...callbackDetails, expectedAmount: balanceAttempt.totalAmount },
      });
      return "0|TradeAmt Error";
    }
    const claimed = await updateBalancePaymentAttemptStatus(merchantTradeNo, status, tradeNo, notifyData);
    if (claimed && status === "paid") {
      await deductInventoryAfterBalancePayment(claimed.balancePayment.merchantTradeNo);
    }
    await recordAuditEventSafely({
      source: "ecpay", category: "balance", action: "ecpay.balance.attempt.callback",
      outcome: claimed ? (status === "paid" ? "success" : "failed") : "duplicate",
      severity: status === "paid" ? "info" : "warning",
      orderId: balanceAttempt.balancePayment.orderId,
      merchantTradeNo,
      summary: claimed
        ? status === "paid" ? "綠界尾款付款成功" : "綠界回報尾款付款失敗，可由原連結重試"
        : "已處理或已失效的尾款付款嘗試回呼已忽略",
      details: { ...callbackDetails, balanceLinkToken: balanceAttempt.balancePayment.merchantTradeNo },
    });
    return "1|OK";
  }

  // 向下相容：部署前已送往綠界、尚未回呼的交易仍以固定連結編號回查舊主記錄。
  const balancePayment = await getBalancePaymentByMerchantTradeNo(merchantTradeNo);
  if (balancePayment) {
    if (!matchesECPayAmount(notifyData.TradeAmt, balancePayment.totalAmount)) {
      console.error(`[ECPay Notify] Balance TradeAmt mismatch for ${merchantTradeNo}`);
      await recordAuditEventSafely({
        source: "ecpay", category: "balance", action: "ecpay.balance.callback",
        outcome: "rejected", severity: "error", orderId: balancePayment.orderId, merchantTradeNo,
        summary: "綠界尾款回呼金額與尾款單不符",
        details: { ...callbackDetails, expectedAmount: balancePayment.totalAmount },
      });
      return "0|TradeAmt Error";
    }
    const claimed = await updateBalancePaymentStatus(merchantTradeNo, status, tradeNo, notifyData);
    if (claimed && status === "paid") {
      await deductInventoryAfterBalancePayment(merchantTradeNo);
    }
    console.log(`[ECPay Notify] Balance ${merchantTradeNo} → ${status}`);
    await recordAuditEventSafely({
      source: "ecpay", category: "balance", action: "ecpay.balance.callback",
      outcome: claimed ? (status === "paid" ? "success" : "failed") : "duplicate",
      severity: status === "paid" ? "info" : "warning", orderId: balancePayment.orderId, merchantTradeNo,
      summary: claimed
        ? status === "paid" ? "綠界尾款付款成功" : "綠界回報尾款付款失敗"
        : "已處理過的綠界尾款回呼已忽略",
      details: callbackDetails,
    });
    return "1|OK";
  }

  console.error("[ECPay Notify] Order not found:", merchantTradeNo);
  await recordAuditEventSafely({
    source: "ecpay", category: "payment", action: "ecpay.payment.callback",
    outcome: "rejected", severity: "warning", merchantTradeNo,
    summary: "綠界付款回呼找不到對應訂單或尾款", details: callbackDetails,
  });
  return "0|Order Not Found";
}

function matchesECPayAmount(rawAmount: string | undefined, expectedAmount: number) {
  return typeof rawAmount === "string" && /^\d+$/.test(rawAmount) && Number(rawAmount) === expectedAmount;
}

const LOGISTICS_STATUS_LABELS: Record<LogisticsStatus, string> = {
  created: "已建立",
  in_transit: "運送中",
  arrived: "已到店",
  picked_up: "已取貨／已送達",
  returned: "已退回",
  failed: "物流異常",
};

/**
 * 綠界物流狀態通知（ServerReplyURL）。
 * 物流與訂單狀態都只往前推進；已完成、已取消等由管理員決定的訂單狀態不會被回呼覆蓋。
 */
export async function handleECPayLogisticsNotify(data: Record<string, string>) {
  const logisticsMerchantTradeNo = data.MerchantTradeNo || null;
  const callbackDetails = {
    rtnCode: data.RtnCode ?? null,
    rtnMsg: data.RtnMsg ?? null,
    logisticsType: data.LogisticsSubType ?? data.LogisticsType ?? null,
    updateStatusDate: data.UpdateStatusDate ?? null,
  };
  console.log("[ECPay Logistics Notify]", { merchantTradeNo: logisticsMerchantTradeNo, ...callbackDetails });

  if (!verifyLogisticsCheckMacValue(data)) {
    console.error("[ECPay Logistics Notify] CheckMacValue verification failed");
    await recordAuditEventSafely({
      source: "logistics", category: "logistics", action: "ecpay.logistics.callback",
      outcome: "rejected", severity: "warning", merchantTradeNo: logisticsMerchantTradeNo,
      summary: "綠界物流回呼簽章驗證失敗",
      details: callbackDetails,
    });
    return "0|CheckMacValue Error";
  }
  if (!logisticsMerchantTradeNo) return "0|MerchantTradeNo Error";

  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [logistics] = await db
    .select({
      orderId: logisticsOrders.orderId,
      logisticsType: logisticsOrders.logisticsType,
      logisticsSubType: logisticsOrders.logisticsSubType,
      logisticsStatus: logisticsOrders.logisticsStatus,
    })
    .from(logisticsOrders)
    .where(eq(logisticsOrders.logisticsMerchantTradeNo, logisticsMerchantTradeNo))
    .limit(1);
  if (!logistics) {
    await recordAuditEventSafely({
      source: "logistics", category: "logistics", action: "ecpay.logistics.callback",
      outcome: "rejected", severity: "warning", merchantTradeNo: logisticsMerchantTradeNo,
      summary: "綠界物流回呼找不到對應的物流單",
      details: callbackDetails,
    });
    // 回 1|OK 避免綠界對已刪除的物流單持續重送
    return "1|OK";
  }

  // 回呼未帶物流商時，以建立物流單時記錄的類型判斷
  const classification = classifyECPayLogisticsStatus({
    RtnCode: data.RtnCode,
    LogisticsSubType: data.LogisticsSubType || logistics.logisticsSubType || undefined,
    LogisticsType: data.LogisticsType || logistics.logisticsType,
  });

  if (classification.kind === "record_only") {
    await recordAuditEventSafely({
      source: "logistics", category: "logistics", action: "ecpay.logistics.callback",
      outcome: "success", severity: "warning", orderId: logistics.orderId, merchantTradeNo: logisticsMerchantTradeNo,
      summary: `綠界通知撤銷先前的物流狀態（${data.RtnMsg ?? data.RtnCode}），未自動變更，請人工確認`,
      details: { ...callbackDetails, currentStatus: logistics.logisticsStatus },
    });
    return "1|OK";
  }

  const newStatus = classification.status;
  const statusDate = parseECPayStatusDate(data.UpdateStatusDate) ?? new Date();
  const logisticsUpdated = await updateLogisticsStatus(
    logisticsMerchantTradeNo,
    newStatus,
    LOGISTICS_STATUS_ALLOWED_FROM[newStatus],
    {
      cvsPaymentNo: data.CVSPaymentNo,
      cvsValidationNo: data.CVSValidationNo,
      bookingNote: data.BookingNote,
      arrivedAt: newStatus === "arrived" ? statusDate : undefined,
      pickedUpAt: newStatus === "picked_up" ? statusDate : undefined,
      ecpayLogisticsData: data,
    }
  );

  let orderUpdated = false;
  const orderStatus = logisticsUpdated ? orderStatusForLogistics(newStatus) : null;
  if (orderStatus) {
    const result = await db
      .update(orders)
      .set({ orderStatus })
      .where(and(eq(orders.id, logistics.orderId), inArray(orders.orderStatus, ORDER_STATUS_ALLOWED_FROM[orderStatus] as OrderStatus[])));
    const candidate = Array.isArray(result) ? result[0] : result;
    orderUpdated = Boolean((candidate as { affectedRows?: number } | undefined)?.affectedRows);
  }

  console.log(`[ECPay Logistics Notify] ${logisticsMerchantTradeNo} → ${newStatus}`, { logisticsUpdated, orderUpdated });
  const needsAttention = logisticsUpdated && classification.needsAttention === true;
  await recordAuditEventSafely({
    source: "logistics", category: "logistics", action: "ecpay.logistics.callback",
    outcome: logisticsUpdated ? (newStatus === "failed" ? "failed" : "success") : "duplicate",
    severity: needsAttention ? "warning" : "info",
    orderId: logistics.orderId,
    merchantTradeNo: logisticsMerchantTradeNo,
    summary: logisticsUpdated
      ? needsAttention
        ? `物流異常：${data.RtnMsg ?? data.RtnCode}，請人工確認`
        : `綠界物流狀態更新為${LOGISTICS_STATUS_LABELS[newStatus]}${orderStatus && !orderUpdated ? "（訂單狀態未變更）" : ""}`
      : `已忽略較舊或重複的物流狀態（${LOGISTICS_STATUS_LABELS[newStatus]}）`,
    details: {
      ...callbackDetails,
      previousStatus: logistics.logisticsStatus,
      newStatus,
      orderStatus: orderUpdated ? orderStatus : null,
    },
  });
  return "1|OK";
}

export function registerECPayRoutes(app: Application) {
  /**
   * 綠界金流付款結果通知（ReturnURL）
   * 綠界 POST 到此端點，需回傳 "1|OK"
   */
  app.post("/api/ecpay/notify", async (req: Request, res: Response) => {
    try {
      const notifyData = req.body as Record<string, string>;
      res.send(await handleECPayPaymentNotify(notifyData));
    } catch (err) {
      console.error("[ECPay Notify] Error:", err);
      const notifyData = req.body as Record<string, string>;
      await recordAuditEventSafely({
        source: "ecpay", category: "payment", action: "ecpay.payment.callback",
        outcome: "failed", severity: "error", merchantTradeNo: notifyData?.MerchantTradeNo,
        summary: "處理綠界付款回呼時發生系統錯誤",
        details: { error: err instanceof Error ? err.message : String(err) },
      });
      res.send("0|Server Error");
    }
  });

  /**
   * 綠界付款完成後，使用者瀏覽器端的 POST 導回（OrderResultURL）。
   * Vercel SPA 靜態頁不接受 POST（會回 405），所以改由此 API 接住，
   * 讀出 MerchantTradeNo 後 302 轉回 GET /order/:merchantTradeNo，
   * 讓前端 React 路由照常顯示訂單結果頁。
   */
  app.post("/api/ecpay/order-result", (req: Request, res: Response) => {
    try {
      const data = req.body as Record<string, string>;
      const merchantTradeNo = data?.MerchantTradeNo ?? "";
      console.log("[ECPay OrderResult]", { merchantTradeNo, RtnCode: data?.RtnCode });
      if (!merchantTradeNo) {
        res.redirect(302, "/");
        return;
      }
      res.redirect(302, `/order/${encodeURIComponent(merchantTradeNo)}`);
    } catch (err) {
      console.error("[ECPay OrderResult] Error:", err);
      res.redirect(302, "/");
    }
  });

  app.post("/api/ecpay/balance-result", async (req: Request, res: Response) => {
    try {
      const data = req.body as Record<string, string>;
      const merchantTradeNo = data?.MerchantTradeNo ?? "";
      console.log("[ECPay BalanceResult]", { merchantTradeNo, RtnCode: data?.RtnCode });
      if (!merchantTradeNo) {
        res.redirect(302, "/");
        return;
      }
      const attempt = await getBalancePaymentAttemptByMerchantTradeNo(merchantTradeNo);
      const linkToken = attempt?.balancePayment.merchantTradeNo ?? merchantTradeNo;
      res.redirect(302, `/balance/${encodeURIComponent(linkToken)}`);
    } catch (err) {
      console.error("[ECPay BalanceResult] Error:", err);
      res.redirect(302, "/");
    }
  });

  /**
   * 超商選店地圖啟動
   * GET /api/ecpay/cvs-map?tradeNo=xxx&subType=UNIMART&clientReturn=xxx
   * 回傳自動提交的 HTML 表單，將使用者導向綠界選店地圖
   */
  app.get("/api/ecpay/cvs-map", (req: Request, res: Response) => {
    const { tradeNo, subType, clientReturn } = req.query as Record<string, string>;
    if (!tradeNo || !subType) {
      res.status(400).send("Missing tradeNo or subType");
      return;
    }

    // 強制轉換為 C2C 類型（老闆申請的是店到店 C2C，不是 B2C）
    const normalizedSubType = subType === "UNIMART" ? "UNIMARTC2C"
      : subType === "FAMI" ? "FAMIC2C"
      : subType;

    // 優先使用 x-forwarded-proto（反向代理後 req.protocol 可能是 http）
    const forwardedProto1 = req.headers['x-forwarded-proto'] as string | undefined;
    const protocol1 = forwardedProto1 ? forwardedProto1.split(',')[0].trim() : req.protocol;
    const origin = `${protocol1}://${req.get("host")}`;
    // 選完門市後要導回的前端頁面（結帳頁 /checkout 或尾款頁 /balance/xxx）。
    // 把這個路徑帶進 ServerReplyURL 的 query，綠界 POST 回來時 cvs-map-reply 才知道
    // 該 302 回哪一頁。safeReturnPath 防開放轉址（只允許本站相對路徑）。
    const returnPath = safeReturnPath(clientReturn);
    const serverReplyURL = `${origin}/api/ecpay/cvs-map-reply?to=${encodeURIComponent(returnPath)}`;
    const clientReplyURL = `${origin}${returnPath}`;

    const params = buildCVSMapParams({
      logisticsMerchantTradeNo: tradeNo,
      logisticsSubType: normalizedSubType as "UNIMARTC2C" | "FAMIC2C",
      serverReplyURL,
      clientReplyURL,
    });

    // 產生自動提交的 HTML 表單
    const inputs = Object.entries(params)
      .map(([k, v]) => `<input type="hidden" name="${k}" value="${v}" />`)
      .join("\n");

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>選擇門市</title></head>
<body>
<form id="f" method="POST" action="${ECPAY_LOGISTICS_CONFIG.MapURL}">
${inputs}
</form>
<script>document.getElementById('f').submit();</script>
</body>
</html>`;

    res.send(html);
  });

  /**
   * 超商選店結果回調
   * POST /api/ecpay/cvs-map-reply
   * 綠界選完門市後 POST 到此，儲存門市資訊並導回前端
   */
  app.post("/api/ecpay/cvs-map-reply", async (req: Request, res: Response) => {
    try {
      const data = req.body as Record<string, string>;
      console.log("[ECPay CVS Map Reply]", {
        logisticsSubType: data.LogisticsSubType,
        hasStoreId: Boolean(data.CVSStoreID),
      });

      const storeId = data.CVSStoreID || "";
      const storeName = data.CVSStoreName || "";
      const cvsType = data.LogisticsSubType || ""; // UNIMART or FAMI

      // 同分頁跳轉：綠界選完門市後是整頁 POST 回來（top-level），直接 302 導回
      // 原本的前端頁面（結帳頁 /checkout 或尾款頁 /balance/xxx，由 ServerReplyURL
      // 的 ?to= 帶過來），並把門市資訊帶在 query string。不用 popup / opener /
      // window.close，桌機、手機、LINE 內建瀏覽器都能穩定回到原頁。
      const returnPath = safeReturnPath(req.query.to);
      const qs = new URLSearchParams({
        cvsStoreId: storeId,
        cvsStoreName: storeName,
        cvsType,
      }).toString();
      res.redirect(302, `${returnPath}?${qs}`);
    } catch (err) {
      console.error("[ECPay CVS Map Reply] Error:", err);
      res.status(500).send("Error");
    }
  });

  /**
   * 物流狀態通知
   * POST /api/ecpay/logistics-notify
   * 綠界物流狀態變更時 POST 到此
   */
  app.post("/api/ecpay/logistics-notify", async (req: Request, res: Response) => {
    try {
      res.send(await handleECPayLogisticsNotify(req.body as Record<string, string>));
    } catch (err) {
      console.error("[ECPay Logistics Notify] Error:", err);
      const data = req.body as Record<string, string>;
      await recordAuditEventSafely({
        source: "logistics", category: "logistics", action: "ecpay.logistics.callback",
        outcome: "failed", severity: "error", merchantTradeNo: data?.MerchantTradeNo,
        summary: "處理綠界物流回呼時發生系統錯誤",
        details: { error: err instanceof Error ? err.message : String(err) },
      });
      res.send("0|Server Error");
    }
  });

}
