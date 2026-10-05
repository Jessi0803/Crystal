import { ReactNode } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { AlertTriangle, CheckCircle, LockKeyhole, XCircle } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { CUSTOM_LINE_URL, type CustomDepositProductId } from "@/lib/customOrderingContent";
import { getSavedOrderAccess } from "@/lib/orderAccess";
import { extractCustomConsultationNote } from "@shared/customFormNote";

export const RECENT_CUSTOM_FORM_SUBMISSION_TTL_MS = 2 * 60 * 1000;

export function getRecentCustomFormSubmissionKey({
  merchantTradeNo,
  productId,
  orderItemId,
  itemIndex,
}: {
  merchantTradeNo: string;
  productId: string;
  orderItemId?: number;
  itemIndex?: number;
}) {
  return [
    "custom-form-submitted",
    merchantTradeNo,
    productId,
    orderItemId && itemIndex ? `${orderItemId}:${itemIndex}` : "legacy",
  ].join(":");
}

export function useCustomFormSubmission(productId: CustomDepositProductId) {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(search);
  const merchantTradeNo = params.get("order")?.trim() ?? "";
  const orderItemId = Number(params.get("orderItemId") ?? "");
  const itemIndex = Number(params.get("itemIndex") ?? "");
  const hasItemInstance = Number.isInteger(orderItemId) && orderItemId > 0 && Number.isInteger(itemIndex) && itemIndex > 0;
  const orderAccess = getSavedOrderAccess(merchantTradeNo);
  // 送出後預設不開放客人自行修改；店家同意時，給一條帶 ?edit=1 的連結即可重新填寫
  const allowRewrite = params.get("edit") === "1";

  const orderQuery = trpc.order.getOrder.useQuery(
    { merchantTradeNo, ...orderAccess },
    { enabled: merchantTradeNo.length > 0 }
  );
  const submitMutation = trpc.order.submitCustomConsultation.useMutation();

  const order = orderQuery.data;
  const matchingOrderItem = order?.items?.find((item: any) =>
      item.productId === productId &&
      (!hasItemInstance || (item.id === orderItemId && itemIndex <= item.quantity))
  );
  const hasMatchingProduct = Boolean(matchingOrderItem);
  const isPaymentReady =
    order?.paymentStatus === "paid" ||
    order?.paymentStatus === "confirmed" ||
    order?.paymentStatus === "transfer_pending";
  const canFillForm = Boolean(order?.isCustomOrder && hasMatchingProduct && isPaymentReady);

  const existingNote = extractCustomConsultationNote(order?.customerNote, {
    productId,
    ...(hasItemInstance ? { orderItemId, itemIndex } : {}),
  });

  const submitCustomNote = async (customerNote: string) => {
    if (!merchantTradeNo) {
      toast.error("請先完成訂金付款後再填寫客製需求");
      return;
    }
    await submitMutation.mutateAsync({
      merchantTradeNo,
      ...orderAccess,
      productId,
      ...(hasItemInstance ? { orderItemId, itemIndex } : {}),
      customerNote,
    });
    try {
      sessionStorage.setItem(
        getRecentCustomFormSubmissionKey({
          merchantTradeNo,
          productId,
          ...(hasItemInstance ? { orderItemId, itemIndex } : {}),
        }),
        String(Date.now())
      );
    } catch {
      /* ignore */
    }
    toast.success("客製需求已送出");
    setLocation(`/order/${merchantTradeNo}`);
  };

  return {
    merchantTradeNo,
    order,
    matchingOrderItem,
    isLoading: orderQuery.isLoading,
    isError: orderQuery.isError,
    canFillForm,
    // 已送出的內容：用來讓客人先看到自己填過什麼，而不是直接看到一張空白表單
    existingNote,
    hasExistingNote: Boolean(existingNote),
    allowRewrite,
    submitCustomNote,
    isSubmitting: submitMutation.isPending,
  };
}

