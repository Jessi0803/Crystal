import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { CheckCircle, CreditCard, Banknote, XCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function BalancePayment() {
  const { merchantTradeNo } = useParams<{ merchantTradeNo: string }>();
  const [, setLocation] = useLocation();
  const [paymentMethod, setPaymentMethod] = useState<"credit" | "atm">("credit");
  const [transferCode, setTransferCode] = useState("");
  const [codeSubmitted, setCodeSubmitted] = useState(false);

  const { data, isLoading, refetch } = trpc.order.getBalancePayment.useQuery(
    { merchantTradeNo: merchantTradeNo ?? "" },
    { enabled: !!merchantTradeNo, refetchInterval: 5000 }
  );

  const startCheckout = trpc.order.getBalancePaymentCheckout.useMutation({
    onSuccess: (result) => {
      if (result.kind === "atm") {
        refetch();
        return;
      }
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

  const submitCode = trpc.order.submitBalanceTransferCode.useMutation({
    onSuccess: () => {
      setCodeSubmitted(true);
      toast.success("已送出匯款末五碼，老闆確認後將更新狀態");
      refetch();
    },
    onError: () => toast.error("送出失敗，請重試"),
  });

  const handleSubmitCode = () => {
    if (transferCode.length !== 5 || !/^\d+$/.test(transferCode)) {
      toast.error("請輸入正確的 5 位數字");
      return;
    }
    submitCode.mutate({ merchantTradeNo: merchantTradeNo ?? "", lastFive: transferCode });
  };

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
  const isTransferPending = data.paymentStatus === "transfer_pending";
  const showPaymentChoice = !isPaid && !isTransferPending && !startCheckout.isSuccess;

  return (
    <div className="min-h-screen bg-[oklch(0.98_0.005_60)]">
      <div className="max-w-2xl mx-auto px-4 sm:px-8 py-12">
        <div className="bg-white border border-[oklch(0.93_0_0)] p-8 sm:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            {isPaid ? (
              <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
            ) : isTransferPending ? (
              <Banknote className="w-14 h-14 text-blue-500 mx-auto mb-4" />
            ) : (
              <CreditCard className="w-14 h-14 text-rose-500 mx-auto mb-4" />
            )}
            <p className="text-xs tracking-[0.16em] text-[oklch(0.5_0_0)] font-body mb-2">客製化尾款</p>
            <h1 className="text-2xl text-[oklch(0.12_0_0)]" style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 300 }}>
              {isPaid ? "尾款已完成付款" : isTransferPending ? "等待轉帳確認" : "請完成客製化尾款"}
            </h1>
            <p className="text-sm font-body text-[oklch(0.5_0_0)] mt-3">
              {isPaid
                ? "感謝您的付款，訂單已轉為已付款並會進入出貨流程。"
                : isTransferPending
                ? "老闆確認收款後將更新訂單狀態，請耐心等候。"
                : "這是老闆為您的客製化訂單產生的尾款付款連結。"}
            </p>
          </div>

          {/* 訂單摘要 */}
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
              <span className={
                isPaid ? "text-green-600 font-medium"
                : isTransferPending ? "text-blue-600 font-medium"
                : data.paymentStatus === "failed" ? "text-red-600 font-medium"
                : "text-rose-600 font-medium"
              }>
                {isPaid ? "已付款"
                  : isTransferPending ? "⏳ 轉帳待確認"
                  : data.paymentStatus === "failed" ? "付款失敗"
                  : "待付款"}
              </span>
            </div>
          </div>

          {/* 選擇付款方式 */}
          {showPaymentChoice && (
            <>
              <p className="text-xs tracking-widest font-body text-[oklch(0.4_0_0)] mb-3">選擇付款方式</p>
              <div className="grid grid-cols-2 gap-3 mb-5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("credit")}
                  className={`flex items-start gap-3 p-4 border text-left transition-all ${
                    paymentMethod === "credit"
                      ? "border-[oklch(0.1_0_0)] bg-[oklch(0.98_0_0)]"
                      : "border-[oklch(0.88_0_0)] hover:border-[oklch(0.7_0_0)]"
                  }`}
                >
                  <CreditCard className="w-5 h-5 mt-0.5 shrink-0 text-[oklch(0.3_0_0)]" />
                  <div>
                    <p className="text-sm font-body font-medium text-[oklch(0.1_0_0)]">信用卡</p>
                    <p className="text-xs font-body text-[oklch(0.5_0_0)] mt-0.5">即時扣款</p>
                  </div>
                  <div className={`ml-auto w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center ${
                    paymentMethod === "credit" ? "border-[oklch(0.1_0_0)]" : "border-[oklch(0.8_0_0)]"
                  }`}>
                    {paymentMethod === "credit" && <div className="w-2 h-2 rounded-full bg-[oklch(0.1_0_0)]" />}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("atm")}
                  className={`flex items-start gap-3 p-4 border text-left transition-all ${
                    paymentMethod === "atm"
                      ? "border-[oklch(0.1_0_0)] bg-[oklch(0.98_0_0)]"
                      : "border-[oklch(0.88_0_0)] hover:border-[oklch(0.7_0_0)]"
                  }`}
                >
                  <Banknote className="w-5 h-5 mt-0.5 shrink-0 text-[oklch(0.3_0_0)]" />
                  <div>
                    <p className="text-sm font-body font-medium text-[oklch(0.1_0_0)]">轉帳</p>
                    <p className="text-xs font-body text-[oklch(0.5_0_0)] mt-0.5">匯款後填末五碼</p>
                  </div>
                  <div className={`ml-auto w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center ${
                    paymentMethod === "atm" ? "border-[oklch(0.1_0_0)]" : "border-[oklch(0.8_0_0)]"
                  }`}>
                    {paymentMethod === "atm" && <div className="w-2 h-2 rounded-full bg-[oklch(0.1_0_0)]" />}
                  </div>
                </button>
              </div>

              <button
                onClick={() => startCheckout.mutate({
                  merchantTradeNo: data.merchantTradeNo,
                  paymentMethod,
                  origin: window.location.origin,
                })}
                disabled={startCheckout.isPending}
                className="w-full bg-[oklch(0.12_0_0)] text-white py-3.5 text-sm font-body hover:bg-[oklch(0.22_0_0)] transition-colors disabled:opacity-60"
              >
                {startCheckout.isPending
                  ? "處理中..."
                  : paymentMethod === "credit" ? "前往信用卡付款" : "確認使用轉帳"}
              </button>
            </>
          )}

          {/* 轉帳資訊（選完轉帳後顯示） */}
          {(isTransferPending || (startCheckout.isSuccess && startCheckout.data?.kind === "atm")) && (
            <div className="border border-blue-200 bg-blue-50 p-5">
              <div className="flex items-start gap-3">
                <Banknote className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="w-full">
                  <p className="text-sm font-body font-medium text-blue-800 mb-3">轉帳資訊</p>
                  {(() => {
                    const bankInfo = startCheckout.data?.kind === "atm" ? startCheckout.data.bankInfo : null;
                    return bankInfo ? (
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm font-body">
                          <span className="text-blue-700">銀行</span>
                          <span className="font-medium text-blue-900">{bankInfo.bankName || "請見老闆提供的帳號"}</span>
                        </div>
                        <div className="flex justify-between text-sm font-body">
                          <span className="text-blue-700">戶名</span>
                          <span className="font-medium text-blue-900">{bankInfo.accountName}</span>
                        </div>
                        <div className="flex justify-between text-sm font-body">
                          <span className="text-blue-700">帳號</span>
                          <span className="font-medium text-blue-900 tracking-wider">{bankInfo.accountNumber}</span>
                        </div>
                        <div className="flex justify-between text-sm font-body border-t border-blue-200 pt-2">
                          <span className="text-blue-700">轉帳金額</span>
                          <span className="font-bold text-blue-900">NT$ {data.amount.toLocaleString()}</span>
                        </div>
                      </div>
                    ) : null;
                  })()}

                  {!codeSubmitted && !data.transferLastFive ? (
                    <div>
                      <p className="text-xs font-body text-blue-700 mb-2">轉帳完成後，請填入匯款末五碼：</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={5}
                          value={transferCode}
                          onChange={(e) => setTransferCode(e.target.value.replace(/\D/g, ""))}
                          placeholder="12345"
                          className="flex-1 border border-blue-300 bg-white px-3 py-2 text-sm font-body text-center tracking-widest focus:outline-none focus:border-blue-500"
                        />
                        <button
                          onClick={handleSubmitCode}
                          disabled={submitCode.isPending}
                          className="btn-primary text-sm px-4 py-2"
                        >
                          {submitCode.isPending ? "送出中..." : "確認送出"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm font-body text-blue-700 bg-blue-100 px-3 py-2 text-center">
                      ✅ 已收到您的匯款末五碼：<strong>{data.transferLastFive}</strong>，老闆確認後將更新訂單狀態。
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
