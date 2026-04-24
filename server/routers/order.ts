/**
 * 訂單 tRPC 路由
 * 處理：建立訂單、產生綠界付款表單參數、查詢訂單狀態、轉帳確認
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import {
  generateMerchantTradeNo,
  buildCreditPaymentParams,
  ECPAY_CONFIG,
} from "../ecpay";
import {
  createOrder,
  getOrderWithItems,
  getAdminOrderDetail,
  getAdminOrderSummaries,
  updateOrderTransferLastFive,
  confirmTransferPayment,
  getOrderStats,
  getMonthlyRevenue,
  getTopProducts,
  updateOrderStatus as dbUpdateOrderStatus,
  createLogisticsOrder,
  markOrderPaidPayPal,
  isCustomDepositProduct,
  createOrReplaceBalancePayment,
  getBalancePaymentDetail,
  updateBalancePaymentTransferCode,
  confirmBalanceTransfer,
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
import {
  createPayPalCheckoutOrder,
  verifyPayPalOrderBelongsToMerchant,
  capturePayPalOrder,
} from "../_core/paypal";
import { isOverseasShipCountryCode } from "@shared/overseasShipping";
import {
  formatOverseasShippingAddress,
  validateOverseasAddress,
} from "@shared/overseasAddress";

function siteBaseUrl(req: { get(name: string): string | undefined; protocol?: string }) {
  const fixed = process.env.SITE_URL?.trim().replace(/\/$/, "");
  if (fixed) return fixed;
  const host = (req.get("x-forwarded-host") || req.get("host") || "").trim();
  const protoHeader = req.get("x-forwarded-proto");
  const proto =
    (Array.isArray(protoHeader) ? protoHeader[0] : protoHeader?.split(",")[0]?.trim()) ||
    (req.protocol === "https" ? "https" : "http");
  return `${proto}://${host}`;
}

const CartItemSchema = z.object({
  id: z.string(),
  baseProductId: z.string().optional(),
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
   * - atm：回傳轉帳帳號資訊
   */
  createAndPay: publicProcedure
    .input(
      z
        .object({
          buyerName: z.string().min(1),
          buyerEmail: z.string().email(),
          buyerPhone: z.string().min(8),
          checkoutRegion: z.enum(["domestic", "overseas"]),
          paymentMethod: z.enum(["credit", "atm"]),
          shippingMethod: z.enum(["cvs_711", "cvs_family", "home"]),
          cvsStoreId: z.string().optional(),
          cvsStoreName: z.string().optional(),
          cvsType: z.string().optional(),
          shippingAddress: z.string().optional(),
          receiverZipCode: z.string().optional(),
          intlCountry: z.string().optional(),
          intlAddrLine1: z.string().optional(),
          intlAddrLine2: z.string().optional(),
          intlCity: z.string().optional(),
          intlState: z.string().optional(),
          intlPostalCode: z.string().optional(),
          items: z.array(CartItemSchema).min(1),
          origin: z.string(),
          sessionToken: z.string().optional(),
        })
        .superRefine((data, ctx) => {
          if (data.checkoutRegion === "domestic") {
            const phone = data.buyerPhone.replace(/\s/g, "");
            if (!/^09\d{8}$/.test(phone)) {
              ctx.addIssue({
                code: "custom",
                message: "請輸入台灣手機格式（09 開頭共 10 碼）",
                path: ["buyerPhone"],
              });
            }
            if (data.shippingMethod === "cvs_711" || data.shippingMethod === "cvs_family") {
              if (!data.cvsStoreId?.trim()) {
                ctx.addIssue({ code: "custom", message: "請選擇超商門市", path: ["cvsStoreId"] });
              }
            }
            if (data.shippingMethod === "home") {
              if (!data.shippingAddress?.trim()) {
                ctx.addIssue({ code: "custom", message: "請填寫收件地址", path: ["shippingAddress"] });
              }
              const zip = data.receiverZipCode?.trim() ?? "";
              if (!/^\d{3,6}$/.test(zip)) {
                ctx.addIssue({ code: "custom", message: "請填寫郵遞區號", path: ["receiverZipCode"] });
              }
            }
          } else {
            if (data.buyerPhone.trim().length < 8) {
              ctx.addIssue({ code: "custom", message: "請填寫聯絡電話", path: ["buyerPhone"] });
            }
            const payload = {
              intlCountry: data.intlCountry ?? "",
              intlAddrLine1: data.intlAddrLine1 ?? "",
              intlAddrLine2: data.intlAddrLine2 ?? "",
              intlCity: data.intlCity ?? "",
              intlState: data.intlState ?? "",
              intlPostalCode: data.intlPostalCode ?? "",
            };
            for (const it of validateOverseasAddress(payload)) {
              ctx.addIssue({
                code: "custom",
                message: it.message,
                path: [it.path as string],
              });
            }
          }
        })
    )
    .mutation(async ({ input, ctx }) => {
      const isOverseas = input.checkoutRegion === "overseas";
      const shippingMethod = isOverseas ? ("home" as const) : input.shippingMethod;
      const paymentMethod = isOverseas ? ("paypal" as const) : input.paymentMethod;

      const merchantTradeNo = generateMerchantTradeNo();
      const totalAmount = input.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      const itemName = input.items
        .map((i) => `${i.name} x${i.quantity}`)
        .join("#");

      const isPreorder = input.items.some((i) => i.isPreorder);
      const isCustomOrder = isCustomDepositProduct(input.items);
      const buyerEmail = normalizeOrderEmail(input.buyerEmail);

      let shippingAddress = input.shippingAddress;
      let receiverZipCode = input.receiverZipCode;
      let cvsStoreId = input.cvsStoreId;
      let cvsStoreName = input.cvsStoreName;
      let cvsType = input.cvsType;

      if (isOverseas) {
        cvsStoreId = undefined;
        cvsStoreName = undefined;
        cvsType = undefined;
        const countryCode = input.intlCountry!.trim();
        if (!isOverseasShipCountryCode(countryCode)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "不支援的海外配送地區" });
        }
        const formatted = formatOverseasShippingAddress({
          countryCode,
          line1: input.intlAddrLine1!.trim(),
          line2: input.intlAddrLine2 ?? "",
          city: input.intlCity!.trim(),
          state: input.intlState ?? "",
          postal: input.intlPostalCode ?? "",
        });
        shippingAddress = formatted.shippingAddress;
        receiverZipCode = formatted.receiverZipCode;
      }

      const orderRow: Parameters<typeof createOrder>[0] = {
        merchantTradeNo,
        paymentStatus: paymentMethod === "atm" ? "transfer_pending" : "pending",
        paymentMethod,
        shippingMethod,
        deliveryRegion: isOverseas ? "overseas" : "domestic",
        orderStatus: "pending_payment",
        isPreorder,
        isCustomOrder,
        totalAmount,
        buyerName: input.buyerName,
        buyerEmail,
        buyerPhone: input.buyerPhone,
        cvsStoreId,
        cvsStoreName,
        cvsType,
        shippingAddress,
        receiverZipCode,
      };
      if (ctx.user?.id != null) {
        orderRow.userId = ctx.user.id;
      }

      await createOrder(
        orderRow,
        input.items.map((item) => ({
          orderId: 0,
          productId: item.baseProductId ?? item.id,
          productName: item.name,
          productImage: item.image ?? "",
          quantity: item.quantity,
          unitPrice: item.price,
          subtotal: item.price * item.quantity,
          isPreorder: item.isPreorder ?? false,
        }))
      );

      if (paymentMethod === "paypal") {
        const returnUrl = `${input.origin}/order/${encodeURIComponent(merchantTradeNo)}?paypal_return=1`;
        const cancelUrl = `${input.origin}/order/${encodeURIComponent(merchantTradeNo)}?paypal_cancel=1`;
        try {
          const { approvalUrl } = await createPayPalCheckoutOrder({
            merchantTradeNo,
            totalAmountTwd: totalAmount,
            returnUrl,
            cancelUrl,
          });
          return {
            kind: "paypal" as const,
            merchantTradeNo,
            approvalUrl,
          };
        } catch (e) {
          console.error("[createAndPay paypal]", e);
          const missing =
            e instanceof Error && e.message === "PAYPAL_CREDENTIALS_MISSING";
          throw new TRPCError({
            code: missing ? "PRECONDITION_FAILED" : "INTERNAL_SERVER_ERROR",
            message: missing
              ? "海外 PayPal 付款尚未完成商店設定，請改選國內結帳或聯絡客服。"
              : "建立 PayPal 付款失敗，請稍後再試。",
          });
        }
      }

      if (paymentMethod === "atm") {
        return {
          kind: "atm" as const,
          paymentMethod: "atm" as const,
          merchantTradeNo,
          bankInfo: {
            bankName: process.env.BANK_NAME ?? "",
            accountName: process.env.BANK_ACCOUNT_NAME ?? "",
            accountNumber: process.env.BANK_ACCOUNT_NUMBER ?? "",
          },
        };
      }

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
        kind: "ecpay_credit" as const,
        paymentMethod: "credit" as const,
        merchantTradeNo,
        paymentURL: ECPAY_CONFIG.PaymentURL,
        paymentParams,
      };
    }),

  /**
   * PayPal 核准後於 return 頁呼叫：驗證訂單與 PayPal Order 後 Capture
   */
  capturePayPal: publicProcedure
    .input(
      z.object({
        merchantTradeNo: z.string().min(1),
        paypalOrderId: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const order = await getOrderWithItems(input.merchantTradeNo);
      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "找不到訂單" });
      }
      if (order.paymentMethod !== "paypal") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "此訂單無需 PayPal 扣款" });
      }
      if (order.paymentStatus === "paid" || order.paymentStatus === "confirmed") {
        return { success: true as const, alreadyPaid: true as const };
      }
      if (order.paymentStatus !== "pending") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "訂單狀態無法完成付款" });
      }

      try {
        await verifyPayPalOrderBelongsToMerchant(input.paypalOrderId, input.merchantTradeNo);
      } catch (e) {
        console.error("[capturePayPal verify]", e);
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            e instanceof Error && e.message === "PAYPAL_ORDER_MISMATCH"
              ? "付款資料與訂單不符"
              : "無法驗證 PayPal 訂單",
        });
      }

      try {
        const cap = await capturePayPalOrder(input.paypalOrderId);
        if (cap.status !== "completed") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: cap.message ?? "PayPal 扣款失敗",
          });
        }
        await markOrderPaidPayPal(input.merchantTradeNo, cap.captureId, cap.raw);
        return { success: true as const, alreadyPaid: false as const };
      } catch (e) {
        if (e instanceof TRPCError) throw e;
        console.error("[capturePayPal]", e);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: e instanceof Error ? e.message : "PayPal 扣款發生錯誤",
        });
      }
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
   * 客人填入轉帳匯款末五碼
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
   * 老闆確認轉帳收款（管理後台）
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
      status: z.enum(["pending_payment", "deposit_paid", "paid", "processing", "shipped", "arrived", "completed", "cancelled"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [order] = await db.select({ merchantTradeNo: orders.merchantTradeNo }).from(orders).where(eq(orders.id, input.orderId)).limit(1);
      if (!order) throw new Error("Order not found");
      await dbUpdateOrderStatus(order.merchantTradeNo, input.status);
      return { success: true };
    }),

  createBalancePaymentLink: adminProcedure
    .input(
      z.object({
        orderId: z.number(),
        amount: z.number().int().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const payment = await createOrReplaceBalancePayment(input);
      const origin = siteBaseUrl(ctx.req);
      return {
        merchantTradeNo: payment.merchantTradeNo,
        amount: payment.amount,
        paymentLink: `${origin}/balance/${encodeURIComponent(payment.merchantTradeNo)}`,
      };
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
        status: z.enum(["all", "pending_payment", "deposit_paid", "paid", "processing", "shipped", "arrived", "completed", "cancelled", "transfer_pending"]).optional().default("all"),
        limit: z.number().min(1).max(500).optional().default(100),
        offset: z.number().min(0).optional().default(0),
      })
    )
    .query(async ({ input }) => {
      return getAdminOrderSummaries(input.limit, input.offset, input.status);
    }),

  /**
   * 取得單筆訂單明細（管理後台展開卡片時才載入）
   */
  getOrderDetail: adminProcedure
    .input(z.object({ orderId: z.number() }))
    .query(async ({ input }) => {
      const order = await getAdminOrderDetail(input.orderId);
      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      const printURL =
        order.shippingMethod === "home" &&
        order.logistics?.logisticsType === "HOME" &&
        order.logistics?.allPayLogisticsId
          ? buildPrintTradeDocURL({
              allPayLogisticsId: order.logistics.allPayLogisticsId,
            })
          : null;

      return {
        ...order,
        printURL,
      };
    }),

  getBalancePayment: publicProcedure
    .input(z.object({ merchantTradeNo: z.string().min(1) }))
    .query(async ({ input }) => {
      return getBalancePaymentDetail(input.merchantTradeNo);
    }),

  getBalancePaymentCheckout: publicProcedure
    .input(
      z.object({
        merchantTradeNo: z.string().min(1),
        paymentMethod: z.enum(["credit", "atm"]),
        origin: z.string().url(),
      })
    )
    .mutation(async ({ input }) => {
      const balancePayment = await getBalancePaymentDetail(input.merchantTradeNo);
      if (!balancePayment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "找不到尾款資料" });
      }
      if (balancePayment.paymentStatus === "paid") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "尾款已付款" });
      }

      const { getDb } = await import("../db");
      const { orderBalancePayments } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db.update(orderBalancePayments)
        .set({ paymentMethod: input.paymentMethod })
        .where(eq(orderBalancePayments.merchantTradeNo, input.merchantTradeNo));

      if (input.paymentMethod === "atm") {
        return {
          kind: "atm" as const,
          bankInfo: {
            bankName: process.env.BANK_NAME ?? "",
            accountName: process.env.BANK_ACCOUNT_NAME ?? "",
            accountNumber: process.env.BANK_ACCOUNT_NUMBER ?? "",
          },
        };
      }

      const paymentParams = buildCreditPaymentParams({
        merchantTradeNo: balancePayment.merchantTradeNo,
        tradeDesc: "椛Crystal客製化尾款",
        itemName: `客製化商品尾款#${balancePayment.order.merchantTradeNo}`,
        totalAmount: balancePayment.amount,
        returnURL: `${input.origin}/api/ecpay/notify`,
        orderResultURL: `${input.origin}/api/ecpay/balance-result`,
        clientBackURL: `${input.origin}/balance/${encodeURIComponent(balancePayment.merchantTradeNo)}`,
      });

      return {
        kind: "credit" as const,
        paymentURL: ECPAY_CONFIG.PaymentURL,
        paymentParams,
      };
    }),

  submitBalanceTransferCode: publicProcedure
    .input(z.object({
      merchantTradeNo: z.string().min(1),
      lastFive: z.string().length(5).regex(/^\d+$/),
    }))
    .mutation(async ({ input }) => {
      await updateBalancePaymentTransferCode(input.merchantTradeNo, input.lastFive);
      return { success: true };
    }),

  confirmBalanceTransfer: adminProcedure
    .input(z.object({ merchantTradeNo: z.string().min(1) }))
    .mutation(async ({ input }) => {
      await confirmBalanceTransfer(input.merchantTradeNo);
      return { success: true };
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