export function CustomFormAccessGate({
  merchantTradeNo,
  isLoading,
  isError,
  canFillForm,
  hasExistingNote,
  existingNote,
  allowRewrite = false,
  children,
}: {
  merchantTradeNo: string;
  isLoading: boolean;
  isError: boolean;
  canFillForm: boolean;
  hasExistingNote: boolean;
  /** 已送出的需求內容；有值時只顯示唯讀版本 */
  existingNote?: string | null;
  /** 店家放行時才為 true（網址帶 ?edit=1），允許重新填寫覆蓋 */
  allowRewrite?: boolean;
  children: ReactNode;
}) {
  if (!merchantTradeNo) {
    return (
      <CustomFormGateMessage
        icon={<LockKeyhole className="h-10 w-10 text-brand-blush" strokeWidth={1.5} />}
        title="請先完成訂金付款"
        description="付款成功後，訂單頁會出現填寫客製需求的按鈕。"
      />
    );
  }

  if (isLoading) {
    return (
      <CustomFormGateMessage
        icon={<div className="h-8 w-8 rounded-full border-2 border-sf-accent border-t-transparent animate-spin" />}
        title="正在確認訂單"
        description="請稍候，我們正在確認付款狀態。"
      />
    );
  }

  if (isError || !canFillForm) {
    return (
      <CustomFormGateMessage
        icon={<XCircle className="h-10 w-10 text-red-400" />}
        title="目前無法填寫這份表單"
        description="請確認訂單已付款，且購買的方案與此表單相符。"
      />
    );
  }

  // 已填寫過：先給唯讀畫面。表單無法從純文字還原成欄位，
  // 直接顯示空白表單會讓客人一送出就把先前的內容覆蓋掉。
  if (existingNote && !allowRewrite) {
    return (
      <div className="min-h-[60vh] bg-sf-cream px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-lg border border-sf-line bg-white p-6 sm:p-8">
            <div className="mb-5 flex items-center gap-2 text-emerald-700">
              <CheckCircle className="h-5 w-5" />
              <h1
                className="text-lg font-light tracking-[0.08em] text-sf-ink"
                style={{ fontFamily: "'Noto Serif TC', serif" }}
              >
                你已經填寫過這份表單
              </h1>
            </div>
            <p className="mb-5 text-sm font-body leading-relaxed text-sf-muted">
              以下是你送出的內容，設計師已經收到。送出後無法自行修改，如需調整請透過
              <a
                href={CUSTOM_LINE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mx-1 underline decoration-brand-peach underline-offset-2 hover:text-sf-accent"
              >
                官方 LINE
              </a>
              與我們聯繫。
            </p>

            <div className="mb-6 whitespace-pre-wrap rounded-md border border-sf-line bg-sf-cream px-4 py-4 text-sm font-body leading-relaxed text-sf-text">
              {existingNote}
            </div>

            <Link
              href={`/order/${encodeURIComponent(merchantTradeNo)}`}
              className="block w-full sm:w-auto"
            >
              <button type="button" className="btn-primary w-full justify-center sm:w-auto">
                返回訂單
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {hasExistingNote && (
        <div className="mx-auto mb-6 max-w-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-body text-amber-900">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              這是<strong className="font-medium">重新填寫</strong>。表單不會帶入先前的內容，
              送出後會以這次填寫的內容<strong className="font-medium">完全取代</strong>原本已送出的需求。
            </span>
          </div>
        </div>
      )}
      {children}
    </>
  );
}

function CustomFormGateMessage({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="min-h-[60vh] bg-sf-cream px-4 py-16">
      <div className="mx-auto max-w-md rounded-lg border border-sf-line bg-white p-8 text-center">
        <div className="mb-4 flex justify-center">{icon}</div>
        <h1 className="mb-2 text-xl font-light tracking-[0.08em] text-sf-ink" style={{ fontFamily: "'Noto Serif TC', serif" }}>{title}</h1>
        <p className="mb-6 text-sm font-body leading-relaxed text-sf-muted">{description}</p>
        <Link href="/custom">
          <button className="btn-primary w-full justify-center">前往客製方案頁</button>
        </Link>
      </div>
    </div>
  );
}
