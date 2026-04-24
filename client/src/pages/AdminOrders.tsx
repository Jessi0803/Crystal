/**
 * 訂單管理後台
 * 路由：/admin/orders
 * 僅限 admin 角色存取
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  CheckCircle,
  Clock,
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

type StatusFilter =
  | "all"
  | "pending_payment"
  | "paid"
  | "transfer_pending"
  | "processing"
  | "shipped"
  | "arrived"
  | "completed"
  | "cancelled";

const ORDER_STATUS_CONFIG: Record<string, { label: string; className: string; dot: string }> = {
  pending_payment: { label: "待付款", className: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-400" },
  paid: { label: "已付款", className: "bg-green-50 text-green-700 border-green-200", dot: "bg-green-500" },
  transfer_pending: { label: "轉帳待確認", className: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-400" },
  processing: { label: "備貨中", className: "bg-purple-50 text-purple-700 border-purple-200", dot: "bg-purple-400" },
  shipped: { label: "已出貨", className: "bg-indigo-50 text-indigo-700 border-indigo-200", dot: "bg-indigo-400" },
  arrived: { label: "已到店", className: "bg-teal-50 text-teal-700 border-teal-200", dot: "bg-teal-400" },
  completed: { label: "已完成", className: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  cancelled: { label: "已取消", className: "bg-gray-50 text-gray-600 border-gray-200", dot: "bg-gray-400" },
};

const PAGE_SIZE = 100;

const FILTER_TABS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "transfer_pending", label: "轉帳待確認" },
  { key: "paid", label: "已付款" },
  { key: "processing", label: "備貨中" },
  { key: "shipped", label: "已出貨" },
  { key: "arrived", label: "已到店" },
  { key: "completed", label: "已完成" },
  { key: "pending_payment", label: "待付款" },
  { key: "cancelled", label: "已取消" },
];

function PrintWaybillButton({ orderId }: { orderId: number }) {
  const { data, isLoading, error } = trpc.order.getPrintURL.useQuery(
    { orderId },
    { retry: false }
  );

  if (isLoading) return (
    <div className="flex items-center gap-1.5 px-4 py-2 text-xs font-body text-[oklch(0.5_0_0)]">
      <span className="animate-spin">⟳</span> 載入列印連結...
    </div>
  );

  if (error || !data?.printURL) return null;

  return (
    <a
      href={data.printURL}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-body hover:bg-emerald-700 transition-colors"
    >
      <Truck className="w-3.5 h-3.5" />
      列印託運單 PDF
    </a>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = ORDER_STATUS_CONFIG[status] ?? ORDER_STATUS_CONFIG.pending_payment;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export default function AdminOrders() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    setPage(0);
  }, [statusFilter]);

  const { data: dashStats, isLoading: dashStatsLoading, isFetching: dashStatsFetching, refetch: refetchDashStats } =
    trpc.order.getStats.useQuery(undefined, {
      enabled: user?.role === "admin",
      staleTime: 60_000,
    });

  const { data: orders, isLoading, refetch: refetchOrders, isFetching } = trpc.order.listOrders.useQuery(
    { status: statusFilter, limit: PAGE_SIZE, offset: page * PAGE_SIZE },
    {
      enabled: user?.role === "admin",
      staleTime: 30_000,
    }
  );

  const refetchListAndStats = () => {
    void refetchOrders();
    void refetchDashStats();
  };

  const confirmTransfer = trpc.order.confirmTransfer.useMutation({
    onSuccess: () => {
      toast.success("已確認收款，訂單更新為已付款");
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

  const allOrders = orders ?? [];
  const stats = {
    total: dashStats?.totalOrders ?? 0,
    transferPending: dashStats?.transferPending ?? 0,
    toShip: dashStats?.toShip ?? 0,
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
            { label: "總訂單數", value: stats.total, icon: <Package className="w-4 h-4" />, color: "text-[oklch(0.4_0_0)]" },
            { label: "轉帳待確認", value: stats.transferPending, icon: <Banknote className="w-4 h-4" />, color: "text-blue-600" },
            { label: "待出貨", value: stats.toShip, icon: <Truck className="w-4 h-4" />, color: "text-amber-600" },
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

        {/* Orders List */}
        {isLoading || authLoading ? (
          <div className="bg-white border border-[oklch(0.93_0_0)] p-12 text-center">
            <div className="w-8 h-8 border-2 border-[oklch(0.1_0_0)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-body text-[oklch(0.5_0_0)]">載入訂單中...</p>
          </div>
        ) : allOrders.length === 0 ? (
          <div className="bg-white border border-[oklch(0.93_0_0)] p-16 text-center space-y-4">
            <ShoppingBag className="w-10 h-10 text-[oklch(0.85_0_0)] mx-auto mb-4" />
            <p className="text-sm font-body text-[oklch(0.5_0_0)]">
              {page > 0 ? "此頁沒有訂單，請返回上一頁或切換篩選。" : "目前沒有符合條件的訂單"}
            </p>
            {page > 0 && (
              <button
                type="button"
                className="text-xs font-body text-[oklch(0.35_0_0)] underline"
                onClick={() => setPage(0)}
              >
                回到第一頁
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-2">
            {allOrders.map((order) => {
              const isExpanded = expandedId === order.id;
              const displayStatus = order.orderStatus;
              return (
                <div key={order.id} className="bg-white border border-[oklch(0.93_0_0)] overflow-hidden">
                  {/* Row Header */}
                  <button
                    className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-[oklch(0.98_0_0)] transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
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
                        <span className="flex items-center gap-1"><Package className="w-3 h-3" />{(order as any).items?.length ?? 0} 件</span>
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

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="border-t border-[oklch(0.93_0_0)] px-5 py-5 bg-[oklch(0.985_0_0)]">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-5">
                        {/* 購買人資訊 */}
                        <div>
                          <p className="text-xs tracking-[0.15em] font-body text-[oklch(0.5_0_0)] mb-3">購買人資訊</p>
                          <div className="space-y-2">
                            {[
                              { icon: <User className="w-3.5 h-3.5" />, label: "姓名", value: order.buyerName },
                              { icon: <Mail className="w-3.5 h-3.5" />, label: "Email", value: order.buyerEmail },
                              { icon: <Phone className="w-3.5 h-3.5" />, label: "手機", value: order.buyerPhone },
                              { icon: <MapPin className="w-3.5 h-3.5" />, label: "配送", value: order.cvsStoreName ? `${getShippingLabel(order.shippingMethod ?? "")} — ${order.cvsStoreName}` : (order.shippingAddress ?? getShippingLabel(order.shippingMethod ?? "")) },
                            ].map((row) => (
                              <div key={row.label} className="flex items-start gap-2 text-sm font-body">
                                <span className="text-[oklch(0.6_0_0)] mt-0.5 shrink-0">{row.icon}</span>
                                <span className="text-[oklch(0.5_0_0)] shrink-0 w-10">{row.label}</span>
                                <span className="text-[oklch(0.1_0_0)] break-all">{row.value}</span>
                              </div>
                            ))}
                            {order.transferLastFive && (
                              <div className="flex items-start gap-2 text-sm font-body">
                                <span className="text-[oklch(0.6_0_0)] mt-0.5 shrink-0"><Banknote className="w-3.5 h-3.5" /></span>
                                <span className="text-[oklch(0.5_0_0)] shrink-0 w-10">末五碼</span>
                                <span className="text-blue-700 font-medium tracking-wider">{order.transferLastFive}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 商品明細 */}
                        <div>
                          <p className="text-xs tracking-[0.15em] font-body text-[oklch(0.5_0_0)] mb-3">商品明細</p>
                          <div className="space-y-2">
                            {((order as any).items ?? []).map((item: any) => (
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

                      {/* 操作按鈕 */}
                      <div className="flex flex-wrap gap-2 pt-4 border-t border-[oklch(0.93_0_0)]">
                        {/* 確認銀行轉帳收款 */}
                        {order.paymentStatus === "transfer_pending" && (
                          <button
                            onClick={() => confirmTransfer.mutate({ orderId: order.id })}
                            disabled={confirmTransfer.isPending}
                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-body hover:bg-blue-700 transition-colors disabled:opacity-60"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            確認收款
                          </button>
                        )}

                        {/* 建立物流訂單 */}
                        {(order.orderStatus === "paid" || order.orderStatus === "processing") && !(order as any).logistics && (
                          <button
                            onClick={() => createLogistics.mutate({ orderId: order.id })}
                            disabled={createLogistics.isPending}
                            className="flex items-center gap-1.5 px-4 py-2 bg-[oklch(0.1_0_0)] text-white text-xs font-body hover:bg-[oklch(0.2_0_0)] transition-colors disabled:opacity-60"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            {createLogistics.isPending ? "建立中..." : "建立物流訂單"}
                          </button>
                        )}

                        {/* 顯示物流編號 */}
                        {(order as any).logistics && (
                          <div className="flex flex-col gap-2">
                            {/* 超商取件碼 */}
                            {(order as any).logistics?.cvsPaymentNo ? (
                              <div className="flex flex-col gap-1 px-4 py-2 bg-green-50 border border-green-300 text-xs font-body">
                                <div className="flex items-center gap-1.5 text-green-700">
                                  <Truck className="w-3.5 h-3.5" />
                                  <span className="font-semibold">超商取件碼</span>
                                </div>
                                <span className="font-mono text-lg font-bold text-green-800 tracking-widest">{(order as any).logistics.cvsPaymentNo}</span>
                                {(order as any).logistics?.cvsValidationNo && (
                                  <span className="text-green-600">驗證碼：{(order as any).logistics.cvsValidationNo}</span>
                                )}
                                <span className="text-green-500 text-[10px]">物流編號：{(order as any).logistics?.allPayLogisticsId ?? (order as any).logistics?.logisticsMerchantTradeNo}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 border border-indigo-200 text-xs font-body text-indigo-700">
                                <Truck className="w-3.5 h-3.5" />
                                物流編號：{(order as any).logistics?.allPayLogisticsId ?? (order as any).logistics?.logisticsMerchantTradeNo}
                                {(order as any).logistics?.logisticsStatus === "failed" && (
                                  <span className="ml-2 text-red-600 font-semibold">建立失敗</span>
                                )}
                              </div>
                            )}
                            {/* 宅配託運單列印按鈕 */}
                            {order.shippingMethod === "home" && (order as any).logistics?.allPayLogisticsId && (
                              <PrintWaybillButton orderId={order.id} />
                            )}
                          </div>
                        )}

                        {/* 手動更新訂單狀態 */}
                        {order.orderStatus !== "completed" && order.orderStatus !== "cancelled" && (
                          <select
                            className="px-3 py-2 border border-[oklch(0.88_0_0)] text-xs font-body text-[oklch(0.4_0_0)] bg-white focus:outline-none focus:border-[oklch(0.5_0_0)]"
                            defaultValue=""
                            onChange={(e) => {
                              if (!e.target.value) return;
                              updateOrderStatus.mutate({ orderId: order.id, status: e.target.value as any });
                              e.target.value = "";
                            }}
                          >
                            <option value="">更新狀態...</option>
                            <option value="processing">備貨中</option>
                            <option value="shipped">已出貨</option>
                            <option value="arrived">已到店</option>
                            <option value="completed">已完成</option>
                            <option value="cancelled">取消訂單</option>
                          </select>
                        )}
                      </div>

                      {/* 物流資訊 */}
                      {(order as any).logistics && (
                        <div className="mt-4 p-3 bg-indigo-50 border border-indigo-100 text-xs font-body text-indigo-700">
                          <p className="font-medium mb-1">物流資訊</p>
                          <p>物流商：{(order as any).logistics.logisticsSubType}</p>
                          {(order as any).logistics.bookingNote && <p>托運單號：{(order as any).logistics.bookingNote}</p>}
                          {(order as any).logistics.cvsPaymentNo && <p>超商取件碼：{(order as any).logistics.cvsPaymentNo}</p>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            </div>
            {(page > 0 || allOrders.length === PAGE_SIZE) && (
              <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs font-body text-[oklch(0.45_0_0)]">
                <p>
                  本頁 {allOrders.length} 筆
                  {allOrders.length === PAGE_SIZE ? "（可能還有下一頁）" : ""}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page === 0 || isFetching}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    className="px-3 py-2 border border-[oklch(0.88_0_0)] bg-white text-[oklch(0.25_0_0)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[oklch(0.98_0_0)]"
                  >
                    上一頁
                  </button>
                  <span className="px-2 tabular-nums">第 {page + 1} 頁</span>
                  <button
                    type="button"
                    disabled={allOrders.length < PAGE_SIZE || isFetching}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-2 border border-[oklch(0.88_0_0)] bg-white text-[oklch(0.25_0_0)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[oklch(0.98_0_0)]"
                  >
                    下一頁
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
