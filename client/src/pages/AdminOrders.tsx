/**
 * 訂單管理後台
 * 路由：/admin/orders
 * 僅限 admin 角色存取
 */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  CheckCircle,
  XCircle,
  Package,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ShoppingBag,
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Calendar,
  Truck,
  Banknote,
  BarChart3,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type StatusFilter =
  | "all"
  | "pending_payment"
  | "deposit_paid"
  | "paid"
  | "transfer_pending"
  | "processing"
  | "shipped"
  | "arrived"
  | "completed"
  | "cancelled";

const ORDER_STATUS_CONFIG: Record<string, { label: string; className: string; dot: string }> = {
  pending_payment: { label: "待付款", className: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-400" },
  deposit_paid: { label: "已付訂金", className: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-400" },
  paid: { label: "已付款", className: "bg-green-50 text-green-700 border-green-200", dot: "bg-green-500" },
  transfer_pending: { label: "轉帳待確認", className: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-400" },
  processing: { label: "備貨中", className: "bg-purple-50 text-purple-700 border-purple-200", dot: "bg-purple-400" },
  shipped: { label: "已出貨", className: "bg-indigo-50 text-indigo-700 border-indigo-200", dot: "bg-indigo-400" },
  arrived: { label: "已到店", className: "bg-teal-50 text-teal-700 border-teal-200", dot: "bg-teal-400" },
  completed: { label: "已完成", className: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  cancelled: { label: "已取消", className: "bg-gray-50 text-gray-600 border-gray-200", dot: "bg-gray-400" },
};

const PAGE_SIZE_OPTIONS = [50, 100] as const;
const DEFAULT_PAGE_SIZE = 50;

const FILTER_TABS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "transfer_pending", label: "轉帳待確認" },
  { key: "deposit_paid", label: "已付訂金" },
  { key: "paid", label: "已付款" },
  { key: "processing", label: "備貨中" },
  { key: "cancelled", label: "已取消" },
];

function StatusBadge({ status }: { status: string }) {
  const cfg = ORDER_STATUS_CONFIG[status] ?? ORDER_STATUS_CONFIG.pending_payment;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

type OrderSummary = {
  id: number;
  merchantTradeNo: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  shippingMethod: string;
  buyerName: string;
  totalAmount: number;
  isPreorder: boolean;
  isCustomOrder: boolean;
  createdAt: Date | string;
  itemCount: number;
  hasLogistics: boolean;
};

function OrderRowCard({
  order,
  isExpanded,
  onToggle,
  getPaymentLabel,
  getShippingLabel,
  confirmTransfer,
  createLogistics,
  updateOrderStatus,
}: {
  order: OrderSummary;
  isExpanded: boolean;
  onToggle: () => void;
  getPaymentLabel: (method: string) => string;
  getShippingLabel: (method: string) => string;
  confirmTransfer: ReturnType<typeof trpc.order.confirmTransfer.useMutation>;
  createLogistics: ReturnType<typeof trpc.order.createLogistics.useMutation>;
  updateOrderStatus: ReturnType<typeof trpc.order.updateOrderStatus.useMutation>;
}) {
  const utils = trpc.useUtils();
  const { data: detail, isLoading: detailLoading } = trpc.order.getOrderDetail.useQuery(
    { orderId: order.id },
    {
      enabled: isExpanded,
      staleTime: 0,
    }
  );

  const createBalancePaymentLink = trpc.order.createBalancePaymentLink.useMutation({
    onSuccess: async (data) => {
      await utils.order.getOrderDetail.invalidate({ orderId: order.id });
      await utils.order.listOrders.invalidate();
      await utils.order.getStats.invalidate();
      try {
        await navigator.clipboard.writeText(data.paymentLink);
        toast.success(`尾款連結已產生並複製，金額 NT$ ${data.amount.toLocaleString()}`);
      } catch {
        toast.success(`尾款連結已產生：${data.paymentLink}`);
      }
    },
    onError: (err) => toast.error(err.message || "產生尾款連結失敗"),
  });

  const confirmBalanceTransfer = trpc.order.confirmBalanceTransfer.useMutation({
    onSuccess: async () => {
      await utils.order.getOrderDetail.invalidate({ orderId: order.id });
      toast.success("尾款已確認收款，訂單狀態已更新");
    },
    onError: (err) => toast.error(err.message || "確認失敗"),
  });

  const displayStatus = order.orderStatus;

  return (
    <div className="bg-white border border-[oklch(0.93_0_0)] overflow-hidden">
      <button
        className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-[oklch(0.98_0_0)] transition-colors"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <span className="text-xs font-mono text-[oklch(0.4_0_0)] tracking-wide">{order.merchantTradeNo}</span>
            <StatusBadge status={displayStatus} />
            {order.isPreorder && (
              <span className="text-xs bg-orange-50 text-orange-600 border border-orange-200 px-2 py-0.5 rounded-full">預購</span>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs font-body text-[oklch(0.5_0_0)] flex-wrap">
            <span className="flex items-center gap-1"><User className="w-3 h-3" />{order.buyerName}</span>
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(order.createdAt).toLocaleString("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
            <span className="flex items-center gap-1"><Package className="w-3 h-3" />{order.itemCount} 件</span>
            <span>{getShippingLabel(order.shippingMethod ?? "")}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-base font-medium text-[oklch(0.1_0_0)]" style={{ fontFamily: "'Noto Sans TC', sans-serif" }}>
            NT$ {order.totalAmount.toLocaleString()}
          </div>
          <div className="text-xs font-body text-[oklch(0.6_0_0)]">{getPaymentLabel(order.paymentMethod)}</div>
        </div>
        <div className="shrink-0 text-[oklch(0.6_0_0)]">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-[oklch(0.93_0_0)] px-5 py-5 bg-[oklch(0.985_0_0)]">
          {detailLoading || !detail ? (
            <div className="py-8 text-center">
              <div className="w-6 h-6 border-2 border-[oklch(0.1_0_0)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-body text-[oklch(0.5_0_0)]">載入訂單明細中...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-5">
                <div>
                  <p className="text-xs tracking-[0.15em] font-body text-[oklch(0.5_0_0)] mb-3">購買人資訊</p>
                  <div className="space-y-2">
                    {[
                      { icon: <User className="w-3.5 h-3.5" />, label: "姓名", value: detail.buyerName },
                      { icon: <Mail className="w-3.5 h-3.5" />, label: "Email", value: detail.buyerEmail },
                      { icon: <Phone className="w-3.5 h-3.5" />, label: "手機", value: detail.buyerPhone },
                      { icon: <MapPin className="w-3.5 h-3.5" />, label: "配送", value: detail.cvsStoreName ? `${getShippingLabel(detail.shippingMethod ?? "")} — ${detail.cvsStoreName}` : (detail.shippingAddress ?? getShippingLabel(detail.shippingMethod ?? "")) },
                    ].map((row) => (
                      <div key={row.label} className="flex items-start gap-2 text-sm font-body">
                        <span className="text-[oklch(0.6_0_0)] mt-0.5 shrink-0">{row.icon}</span>
                        <span className="text-[oklch(0.5_0_0)] shrink-0 w-10">{row.label}</span>
                        <span className="text-[oklch(0.1_0_0)] break-all">{row.value}</span>
                      </div>
                    ))}
                    {detail.transferLastFive && detail.balancePayment?.paymentStatus !== "transfer_pending" && (
                      <div className="flex items-start gap-2 text-sm font-body">
                        <span className="text-[oklch(0.6_0_0)] mt-0.5 shrink-0"><Banknote className="w-3.5 h-3.5" /></span>
                        <span className="text-[oklch(0.5_0_0)] shrink-0 w-10">末五碼</span>
                        <span className="text-blue-700 font-medium tracking-wider">{detail.transferLastFive}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs tracking-[0.15em] font-body text-[oklch(0.5_0_0)] mb-3">商品明細</p>
                  <div className="space-y-2">
                    {detail.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3">
                        {item.productImage && (
                          <img src={item.productImage} alt={item.productName} className="w-10 h-10 object-cover shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-body text-[oklch(0.1_0_0)] truncate">{item.productName}</p>
                          <p className="text-xs font-body text-[oklch(0.5_0_0)]">x{item.quantity} · NT$ {item.subtotal.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-4 border-t border-[oklch(0.93_0_0)]">
                {detail.paymentStatus === "transfer_pending" && detail.balancePayment?.paymentStatus !== "transfer_pending" && (
                  <button
                    onClick={() => confirmTransfer.mutate({ orderId: detail.id })}
                    disabled={confirmTransfer.isPending}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-body hover:bg-blue-700 transition-colors disabled:opacity-60"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    確認收款
                  </button>
                )}

                {detail.isCustomOrder && detail.orderStatus === "deposit_paid" &&
                  detail.balancePayment?.paymentStatus !== "transfer_pending" &&
                  detail.balancePayment?.paymentStatus !== "paid" && (
                  <button
                    onClick={() => {
                      const defaultAmount = detail.balancePayment?.amount?.toString() ?? "";
                      const raw = window.prompt("請輸入尾款金額", defaultAmount);
                      if (!raw) return;
                      const amount = Number(raw);
                      if (!Number.isInteger(amount) || amount < 1) {
                        toast.error("請輸入大於 0 的整數金額");
                        return;
                      }
                      createBalancePaymentLink.mutate({ orderId: detail.id, amount });
                    }}
                    disabled={createBalancePaymentLink.isPending}
                    className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white text-xs font-body hover:bg-rose-700 transition-colors disabled:opacity-60"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    {createBalancePaymentLink.isPending ? "產生中..." : "產生尾款連結"}
                  </button>
                )}

                {(detail.orderStatus === "paid" || detail.orderStatus === "processing") && !detail.logistics && (
                  <button
                    onClick={() => createLogistics.mutate({ orderId: detail.id })}
                    disabled={createLogistics.isPending}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[oklch(0.1_0_0)] text-white text-xs font-body hover:bg-[oklch(0.2_0_0)] transition-colors disabled:opacity-60"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    {createLogistics.isPending ? "建立中..." : "建立物流訂單"}
                  </button>
                )}

                {detail.logistics && (
                  <div className="flex flex-col gap-2">
                    {detail.logistics.cvsPaymentNo ? (
                      <div className="flex flex-col gap-1 px-4 py-2 bg-green-50 border border-green-300 text-xs font-body">
                        <div className="flex items-center gap-1.5 text-green-700">
                          <Truck className="w-3.5 h-3.5" />
                          <span className="font-semibold">超商取件碼</span>
                        </div>
                        <span className="font-mono text-lg font-bold text-green-800 tracking-widest">{detail.logistics.cvsPaymentNo}</span>
                        {detail.logistics.cvsValidationNo && (
                          <span className="text-green-600">驗證碼：{detail.logistics.cvsValidationNo}</span>
                        )}
                        <span className="text-green-500 text-[10px]">物流編號：{detail.logistics.allPayLogisticsId ?? detail.logistics.logisticsMerchantTradeNo}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 border border-indigo-200 text-xs font-body text-indigo-700">
                        <Truck className="w-3.5 h-3.5" />
                        物流編號：{detail.logistics.allPayLogisticsId ?? detail.logistics.logisticsMerchantTradeNo}
                        {detail.logistics.logisticsStatus === "failed" && (
                          <span className="ml-2 text-red-600 font-semibold">建立失敗</span>
                        )}
                      </div>
                    )}
                    {detail.printURL && (
                      <a
                        href={detail.printURL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-body hover:bg-emerald-700 transition-colors"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        列印託運單 PDF
                      </a>
                    )}
                  </div>
                )}

                {detail.orderStatus !== "completed" && detail.orderStatus !== "cancelled" && (
                  <select
                    className="px-3 py-2 border border-[oklch(0.88_0_0)] text-xs font-body text-[oklch(0.4_0_0)] bg-white focus:outline-none focus:border-[oklch(0.5_0_0)]"
                    defaultValue=""
                    onChange={(e) => {
                      if (!e.target.value) return;
                      updateOrderStatus.mutate({ orderId: detail.id, status: e.target.value as any });
                      e.target.value = "";
                    }}
                  >
                    <option value="">更新狀態...</option>
                    <option value="processing">備貨中</option>
                    <option value="cancelled">取消訂單</option>
                  </select>
                )}
              </div>

              {detail.logistics && (
                <div className="mt-4 p-3 bg-indigo-50 border border-indigo-100 text-xs font-body text-indigo-700">
                  <p className="font-medium mb-1">物流資訊</p>
                  <p>物流商：{detail.logistics.logisticsSubType}</p>
                  {detail.logistics.bookingNote && <p>托運單號：{detail.logistics.bookingNote}</p>}
                  {detail.logistics.cvsPaymentNo && <p>超商取件碼：{detail.logistics.cvsPaymentNo}</p>}
                </div>
              )}

              {(detail as any).customerNote && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-100 text-xs font-body text-amber-800">
                  <p className="font-medium mb-2">客製化諮詢內容</p>
                  <pre className="whitespace-pre-wrap leading-relaxed" style={{ fontFamily: "'Noto Sans TC', sans-serif" }}>
                    {(detail as any).customerNote}
                  </pre>
                </div>
              )}

              {detail.isCustomOrder && detail.balancePayment && (
                <div className="mt-4 p-3 bg-rose-50 border border-rose-100 text-xs font-body text-rose-700">
                  <p className="font-medium mb-1">尾款資訊</p>
                  <p>尾款編號：{detail.balancePayment.merchantTradeNo}</p>
                  <p>尾款金額：NT$ {detail.balancePayment.amount.toLocaleString()}</p>
                  <p>付款方式：{(detail.balancePayment as any).paymentMethod === "atm" ? "轉帳" : "信用卡"}</p>
                  <p>尾款狀態：{
                    detail.balancePayment.paymentStatus === "paid" ? "✅ 已付款"
                    : (detail.balancePayment.paymentStatus as string) === "transfer_pending" ? "⏳ 轉帳待確認"
                    : detail.balancePayment.paymentStatus === "failed" ? "❌ 付款失敗"
                    : "待付款"
                  }</p>
                  {(detail.balancePayment as any).transferLastFive && (
                    <p>匯款末五碼：<strong>{(detail.balancePayment as any).transferLastFive}</strong></p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(detail.balancePayment.paymentStatus as string) !== "transfer_pending" && detail.balancePayment.paymentStatus !== "paid" && (
                    <button
                      onClick={async () => {
                        const link = `${window.location.origin}/balance/${encodeURIComponent(detail.balancePayment!.merchantTradeNo)}`;
                        try {
                          await navigator.clipboard.writeText(link);
                          toast.success("尾款連結已複製");
                        } catch {
                          toast.success(link);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-rose-200 text-rose-700 hover:bg-rose-100 transition-colors"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      複製尾款連結
                    </button>
                    )}
                    {(detail.balancePayment.paymentStatus as string) === "transfer_pending" && (
                      <button
                        onClick={() => {
                          if (window.confirm("確認已收到尾款轉帳？")) {
                            confirmBalanceTransfer.mutate({ merchantTradeNo: detail.balancePayment!.merchantTradeNo });
                          }
                        }}
                        disabled={confirmBalanceTransfer.isPending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-60"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        確認收到尾款
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminOrders() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  const { data: dashStats, isLoading: dashStatsLoading, isFetching: dashStatsFetching, refetch: refetchDashStats } =
    trpc.order.getStats.useQuery(undefined, {
      enabled: user?.role === "admin",
      staleTime: 60_000,
    });

  const { data: orders, isLoading, error: ordersError, refetch: refetchOrders, isFetching } = trpc.order.listOrders.useQuery(
    { status: statusFilter, limit: pageSize, offset: (page - 1) * pageSize },
    {
      enabled: user?.role === "admin",
      staleTime: 30_000,
    }
  );

  useEffect(() => {
    setPage(1);
    setExpandedId(null);
  }, [statusFilter, pageSize]);

  const utils = trpc.useUtils();

  const refetchListAndStats = () => {
    void refetchOrders();
    void refetchDashStats();
  };

  const confirmTransfer = trpc.order.confirmTransfer.useMutation({
    onSuccess: async () => {
      toast.success("已確認收款，訂單更新為已付款");
      await utils.order.getOrderDetail.invalidate();
      refetchListAndStats();
    },
    onError: () => toast.error("操作失敗，請重試"),
  });

  const createLogistics = trpc.order.createLogistics.useMutation({
    onSuccess: (data) => {
      toast.success(`物流訂單建立成功！${data.logisticsId ? `物流編號：${data.logisticsId}` : ""}`);
      refetchListAndStats();
    },
    onError: (err) => toast.error(`建立物流失敗：${err.message}`),
  });

  const updateOrderStatus = trpc.order.updateOrderStatus.useMutation({
    onSuccess: () => {
      toast.success("訂單狀態已更新");
      refetchListAndStats();
    },
    onError: () => toast.error("更新失敗，請重試"),
  });

  // 未登入 → 導向登入
  if (!authLoading && !user) {
    window.location.href = getLoginUrl();
    return null;
  }

  // 已登入但非 admin → 顯示無權限
  if (!authLoading && user && user.role !== "admin") {
    return (
      <div className="min-h-screen bg-[oklch(0.97_0_0)] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl mb-2 text-[oklch(0.1_0_0)]" style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 300 }}>
            無存取權限
          </h1>
          <p className="text-sm font-body text-[oklch(0.5_0_0)] mb-6">此頁面僅限管理員存取。</p>
          <button className="btn-primary" onClick={() => setLocation("/")}>返回首頁</button>
        </div>
      </div>
    );
  }

  const allOrders = orders?.items ?? [];
  const totalOrders = orders?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalOrders / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startItem = totalOrders === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = totalOrders === 0 ? 0 : Math.min(currentPage * pageSize, totalOrders);
  const stats = {
    paid: (dashStats as any)?.paid ?? 0,
    transferPending: dashStats?.transferPending ?? 0,
    depositPaid: (dashStats as any)?.depositPaid ?? 0,
    revenue: dashStats?.totalRevenue ?? 0,
  };

  const getPaymentLabel = (method: string) => {
    if (method === "credit") return "信用卡";
    if (method === "atm") return "銀行轉帳";
    if (method === "paypal") return "PayPal";
    return method;
  };

  const getShippingLabel = (method: string) => {
    if (method === "cvs_711") return "7-11 超商";
    if (method === "cvs_family") return "全家超商";
    if (method === "home") return "宅配";
    return method;
  };

  const getPageNumbers = () => {
    const pages: Array<number | "ellipsis"> = [];
    const addPage = (value: number | "ellipsis") => pages.push(value);

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) addPage(i);
      return pages;
    }

    addPage(1);
    if (currentPage > 3) addPage("ellipsis");
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      addPage(i);
    }
    if (currentPage < totalPages - 2) addPage("ellipsis");
    addPage(totalPages);
    return pages;
  };

  return (
    <div className="min-h-screen bg-[oklch(0.97_0_0)]">
      {/* Header */}
      <div className="bg-white border-b border-[oklch(0.93_0_0)] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <button
              onClick={() => setLocation("/")}
              className="text-xs tracking-widest font-body text-[oklch(0.5_0_0)] hover:text-[oklch(0.1_0_0)] transition-colors mb-1 block"
            >
              ← 返回網站
            </button>
            <h1 className="text-lg text-[oklch(0.1_0_0)]" style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 300 }}>
              訂單管理後台
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLocation("/admin/revenue")}
              className="flex items-center gap-2 text-xs font-body text-[oklch(0.5_0_0)] hover:text-[oklch(0.1_0_0)] transition-colors border border-[oklch(0.88_0_0)] px-3 py-2"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              營收報表
            </button>
            <button
              onClick={() => refetchListAndStats()}
              disabled={isFetching || dashStatsFetching}
              className="flex items-center gap-2 text-xs font-body text-[oklch(0.5_0_0)] hover:text-[oklch(0.1_0_0)] transition-colors border border-[oklch(0.88_0_0)] px-3 py-2"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isFetching || dashStatsFetching ? "animate-spin" : ""}`}
              />
              重新整理
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "已付款", value: stats.paid, icon: <Package className="w-4 h-4" />, color: "text-[oklch(0.4_0_0)]" },
            { label: "轉帳待確認", value: stats.transferPending, icon: <Banknote className="w-4 h-4" />, color: "text-blue-600" },
            { label: "已付訂金", value: stats.depositPaid, icon: <Truck className="w-4 h-4" />, color: "text-amber-600" },
            { label: "總營收", value: `NT$ ${stats.revenue.toLocaleString()}`, icon: <CreditCard className="w-4 h-4" />, color: "text-[oklch(0.72_0.09_70)]" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border border-[oklch(0.93_0_0)] p-5">
              <div className={`flex items-center gap-2 mb-2 ${stat.color}`}>
                {stat.icon}
                <span className="text-xs tracking-widest font-body text-[oklch(0.5_0_0)]">{stat.label}</span>
              </div>
              <div className={`text-2xl font-medium ${stat.color}`} style={{ fontFamily: "'Noto Sans TC', sans-serif" }}>
                {dashStatsLoading ? "…" : stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-0 mb-6 border-b border-[oklch(0.93_0_0)] overflow-x-auto">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-4 py-2.5 text-xs tracking-widest font-body transition-colors border-b-2 -mb-px whitespace-nowrap ${
                statusFilter === tab.key
                  ? "border-[oklch(0.1_0_0)] text-[oklch(0.1_0_0)]"
                  : "border-transparent text-[oklch(0.5_0_0)] hover:text-[oklch(0.3_0_0)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <p className="text-[11px] font-body text-[oklch(0.5_0_0)] mb-4 -mt-2">
          目前顯示第 {currentPage} / {totalPages} 頁，共 {totalOrders} 筆；本頁 {startItem}-{endItem} 筆。
        </p>

        {/* Orders List */}
        {isLoading || authLoading ? (
          <div className="bg-white border border-[oklch(0.93_0_0)] p-12 text-center">
            <div className="w-8 h-8 border-2 border-[oklch(0.1_0_0)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-body text-[oklch(0.5_0_0)]">載入訂單中...</p>
          </div>
        ) : ordersError ? (
          <div className="bg-white border border-red-200 p-12 text-center">
            <XCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
            <p className="text-sm font-body text-red-700 mb-2">載入訂單失敗</p>
            <p className="text-xs font-body text-red-500 break-all">{ordersError.message}</p>
          </div>
        ) : allOrders.length === 0 ? (
          <div className="bg-white border border-[oklch(0.93_0_0)] p-16 text-center">
            <ShoppingBag className="w-10 h-10 text-[oklch(0.85_0_0)] mx-auto mb-4" />
            <p className="text-sm font-body text-[oklch(0.5_0_0)]">目前沒有符合條件的訂單</p>
          </div>
        ) : (
          <div className="space-y-2">
            {allOrders.map((order) => {
              return (
                <OrderRowCard
                  key={order.id}
                  order={order}
                  isExpanded={expandedId === order.id}
                  onToggle={() => setExpandedId(expandedId === order.id ? null : order.id)}
                  getPaymentLabel={getPaymentLabel}
                  getShippingLabel={getShippingLabel}
                  confirmTransfer={confirmTransfer}
                  createLogistics={createLogistics}
                  updateOrderStatus={updateOrderStatus}
                />
              );
            })}
          </div>
        )}

        {!isLoading && !ordersError && totalOrders > 0 && (
          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 text-sm font-body text-[oklch(0.5_0_0)]">
              <span>每頁</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-3 py-2 border border-[oklch(0.88_0_0)] bg-white text-sm text-[oklch(0.4_0_0)] focus:outline-none focus:border-[oklch(0.5_0_0)]"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size} 筆
                  </option>
                ))}
              </select>
            </div>

            <Pagination className="mx-0 w-auto justify-start sm:justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage > 1) {
                        setExpandedId(null);
                        setPage(currentPage - 1);
                      }
                    }}
                    aria-disabled={currentPage === 1}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>

                {getPageNumbers().map((pageNumber, index) => (
                  pageNumber === "ellipsis" ? (
                    <PaginationItem key={`ellipsis-${index}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink
                        href="#"
                        isActive={pageNumber === currentPage}
                        onClick={(e) => {
                          e.preventDefault();
                          setExpandedId(null);
                          setPage(pageNumber);
                        }}
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  )
                ))}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage < totalPages) {
                        setExpandedId(null);
                        setPage(currentPage + 1);
                      }
                    }}
                    aria-disabled={currentPage === totalPages}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </div>
  );
}
