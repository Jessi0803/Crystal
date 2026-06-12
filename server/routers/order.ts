/**
 * 訂單 tRPC 路由
 * 處理：建立訂單、產生綠界付款表單參數、查詢訂單狀態、轉帳確認
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { OverseasShipCountryCode } from "@shared/overseasShipping";
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
  getProductSalesTotals,
  updateOrderStatus as dbUpdateOrderStatus,
  createLogisticsOrder,
  markOrderPaidPayPal,
  isCustomDepositProduct,
  createOrReplaceBalancePayment,
  getBalancePaymentDetail,
  updateBalancePaymentTransferCode,
  confirmBalanceTransfer,
} from "../orderDb";
import {
  deductInventoryAfterPayment,
  restoreInventoryOnCancel,
  ensureOrdersColumns,
  getProductAvailability,
} from "../inventoryDb";
import {
  buildPrintTradeDocURL,
  createCVSLogisticsOrder,
  createHomeLogisticsOrder,
  useLogisticsSandbox,
} from "../ecpayLogistics";
import { getDb } from "../db";
import { normalizeOrderEmail } from "../_core/emailNormalize";
import { dbProducts, orders, orderItems, logisticsOrders, orderBalancePayments } from "../../drizzle/schema";
import { and, eq, inArray } from "drizzle-orm";
import {
  createPayPalCheckoutOrder,
  verifyPayPalOrderBelongsToMerchant,
  capturePayPalOrder,
} from "../_core/paypal";
import {
  notifyCustomerOrderPlacedSafely,
  notifyCustomerOrderShippedSafely,
} from "../customerOrderNotification";
import { storagePut } from "../storage";
import { isOverseasShipCountryCode, OVERSEAS_SHIP_COUNTRY_LABELS } from "@shared/overseasShipping";
import {
  formatOverseasShippingAddress,
  validateOverseasAddress,
} from "@shared/overseasAddress";
import { calcCheckoutFees } from "@shared/checkoutFees";
import { CUSTOM_PRODUCT_IDS } from "@shared/const";
import { STORE_BANK_INFO } from "@shared/bankAccount";

const BANK_TRANSFER_INVENTORY_LOCK_TTL_MS: number | null = null;
const TRANSFER_RECEIPT_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const CLEAR_QUARTZ_CHIPS_PRODUCT_ID = "prod-1781070485343";

async function getClearQuartzChipsAddOn(db: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  const [product] = await db
    .select()
    .from(dbProducts)
    .where(eq(dbProducts.id, CLEAR_QUARTZ_CHIPS_PRODUCT_ID))
    .limit(1);

  if (!product || !product.active) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "找不到白水晶碎石加購商品" });
  }

  return product;
}

async function deleteCancelledOrderRecords(db: Awaited<ReturnType<typeof getDb>>, orderIds: number[]) {
  if (!db) throw new Error("Database not available");

  await db.delete(orderBalancePayments).where(inArray(orderBalancePayments.orderId, orderIds));
  await db.delete(logisticsOrders).where(inArray(logisticsOrders.orderId, orderIds));
  await db.delete(orderItems).where(inArray(orderItems.orderId, orderIds));
  await db.delete(orders).where(inArray(orders.id, orderIds));
}

function getReceiptExtension(contentType: string, filename?: string) {
  const ext = filename?.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (ext && ["jpg", "jpeg", "png", "webp"].includes(ext)) return ext === "jpeg" ? "jpg" : ext;
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

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
  twoItemFreeShippingEligible: z.boolean().optional(),
});

function isCustomCheckoutItem(item: { id: string; baseProductId?: string }) {
  return CUSTOM_PRODUCT_IDS.includes(item.baseProductId ?? item.id);
}

async function attachTwoItemFreeShippingEligibility<
  T extends { id: string; baseProductId?: string; twoItemFreeShippingEligible?: boolean },
>(items: T[]) {
  const db = await getDb();
  if (!db) return items;

  const productIds = Array.from(new Set(items.map((item) => item.baseProductId ?? item.id)));
  if (productIds.length === 0) return items;

  const rows = await db
    .select({
      id: dbProducts.id,
      twoItemFreeShippingEligible: dbProducts.twoItemFreeShippingEligible,
    })
    .from(dbProducts)
    .where(inArray(dbProducts.id, productIds));
  const eligibilityById = new Map(rows.map((row) => [row.id, row.twoItemFreeShippingEligible]));

  return items.map((item) => {
    const productId = item.baseProductId ?? item.id;
    return {
      ...item,
      twoItemFreeShippingEligible: eligibilityById.get(productId) ?? item.twoItemFreeShippingEligible ?? true,
    };
  });
}

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
          transferLastFive: z.string().optional(),
          transferReceiptImageBase64: z.string().max(8_000_000).optional(),
          transferReceiptImageContentType: z.string().optional(),
          transferReceiptImageFilename: z.string().optional(),
          items: z.array(CartItemSchema).min(1),
          origin: z.string(),
          sessionToken: z.string().optional(),
          customerNote: z.string().max(2000).optional(),
        })
        .superRefine((data, ctx) => {
          const isCustomDepositCheckout = data.items
            .filter((item) => {
              const productId = item.baseProductId ?? item.id;
              return productId !== "shipping" && productId !== "shipping-fee" && productId !== "payment-fee";
            })
            .some(isCustomCheckoutItem);

          if (data.checkoutRegion === "domestic" && data.paymentMethod === "atm" && !/^\d{5}$/.test(data.transferLastFive ?? "")) {
            ctx.addIssue({
              code: "custom",
              message: "請輸入銀行帳號末五碼",
              path: ["transferLastFive"],
            });
          }
          if (data.checkoutRegion === "domestic" && data.paymentMethod === "atm") {
            if (!data.transferReceiptImageBase64 || !data.transferReceiptImageContentType) {
              ctx.addIssue({
                code: "custom",
                message: "請上傳轉帳成功截圖",
                path: ["transferReceiptImageBase64"],
              });
            } else if (!TRANSFER_RECEIPT_CONTENT_TYPES.has(data.transferReceiptImageContentType)) {
              ctx.addIssue({
                code: "custom",
                message: "轉帳截圖請上傳 JPG、PNG 或 WebP 圖片",
                path: ["transferReceiptImageContentType"],
              });
            }
          }

          if (isCustomDepositCheckout) return;

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
      await ensureOrdersColumns();
      const submittedItems = input.items.filter((item) => {
        const productId = item.baseProductId ?? item.id;
        return productId !== "shipping" && productId !== "shipping-fee" && productId !== "payment-fee";
      });
      if (submittedItems.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "購物車沒有可結帳商品" });
      }
      const isCustomOrder = isCustomDepositProduct(submittedItems);
      const checkoutRegion = isCustomOrder ? ("domestic" as const) : input.checkoutRegion;
      const isOverseas = checkoutRegion === "overseas";
      const shippingMethod = isCustomOrder ? ("home" as const) : isOverseas ? ("home" as const) : input.shippingMethod;
      const paymentMethod = isOverseas ? ("paypal" as const) : input.paymentMethod;
      for (const item of submittedItems) {
        const productId = item.baseProductId ?? item.id;
        const availability = await getProductAvailability(productId);
        if (
          availability.isMonthlyLimited &&
          (!availability.available || (availability.stock !== -1 && availability.stock < item.quantity))
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `「${item.name}」已售完，無法預購。`,
          });
        }
      }

      const merchantTradeNo = generateMerchantTradeNo();
      const isPreorder = submittedItems.some((i) => i.isPreorder);
      const buyerEmail = normalizeOrderEmail(input.buyerEmail);

      let shippingAddress = isCustomOrder ? undefined : input.shippingAddress;
      let receiverZipCode = isCustomOrder ? undefined : input.receiverZipCode;
      let cvsStoreId = isCustomOrder ? undefined : input.cvsStoreId;
      let cvsStoreName = isCustomOrder ? undefined : input.cvsStoreName;
      let cvsType = isCustomOrder ? undefined : input.cvsType;
      let overseasCountry: OverseasShipCountryCode | null = null;

      if (isOverseas) {
        cvsStoreId = undefined;
        cvsStoreName = undefined;
        cvsType = undefined;
        const countryCode = input.intlCountry!.trim();
        if (!isOverseasShipCountryCode(countryCode)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "不支援的海外配送地區" });
        }
        overseasCountry = countryCode;
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

      const feeItemsForCalculation = await attachTwoItemFreeShippingEligibility(submittedItems);
      const feeSummary = isCustomOrder
        ? {
            shippingFee: 0,
            total: submittedItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
          }
        : calcCheckoutFees({
            items: feeItemsForCalculation,
            checkoutRegion,
            shippingMethod,
            paymentMethod,
            overseasCountry,
            buyerEmail,
          });
      const feeItems: typeof submittedItems = [];
      if (feeSummary.shippingFee > 0) {
        feeItems.push({
          id: "shipping-fee",
          baseProductId: "shipping-fee",
          name: isOverseas
            ? `海外運費 - ${OVERSEAS_SHIP_COUNTRY_LABELS[overseasCountry!]}`
            : shippingMethod === "home"
              ? "運費 - 黑貓宅急便"
              : shippingMethod === "cvs_711"
                ? "運費 - 7-11店到店"
                : "運費 - 全家店到店",
          price: feeSummary.shippingFee,
          quantity: 1,
          image: "",
        });
      }
      const orderItems = submittedItems.concat(feeItems);
      const totalAmount = feeSummary.total;
      let transferReceiptUrl: string | undefined;
      if (paymentMethod === "atm") {
        const receiptBase64 = input.transferReceiptImageBase64;
        const receiptContentType = input.transferReceiptImageContentType;
        if (!receiptBase64 || !receiptContentType || !TRANSFER_RECEIPT_CONTENT_TYPES.has(receiptContentType)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "請上傳轉帳成功截圖" });
        }
        const receiptBuffer = Buffer.from(receiptBase64, "base64");
        if (receiptBuffer.length === 0 || receiptBuffer.length > 6 * 1024 * 1024) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "轉帳截圖大小需小於 6MB" });
        }
        const ext = getReceiptExtension(receiptContentType, input.transferReceiptImageFilename);
        const uploaded = await storagePut(`transfer-receipts/${merchantTradeNo}-${Date.now()}.${ext}`, receiptBuffer, receiptContentType);
        transferReceiptUrl = uploaded.url;
      }

      const itemName = orderItems
        .map((i) => `${i.name} x${i.quantity}`)
        .join("#");

      const orderRow: Parameters<typeof createOrder>[0] = {
        merchantTradeNo,
        paymentStatus: paymentMethod === "atm" ? "transfer_pending" : "pending",
        paymentMethod,
        shippingMethod,
        deliveryRegion: checkoutRegion,
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
        transferLastFive: paymentMethod === "atm" ? input.transferLastFive : undefined,
        transferReceiptUrl,
        customerNote: input.customerNote ?? null,
      };
      if (ctx.user?.id != null) {
        orderRow.userId = ctx.user.id;
      }

      const createdOrderId = await createOrder(
        orderRow,
        orderItems.map((item) => ({
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
      await notifyCustomerOrderPlacedSafely(createdOrderId);

      const origin = siteBaseUrl(ctx.req);

      if (paymentMethod === "paypal") {
        const returnUrl = `${origin}/order/${encodeURIComponent(merchantTradeNo)}?paypal_return=1`;
        const cancelUrl = `${origin}/order/${encodeURIComponent(merchantTradeNo)}?paypal_cancel=1`;
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
        // ATM 下單即扣減庫存（confirmTransfer 時會因 inventoryDeducted=true 跳過）
        await deductInventoryAfterPayment(merchantTradeNo);
        return {
          kind: "atm" as const,
          paymentMethod: "atm" as const,
          merchantTradeNo,
          bankInfo: STORE_BANK_INFO,
        };
      }

      const returnURL = `${origin}/api/ecpay/notify`;
      const orderResultURL = `${origin}/api/ecpay/order-result`;
      const clientBackURL = `${origin}/products`;

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
        await deductInventoryAfterPayment(input.merchantTradeNo);
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
      await deductInventoryAfterPayment(order.merchantTradeNo);
      return { success: true };
    }),

  /**
   * 手動更新訂單狀態（管理後台）
   */
  updateOrderStatus: adminProcedure
    .input(z.object({
      orderId: z.number(),
      status: z.enum(["pending_payment", "transfer_pending", "deposit_paid", "paid", "processing", "shipped", "arrived", "picked_up", "not_picked", "completed", "cancelled"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [order] = await db.select({ id: orders.id, merchantTradeNo: orders.merchantTradeNo }).from(orders).where(eq(orders.id, input.orderId)).limit(1);
      if (!order) throw new Error("Order not found");

      // 轉帳待確認屬於「付款狀態」(paymentStatus)，不是訂單狀態(orderStatus)，
      // 列表與統計也是用 paymentStatus 篩選，因此直接更新 paymentStatus。
      if (input.status === "transfer_pending") {
        await db.update(orders).set({ paymentStatus: "transfer_pending" }).where(eq(orders.id, order.id));
        return { success: true };
      }

      await dbUpdateOrderStatus(order.merchantTradeNo, input.status);

      if (input.status === "paid") {
        // 改為已付款：標記付款並扣庫存，與綠界付款通知 / 確認轉帳的邏輯一致。
        // deductInventoryAfterPayment 以 inventoryDeducted 旗標防止重複扣減。
        await db.update(orders).set({ paymentStatus: "paid", paidAt: new Date() }).where(eq(orders.id, order.id));
        await deductInventoryAfterPayment(order.merchantTradeNo);
      }
      if (input.status === "cancelled") {
        await restoreInventoryOnCancel(order.merchantTradeNo);
      }
      if (input.status === "shipped") {
        await notifyCustomerOrderShippedSafely(order.id);
      }
      return { success: true };
    }),

  /**
   * 刪除已取消訂單（管理後台）
   */
  deleteCancelledOrder: adminProcedure
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [order] = await db
        .select({ id: orders.id, orderStatus: orders.orderStatus })
        .from(orders)
        .where(eq(orders.id, input.orderId))
        .limit(1);

      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      if (order.orderStatus !== "cancelled") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "只能刪除已取消的訂單" });
      }

      await deleteCancelledOrderRecords(db, [order.id]);

      return { success: true };
    }),

  /**
   * 批次刪除已取消訂單（管理後台）
   */
  deleteCancelledOrders: adminProcedure
    .input(
      z.object({
        orderIds: z.array(z.number().int().positive()).min(1).max(100),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const orderIds = Array.from(new Set(input.orderIds));
      const rows = await db
        .select({
          id: orders.id,
          orderStatus: orders.orderStatus,
          merchantTradeNo: orders.merchantTradeNo,
        })
        .from(orders)
        .where(inArray(orders.id, orderIds));

      if (rows.length !== orderIds.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "部分訂單不存在，請重新整理後再試" });
      }

      const notCancelled = rows.filter((order) => order.orderStatus !== "cancelled");
      if (notCancelled.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `只能刪除已取消的訂單：${notCancelled.map((order) => order.merchantTradeNo).join(", ")}`,
        });
      }

      await deleteCancelledOrderRecords(db, orderIds);

      return { success: true, deletedCount: orderIds.length };
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
      const serverReplyURL = `${siteBaseUrl(ctx.req)}/api/ecpay/logistics-notify`;

      let ecpayResult;
      try {
        if (order.shippingMethod === "home") {
          ecpayResult = await createHomeLogisticsOrder({
            logisticsMerchantTradeNo,
            goodsName: "椛Crystal能量水晶",
            goodsAmount: order.totalAmount,
            senderName: process.env.SENDER_NAME || "陳柔薫",
            senderPhone: process.env.SENDER_PHONE || "0916915813",
            senderZipCode: process.env.SENDER_ZIPCODE || "330",
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
            senderZipCode: process.env.SENDER_ZIPCODE || "330",
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
          await notifyCustomerOrderShippedSafely(input.orderId);

          return {
            success: true,
            sandbox: useLogisticsSandbox,
            logisticsId: logisticsMerchantTradeNo,
            logisticsSubType,
            allPayLogisticsId: ecpayResult.allPayLogisticsId,
            cvsPaymentNo: (ecpayResult as any).cvsPaymentNo || null,
            cvsValidationNo: (ecpayResult as any).cvsValidationNo || null,
            bookingNote: (ecpayResult as any).bookingNote || null,
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
        status: z.enum(["all", "pending_payment", "deposit_paid", "paid", "processing", "shipped", "arrived", "picked_up", "not_picked", "completed", "cancelled", "transfer_pending"]).optional().default("all"),
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
      z
        .object({
          merchantTradeNo: z.string().min(1),
          paymentMethod: z.enum(["credit", "atm"]),
          includeClearQuartzChips: z.boolean().optional(),
          checkoutRegion: z.enum(["domestic", "overseas"]),
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
          origin: z.string().url(),
        })
        .superRefine((data, ctx) => {
          if (data.checkoutRegion === "domestic") {
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
      const balancePayment = await getBalancePaymentDetail(input.merchantTradeNo);
      if (!balancePayment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "找不到尾款資料" });
      }
      if (balancePayment.paymentStatus === "paid") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "尾款已付款" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const isOverseas = input.checkoutRegion === "overseas";
      const shippingMethod = isOverseas ? ("home" as const) : input.shippingMethod;
      let shippingAddress = input.shippingAddress;
      let receiverZipCode = input.receiverZipCode;
      let cvsStoreId = input.cvsStoreId;
      let cvsStoreName = input.cvsStoreName;
      let cvsType = input.cvsType;
      let overseasCountry: OverseasShipCountryCode | null = null;

      if (isOverseas) {
        cvsStoreId = undefined;
        cvsStoreName = undefined;
        cvsType = undefined;
        const countryCode = input.intlCountry!.trim();
        if (!isOverseasShipCountryCode(countryCode)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "不支援的海外配送地區" });
        }
        overseasCountry = countryCode;
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

      const balanceItems: Array<{
        id: string;
        name: string;
        price: number;
        quantity: number;
        twoItemFreeShippingEligible?: boolean;
      }> = [{
          id: "custom-balance-payment",
          name: "客製化商品尾款",
          price: balancePayment.amount,
          quantity: 1,
          twoItemFreeShippingEligible: false,
        }];
      const clearQuartzChipsAddOn = input.includeClearQuartzChips
        ? await getClearQuartzChipsAddOn(db)
        : null;

      if (clearQuartzChipsAddOn) {
        balanceItems.push({
          id: clearQuartzChipsAddOn.id,
          name: clearQuartzChipsAddOn.name,
          price: clearQuartzChipsAddOn.price,
          quantity: 1,
          twoItemFreeShippingEligible: clearQuartzChipsAddOn.twoItemFreeShippingEligible,
        });
      }

      const feeSummary = calcCheckoutFees({
        items: balanceItems,
        checkoutRegion: input.checkoutRegion,
        shippingMethod,
        paymentMethod: input.paymentMethod,
        overseasCountry,
        buyerEmail: balancePayment.order.buyerEmail,
      });
      const totalAmount = feeSummary.total;

      await db.update(orderBalancePayments)
        .set({
          paymentMethod: input.paymentMethod,
          shippingFee: feeSummary.shippingFee,
          paymentFee: feeSummary.paymentFee,
          totalAmount,
        })
        .where(eq(orderBalancePayments.merchantTradeNo, input.merchantTradeNo));

      const [existingClearQuartzItem] = await db
        .select()
        .from(orderItems)
        .where(and(
          eq(orderItems.orderId, balancePayment.orderId),
          eq(orderItems.productId, CLEAR_QUARTZ_CHIPS_PRODUCT_ID),
        ))
        .limit(1);

      if (clearQuartzChipsAddOn) {
        const itemValues = {
          productName: clearQuartzChipsAddOn.name,
          productImage: clearQuartzChipsAddOn.image,
          quantity: 1,
          unitPrice: clearQuartzChipsAddOn.price,
          subtotal: clearQuartzChipsAddOn.price,
          isPreorder: false,
        };
        if (existingClearQuartzItem) {
          await db.update(orderItems)
            .set(itemValues)
            .where(eq(orderItems.id, existingClearQuartzItem.id));
        } else {
          await db.insert(orderItems).values({
            orderId: balancePayment.orderId,
            productId: CLEAR_QUARTZ_CHIPS_PRODUCT_ID,
            ...itemValues,
          });
        }
      } else if (existingClearQuartzItem) {
        await db.delete(orderItems)
          .where(and(
            eq(orderItems.orderId, balancePayment.orderId),
            eq(orderItems.productId, CLEAR_QUARTZ_CHIPS_PRODUCT_ID),
          ));
      }

      await db.update(orders)
        .set({
          deliveryRegion: isOverseas ? "overseas" : "domestic",
          shippingMethod,
          cvsStoreId: cvsStoreId ?? null,
          cvsStoreName: cvsStoreName ?? null,
          cvsType: cvsType ?? null,
          shippingAddress: shippingAddress ?? null,
          receiverZipCode: receiverZipCode ?? null,
          totalAmount: balancePayment.order.totalAmount - (balancePayment.totalAmount ?? balancePayment.amount) + totalAmount,
        })
        .where(eq(orders.id, balancePayment.orderId));

      if (input.paymentMethod === "atm") {
        return {
          kind: "atm" as const,
          amount: totalAmount,
          shippingFee: feeSummary.shippingFee,
          paymentFee: feeSummary.paymentFee,
          bankInfo: STORE_BANK_INFO,
        };
      }

      const origin = siteBaseUrl(ctx.req);
      const paymentParams = buildCreditPaymentParams({
        merchantTradeNo: balancePayment.merchantTradeNo,
        tradeDesc: "椛Crystal客製化尾款",
        itemName: balanceItems.map((item) => `${item.name} x${item.quantity}`).join("#"),
        totalAmount,
        returnURL: `${origin}/api/ecpay/notify`,
        orderResultURL: `${origin}/api/ecpay/balance-result`,
        clientBackURL: `${origin}/balance/${encodeURIComponent(balancePayment.merchantTradeNo)}`,
      });

      return {
        kind: "credit" as const,
        paymentURL: ECPAY_CONFIG.PaymentURL,
        paymentParams,
        amount: totalAmount,
        shippingFee: feeSummary.shippingFee,
        paymentFee: feeSummary.paymentFee,
      };
    }),

  submitBalanceTransferCode: publicProcedure
    .input(z.object({
      merchantTradeNo: z.string().min(1),
      lastFive: z.string().length(5).regex(/^\d+$/),
      transferReceiptImageBase64: z.string().max(8_000_000),
      transferReceiptImageContentType: z.string(),
      transferReceiptImageFilename: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const receiptContentType = input.transferReceiptImageContentType;
      if (!TRANSFER_RECEIPT_CONTENT_TYPES.has(receiptContentType)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "轉帳截圖請上傳 JPG、PNG 或 WebP 圖片" });
      }
      const receiptBuffer = Buffer.from(input.transferReceiptImageBase64, "base64");
      if (receiptBuffer.length === 0 || receiptBuffer.length > 6 * 1024 * 1024) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "轉帳截圖大小需小於 6MB" });
      }
      const ext = getReceiptExtension(receiptContentType, input.transferReceiptImageFilename);
      const uploaded = await storagePut(
        `balance-transfer-receipts/${input.merchantTradeNo}-${Date.now()}.${ext}`,
        receiptBuffer,
        receiptContentType
      );
      await updateBalancePaymentTransferCode(input.merchantTradeNo, input.lastFive, uploaded.url);
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

  /**
   * 商品銷售量排序資料（前台商品列表使用）
   */
  getProductSalesTotals: publicProcedure.query(async () => {
    try {
      return await getProductSalesTotals();
    } catch (error) {
      console.error("[order.getProductSalesTotals] failed", error);
      return [];
    }
  }),
});
