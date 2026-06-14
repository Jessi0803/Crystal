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
  createCVSLogisticsOrder,
  createHomeLogisticsOrder,
  ECPAY_LOGISTICS_CONFIG,
} from "./ecpayLogistics";
import {
  updateOrderPaymentStatus,
  getOrderByMerchantTradeNo,
  updateLogisticsStatus,
  getBalancePaymentByMerchantTradeNo,
  updateBalancePaymentStatus,
} from "./orderDb";
import { deductInventoryAfterBalancePayment, deductInventoryAfterPayment } from "./inventoryDb";
import {
  notifyCustomerOrderPlacedSafely,
  notifyCustomerOrderShippedSafely,
} from "./customerOrderNotification";
import { getDb } from "./db";
import { orders, logisticsOrders } from "../drizzle/schema";
import { eq } from "drizzle-orm";

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
  console.log("[ECPay Notify]", notifyData);

  const isValid = verifyCheckMacValue(notifyData);
  if (!isValid) {
    console.error("[ECPay Notify] CheckMacValue verification failed");
    return "0|CheckMacValue Error";
  }

  const merchantTradeNo = notifyData.MerchantTradeNo;
  const rtnCode = notifyData.RtnCode;
  const tradeNo = notifyData.TradeNo ?? "";

  const status = rtnCode === "1" ? "paid" : "failed";
  const order = await getOrderByMerchantTradeNo(merchantTradeNo);
  if (order) {
    const shouldNotifyOrderPlaced =
      status === "paid" && order.paymentStatus !== "paid" && order.paymentStatus !== "confirmed";
    await updateOrderPaymentStatus(merchantTradeNo, status, tradeNo, notifyData);
    if (status === "paid") {
      await deductInventoryAfterPayment(merchantTradeNo);
      if (shouldNotifyOrderPlaced) {
        await notifyCustomerOrderPlacedSafely(order.id);
      }
    }
    console.log(`[ECPay Notify] Order ${merchantTradeNo} → ${status}`);
    return "1|OK";
  }

  const balancePayment = await getBalancePaymentByMerchantTradeNo(merchantTradeNo);
  if (balancePayment) {
    await updateBalancePaymentStatus(merchantTradeNo, status, tradeNo, notifyData);
    if (status === "paid") {
      await deductInventoryAfterBalancePayment(merchantTradeNo);
    }
    console.log(`[ECPay Notify] Balance ${merchantTradeNo} → ${status}`);
    return "1|OK";
  }

  console.error("[ECPay Notify] Order not found:", merchantTradeNo);
  return "0|Order Not Found";
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

  app.post("/api/ecpay/balance-result", (req: Request, res: Response) => {
    try {
      const data = req.body as Record<string, string>;
      const merchantTradeNo = data?.MerchantTradeNo ?? "";
      console.log("[ECPay BalanceResult]", { merchantTradeNo, RtnCode: data?.RtnCode });
      if (!merchantTradeNo) {
        res.redirect(302, "/");
        return;
      }
      res.redirect(302, `/balance/${encodeURIComponent(merchantTradeNo)}`);
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
      console.log("[ECPay CVS Map Reply]", data);

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
      const data = req.body as Record<string, string>;
      console.log("[ECPay Logistics Notify]", data);

      // 驗證 CheckMacValue
      const isValid = verifyLogisticsCheckMacValue(data);
      if (!isValid) {
        console.error("[ECPay Logistics Notify] CheckMacValue verification failed");
        res.send("0|CheckMacValue Error");
        return;
      }

      const logisticsMerchantTradeNo = data.MerchantTradeNo;
      const rtnCode = data.RtnCode;

      // 狀態對應
      // 300 = 到店, 3024 = 已取貨, 3022 = 退件
      let newStatus: "in_transit" | "arrived" | "picked_up" | "returned" | "failed" = "in_transit";
      if (rtnCode === "300" || rtnCode === "3018") newStatus = "arrived";
      else if (rtnCode === "3024") newStatus = "picked_up";
      else if (rtnCode === "3022" || rtnCode === "3028") newStatus = "returned";
      else if (["3002", "3003", "3004"].includes(rtnCode)) newStatus = "failed";

      await updateLogisticsStatus(logisticsMerchantTradeNo, newStatus);

      // 如果物流狀態已到店、已取貨或退件，同步更新訂單狀態
      if (newStatus === "arrived" || newStatus === "picked_up" || newStatus === "returned") {
        const db = await getDb();
        if (db) {
          const [logistics] = await db
            .select({ orderId: logisticsOrders.orderId })
            .from(logisticsOrders)
            .where(eq(logisticsOrders.logisticsMerchantTradeNo, logisticsMerchantTradeNo))
            .limit(1);

          if (logistics) {
            const orderStatus =
              newStatus === "arrived"
                ? "arrived"
                : newStatus === "picked_up"
                  ? "picked_up"
                  : "not_picked";
            await db
              .update(orders)
              .set({ orderStatus })
              .where(eq(orders.id, logistics.orderId));
          }
        }
      }

      console.log(`[ECPay Logistics Notify] ${logisticsMerchantTradeNo} → ${newStatus}`);
      res.send("1|OK");
    } catch (err) {
      console.error("[ECPay Logistics Notify] Error:", err);
      res.send("0|Server Error");
    }
  });

  /**
   * 建立物流訂單 API（由後台管理員觸發）
   * POST /api/ecpay/create-logistics
   */
  app.post("/api/ecpay/create-logistics", async (req: Request, res: Response) => {
    try {
      const { orderId } = req.body as { orderId: number };
      const db = await getDb();
      if (!db) { res.status(500).json({ error: "DB unavailable" }); return; }

      const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      if (!order) { res.status(404).json({ error: "Order not found" }); return; }

      const [logistics] = await db
        .select()
        .from(logisticsOrders)
        .where(eq(logisticsOrders.orderId, orderId))
        .limit(1);

      if (!logistics) { res.status(404).json({ error: "Logistics order not found" }); return; }

      // 優先使用 x-forwarded-proto（反向代理後 req.protocol 可能是 http）
      const forwardedProto2 = req.headers['x-forwarded-proto'] as string | undefined;
      const protocol2 = forwardedProto2 ? forwardedProto2.split(',')[0].trim() : req.protocol;
      const origin = `${protocol2}://${req.get("host")}`;
      const serverReplyURL = `${origin}/api/ecpay/logistics-notify`;

      let result;
      if (order.shippingMethod === "home") {
        result = await createHomeLogisticsOrder({
          logisticsMerchantTradeNo: logistics.logisticsMerchantTradeNo,
          goodsName: "椛Crystal能量水晶",
          goodsAmount: order.totalAmount,
          senderName: process.env.OWNER_NAME || "椛Crystal",
          senderPhone: "0900000000",
          senderZipCode: process.env.SENDER_ZIPCODE || "110",
          senderAddress: "台北市信義區",
          receiverName: order.buyerName,
          receiverPhone: order.buyerPhone,
          receiverAddress: order.shippingAddress || "",
          serverReplyURL,
        });
      } else {
        const logisticsSubType = order.shippingMethod === "cvs_711" ? "UNIMARTC2C" : "FAMIC2C";
        result = await createCVSLogisticsOrder({
          logisticsMerchantTradeNo: logistics.logisticsMerchantTradeNo,
          goodsName: "椛Crystal能量水晶",
          goodsAmount: order.totalAmount,
          senderName: process.env.OWNER_NAME || "椛Crystal",
          senderPhone: "0900000000",
          senderZipCode: process.env.SENDER_ZIPCODE || "110",
          receiverName: order.buyerName,
          receiverPhone: order.buyerPhone,
          receiverStoreID: order.cvsStoreId || "",
          logisticsSubType,
          serverReplyURL,
        });
      }

      if (result.success) {
        // 更新物流訂單資訊
        await db
          .update(logisticsOrders)
          .set({
            allPayLogisticsId: result.allPayLogisticsId,
            cvsPaymentNo: (result as any).cvsPaymentNo,
            cvsValidationNo: (result as any).cvsValidationNo,
            bookingNote: (result as any).bookingNote,
            logisticsStatus: "in_transit",
            ecpayLogisticsData: result.raw,
          })
          .where(eq(logisticsOrders.orderId, orderId));

        // 更新訂單狀態為已出貨
        await db.update(orders).set({ orderStatus: "shipped" }).where(eq(orders.id, orderId));
        await notifyCustomerOrderShippedSafely(orderId);
      }

      res.json(result);
    } catch (err) {
      console.error("[ECPay Create Logistics] Error:", err);
      res.status(500).json({ error: String(err) });
    }
  });
}
