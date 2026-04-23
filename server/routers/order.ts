/**
 * 訂單 tRPC 路由
 * 處理：建立訂單、產生綠界付款表單參數、查詢訂單狀態、銀行轉帳確認
 */
import { z } from "zod";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import {
  generateMerchantTradeNo,
  buildCreditPaymentParams,
  ECPAY_CONFIG,
} from "../ecpay";
import {
  createOrder,
  getOrderWithItems,
  getAllOrders,
  updateOrderTransferLastFive,
  confirmTransferPayment,
  getOrderStats,
  getMonthlyRevenue,
  getTopProducts,
  updateOrderStatus as dbUpdateOrderStatus,
  createLogisticsOrder,
} from "../orderDb";
import { acquireInventoryLock, releaseExpiredLocks } from "../inventoryDb";
import {
  buildPrintTradeDocURL,
  createCVSLogisticsOrder,
  createHomeLogisticsOrder,
} from "../ecpayLogistics";
import { getDb } from "../db";
import { normalizeOrderEmail } from "../_core/emailNormalize";
import { orders, logisticsOrders } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

const CartItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  quantity: z.number(),
  image: z.string().optional(),
  isPreorder: z.boolean().optional(),
});

export const orderRouter = router({
  /**
   * 建立訂單並取得付款資訊
   * - credit：回傳綠界付款表單參數
   * - atm：回傳銀行帳號資訊
   */
  createAndPay: publicProcedure
    .input(
      z.object({
        buyerName: z.string().min(1),
        buyerEmail: z.string().email(),
        buyerPhone: z.string().min(8),
        paymentMethod: z.enum(["credit", "atm"]),
        shippingMethod: z.enum(["cvs_711", "cvs_family", "home"]),
        // 超商取貨資訊
        cvsStoreId: z.string().optional(),
        cvsStoreName: z.string().optional(),
        cvsType: z.string().optional(),
        // 宅配地址
        shippingAddress: z.string().optional(),
        receiverZipCode: z.string().optional(),
        items: z.array(CartItemSchema).min(1),
        origin: z.string(),
        // 庫存鎖定 session token
        sessionToken: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const merchantTradeNo = generateMerchantTradeNo();
      const totalAmount = input.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      const itemName = input.items
        .map((i) => `${i.name} x${i.quantity}`)
        .join("#");

      const isPreorder = input.items.some((i) => i.isPreorder);
      const buyerEmail = normalizeOrderEmail(input.buyerEmail);

      // 建立訂單
      const orderId = await createOrder(
        {
          merchantTradeNo,
          paymentStatus: input.paymentMethod === "atm" ? "transfer_pending" : "pending",
          paymentMethod: input.paymentMethod,
          shippingMethod: input.shippingMethod,
          orderStatus: "pending_payment",
          isPreorder,
          totalAmount,
          buyerName: input.buyerName,
          buyerEmail,
          buyerPhone: input.buyerPhone,
          cvsStoreId: input.cvsStoreId,
          cvsStoreName: input.cvsStoreName,
          cvsType: input.cvsType,
          shippingAddress: input.shippingAddress,
          receiverZipCode: input.receiverZipCode,
        },
        input.items.map((item) => ({
          orderId: 0,
          productId: item.id,
          productName: item.name,
          productImage: item.image ?? "",
          quantity: item.quantity,
          unitPrice: item.price,
          subtotal: item.price * item.quantity,
          isPreorder: item.isPreorder ?? false,
        }))
      );

      // 銀行轉帳：直接回傳帳號資訊
      if (input.paymentMethod === "atm") {
        return {
          paymentMethod: "atm" as const,
          merchantTradeNo,
          bankInfo: {
            bankName: process.env.BANK_NAME ?? "",
            accountName: process.env.BANK_ACCOUNT_NAME ?? "",
            accountNumber: process.env.BANK_ACCOUNT_NUMBER ?? "",
          },
        };
      }

      // 信用卡/Apple Pay：產生綠界付款表單
      const returnURL = `${input.origin}/api/ecpay/notify`;
      const orderResultURL = `${input.origin}/api/ecpay/order-result`;
      const clientBackURL = `${input.origin}/products`;

      const paymentParams = buildCreditPaymentParams({
        merchantTradeNo,
        tradeDesc: "椛Crystal能量水晶",
        itemName,
        totalAmount,
        returnURL,
        orderResultURL,
        clientBackURL,
      });

      return {
        paymentMethod: "credit" as const,
        merchantTradeNo,
        paymentURL: ECPAY_CONFIG.PaymentURL,
        paymentParams,
      };
    }),

  /**
   * 查詢訂單（含商品明細）
   */
  getOrder: publicProcedure
    .input(z.object({ merchantTradeNo: z.string() }))
    .query(async ({ input }) => {
      const order = await getOrderWithItems(input.merchantTradeNo);
      if (!order) return null;
      return order;
    }),

  /**
   * 客人填入銀行轉帳末五碼
   */
  submitTransferCode: publicProcedure
    .input(z.object({
      merchantTradeNo: z.string(),
      lastFive: z.string().length(5).regex(/^\d+$/),
    }))
    .mutation(async ({ input }) => {
      await updateOrderTransferLastFive(input.merchantTradeNo, input.lastFive);
      return { success: true };
    }),

  /**
   * 老闆確認銀行轉帳收款（管理後台）
   */
  confirmTransfer: adminProcedure
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [order] = await db.select({ merchantTradeNo: orders.merchantTradeNo }).from(orders).where(eq(orders.id, input.orderId)).limit(1);
      if (!order) throw new Error("Order not found");
      await confirmTransferPayment(order.merchantTradeNo);
      return { success: true };
    }),

  /**
   * 手動更新訂單狀態（管理後台）
   */
  updateOrderStatus: adminProcedure
    .input(z.object({
      orderId: z.number(),
      status: z.enum(["pending_payment", "paid", "processing", "shipped", "arrived", "completed", "cancelled"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [order] = await db.select({ merchantTradeNo: orders.merchantTradeNo }).from(orders).where(eq(orders.id, input.orderId)).limit(1);
      if (!order) throw new Error("Order not found");
      await dbUpdateOrderStatus(order.merchantTradeNo, input.status);
      return { success: true };
    }),

  /**
   * 建立物流訂單（管理後台）
   */
  createLogistics: adminProcedure
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [order] = await db.select().from(orders).where(eq(orders.id, input.orderId)).limit(1);
      if (!order) throw new Error("Order not found");

      // 強制使用 C2C 物流類型（避免舊訂單存了 B2C 類型）
      const logisticsMerchantTradeNo = `L${Date.now()}`;
      const logisticsType = order.shippingMethod === "home" ? "HOME" : "CVS";
      const logisticsSubType =
        order.shippingMethod === "cvs_711" ? "UNIMARTC2C" :
        order.shippingMethod === "cvs_family" ? "FAMIC2C" : "TCAT";

      // 補足收件人姓名長度（綠界規定：中文 2~5 字，英文 4~10 字）
      const normalizeReceiverName = (name: string): string => {
        const trimmed = name.trim();
        // 判斷是否含中文
        const hasChinese = /[\u4e00-\u9fff]/.test(trimmed);
        if (hasChinese) {
          // 中文：不足 2 字補「先生」，超過 5 字截斷
          if (trimmed.length < 2) return trimmed + "先生";
          if (trimmed.length > 5) return trimmed.slice(0, 5);
          return trimmed;
        } else {
          // 英文：不足 4 字補空格到 4 字，超過 10 字截斷
          if (trimmed.length < 4) return trimmed.padEnd(4, " ");
          if (trimmed.length > 10) return trimmed.slice(0, 10);
          return trimmed;
        }
      };
      const normalizedReceiverName = normalizeReceiverName(order.buyerName);

      // 先建立物流訂單記錄
      await createLogisticsOrder({
        orderId: input.orderId,
        logisticsMerchantTradeNo,
        logisticsType: logisticsType as "CVS" | "HOME",
        logisticsSubType,
        logisticsStatus: "created",
      });

      // 取得 serverReplyURL（用於綠界回調）
      // 使用正式網域，確保綠界可以回調
      const host = process.env.NODE_ENV === "production"
        ? "https://www.goodaytarot.com"
        : `http://localhost:${process.env.PORT || 3000}`;
      const serverReplyURL = `${host}/api/ecpay/logistics-notify`;

      let ecpayResult;
      try {
        if (order.shippingMethod === "home") {
          ecpayResult = await createHomeLogisticsOrder({
            logisticsMerchantTradeNo,
            goodsName: "椛Crystal能量水晶",
            goodsAmount: order.totalAmount,
            senderName: process.env.SENDER_NAME || "陳柔薫",
            senderPhone: process.env.SENDER_PHONE || "0916915813",
            senderAddress: process.env.SENDER_ADDRESS || "桃園市龜山區南上路290巷25號",
            receiverName: normalizedReceiverName,
            receiverPhone: order.buyerPhone,
            receiverZipCode: order.receiverZipCode || "",
            receiverAddress: order.shippingAddress || "",
            serverReplyURL,
          });
        } else {
          ecpayResult = await createCVSLogisticsOrder({
            logisticsMerchantTradeNo,
            goodsName: "椛Crystal能量水晶",
            goodsAmount: order.totalAmount,
            senderName: process.env.SENDER_NAME || "陳柔薫",
            senderPhone: process.env.SENDER_PHONE || "0916915813",
            receiverName: normalizedReceiverName,
            receiverPhone: order.buyerPhone,
            receiverStoreID: order.cvsStoreId || "",
            logisticsSubType: logisticsSubType as "UNIMARTC2C" | "FAMIC2C",
            serverReplyURL,
          });
        }

        console.log("[createLogistics] ECPay result:", ecpayResult);

        if (ecpayResult.success) {
          // 更新物流訂單：存入取件碼、AllPayLogisticsID 等
          await db
            .update(logisticsOrders)
            .set({
              allPayLogisticsId: ecpayResult.allPayLogisticsId || null,
              cvsPaymentNo: (ecpayResult as any).cvsPaymentNo || null,
              cvsValidationNo: (ecpayResult as any).cvsValidationNo || null,
              bookingNote: (ecpayResult as any).bookingNote || null,
              logisticsStatus: "in_transit",
              ecpayLogisticsData: ecpayResult.raw,
            })
            .where(eq(logisticsOrders.logisticsMerchantTradeNo, logisticsMerchantTradeNo));

          // 更新訂單狀態為已出貨
          await dbUpdateOrderStatus(order.merchantTradeNo, "shipped");

          return {
            success: true,
            logisticsId: logisticsMerchantTradeNo,
            allPayLogisticsId: ecpayResult.allPayLogisticsId,
            cvsPaymentNo: (ecpayResult as any).cvsPaymentNo || null,
          };
        } else {
          // 綠界回傳失敗，刪除這筆記錄讓按鈕可以重新出現
          await db
            .delete(logisticsOrders)
            .where(eq(logisticsOrders.logisticsMerchantTradeNo, logisticsMerchantTradeNo));
          throw new Error(`綠界物流建立失敗：${ecpayResult.rtnMsg}`);
        }
      } catch (err) {
        // 若是我們自己拋的錯誤，直接往上傳
        if (err instanceof Error && err.message.startsWith("綠界物流")) throw err;
        // 其他錯誤（網路等）
        console.error("[createLogistics] Error calling ECPay:", err);
        // 刪除失敗的物流記錄，讓按鈕可以重新出現
        try {
          await db
            .delete(logisticsOrders)
            .where(eq(logisticsOrders.logisticsMerchantTradeNo, logisticsMerchantTradeNo));
        } catch (_) { /* ignore cleanup error */ }
        throw new Error(`呼叫綠界物流 API 失敗：${String(err)}`);
      }
    }),

  /**
   * 取得宅配託運單列印 URL（管理後台）
   */
  getPrintURL: adminProcedure
    .input(z.object({ orderId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [logistics] = await db
        .select()
        .from(logisticsOrders)
        .where(eq(logisticsOrders.orderId, input.orderId))
        .limit(1);
      if (!logistics) throw new Error("Logistics order not found");
      if (logistics.logisticsType !== "HOME") throw new Error("Only HOME logistics supports print");
      if (!logistics.allPayLogisticsId) throw new Error("AllPayLogisticsID not available yet");

      const printURL = buildPrintTradeDocURL({
        allPayLogisticsId: logistics.allPayLogisticsId,
      });
      return { printURL };
    }),

  /**
   * 取得所有訂單（管理後台）
   */
  listOrders: adminProcedure
    .input(
      z.object({
        status: z.enum(["all", "pending_payment", "paid", "processing", "shipped", "arrived", "completed", "cancelled", "transfer_pending"]).optional().default("all"),
        limit: z.number().min(1).max(500).optional().default(100),
        offset: z.number().min(0).optional().default(0),
      })
    )
    .query(async ({ input }) => {
      return getAllOrders(input.limit, input.offset, input.status);
    }),

  /**
   * 訂單統計（管理後台 Dashboard）
   */
  getStats: adminProcedure.query(async () => {
    return getOrderStats();
  }),

  /**
   * 月營收報表
   */
  getMonthlyRevenue: adminProcedure
    .input(z.object({ months: z.number().min(1).max(24).optional().default(6) }))
    .query(async ({ input }) => {
      return getMonthlyRevenue(input.months);
    }),

  /**
   * 熱銷商品排行
   */
  getTopProducts: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(20).optional().default(10) }))
    .query(async ({ input }) => {
      return getTopProducts(input.limit);
    }),
});
