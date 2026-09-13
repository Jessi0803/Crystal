/**
 * 訂單 tRPC 路由
 * 處理：建立訂單、產生綠界付款表單參數、查詢訂單狀態、轉帳確認
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { OverseasShipCountryCode } from "@shared/overseasShipping";
import { adminProcedure, publicProcedure, rateLimitedPublicProcedure, router } from "../_core/trpc";
import type { TrpcContext } from "../_core/context";
import { enforceRateLimit } from "../_core/rateLimit";
import {
  generateMerchantTradeNo,
  buildCreditPaymentParams,
  ECPAY_CONFIG,
  usePaymentSandbox,
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
  createBalancePaymentAttempt,
  getBalancePaymentDetail,
  updateBalancePaymentTransferCode,
  confirmBalanceTransfer,
  settleZeroBalancePayment,
} from "../orderDb";
import {
  deductInventoryAfterBalancePayment,
  deductInventoryAfterPayment,
  restoreInventoryOnCancel,
  ensureOrdersColumns,
  getProductAvailability,
} from "../inventoryDb";
import {
  buildPrintTradeDocURL,
  createCVSLogisticsOrder,
  createHomeLogisticsOrder,
  fetchPrintTradeDocument,
  useLogisticsSandbox,
} from "../ecpayLogistics";
import { getDb } from "../db";
import { normalizeOrderEmail } from "../_core/emailNormalize";
import {
  dbProducts,
  orders,
  orderItems,
  logisticsOrders,
  orderBalancePayments,
  orderMergeGroups,
  orderMergeMembers,
  type OrderItemConfigurationSnapshot,
} from "../../drizzle/schema";
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
import { recordAuditEventSafely } from "../auditDb";
import { isOverseasShipCountryCode, OVERSEAS_SHIP_COUNTRY_LABELS } from "@shared/overseasShipping";
import {
  formatOverseasShippingAddress,
  validateOverseasAddress,
} from "@shared/overseasAddress";
import { calcCheckoutFees } from "@shared/checkoutFees";
import { CLEAR_QUARTZ_CHIPS_PRODUCT_ID, CUSTOM_PRODUCT_IDS } from "@shared/const";
import { STORE_BANK_INFO } from "@shared/bankAccount";
import {
  getTarotDepositPrice,
  getTarotTopicByOptionId,
  TAROT_DEPOSIT_PRODUCT_ID,
} from "@shared/tarotPricing";
import { createOrderAccessToken, verifyOrderAccessToken } from "../orderAccess";

const BANK_TRANSFER_INVENTORY_LOCK_TTL_MS: number | null = null;
const TRANSFER_RECEIPT_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

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

  await db.transaction(async (tx) => {
    const mergeMemberships = await tx
      .select({ groupId: orderMergeMembers.groupId })
      .from(orderMergeMembers)
      .where(inArray(orderMergeMembers.orderId, orderIds));
    const mergeGroupIds = Array.from(new Set(mergeMemberships.map((row) => row.groupId)));

    // Dissolve an affected merge group before deleting any of its orders. This
    // prevents surviving legacy orders from pointing at a deleted main order.
    if (mergeGroupIds.length > 0) {
      await tx.delete(orderMergeMembers).where(inArray(orderMergeMembers.groupId, mergeGroupIds));
      await tx.delete(orderMergeGroups).where(inArray(orderMergeGroups.id, mergeGroupIds));
    }

    await tx.delete(orderBalancePayments).where(inArray(orderBalancePayments.orderId, orderIds));
    await tx.delete(logisticsOrders).where(inArray(logisticsOrders.orderId, orderIds));
    await tx.delete(orderItems).where(inArray(orderItems.orderId, orderIds));
    await tx.delete(orders).where(inArray(orders.id, orderIds));
  });
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

type OrderDatabase = NonNullable<Awaited<ReturnType<typeof getDb>>>;

const MERGED_ORDER_SYNC_STATUSES = new Set([
  "processing",
  "shipped",
  "arrived",
  "picked_up",
  "not_picked",
  "completed",
  "cancelled",
]);

const FULFILLMENT_STATUSES = new Set([
  "shipped",
  "arrived",
  "picked_up",
  "not_picked",
  "completed",
]);

async function getOrderOperationContext(db: OrderDatabase, orderId: number) {
  const [mergeMember] = await db
    .select({
      groupId: orderMergeMembers.groupId,
      mainOrderId: orderMergeGroups.mainOrderId,
    })
    .from(orderMergeMembers)
    .leftJoin(orderMergeGroups, eq(orderMergeMembers.groupId, orderMergeGroups.id))
    .where(eq(orderMergeMembers.orderId, orderId))
    .limit(1);

  if (mergeMember?.mainOrderId && mergeMember.mainOrderId !== orderId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "此訂單已併入主訂單，請從主訂單操作" });
  }

  if (!mergeMember?.groupId) {
    return { groupId: null, mainOrderId: orderId, orderIds: [orderId] };
  }

  const members = await db
    .select({ orderId: orderMergeMembers.orderId })
    .from(orderMergeMembers)
    .where(eq(orderMergeMembers.groupId, mergeMember.groupId));

  return {
    groupId: mergeMember.groupId,
    mainOrderId: mergeMember.mainOrderId ?? orderId,
    orderIds: members.map((member) => member.orderId),
  };
}

async function assertReadyForFulfillment(
  db: OrderDatabase,
  context: Awaited<ReturnType<typeof getOrderOperationContext>>
) {
  const groupOrders = await db
    .select({
      id: orders.id,
      merchantTradeNo: orders.merchantTradeNo,
      paymentStatus: orders.paymentStatus,
      orderStatus: orders.orderStatus,
      isCustomOrder: orders.isCustomOrder,
    })
    .from(orders)
    .where(inArray(orders.id, context.orderIds));

  if (groupOrders.length !== context.orderIds.length) {
    throw new TRPCError({ code: "NOT_FOUND", message: "部分合併訂單不存在，請重新整理後再試" });
  }

  const unpaidOrders = groupOrders.filter(
    (order) => !["paid", "confirmed"].includes(order.paymentStatus)
  );
  if (unpaidOrders.length > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `尚有訂單未完成付款：${unpaidOrders.map((order) => order.merchantTradeNo).join(", ")}`,
    });
  }

  if (!groupOrders.some((order) => order.isCustomOrder)) return;

  const balances = await db
    .select({
      orderId: orderBalancePayments.orderId,
      paymentStatus: orderBalancePayments.paymentStatus,
    })
    .from(orderBalancePayments)
    .where(inArray(orderBalancePayments.orderId, context.orderIds));
  const mainBalance = balances.find((balance) => balance.orderId === context.mainOrderId);
  if (!mainBalance) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "客製訂單尚未設定尾款；若無需尾款，請先使用「確認尾款為 0」",
    });
  }
  // A merged group has one authoritative balance on its main order. Older
  // member orders can retain superseded balance rows and must not block the
  // group after the main balance has been paid.
  if (mainBalance.paymentStatus !== "paid") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "客製訂單尾款尚未完成，不能進入出貨流程" });
  }
}

function generateOrderMergeCode() {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `OM${ymd}${rand}`.slice(0, 32);
}

const mergeableOrderStatuses = new Set([
  "pending_payment",
  "deposit_paid",
  "paid",
  "processing",
]);

const CartItemSchema = z.object({
  id: z.string(),
  baseProductId: z.string().optional(),
  purchaseOptionId: z.string().optional(),
  purchaseOptionLabel: z.string().optional(),
  wristSize: z.string().optional(),
  wristSizeSelections: z.array(z.object({
    id: z.string(),
    label: z.string(),
    value: z.string(),
  })).optional(),
  claspType: z.enum(["elastic", "lobster", "magnetic"]).optional(),
  fitPreference: z.enum(["just-right", "loose"]).optional(),
  name: z.string(),
  // 價格欄位只保留向下相容；實際成交價一律由伺服器依商品資料重算。
  price: z.number().finite(),
  quantity: z.number().int().min(1).max(100),
  image: z.string().optional(),
  isPreorder: z.boolean().optional(),
  twoItemFreeShippingEligible: z.boolean().optional(),
  purchaseOptionUsesOwnStock: z.boolean().optional(),
});

type CheckoutItem = z.infer<typeof CartItemSchema>;
type NormalizedCheckoutItem = CheckoutItem & {
  configurationSnapshot: OrderItemConfigurationSnapshot | null;
};

const OrderAccessSchema = z.object({
  merchantTradeNo: z.string().min(1),
  accessToken: z.string().min(1).optional(),
  buyerEmail: z.string().trim().email().optional(),
});

function hasOrderAccess(
  order: { userId?: number | null; merchantTradeNo: string; buyerEmail: string },
  user: { id: number; role?: string | null } | null,
  input: { accessToken?: string; buyerEmail?: string }
) {
  if (user?.role === "admin") return true;
  if (user?.id != null && order.userId === user.id) return true;
  if (verifyOrderAccessToken(order.merchantTradeNo, order.buyerEmail, input.accessToken)) return true;
  return order.userId == null &&
    Boolean(input.buyerEmail) &&
    normalizeOrderEmail(input.buyerEmail!) === normalizeOrderEmail(order.buyerEmail);
}

function assertOrderAccess(
  order: { userId?: number | null; merchantTradeNo: string; buyerEmail: string },
  ctx: Pick<TrpcContext, "user" | "req" | "res">,
  input: { accessToken?: string; buyerEmail?: string }
) {
  if (!hasOrderAccess(order, ctx.user, input)) {
    enforceRateLimit(
      ctx.req,
      ctx.res,
      `order-access:${order.merchantTradeNo}`,
      8,
      15 * 60_000
    );
    throw new TRPCError({ code: "UNAUTHORIZED", message: "請驗證訂購 Email 後查看訂單" });
  }
}

function getWristSizeRulePrice(
  product: { wristSizePriceRules?: { maxWristSize: number; price: number }[] | null },
  wristSize: number
) {
  const rules = product.wristSizePriceRules
    ?.filter((rule) => Number.isFinite(rule.maxWristSize) && Number.isFinite(rule.price))
    .sort((a, b) => a.maxWristSize - b.maxWristSize);
  if (!rules?.length) return null;
  return rules.find((rule) => wristSize <= rule.maxWristSize)?.price ?? rules[rules.length - 1].price;
}

const DEFAULT_CLASP_OPTIONS = ["elastic", "lobster", "magnetic"] as const;
const CLASP_SURCHARGE = 200;

function getValidatedWristSize(
  item: CheckoutItem,
  product: { name: string; wristSizeMin: number; wristSizeMax: number }
) {
  const wristSize = item.wristSize == null ? NaN : Number(item.wristSize);
  if (
    !Number.isFinite(wristSize) ||
    !Number.isInteger(wristSize * 2) ||
    wristSize < product.wristSizeMin ||
    wristSize > product.wristSizeMax
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `請重新選擇「${product.name}」的手圍尺寸後再結帳。`,
    });
  }
  return wristSize;
}

function getClaspSurcharge(
  item: CheckoutItem,
  product: {
    name: string;
    category: string;
    claspOptions: ("elastic" | "lobster" | "magnetic")[] | null;
  }
) {
  if (product.category === "custom" || item.claspType == null) return 0;
  const allowedOptions = product.claspOptions ?? [...DEFAULT_CLASP_OPTIONS];
  if (!allowedOptions.includes(item.claspType)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `請重新選擇「${product.name}」的扣具後再結帳。`,
    });
  }
  return item.claspType === "elastic" ? 0 : CLASP_SURCHARGE;
}

function formatOrderItemWristSize(wristSize: number) {
  return Number.isInteger(wristSize) ? String(wristSize) : wristSize.toFixed(1);
}

function buildOrderItemName(input: {
  productName: string;
  purchaseOptionLabel?: string | null;
  wristSize?: number | null;
  wristSizeSelections?: { label: string; wristSize: number }[];
  claspType?: CheckoutItem["claspType"];
  fitPreference?: CheckoutItem["fitPreference"];
}) {
  const details = [
    input.purchaseOptionLabel,
    input.wristSize == null ? null : `手圍 ${formatOrderItemWristSize(input.wristSize)}cm`,
    ...(input.wristSizeSelections ?? []).map(
      (selection) => `${selection.label} ${formatOrderItemWristSize(selection.wristSize)}cm`
    ),
    input.claspType === "lobster" ? "龍蝦扣" : input.claspType === "magnetic" ? "磁扣" : null,
    input.fitPreference === "just-right" ? "剛好" : input.fitPreference === "loose" ? "微鬆" : null,
  ].filter((detail): detail is string => Boolean(detail));

  return `${input.productName}${details.map((detail) => `（${detail}）`).join("")}`;
}

function buildOrderItemConfigurationSnapshot(input: {
  productName: string;
  purchaseOption?: { id: string; label: string } | null;
  wristSizes?: { key: string; label: string; value: number }[];
  claspType?: CheckoutItem["claspType"];
  fitPreference?: CheckoutItem["fitPreference"];
  basePrice: number;
  claspSurcharge: number;
}): OrderItemConfigurationSnapshot {
  const claspLabels = {
    elastic: "彈力繩",
    lobster: "龍蝦扣",
    magnetic: "磁扣",
  } as const;
  const fitPreferenceLabels = {
    "just-right": "剛好",
    loose: "微鬆",
  } as const;

  return {
    version: 1,
    baseProductName: input.productName,
    purchaseOption: input.purchaseOption ?? null,
    wristSizes: (input.wristSizes ?? []).map((wristSize) => ({
      ...wristSize,
      unit: "cm" as const,
    })),
    clasp: input.claspType
      ? {
          code: input.claspType,
          label: claspLabels[input.claspType],
          surcharge: input.claspSurcharge,
        }
      : null,
    fitPreference: input.fitPreference
      ? {
          code: input.fitPreference,
          label: fitPreferenceLabels[input.fitPreference],
        }
      : null,
    pricing: {
      basePrice: input.basePrice,
      claspSurcharge: input.claspSurcharge,
      unitPrice: input.basePrice + input.claspSurcharge,
    },
  };
}

async function normalizePurchaseOptionItems(items: CheckoutItem[]): Promise<NormalizedCheckoutItem[]> {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "目前無法確認商品價格，請稍後再試。" });
  }

  const productIds = Array.from(new Set(items.map((item) => item.baseProductId ?? item.id)));
  if (productIds.length === 0) {
    return items.map((item) => ({ ...item, configurationSnapshot: null }));
  }

  const products = await db
    .select({
      id: dbProducts.id,
      name: dbProducts.name,
      price: dbProducts.price,
      image: dbProducts.image,
      active: dbProducts.active,
      category: dbProducts.category,
      claspOptions: dbProducts.claspOptions,
      wristSizeMin: dbProducts.wristSizeMin,
      wristSizeMax: dbProducts.wristSizeMax,
      showFitPreference: dbProducts.showFitPreference,
      wristSizePriceRules: dbProducts.wristSizePriceRules,
      purchaseOptions: dbProducts.purchaseOptions,
    })
    .from(dbProducts)
    .where(inArray(dbProducts.id, productIds));
  const productById = new Map(products.map((product) => [product.id, product]));
  const requestedOptionQuantity = new Map<string, number>();
  for (const item of items) {
    if (!item.purchaseOptionId) continue;
    const productId = item.baseProductId ?? item.id;
    const key = `${productId}:${item.purchaseOptionId}`;
    requestedOptionQuantity.set(key, (requestedOptionQuantity.get(key) ?? 0) + item.quantity);
  }

  return items.map((item) => {
    const productId = item.baseProductId ?? item.id;
    const product = productById.get(productId);
    if (productId === TAROT_DEPOSIT_PRODUCT_ID) {
      const topic = getTarotTopicByOptionId(item.purchaseOptionId);
      if (!product || product.active === false || !topic) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "請重新選擇塔羅占卜主題後再結帳。",
        });
      }
      return {
        ...item,
        name: buildOrderItemName({
          productName: product.name,
          purchaseOptionLabel: topic.label,
        }),
        price: getTarotDepositPrice(product.price, topic),
        image: item.image || product.image,
        purchaseOptionLabel: topic.label,
        purchaseOptionUsesOwnStock: false,
        configurationSnapshot: null,
      };
    }
    if (!product || product.active === false) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `「${item.name}」已不存在或不可購買。` });
    }
    const claspSurcharge = getClaspSurcharge(item, product);
    const fitPreference = product.category !== "custom" && product.showFitPreference !== false
      ? item.fitPreference
      : undefined;
    if (!item.purchaseOptionId) {
      const hasWristSizePriceRules = Boolean(product.wristSizePriceRules?.length);
      const wristSize = hasWristSizePriceRules || item.wristSize != null
        ? getValidatedWristSize(item, product)
        : null;
      const wristSizePrice = wristSize == null ? null : getWristSizeRulePrice(product, wristSize);
      if (hasWristSizePriceRules && wristSizePrice == null) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `「${product.name}」尚未設定此手圍尺寸的價格。`,
        });
      }
      const basePrice = wristSizePrice ?? product.price;
      return {
        ...item,
        id: product.id,
        baseProductId: product.id,
        name: buildOrderItemName({
          productName: product.name,
          wristSize,
          claspType: item.claspType,
          fitPreference,
        }),
        price: basePrice + claspSurcharge,
        image: product.image || item.image,
        configurationSnapshot: buildOrderItemConfigurationSnapshot({
          productName: product.name,
          wristSizes: wristSize == null ? [] : [{ key: "wrist", label: "手圍", value: wristSize }],
          claspType: item.claspType,
          fitPreference,
          basePrice,
          claspSurcharge,
        }),
      };
    }
    const option = product?.purchaseOptions?.find((candidate) => candidate.id === item.purchaseOptionId);
    if (!product || !option || option.active === false) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `「${item.name}」的購買方案已不可購買。` });
    }
    const requestedQuantity = requestedOptionQuantity.get(`${productId}:${item.purchaseOptionId}`) ?? item.quantity;
    if (option.stock != null && option.stock !== -1 && option.stock < requestedQuantity) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `「${product.name}（${option.label}）」庫存不足。` });
    }
    const optionProductName = `${product.name}（${option.label}）`;
    if (option.type === "combo") {
      const groups = option.wristSizeGroups ?? [];
      if (groups.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `「${optionProductName}」尚未設定組合手圍價格。` });
      }
      const selections = item.wristSizeSelections ?? [];
      const validatedSelections = groups.map((group) => {
        const selected = selections.find((selection) => selection.id === group.id);
        const wristSize = getValidatedWristSize(
          { ...item, wristSize: selected?.value },
          product
        );
        const groupPrice = getWristSizeRulePrice(group, wristSize);
        if (groupPrice == null) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `「${optionProductName}」缺少 ${group.label} 的價格。` });
        }
        return { key: group.id, label: group.label, wristSize, price: groupPrice };
      });
      const price = validatedSelections.reduce((sum, selection) => sum + selection.price, 0);
      return {
        ...item,
        name: buildOrderItemName({
          productName: product.name,
          purchaseOptionLabel: option.label,
          wristSizeSelections: validatedSelections,
          claspType: item.claspType,
          fitPreference,
        }),
        price: price + claspSurcharge,
        image: item.image || product.image,
        purchaseOptionLabel: option.label,
        purchaseOptionUsesOwnStock: option.stock != null,
        configurationSnapshot: buildOrderItemConfigurationSnapshot({
          productName: product.name,
          purchaseOption: { id: option.id, label: option.label },
          wristSizes: validatedSelections.map((selection) => ({
            key: selection.key,
            label: selection.label,
            value: selection.wristSize,
          })),
          claspType: item.claspType,
          fitPreference,
          basePrice: price,
          claspSurcharge,
        }),
      };
    }
    const wristSize = item.wristSize == null ? null : getValidatedWristSize(item, product);
    const optionWristSizeRulePrice = wristSize != null
      ? getWristSizeRulePrice(option, wristSize)
      : null;
    const productWristSizeRulePrice = wristSize != null
      ? getWristSizeRulePrice(product, wristSize)
      : null;
    const wristSizeRulePrice = optionWristSizeRulePrice ?? productWristSizeRulePrice;
    const wristSizePriceDelta = wristSizeRulePrice == null ? 0 : wristSizeRulePrice - product.price;
    const basePrice = optionWristSizeRulePrice ?? option.price + wristSizePriceDelta;
    return {
      ...item,
      name: buildOrderItemName({
        productName: product.name,
        purchaseOptionLabel: option.label,
        wristSize,
        claspType: item.claspType,
        fitPreference,
      }),
      price: basePrice + claspSurcharge,
      image: item.image || product.image,
      purchaseOptionLabel: option.label,
      purchaseOptionUsesOwnStock: option.stock != null,
      configurationSnapshot: buildOrderItemConfigurationSnapshot({
        productName: product.name,
        purchaseOption: { id: option.id, label: option.label },
        wristSizes: wristSize == null ? [] : [{ key: "wrist", label: "手圍", value: wristSize }],
        claspType: item.claspType,
        fitPreference,
        basePrice,
        claspSurcharge,
      }),
    };
  });
}

function isCustomCheckoutItem(item: { id: string; baseProductId?: string }) {
  return CUSTOM_PRODUCT_IDS.includes(item.baseProductId ?? item.id);
}

function getCustomConsultationKey(productId: string, orderItemId?: number, itemIndex?: number) {
  if (orderItemId && itemIndex) return `${productId}:${orderItemId}:${itemIndex}`;
  return productId;
}

function getCustomConsultationStartMarker(productId: string, orderItemId?: number, itemIndex?: number) {
  return `【客製需求開始：${getCustomConsultationKey(productId, orderItemId, itemIndex)}】`;
}

function upsertCustomConsultationNote(
  existingNote: string | null,
  productId: string,
  customerNote: string,
  orderItemId?: number,
  itemIndex?: number
) {
  const key = getCustomConsultationKey(productId, orderItemId, itemIndex);
  const startMarker = `【客製需求開始：${key}】`;
  const endMarker = `【客製需求結束：${key}】`;
  const noteBlock = [startMarker, customerNote.trim(), endMarker].join("\n");
  const current = existingNote?.trim() ?? "";
  if (!current) return noteBlock;

  const startIndex = current.indexOf(startMarker);
  const endIndex = current.indexOf(endMarker);
  if (startIndex >= 0 && endIndex > startIndex) {
    return [
      current.slice(0, startIndex).trimEnd(),
      noteBlock,
      current.slice(endIndex + endMarker.length).trimStart(),
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  return [current, noteBlock].join("\n\n");
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

async function originalOrderHasDomesticFreeShipping(orderId: number) {
  const db = await getDb();
  if (!db) return false;

  const items = await db
    .select({
      id: orderItems.productId,
      name: orderItems.productName,
      price: orderItems.unitPrice,
      quantity: orderItems.quantity,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));
  const productItems = items.filter((item) => !["shipping", "shipping-fee", "payment-fee"].includes(item.id));
  if (productItems.length === 0) return false;

  const feeItems = await attachTwoItemFreeShippingEligibility(productItems);
  return calcCheckoutFees({
    items: feeItems,
    checkoutRegion: "domestic",
    shippingMethod: "cvs_711",
    paymentMethod: "credit",
  }).domesticFreeShipping;
}

export const orderRouter = router({
  /**
   * 建立訂單並取得付款資訊
   * - credit：回傳綠界付款表單參數
   * - atm：回傳轉帳帳號資訊
   */
  createAndPay: rateLimitedPublicProcedure({ scope: "checkout", limit: 20, windowMs: 15 * 60_000 })
    .input(
      z
        .object({
          buyerName: z.string().min(1),
          buyerEmail: z.string().email(),
          buyerPhone: z.string().min(1).max(64),
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
          customerNote: z.string().max(10000).optional(),
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

          if (isCustomDepositCheckout) {
            if (!/^09\d{8}$/.test(data.buyerPhone.replace(/\s/g, ""))) {
              ctx.addIssue({
                code: "custom",
                message: "請輸入有效的手機號碼（09xxxxxxxx）",
                path: ["buyerPhone"],
              });
            }
            return;
          }

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
      let submittedItems: NormalizedCheckoutItem[] = input.items.filter((item) => {
        const productId = item.baseProductId ?? item.id;
        return productId !== "shipping" && productId !== "shipping-fee" && productId !== "payment-fee";
      }).map((item) => ({ ...item, configurationSnapshot: null }));
      submittedItems = await normalizePurchaseOptionItems(submittedItems);
      if (submittedItems.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "購物車沒有可結帳商品" });
      }
      const isCustomOrder = isCustomDepositProduct(submittedItems);
      const checkoutRegion = isCustomOrder ? ("domestic" as const) : input.checkoutRegion;
      const isOverseas = checkoutRegion === "overseas";
      const shippingMethod = isCustomOrder ? ("home" as const) : isOverseas ? ("home" as const) : input.shippingMethod;
      const paymentMethod = isOverseas ? ("paypal" as const) : input.paymentMethod;
      for (const item of submittedItems) {
        if (item.purchaseOptionUsesOwnStock) continue;
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
      const orderAccessToken = createOrderAccessToken(merchantTradeNo, buyerEmail) ?? undefined;

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
          configurationSnapshot: null,
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
          purchaseOptionId: item.purchaseOptionId ?? null,
          configurationSnapshot: item.configurationSnapshot,
          isPreorder: item.isPreorder ?? false,
        }))
      );
      if (paymentMethod === "atm") {
        await notifyCustomerOrderPlacedSafely(createdOrderId);
      }

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
            orderAccessToken,
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
        // 一般訂單的 ATM 結帳頁已要求末五碼與轉帳截圖，送出成立訂單時扣庫存。
        await deductInventoryAfterPayment(merchantTradeNo);
        return {
          kind: "atm" as const,
          paymentMethod: "atm" as const,
          merchantTradeNo,
          orderAccessToken,
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
        orderAccessToken,
        paymentURL: ECPAY_CONFIG.PaymentURL,
        paymentParams,
      };
    }),

  /**
   * PayPal 核准後於 return 頁呼叫：驗證訂單與 PayPal Order 後 Capture
   */
  capturePayPal: rateLimitedPublicProcedure({ scope: "paypal-capture", limit: 20, windowMs: 15 * 60_000 })
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
        await recordAuditEventSafely({
          source: "paypal", category: "payment", action: "paypal.capture",
          outcome: "duplicate", orderId: order.id, merchantTradeNo: input.merchantTradeNo,
          summary: "已付款的 PayPal 訂單重複要求 Capture，已忽略",
          details: { paypalOrderId: input.paypalOrderId },
        });
        return { success: true as const, alreadyPaid: true as const };
      }
      if (order.paymentStatus !== "pending") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "訂單狀態無法完成付款" });
      }

      try {
        await verifyPayPalOrderBelongsToMerchant(input.paypalOrderId, input.merchantTradeNo);
      } catch (e) {
        console.error("[capturePayPal verify]", e);
        await recordAuditEventSafely({
          source: "paypal", category: "payment", action: "paypal.capture.verify",
          outcome: "rejected", severity: "warning", orderId: order.id, merchantTradeNo: input.merchantTradeNo,
          summary: "PayPal 訂單歸屬驗證失敗",
          details: { paypalOrderId: input.paypalOrderId, error: e instanceof Error ? e.message : String(e) },
        });
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
        await notifyCustomerOrderPlacedSafely(order.id);
        await recordAuditEventSafely({
          source: "paypal", category: "payment", action: "paypal.capture",
          outcome: "success", orderId: order.id, merchantTradeNo: input.merchantTradeNo,
          summary: "PayPal 訂單 Capture 成功",
          details: { paypalOrderId: input.paypalOrderId, captureId: cap.captureId },
        });
        return { success: true as const, alreadyPaid: false as const };
      } catch (e) {
        await recordAuditEventSafely({
          source: "paypal", category: "payment", action: "paypal.capture",
          outcome: "failed", severity: "error", orderId: order.id, merchantTradeNo: input.merchantTradeNo,
          summary: "PayPal 訂單 Capture 失敗",
          details: { paypalOrderId: input.paypalOrderId, error: e instanceof Error ? e.message : String(e) },
        });
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
  getOrder: rateLimitedPublicProcedure({ scope: "order-read", limit: 240, windowMs: 15 * 60_000 })
    .input(OrderAccessSchema)
    .query(async ({ input, ctx }) => {
      const order = await getOrderWithItems(input.merchantTradeNo);
      if (!order) {
        enforceRateLimit(ctx.req, ctx.res, "order-read-miss", 12, 15 * 60_000);
        return null;
      }
      assertOrderAccess(order, ctx, input);
      return {
        ...order,
        paymentSandbox: usePaymentSandbox,
      };
    }),

  submitCustomConsultation: publicProcedure
    .input(
      z.object({
        merchantTradeNo: z.string().min(1),
        accessToken: z.string().min(1).optional(),
        buyerEmail: z.string().trim().email().optional(),
        productId: z.enum([
          "custom-deposit-product",
          "tarot-crystal-deposit-product",
          "chakra-crystal-deposit-product",
          "numerology-crystal-deposit-product",
        ]),
        orderItemId: z.number().int().positive().optional(),
        itemIndex: z.number().int().positive().optional(),
        customerNote: z.string().min(1).max(10000),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const order = await getOrderWithItems(input.merchantTradeNo);
      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "找不到訂單" });
      }
      assertOrderAccess(order, ctx, input);
      if (!order.isCustomOrder) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "此訂單不是客製化訂金訂單" });
      }
      const hasMatchingProduct = order.items.some((item) => item.productId === input.productId);
      if (!hasMatchingProduct) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "表單方案與訂單商品不符" });
      }
      const targetItem = input.orderItemId
        ? order.items.find((item) => item.id === input.orderItemId && item.productId === input.productId)
        : order.items.find((item) => item.productId === input.productId);
      if (!targetItem) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "找不到這一筆客製訂金商品" });
      }
      const itemIndex = input.itemIndex ?? 1;
      if (itemIndex < 1 || itemIndex > targetItem.quantity) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "客製表單件數與訂單商品不符" });
      }
      const canSubmit =
        order.paymentStatus === "paid" ||
        order.paymentStatus === "confirmed" ||
        order.paymentStatus === "transfer_pending";
      if (!canSubmit) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "請先完成付款後再填寫客製需求" });
      }
      if (order.orderStatus === "cancelled" || order.paymentStatus === "failed" || order.paymentStatus === "cancelled") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "此訂單狀態無法填寫客製需求" });
      }

      const customerNote = upsertCustomConsultationNote(
        order.customerNote,
        input.productId,
        input.customerNote,
        input.orderItemId,
        input.itemIndex
      );

      await db
        .update(orders)
        .set({ customerNote })
        .where(eq(orders.merchantTradeNo, input.merchantTradeNo));

      return { success: true };
    }),

  /**
   * 客人填入轉帳匯款末五碼
   */
  submitTransferCode: publicProcedure
    .input(z.object({
      merchantTradeNo: z.string(),
      accessToken: z.string().min(1).optional(),
      buyerEmail: z.string().trim().email().optional(),
      lastFive: z.string().length(5).regex(/^\d+$/),
    }))
    .mutation(async ({ input, ctx }) => {
      const order = await getOrderWithItems(input.merchantTradeNo);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "找不到訂單" });
      assertOrderAccess(order, ctx, input);
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

      const operationContext = await getOrderOperationContext(db, input.orderId);

      // 轉帳待確認屬於「付款狀態」(paymentStatus)，不是訂單狀態(orderStatus)，
      // 列表與統計也是用 paymentStatus 篩選，因此直接更新 paymentStatus。
      if (input.status === "transfer_pending") {
        await db.update(orders).set({ paymentStatus: "transfer_pending" }).where(eq(orders.id, order.id));
        return { success: true };
      }

      if (MERGED_ORDER_SYNC_STATUSES.has(input.status)) {
        if (FULFILLMENT_STATUSES.has(input.status)) {
          await assertReadyForFulfillment(db, operationContext);
        }

        await db
          .update(orders)
          .set({ orderStatus: input.status })
          .where(inArray(orders.id, operationContext.orderIds));

        if (input.status === "cancelled") {
          const affectedOrders = await db
            .select({ merchantTradeNo: orders.merchantTradeNo })
            .from(orders)
            .where(inArray(orders.id, operationContext.orderIds));
          await Promise.all(
            affectedOrders.map((affectedOrder) => restoreInventoryOnCancel(affectedOrder.merchantTradeNo))
          );
        }
        if (input.status === "shipped") {
          await Promise.all(
            operationContext.orderIds.map((orderId) => notifyCustomerOrderShippedSafely(orderId))
          );
        }
        return { success: true };
      }

      await dbUpdateOrderStatus(order.merchantTradeNo, input.status);

      if (input.status === "paid") {
        // 改為已付款：標記付款並扣庫存，與綠界付款通知 / 確認轉帳的邏輯一致。
        // deductInventoryAfterPayment 以 inventoryDeducted 旗標防止重複扣減。
        await db.update(orders).set({ paymentStatus: "paid", paidAt: new Date() }).where(eq(orders.id, order.id));
        await deductInventoryAfterPayment(order.merchantTradeNo);
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

  /**
   * 手動合併訂單：有客製化時用第一筆選取的客製化作為主訂單；
   * 純一般商品合併時，使用最晚建立的訂單作為主訂單。
   */
  mergeOrders: adminProcedure
    .input(
      z.object({
        orderIds: z.array(z.number().int().positive()).min(2).max(20),
        adminNote: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const orderIds = Array.from(new Set(input.orderIds));
      if (orderIds.length < 2) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "請至少選取兩筆不同訂單" });
      }

      const rows = await db
        .select()
        .from(orders)
        .where(inArray(orders.id, orderIds));

      if (rows.length !== orderIds.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "部分訂單不存在，請重新整理後再試" });
      }

      const customOrderIds = new Set(rows.filter((order) => order.isCustomOrder).map((order) => order.id));

      const unmergeable = rows.filter((order) => !mergeableOrderStatuses.has(order.orderStatus));
      if (unmergeable.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `只能合併尚未出貨/未取消的訂單：${unmergeable.map((order) => order.merchantTradeNo).join(", ")}`,
        });
      }

      const normalizedEmails = new Set(rows.map((order) => normalizeOrderEmail(order.buyerEmail)));
      if (normalizedEmails.size > 1) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "只能合併同一位買家的訂單" });
      }

      const existingLogistics = await db
        .select({ orderId: logisticsOrders.orderId })
        .from(logisticsOrders)
        .where(inArray(logisticsOrders.orderId, orderIds));
      if (existingLogistics.length > 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "已有物流單的訂單不能再合併" });
      }

      const existingMergeMembers = await db
        .select({ orderId: orderMergeMembers.orderId })
        .from(orderMergeMembers)
        .where(inArray(orderMergeMembers.orderId, orderIds));
      if (existingMergeMembers.length > 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "選取的訂單已有合併紀錄" });
      }

      const latestOrder = rows.reduce((latest, order) =>
        new Date(order.createdAt).getTime() > new Date(latest.createdAt).getTime() ? order : latest
      );
      const mainOrderId = orderIds.find((orderId) => customOrderIds.has(orderId)) ?? latestOrder.id;
      const mainOrder = rows.find((order) => order.id === mainOrderId);
      if (!mainOrder) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "找不到可作為主訂單的訂單" });
      }
      const mergeCode = generateOrderMergeCode();

      await db.insert(orderMergeGroups).values({
        mergeCode,
        mainOrderId: mainOrder.id,
        adminNote: input.adminNote?.trim() || null,
      });
      const [group] = await db
        .select()
        .from(orderMergeGroups)
        .where(eq(orderMergeGroups.mergeCode, mergeCode))
        .limit(1);
      if (!group) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "合併群組建立失敗" });
      }

      await db.insert(orderMergeMembers).values(orderIds.map((orderId) => ({
        groupId: group.id,
        orderId,
      })));
      await db
        .update(orders)
        .set({ freeShippingOverride: true })
        .where(inArray(orders.id, orderIds));

      return {
        success: true,
        mergeCode,
        groupId: group.id,
        mainOrderId: mainOrder.id,
        mainOrderMerchantTradeNo: mainOrder.merchantTradeNo,
        mergedOrderIds: orderIds,
      };
    }),

  updateFreeShippingOverride: adminProcedure
    .input(z.object({
      orderId: z.number().int().positive(),
      freeShippingOverride: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [order] = await db
        .select({ id: orders.id })
        .from(orders)
        .where(eq(orders.id, input.orderId))
        .limit(1);
      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      const [mergeMember] = await db
        .select({
          groupId: orderMergeMembers.groupId,
          mainOrderId: orderMergeGroups.mainOrderId,
        })
        .from(orderMergeMembers)
        .leftJoin(orderMergeGroups, eq(orderMergeMembers.groupId, orderMergeGroups.id))
        .where(eq(orderMergeMembers.orderId, input.orderId))
        .limit(1);

      if (mergeMember?.mainOrderId && mergeMember.mainOrderId !== input.orderId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "請從合併主訂單調整免運設定" });
      }

      if (mergeMember?.groupId) {
        const mergeRows = await db
          .select({ orderId: orderMergeMembers.orderId })
          .from(orderMergeMembers)
          .where(eq(orderMergeMembers.groupId, mergeMember.groupId));
        const orderIds = mergeRows.map((row) => row.orderId);
        if (orderIds.length > 0) {
          await db
            .update(orders)
            .set({ freeShippingOverride: input.freeShippingOverride })
            .where(inArray(orders.id, orderIds));
        }
      } else {
        await db
          .update(orders)
          .set({ freeShippingOverride: input.freeShippingOverride })
          .where(eq(orders.id, input.orderId));
      }

      return { success: true, freeShippingOverride: input.freeShippingOverride };
    }),

  createBalancePaymentLink: adminProcedure
    .input(
      z.object({
        orderId: z.number(),
        amount: z.number().int().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [mergeMember] = await db
        .select({
          mainOrderId: orderMergeGroups.mainOrderId,
        })
        .from(orderMergeMembers)
        .leftJoin(orderMergeGroups, eq(orderMergeMembers.groupId, orderMergeGroups.id))
        .where(eq(orderMergeMembers.orderId, input.orderId))
        .limit(1);
      if (mergeMember?.mainOrderId && mergeMember.mainOrderId !== input.orderId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "被合併訂單不可產生尾款，請從主訂單產生合併尾款" });
      }

      const payment = await createOrReplaceBalancePayment(input);
      const origin = siteBaseUrl(ctx.req);
      return {
        merchantTradeNo: payment.merchantTradeNo,
        amount: payment.amount,
        paymentLink: `${origin}/balance/${encodeURIComponent(payment.merchantTradeNo)}`,
      };
    }),

  /** 管理員明確確認客製訂單無尾款；沒有尾款紀錄仍代表尚未報價。 */
  settleZeroBalance: adminProcedure
    .input(z.object({
      orderId: z.number().int().positive(),
      note: z.string().max(500).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await getOrderOperationContext(db, input.orderId);

      try {
        const result = await settleZeroBalancePayment(input.orderId, {
          adminUserId: ctx.user.id,
          note: input.note,
        });
        return { success: true, merchantTradeNo: result.merchantTradeNo };
      } catch (error) {
        const message = error instanceof Error ? error.message : "確認零尾款失敗";
        throw new TRPCError({ code: "BAD_REQUEST", message });
      }
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

      const operationContext = await getOrderOperationContext(db, input.orderId);
      await assertReadyForFulfillment(db, operationContext);

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
            senderPhone: process.env.SENDER_PHONE || "0903288876",
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
            senderPhone: process.env.SENDER_PHONE || "0903288876",
            senderZipCode: process.env.SENDER_ZIPCODE || "330",
            receiverName: normalizedReceiverName,
            receiverPhone: order.buyerPhone,
            receiverStoreID: order.cvsStoreId || "",
            logisticsSubType: logisticsSubType as "UNIMARTC2C" | "FAMIC2C",
            serverReplyURL,
          });
        }

        console.log("[createLogistics] ECPay result", {
          success: ecpayResult.success,
          allPayLogisticsId: ecpayResult.allPayLogisticsId ?? null,
          rtnMsg: ecpayResult.rtnMsg ?? null,
        });

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

          // 更新訂單狀態為已出貨；若是合併主單，整組訂單同步出貨狀態。
          if (operationContext.groupId) {
            await db
              .update(orders)
              .set({ orderStatus: "shipped" })
              .where(inArray(orders.id, operationContext.orderIds));
            await Promise.all(
              operationContext.orderIds.map((orderId) => notifyCustomerOrderShippedSafely(orderId))
            );
          } else {
            await dbUpdateOrderStatus(order.merchantTradeNo, "shipped");
            await notifyCustomerOrderShippedSafely(input.orderId);
          }

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
   * 取得宅配託運單 PDF（管理後台）
   */
  getPrintDocument: adminProcedure
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ input }) => {
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

      const document = await fetchPrintTradeDocument({
        allPayLogisticsId: logistics.allPayLogisticsId,
        logisticsType: logistics.logisticsType,
        logisticsSubType: logistics.logisticsSubType,
      });

      return {
        contentType: document.contentType,
        filename: `ecpay-waybill-${logistics.allPayLogisticsId}${
          document.contentType.toLowerCase().includes("html") ? ".html" : ".pdf"
        }`,
        base64: document.buffer.toString("base64"),
      };
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

      return {
        ...order,
        printURL: null,
        printAvailable: Boolean(
          order.shippingMethod === "home" &&
          order.logistics?.logisticsType === "HOME" &&
          order.logistics?.allPayLogisticsId
        ),
      };
    }),

  getBalancePayment: rateLimitedPublicProcedure({ scope: "balance-read", limit: 240, windowMs: 15 * 60_000 })
    .input(z.object({ merchantTradeNo: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      const balancePayment = await getBalancePaymentDetail(input.merchantTradeNo);
      if (!balancePayment) {
        enforceRateLimit(ctx.req, ctx.res, "balance-read-miss", 12, 15 * 60_000);
      }
      return balancePayment;
    }),

  getBalancePaymentCheckout: rateLimitedPublicProcedure({ scope: "balance-write", limit: 20, windowMs: 15 * 60_000 })
    .input(
      z
        .object({
          merchantTradeNo: z.string().min(1),
          paymentMethod: z.enum(["credit", "atm"]),
          includeClearQuartzChips: z.boolean().optional(),
          checkoutRegion: z.enum(["domestic", "overseas"]),
          receiverPhone: z.string().min(1).max(32),
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
          const receiverPhone = data.receiverPhone.trim();
          if (data.checkoutRegion === "domestic") {
            if (!/^09\d{8}$/.test(receiverPhone.replace(/\s/g, ""))) {
              ctx.addIssue({
                code: "custom",
                message: "請輸入台灣手機格式（09 開頭共 10 碼）",
                path: ["receiverPhone"],
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
            if (receiverPhone.length < 8) {
              ctx.addIssue({ code: "custom", message: "請填寫聯絡電話", path: ["receiverPhone"] });
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
      const balancePayment = await getBalancePaymentDetail(input.merchantTradeNo);
      if (!balancePayment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "找不到尾款資料" });
      }
      if (balancePayment.paymentStatus === "paid") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "尾款已付款" });
      }
      if (balancePayment.paymentStatus !== "pending" && balancePayment.paymentStatus !== "failed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "此尾款連結目前不可付款" });
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

      const originalDomesticFreeShipping =
        input.checkoutRegion === "domestic"
          ? await originalOrderHasDomesticFreeShipping(balancePayment.orderId)
          : false;
      const forceBalanceFreeShipping = balancePayment.order.freeShippingOverride || originalDomesticFreeShipping;

      const feeSummary = calcCheckoutFees({
        items: balanceItems,
        checkoutRegion: input.checkoutRegion,
        shippingMethod,
        paymentMethod: input.paymentMethod,
        overseasCountry,
        buyerEmail: balancePayment.order.buyerEmail,
        forceFreeShipping: forceBalanceFreeShipping,
        forcePaidShipping: Boolean(balancePayment.orderMergeInfo && !forceBalanceFreeShipping),
      });
      const totalAmount = feeSummary.total;

      const orderUpdate = {
        buyerPhone: input.receiverPhone.trim(),
        deliveryRegion: isOverseas ? ("overseas" as const) : ("domestic" as const),
        shippingMethod,
        cvsStoreId: cvsStoreId ?? null,
        cvsStoreName: cvsStoreName ?? null,
        cvsType: cvsType ?? null,
        shippingAddress: shippingAddress ?? null,
        receiverZipCode: receiverZipCode ?? null,
      };

      if (input.paymentMethod === "credit") {
        let attempt;
        try {
          attempt = await createBalancePaymentAttempt({
            balancePaymentId: balancePayment.id,
            amount: balancePayment.amount,
            shippingFee: feeSummary.shippingFee,
            paymentFee: feeSummary.paymentFee,
            totalAmount,
            checkoutData: {
              orderUpdate,
              clearQuartzChipsAddOn: clearQuartzChipsAddOn
                ? {
                    productId: CLEAR_QUARTZ_CHIPS_PRODUCT_ID,
                    productName: clearQuartzChipsAddOn.name,
                    productImage: clearQuartzChipsAddOn.image,
                    quantity: 1,
                    unitPrice: clearQuartzChipsAddOn.price,
                    subtotal: clearQuartzChipsAddOn.price,
                  }
                : null,
            },
          });
        } catch (error) {
          if (error instanceof Error && error.message === "Inactive balance payment cannot be retried") {
            throw new TRPCError({ code: "CONFLICT", message: "尾款狀態已更新，請重新整理頁面" });
          }
          throw error;
        }

        const origin = siteBaseUrl(ctx.req);
        const paymentParams = buildCreditPaymentParams({
          merchantTradeNo: attempt.merchantTradeNo,
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
      }

      await db.update(orderBalancePayments)
        .set({
          paymentMethod: input.paymentMethod,
          shippingFee: feeSummary.shippingFee,
          paymentFee: feeSummary.paymentFee,
          totalAmount,
          paymentStatus: "pending",
          tradeNo: null,
          ecpayNotifyData: null,
          paidAt: null,
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
      }

      await db.update(orders)
        .set({
          ...orderUpdate,
          totalAmount: balancePayment.order.totalAmount - (balancePayment.totalAmount ?? balancePayment.amount) + totalAmount,
          ...(clearQuartzChipsAddOn ? { inventoryDeducted: false } : {}),
        })
        .where(eq(orders.id, balancePayment.orderId));

      return {
        kind: "atm" as const,
        amount: totalAmount,
        shippingFee: feeSummary.shippingFee,
        paymentFee: feeSummary.paymentFee,
        bankInfo: STORE_BANK_INFO,
      };
    }),

  submitBalanceTransferCode: rateLimitedPublicProcedure({ scope: "balance-write", limit: 20, windowMs: 15 * 60_000 })
    .input(z.object({
      merchantTradeNo: z.string().min(1),
      lastFive: z.string().length(5).regex(/^\d+$/),
      transferReceiptImageBase64: z.string().max(8_000_000),
      transferReceiptImageContentType: z.string(),
      transferReceiptImageFilename: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const balancePayment = await getBalancePaymentDetail(input.merchantTradeNo);
      if (!balancePayment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "找不到尾款資料" });
      }
      if (balancePayment.paymentStatus !== "pending") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "此尾款連結目前不可提交轉帳資料" });
      }
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
      await deductInventoryAfterBalancePayment(input.merchantTradeNo);
      return { success: true };
    }),

  confirmBalanceTransfer: adminProcedure
    .input(z.object({
      merchantTradeNo: z.string().min(1),
      note: z.string().max(500).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await confirmBalanceTransfer(input.merchantTradeNo, {
        adminUserId: ctx.user.id,
        note: input.note,
      });
      await deductInventoryAfterBalancePayment(input.merchantTradeNo);
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
