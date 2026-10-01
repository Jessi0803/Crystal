/**
 * 客製表單入口的共用邏輯。
 *
 * 訂單頁與會員中心都要回答同一組問題：這筆訂單有哪幾件客製商品、各自填了沒、
 * 表單連結長什麼樣。邏輯集中在這裡，避免兩邊各寫一份而走鐘。
 */
import { CUSTOM_DEPOSIT_PRODUCT_IDS, getCustomFormPath } from "@/lib/customOrderingContent";
import { extractCustomConsultationNote } from "@shared/customFormNote";
import {
  RECENT_CUSTOM_FORM_SUBMISSION_TTL_MS,
  getRecentCustomFormSubmissionKey,
} from "@/lib/customFormSubmission";

export type CustomDepositItemInstance = {
  id: number;
  productId: string;
  productName: string;
  /** 同一筆商品買多件時的第幾件，從 1 開始 */
  itemIndex: number;
  quantity: number;
};

type OrderItemLike = {
  id: number;
  productId: string;
  productName: string;
  quantity: number;
};

type OrderLike = {
  merchantTradeNo: string;
  paymentStatus: string;
  customerNote?: string | null;
  items?: OrderItemLike[] | null;
};

/** 訂金付款完成（含轉帳待確認）後才能填表單 */
export function canFillCustomForm(paymentStatus: string | null | undefined) {
  return (
    paymentStatus === "paid" ||
    paymentStatus === "confirmed" ||
    paymentStatus === "transfer_pending"
  );
}

/** 買 2 件就要填 2 份表單，所以依數量展開成一件一筆 */
export function expandCustomDepositItemInstances(
  items: OrderItemLike[] | null | undefined
): CustomDepositItemInstance[] {
  return (items ?? [])
    .filter(item => (CUSTOM_DEPOSIT_PRODUCT_IDS as readonly string[]).includes(item.productId))
    .flatMap(item => {
      const quantity = Math.max(1, Number(item.quantity) || 1);
      return Array.from({ length: quantity }, (_, index) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        itemIndex: index + 1,
        quantity,
      }));
    });
}

/**
 * 剛送出的表單：資料庫的 customerNote 可能還沒重新抓回來，
 * 先用 sessionStorage 的短期標記避免畫面閃回「尚未填寫」。
 */
function wasRecentlySubmitted(merchantTradeNo: string, item: CustomDepositItemInstance) {
  if (typeof window === "undefined") return false;

  const keys = [
    getRecentCustomFormSubmissionKey({
      merchantTradeNo,
      productId: item.productId,
      orderItemId: item.id,
      itemIndex: item.itemIndex,
    }),
  ];
  if (item.itemIndex === 1) {
    keys.push(getRecentCustomFormSubmissionKey({ merchantTradeNo, productId: item.productId }));
  }

  const now = Date.now();
  return keys.some(key => {
    let submittedAt = 0;
    try {
      submittedAt = Number(sessionStorage.getItem(key) ?? "");
    } catch {
      return false;
    }
    if (!submittedAt) return false;
    if (now - submittedAt > RECENT_CUSTOM_FORM_SUBMISSION_TTL_MS) {
      try {
        sessionStorage.removeItem(key);
      } catch {
        /* 私密模式等情境忽略 */
      }
      return false;
    }
    return true;
  });
}

export type CustomFormEntry = {
  item: CustomDepositItemInstance;
  isSubmitted: boolean;
  /** 該件商品的表單網址；商品沒有對應表單時為 null */
  formUrl: string | null;
};

/** 一筆訂單的所有客製表單入口與填寫狀態 */
export function getCustomFormEntries(order: OrderLike | null | undefined): CustomFormEntry[] {
  if (!order) return [];
  return expandCustomDepositItemInstances(order.items).map(item => {
    const formPath = getCustomFormPath(item.productId);
    return {
      item,
      isSubmitted:
        Boolean(
          extractCustomConsultationNote(order.customerNote, {
            productId: item.productId,
            orderItemId: item.id,
            itemIndex: item.itemIndex,
          })
        ) || wasRecentlySubmitted(order.merchantTradeNo, item),
      formUrl: formPath
        ? `${formPath}?order=${encodeURIComponent(order.merchantTradeNo)}&orderItemId=${item.id}&itemIndex=${item.itemIndex}`
        : null,
    };
  });
}
