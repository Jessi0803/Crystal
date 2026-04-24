/**
 * 訂單結果頁面
 * 路由：/order/:merchantTradeNo
 * 顯示訂單狀態：待付款 / 轉帳待確認 / 已付款 / 付款失敗
 */
import { useEffect, useState, useRef } from "react";
import { useParams, useLocation, useSearch } from "wouter";
import { CheckCircle, Clock, XCircle, ArrowRight, Package, Banknote, Truck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending_payment: "待付款",
  deposit_paid: "已付訂金",
  paid: "已付款・待出貨",
  processing: "備貨中",
  shipped: "🚚 已出貨",
  arrived: "📦 已到店",
  completed: "✅ 已完成",
  cancelled: "已取消",
};

export default function OrderResult() {
  const { merchantTradeNo } = useParams<{ merchantTradeNo: string }>();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [transferCode, setTransferCode] = useState("");
  const [codeSubmitted, setCodeSubmitted] = useState(false);
  const paypalCaptureStarted = useRef(false);

  const { data: order, isLoading, isError, refetch } = trpc.order.getOrder.useQuery(
    { merchantTradeNo: merchantTradeNo ?? "" },
    {
      enabled: !!merchantTradeNo,
      refetchInterval: 5000,
    }
  );

  const submitTransferCode = trpc.order.submitTransferCode.useMutation({
    onSuccess: () => {
      setCodeSubmitted(true);
      toast.success("已送出匯款末五碼，老闆確認後將更新訂單狀態");
      refetch();
    },
    onError: () => toast.error("送出失敗，請重試"),
  });

  const capturePayPal = trpc.order.capturePayPal.useMutation({
    onSuccess: (data) => {
      refetch();
      if (merchantTradeNo) {
        window.history.replaceState({}, "", `/order/${merchantTradeNo}`);
      }
      if (!data.alreadyPaid) {
        toast.success("付款完成");
      }
    },
    onError: (e) => {
      paypalCaptureStarted.current = false;
      toast.error(e.message || "PayPal 扣款失敗");
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(search);
    if (params.get("paypal_cancel") === "1") {
      toast.info("已取消 PayPal 付款");
      if (merchantTradeNo) {
        window.history.replaceState({}, "", `/order/${merchantTradeNo}`);
      }
      return;
    }
    if (params.get("paypal_return") !== "1" || !merchantTradeNo) return;
    const token = params.get("token");
    if (!token) return;
    if (paypalCaptureStarted.current) return;
    paypalCaptureStarted.current = true;
    capturePayPal.mutate({ merchantTradeNo, paypalOrderId: token });
  }, [search, merchantTradeNo, capturePayPal.mutate]);

  const handleSubmitCode = () => {
    if (transferCode.length !== 5 || !/^\d+$/.test(transferCode)) {
      toast.error("請輸入正確的 5 位數字");
      return;
    }
    submitTransferCode.mutate({ merchantTradeNo: merchantTradeNo ?? "", lastFive: transferCode });
  };

  const getStatusConfig = () => {
    if (!order) return null;

    if (order.paymentStatus === "transfer_pending") {
      return {
        icon: <Banknote className="w-12 h-12 text-blue-400" />,
        title: "等待轉帳確認",
        desc: "請完成匯款，並在下方填入匯款末五碼，老闆確認後將為您處理出貨。",
        color: "text-blue-600",
        bg: "bg-blue-50",
      };
    }
    if (order.paymentStatus === "confirmed" || order.paymentStatus === "paid") {
      if (order.orderStatus === "deposit_paid") {
        return {
          icon: <CheckCircle className="w-12 h-12 text-rose-500" />,
          title: "訂金付款成功",
          desc: "我們已收到您的訂金，接下來會由老闆建立尾款付款連結給您。",
          color: "text-rose-600",
          bg: "bg-rose-50",
        };
      }
      return {
        icon: <CheckCircle className="w-12 h-12 text-green-500" />,
        title: "付款成功！",
        desc: "感謝您的購買，我們將盡快為您處理出貨事宜。",
        color: "text-green-600",
        bg: "bg-green-50",
      };
    }
    if (order.orderStatus === "shipped") {
      return {
        icon: <Truck className="w-12 h-12 text-purple-500" />,
        title: "已出貨",
        desc: "您的水晶寶貝已出發，請耐心等候。",
        color: "text-purple-600",
        bg: "bg-purple-50",
      };
    }
    if (order.orderStatus === "arrived") {
      return {
        icon: <Package className="w-12 h-12 text-amber-500" />,
        title: "包裹已到店",
        desc: "您的水晶已抵達門市，請盡快前往領取！",
        color: "text-amber-600",
        bg: "bg-amber-50",
      };
    }
    if (order.orderStatus === "completed") {
      return {
        icon: <CheckCircle className="w-12 h-12 text-emerald-500" />,
        title: "訂單已完成",
        desc: "感謝您的購買，希望水晶能為您帶來滿滿的能量！",
        color: "text-emerald-600",
        bg: "bg-emerald-50",
      };
    }
    if (order.paymentStatus === "failed" || order.orderStatus === "cancelled") {
      return {
        icon: <XCircle className="w-12 h-12 text-red-400" />,
        title: order.paymentStatus === "failed" ? "付款失敗" : "訂單已取消",
        desc: order.paymentStatus === "failed" ? "付款未成功，請重新嘗試或選擇其他付款方式。" : "此訂單已取消。",
        color: "text-red-600",
        bg: "bg-red-50",
      };
    }
    // 預設：待付款
    return {
      icon: <Clock className="w-12 h-12 text-amber-400" />,
      title: "等待付款中",
      desc: "正在等待付款確認，請稍候...",
      color: "text-amber-600",
      bg: "bg-amber-50",
    };
  };

  const getPaymentMethodLabel = () => {
    if (!order) return "";
    if (order.paymentMethod === "credit") return "信用卡 / Apple Pay";
    if (order.paymentMethod === "atm") return "轉帳";
    if (order.paymentMethod === "paypal") return "PayPal";
    return order.paymentMethod;
  };

  const getShippingMethodLabel = () => {
    if (!order) return "";
    if (order.shippingMethod === "cvs_711") return `7-11 超商取貨${order.cvsStoreName ? `（${order.cvsStoreName}）` : ""}`;
    if (order.shippingMethod === "cvs_family") return `全家超商取貨${order.cvsStoreName ? `（${order.cvsStoreName}）` : ""}`;
    if (order.shippingMethod === "home") {
      const addr = order.shippingAddress?.replace(/\n/g, " ") ?? "";
      return `宅配${addr ? `（${addr}）` : ""}`;
    }
    return order.shippingMethod ?? "";
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[oklch(0.1_0_0)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-body text-[oklch(0.5_0_0)]">查詢訂單中...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <XCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-xl mb-2" style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 300 }}>
          查詢訂單失敗
        </p>
        <p className="text-sm font-body text-[oklch(0.5_0_0)] mb-8">
          訂單編號：{merchantTradeNo}
          <br />伺服器暫時無法取得訂單資訊，請稍後重試。
        </p>
        <div className="flex gap-3">
          <button className="btn-primary" onClick={() => refetch()}>
            重新查詢
          </button>
          <button className="btn-outline" onClick={() => setLocation("/")}>
            返回首頁
          </button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <XCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-xl mb-2" style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 300 }}>
          找不到訂單
        </p>
        <p className="text-sm font-body text-[oklch(0.5_0_0)] mb-8">訂單編號：{merchantTradeNo}</p>
        <button className="btn-primary" onClick={() => setLocation("/")}>
          返回首頁
        </button>
      </div>
    );
  }

  const statusConfig = getStatusConfig()!;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-[oklch(0.93_0_0)] py-4 px-4 sm:px-8">
        <div className="max-w-2xl mx-auto">
          <span className="text-xs tracking-widest font-body text-[oklch(0.5_0_0)]">訂單確認</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-8 py-12">
        {capturePayPal.isPending && (
          <div className="mb-6 p-4 border border-amber-200 bg-amber-50 text-sm font-body text-amber-900 text-center">
            正在完成 PayPal 扣款，請勿關閉此頁面…
          </div>
        )}
        {/* Status Card */}
        <div className={`${statusConfig.bg} p-8 text-center mb-8`}>
          <div className="flex justify-center mb-4">{statusConfig.icon}</div>
          <h1
            className={`text-2xl mb-2 ${statusConfig.color}`}
            style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 300 }}
          >
            {statusConfig.title}
          </h1>
          <p className="text-sm font-body text-[oklch(0.5_0_0)]">{statusConfig.desc}</p>
          {(order.paymentStatus === "pending" || order.paymentStatus === "transfer_pending") && (
            <p className="text-xs font-body text-[oklch(0.6_0_0)] mt-3">
              頁面每 5 秒自動更新訂單狀態
            </p>
          )}
        </div>

        {/* 轉帳資訊 */}
        {order.paymentMethod === "atm" && order.paymentStatus === "transfer_pending" && (
          <div className="border border-blue-200 bg-blue-50 p-5 mb-6">
            <div className="flex items-start gap-3">
              <Banknote className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="w-full">
                <p className="text-sm font-body font-medium text-blue-800 mb-3">轉帳資訊</p>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm font-body">
                    <span className="text-blue-700">銀行</span>
                    <span className="font-medium text-blue-900">{(order as any).bankInfo?.bankName ?? "請見老闆提供的帳號"}</span>
                  </div>
                  <div className="flex justify-between text-sm font-body">
                    <span className="text-blue-700">戶名</span>
                    <span className="font-medium text-blue-900">{(order as any).bankInfo?.accountName ?? ""}</span>
                  </div>
                  <div className="flex justify-between text-sm font-body">
                    <span className="text-blue-700">帳號</span>
                    <span className="font-medium text-blue-900 tracking-wider">{(order as any).bankInfo?.accountNumber ?? ""}</span>
                  </div>
                  <div className="flex justify-between text-sm font-body border-t border-blue-200 pt-2 mt-2">
                    <span className="text-blue-700">轉帳金額</span>
                    <span className="font-bold text-blue-900">NT$ {order.totalAmount.toLocaleString()}</span>
                  </div>
                </div>

                {/* 填入末五碼 */}
                {!codeSubmitted && !order.transferLastFive ? (
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
                        disabled={submitTransferCode.isPending}
                        className="btn-primary text-sm px-4 py-2"
                      >
                        {submitTransferCode.isPending ? "送出中..." : "確認送出"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm font-body text-blue-700 bg-blue-100 px-3 py-2 text-center">
                    ✅ 已收到您的匯款末五碼：<strong>{order.transferLastFive}</strong>，老闆確認後將更新訂單狀態。
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Order Info */}
        <div className="border border-[oklch(0.93_0_0)] p-6 mb-6">
          <h2 className="text-xs tracking-[0.2em] font-body mb-4 pb-3 border-b border-[oklch(0.93_0_0)]">
            訂單資訊
          </h2>
          <div className="space-y-3">
            {[
              { label: "訂單編號", value: order.merchantTradeNo },
              { label: "付款方式", value: getPaymentMethodLabel() },
              { label: "配送方式", value: getShippingMethodLabel() },
              {
                label: "付款狀態",
                value:
                  order.paymentStatus === "paid" || order.paymentStatus === "confirmed"
                    ? "✅ 已付款"
                    : order.paymentStatus === "transfer_pending"
                    ? "⏳ 轉帳待確認"
                    : order.paymentStatus === "pending"
                    ? "⏳ 待付款"
                    : order.paymentStatus === "failed"
                    ? "❌ 付款失敗"
                    : "已取消",
              },
              {
                label: "訂單狀態",
                value: ORDER_STATUS_LABEL[order.orderStatus] ?? order.orderStatus,
              },
              { label: "訂單金額", value: `NT$ ${order.totalAmount.toLocaleString()}` },
              { label: "購買人", value: order.buyerName },
              { label: "Email", value: order.buyerEmail },
              { label: "手機", value: order.buyerPhone },
              ...(order.isPreorder ? [{ label: "備註", value: "⏰ 預購商品" }] : []),
              ...(order.paidAt
                ? [{ label: "付款時間", value: new Date(order.paidAt).toLocaleString("zh-TW") }]
                : []),
            ].map((row) => (
              <div key={row.label} className="flex justify-between text-sm font-body">
                <span className="text-[oklch(0.5_0_0)]">{row.label}</span>
                <span className="text-[oklch(0.1_0_0)] font-medium text-right max-w-[60%] break-all">
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 商品明細 */}
        {order.items && order.items.length > 0 && (
          <div className="border border-[oklch(0.93_0_0)] p-6 mb-6">
            <h2 className="text-xs tracking-[0.2em] font-body mb-4 pb-3 border-b border-[oklch(0.93_0_0)]">
              商品明細
            </h2>
            <div className="space-y-3">
              {order.items.map((item: any) => (
                <div key={item.id} className="flex justify-between items-center text-sm font-body">
                  <div className="flex items-center gap-3">
                    {item.productImage && (
                      <img src={item.productImage} alt={item.productName} className="w-10 h-10 object-cover" />
                    )}
                    <div>
                      <p className="text-[oklch(0.1_0_0)]">{item.productName}</p>
                      <p className="text-xs text-[oklch(0.5_0_0)]">x {item.quantity}{item.isPreorder ? " （預購）" : ""}</p>
                    </div>
                  </div>
                  <p className="font-medium">NT$ {item.subtotal.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            className="btn-primary flex-1 flex items-center justify-center gap-2"
            onClick={() => setLocation("/products")}
          >
            繼續購物 <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            className="btn-outline flex-1"
            onClick={() => setLocation("/")}
          >
            返回首頁
          </button>
        </div>

        {/* Sandbox Note */}
        <div className="mt-8 p-4 bg-[oklch(0.97_0_0)] border border-[oklch(0.93_0_0)]">
          <p className="text-xs font-body text-[oklch(0.5_0_0)] font-medium mb-1">🧪 沙盒測試環境</p>
          <p className="text-xs font-body text-[oklch(0.6_0_0)]">
            目前為綠界沙盒測試模式，所有交易均為模擬，不會產生真實扣款。
            正式上線前請替換為正式商店憑證。
          </p>
        </div>
      </div>
    </div>
  );
}
