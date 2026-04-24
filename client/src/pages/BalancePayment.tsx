import { useParams, useLocation } from "wouter";
import { CheckCircle, CreditCard, XCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function BalancePayment() {
  const { merchantTradeNo } = useParams<{ merchantTradeNo: string }>();
  const [, setLocation] = useLocation();

  const { data, isLoading } = trpc.order.getBalancePayment.useQuery(
    { merchantTradeNo: merchantTradeNo ?? "" },
    { enabled: !!merchantTradeNo, refetchInterval: 5000 }
  );

  const startCheckout = trpc.order.getBalancePaymentCheckout.useMutation({
    onSuccess: (result) => {
      const hiddenForm = document.createElement("form");
      hiddenForm.method = "POST";
      hiddenForm.action = result.paymentURL;
      hiddenForm.style.display = "none";

      Object.entries(result.paymentParams).forEach(([key, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = value;
        hiddenForm.appendChild(input);
      });

      document.body.appendChild(hiddenForm);
      hiddenForm.submit();
    },
    onError: (err) => toast.error(err.message || "建立尾款付款失敗"),
  });

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[oklch(0.1_0_0)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-body text-[oklch(0.5_0_0)]">載入尾款資訊中...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <XCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-xl mb-2" style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 300 }}>
          找不到尾款連結
        </p>
        <p className="text-sm font-body text-[oklch(0.5_0_0)] mb-8">請確認連結是否正確，或聯繫客服協助。</p>
        <button className="btn-primary" onClick={() => setLocation("/products")}>
          返回商品頁
        </button>
      </div>
    );
  }

  const isPaid = data.paymentStatus === "paid";

  return (
    <div className="min-h-screen bg-[oklch(0.98_0.005_60)]">
      <div className="max-w-2xl mx-auto px-4 sm:px-8 py-12">
        <div className="bg-white border border-[oklch(0.93_0_0)] p-8 sm:p-10">
          <div className="text-center mb-8">
            {isPaid ? (
              <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
            ) : (
              <CreditCard className="w-14 h-14 text-rose-500 mx-auto mb-4" />
            )}
            <p className="text-xs tracking-[0.16em] text-[oklch(0.5_0_0)] font-body mb-2">客製化尾款</p>
            <h1 className="text-2xl text-[oklch(0.12_0_0)]" style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 300 }}>
              {isPaid ? "尾款已完成付款" : "請完成客製化尾款"}
            </h1>
            <p className="text-sm font-body text-[oklch(0.5_0_0)] mt-3">
              {isPaid ? "感謝您的付款，訂單已轉為已付款並會進入出貨流程。" : "這是老闆為您的客製化訂單產生的尾款付款連結。"}
            </p>
          </div>

          <div className="space-y-3 border border-[oklch(0.93_0_0)] bg-[oklch(0.99_0_0)] p-5 mb-6">
            <div className="flex justify-between gap-4 text-sm font-body">
              <span className="text-[oklch(0.5_0_0)]">原始訂單編號</span>
              <span className="text-[oklch(0.12_0_0)] font-mono">{data.order.merchantTradeNo}</span>
            </div>
            <div className="flex justify-between gap-4 text-sm font-body">
              <span className="text-[oklch(0.5_0_0)]">顧客姓名</span>
              <span className="text-[oklch(0.12_0_0)]">{data.order.buyerName}</span>
            </div>
            <div className="flex justify-between gap-4 text-sm font-body">
              <span className="text-[oklch(0.5_0_0)]">尾款金額</span>
              <span className="text-[oklch(0.12_0_0)] font-medium">NT$ {data.amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-4 text-sm font-body">
              <span className="text-[oklch(0.5_0_0)]">目前狀態</span>
              <span className={isPaid ? "text-green-600 font-medium" : "text-rose-600 font-medium"}>
                {isPaid ? "已付款" : data.paymentStatus === "failed" ? "付款失敗" : "待付款"}
              </span>
            </div>
          </div>

          {!isPaid && (
            <button
              onClick={() => startCheckout.mutate({ merchantTradeNo: data.merchantTradeNo, origin: window.location.origin })}
              disabled={startCheckout.isPending}
              className="w-full bg-[oklch(0.12_0_0)] text-white py-3.5 text-sm font-body hover:bg-[oklch(0.22_0_0)] transition-colors disabled:opacity-60"
            >
              {startCheckout.isPending ? "跳轉付款中..." : "前往付款"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
