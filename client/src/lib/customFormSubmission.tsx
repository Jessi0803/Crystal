import { ReactNode } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { CheckCircle, LockKeyhole, XCircle } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import type { CustomDepositProductId } from "@/lib/customOrderingContent";

export function useCustomFormSubmission(productId: CustomDepositProductId) {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const merchantTradeNo = new URLSearchParams(search).get("order")?.trim() ?? "";

  const orderQuery = trpc.order.getOrder.useQuery(
    { merchantTradeNo },
    { enabled: merchantTradeNo.length > 0 }
  );
  const submitMutation = trpc.order.submitCustomConsultation.useMutation();

  const order = orderQuery.data;
  const hasMatchingProduct = Boolean(order?.items?.some((item: any) => item.productId === productId));
  const isPaymentReady =
    order?.paymentStatus === "paid" ||
    order?.paymentStatus === "confirmed" ||
    order?.paymentStatus === "transfer_pending";
  const canFillForm = Boolean(order?.isCustomOrder && hasMatchingProduct && isPaymentReady);

  const submitCustomNote = async (customerNote: string) => {
    if (!merchantTradeNo) {
      toast.error("請先完成訂金付款後再填寫客製需求");
      return;
    }
    await submitMutation.mutateAsync({
      merchantTradeNo,
      productId,
      customerNote,
    });
    toast.success("客製需求已送出");
    setLocation(`/order/${merchantTradeNo}`);
  };

  return {
    merchantTradeNo,
    order,
    isLoading: orderQuery.isLoading,
    isError: orderQuery.isError,
    canFillForm,
    hasExistingNote: Boolean(order?.customerNote?.includes(`【客製需求開始：${productId}】`)),
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
  children,
}: {
  merchantTradeNo: string;
  isLoading: boolean;
  isError: boolean;
  canFillForm: boolean;
  hasExistingNote: boolean;
  children: ReactNode;
}) {
  if (!merchantTradeNo) {
    return (
      <CustomFormGateMessage
        icon={<LockKeyhole className="h-10 w-10 text-amber-500" />}
        title="請先完成訂金付款"
        description="付款成功後，訂單頁會出現填寫客製需求的按鈕。"
      />
    );
  }

  if (isLoading) {
    return (
      <CustomFormGateMessage
        icon={<div className="h-8 w-8 rounded-full border-2 border-[oklch(0.2_0_0)] border-t-transparent animate-spin" />}
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

  return (
    <>
      {hasExistingNote && (
        <div className="mx-auto mb-6 max-w-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-body text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            這筆訂單已送出過客製需求，再次送出會更新訂單內的需求內容。
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
    <div className="min-h-[60vh] bg-[oklch(0.98_0.005_240)] px-4 py-16">
      <div className="mx-auto max-w-md border border-[oklch(0.9_0_0)] bg-white p-8 text-center">
        <div className="mb-4 flex justify-center">{icon}</div>
        <h1 className="mb-2 text-xl font-medium text-[oklch(0.15_0_0)]">{title}</h1>
        <p className="mb-6 text-sm font-body leading-relaxed text-[oklch(0.5_0_0)]">{description}</p>
        <Link href="/custom">
          <button className="btn-primary w-full">前往客製方案頁</button>
        </Link>
      </div>
    </div>
  );
}
