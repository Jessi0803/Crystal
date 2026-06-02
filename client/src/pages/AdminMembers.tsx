/**
 * 會員管理後台
 * 路由：/admin/members
 * 僅限 admin 角色存取
 */
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Crown,
  Mail,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  Save,
  Search,
  ShoppingBag,
  Truck,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

const PAGE_SIZE = 50;

const VIP_OPTIONS = [
  { value: "none", label: "一般會員" },
  { value: "vip", label: "VIP" },
  { value: "vvip", label: "VVIP" },
] as const;

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending_payment: "待付款",
  deposit_paid: "已付訂金",
  paid: "已付款",
  processing: "備貨中",
  shipped: "已出貨",
  arrived: "已到店",
  picked_up: "已取貨",
  not_picked: "未取貨",
  completed: "已完成",
  cancelled: "已取消",
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "待付款",
  paid: "已付款",
  transfer_pending: "轉帳待確認",
  confirmed: "已確認",
  failed: "付款失敗",
  cancelled: "已取消",
};

function formatDate(value?: Date | string | null) {
  if (!value) return "尚無紀錄";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "尚無紀錄";
  return date.toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(value?: number | null) {
  return `NT$ ${Number(value ?? 0).toLocaleString()}`;
}

function getVipLabel(value?: string | null) {
  return VIP_OPTIONS.find((option) => option.value === value)?.label ?? "一般會員";
}

function getPaymentMethodLabel(method?: string | null) {
  if (method === "atm") return "銀行轉帳";
  if (method === "paypal") return "PayPal";
  return "信用卡";
}

function getShippingMethodLabel(method?: string | null) {
  if (method === "cvs_711") return "7-11 店到店";
  if (method === "cvs_family") return "全家店到店";
  return "宅配";
}

function MemberOrderDetail({ orderId }: { orderId: number }) {
  const { data: detail, isLoading } = trpc.order.getOrderDetail.useQuery(
    { orderId },
    { staleTime: 0 }
  );

  if (isLoading || !detail) {
    return (
      <div className="mt-4 border-t border-[oklch(0.93_0_0)] pt-4 text-center text-xs font-body text-[oklch(0.5_0_0)]">
        載入訂單明細中...
      </div>
    );
  }

  return (
    <div className="mt-4 border-t border-[oklch(0.93_0_0)] pt-4 space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-[11px] tracking-widest font-body text-[oklch(0.5_0_0)] mb-2">購買人資訊</p>
          <div className="space-y-1.5 text-xs font-body text-[oklch(0.45_0_0)]">
            <p className="flex gap-2"><UserRound className="w-3.5 h-3.5 shrink-0" />{detail.buyerName}</p>
            <p className="flex gap-2"><Mail className="w-3.5 h-3.5 shrink-0" />{detail.buyerEmail}</p>
            <p className="flex gap-2"><Phone className="w-3.5 h-3.5 shrink-0" />{detail.buyerPhone}</p>
            <p className="flex gap-2">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>
                {detail.cvsStoreName
                  ? `${getShippingMethodLabel(detail.shippingMethod)} - ${detail.cvsStoreName}`
                  : detail.shippingAddress || getShippingMethodLabel(detail.shippingMethod)}
              </span>
            </p>
          </div>
        </div>

        <div>
          <p className="text-[11px] tracking-widest font-body text-[oklch(0.5_0_0)] mb-2">訂單資訊</p>
          <div className="space-y-1.5 text-xs font-body text-[oklch(0.45_0_0)]">
            <p>付款方式：{getPaymentMethodLabel(detail.paymentMethod)}</p>
            <p>付款狀態：{PAYMENT_STATUS_LABEL[detail.paymentStatus] ?? detail.paymentStatus}</p>
            <p>訂單狀態：{ORDER_STATUS_LABEL[detail.orderStatus] ?? detail.orderStatus}</p>
            {detail.transferLastFive && <p>匯款末五碼：{detail.transferLastFive}</p>}
          </div>
        </div>
      </div>

      <div>
        <p className="text-[11px] tracking-widest font-body text-[oklch(0.5_0_0)] mb-2">商品明細</p>
        <div className="space-y-2">
          {detail.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 bg-[oklch(0.985_0_0)] border border-[oklch(0.94_0_0)] p-2">
              <div className="flex items-center gap-3 min-w-0">
                {item.productImage && (
                  <img
                    src={item.productImage}
                    alt={item.productName}
                    className="h-12 w-12 object-cover border border-[oklch(0.9_0_0)] bg-white shrink-0"
                    loading="lazy"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-body text-[oklch(0.12_0_0)] truncate">{item.productName}</p>
                  <p className="text-[11px] font-body text-[oklch(0.5_0_0)]">x{item.quantity}</p>
                </div>
              </div>
              <p className="text-xs font-medium text-[oklch(0.12_0_0)] shrink-0">{formatMoney(item.subtotal)}</p>
            </div>
          ))}
        </div>
      </div>

      {detail.logistics && (
        <div className="bg-indigo-50 border border-indigo-100 p-3 text-xs font-body text-indigo-700">
          <p className="font-medium flex items-center gap-1.5 mb-1"><Truck className="w-3.5 h-3.5" />物流資訊</p>
          <p>配送方式：{getShippingMethodLabel(detail.shippingMethod)}</p>
          <p>物流狀態：{detail.logistics.logisticsStatus}</p>
          <p>物流編號：{detail.logistics.allPayLogisticsId ?? detail.logistics.logisticsMerchantTradeNo}</p>
          {detail.logistics.bookingNote && <p>托運單號：{detail.logistics.bookingNote}</p>}
          {detail.logistics.cvsPaymentNo && <p>超商取件碼：{detail.logistics.cvsPaymentNo}</p>}
        </div>
      )}

      {(detail as any).customerNote && (
        <div className="bg-amber-50 border border-amber-100 p-3 text-xs font-body text-amber-800">
          <p className="font-medium mb-2">客製化諮詢內容</p>
          <pre className="whitespace-pre-wrap leading-relaxed" style={{ fontFamily: "'Noto Sans TC', sans-serif" }}>
            {(detail as any).customerNote}
          </pre>
        </div>
      )}

      {detail.isCustomOrder && detail.balancePayment && (
        <div className="bg-rose-50 border border-rose-100 p-3 text-xs font-body text-rose-700">
          <p className="font-medium flex items-center gap-1.5 mb-1"><CreditCard className="w-3.5 h-3.5" />尾款資訊</p>
          <p>尾款編號：{detail.balancePayment.merchantTradeNo}</p>
          <p>尾款金額：{formatMoney(detail.balancePayment.amount)}</p>
          <p>尾款狀態：{detail.balancePayment.paymentStatus}</p>
          {(detail.balancePayment as any).transferLastFive && <p>尾款匯款末五碼：{(detail.balancePayment as any).transferLastFive}</p>}
        </div>
      )}
    </div>
  );
}

export default function AdminMembers() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [vipTier, setVipTier] = useState<(typeof VIP_OPTIONS)[number]["value"]>("none");
  const [vipNote, setVipNote] = useState("");

  const utils = trpc.useUtils();
  const offset = (page - 1) * PAGE_SIZE;
  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = trpc.adminMembers.list.useQuery(
    { limit: PAGE_SIZE, offset, search: search || undefined },
    { enabled: user?.role === "admin" }
  );
  const {
    data: detail,
    isLoading: detailLoading,
    refetch: refetchDetail,
  } = trpc.adminMembers.detail.useQuery(
    { userId: selectedUserId ?? 0 },
    { enabled: user?.role === "admin" && selectedUserId !== null }
  );

  const updateVip = trpc.adminMembers.updateVip.useMutation({
    onSuccess: async () => {
      toast.success("會員 VIP 設定已更新");
      await utils.adminMembers.list.invalidate();
      await utils.adminMembers.detail.invalidate();
    },
    onError: (err) => toast.error(err.message || "更新 VIP 設定失敗"),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const selectedMember = detail?.member;
  const totalDetailSpent = useMemo(
    () =>
      (detail?.orders ?? []).reduce((sum, order) => {
        const paid =
          order.paymentStatus === "paid" ||
          order.paymentStatus === "confirmed" ||
          ["deposit_paid", "paid", "processing", "shipped", "arrived", "picked_up", "completed"].includes(order.orderStatus);
        return paid ? sum + order.totalAmount : sum;
      }, 0),
    [detail?.orders]
  );

  useEffect(() => {
    if (selectedUserId === null && items[0]) setSelectedUserId(items[0].id);
  }, [items, selectedUserId]);

  useEffect(() => {
    setExpandedOrderId(null);
  }, [selectedUserId]);

  useEffect(() => {
    if (!selectedMember) return;
    const nextTier = VIP_OPTIONS.some((option) => option.value === selectedMember.vipTier) ? selectedMember.vipTier : "none";
    setVipTier(nextTier);
    setVipNote(selectedMember.vipNote ?? "");
  }, [selectedMember]);

  if (!authLoading && !user) {
    window.location.href = getLoginUrl();
    return null;
  }

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

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSelectedUserId(null);
    setSearch(searchInput.trim());
  };

  const saveVip = () => {
    if (!selectedUserId) return;
    updateVip.mutate({
      userId: selectedUserId,
      vipTier,
      vipNote: vipNote.trim() || null,
    });
  };

  return (
    <div className="min-h-screen bg-[oklch(0.97_0_0)]">
      <div className="bg-white border-b border-[oklch(0.93_0_0)] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div>
            <button
              onClick={() => setLocation("/admin/orders")}
              className="text-xs tracking-widest font-body text-[oklch(0.5_0_0)] hover:text-[oklch(0.1_0_0)] transition-colors mb-1 flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" /> 訂單管理
            </button>
            <h1 className="text-lg text-[oklch(0.1_0_0)]" style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 300 }}>
              會員管理
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLocation("/admin/products")}
              className="hidden sm:flex items-center gap-2 text-xs font-body text-[oklch(0.5_0_0)] hover:text-[oklch(0.1_0_0)] border border-[oklch(0.88_0_0)] px-3 py-2"
            >
              商品管理
            </button>
            <button
              onClick={() => setLocation("/admin/revenue")}
              className="hidden sm:flex items-center gap-2 text-xs font-body text-[oklch(0.5_0_0)] hover:text-[oklch(0.1_0_0)] border border-[oklch(0.88_0_0)] px-3 py-2"
            >
              營收報表
            </button>
            <button
              onClick={() => {
                void refetch();
                if (selectedUserId) void refetchDetail();
              }}
              disabled={isFetching || detailLoading}
              className="flex items-center gap-2 text-xs font-body text-[oklch(0.5_0_0)] hover:text-[oklch(0.1_0_0)] border border-[oklch(0.88_0_0)] px-3 py-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching || detailLoading ? "animate-spin" : ""}`} />
              重新整理
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[oklch(0.93_0_0)] p-5">
            <div className="flex items-center gap-2 mb-2 text-[oklch(0.4_0_0)]">
              <Users className="w-4 h-4" />
              <span className="text-xs tracking-widest font-body text-[oklch(0.5_0_0)]">會員總數</span>
            </div>
            <div className="text-2xl font-medium text-[oklch(0.18_0_0)]" style={{ fontFamily: "'Noto Sans TC', sans-serif" }}>
              {isLoading ? "…" : total.toLocaleString()}
            </div>
          </div>
          <div className="bg-white border border-[oklch(0.93_0_0)] p-5">
            <div className="flex items-center gap-2 mb-2 text-amber-600">
              <Crown className="w-4 h-4" />
              <span className="text-xs tracking-widest font-body text-[oklch(0.5_0_0)]">目前選取</span>
            </div>
            <div className="text-2xl font-medium text-amber-700" style={{ fontFamily: "'Noto Sans TC', sans-serif" }}>
              {getVipLabel(selectedMember?.vipTier)}
            </div>
          </div>
          <div className="bg-white border border-[oklch(0.93_0_0)] p-5">
            <div className="flex items-center gap-2 mb-2 text-blue-600">
              <ShoppingBag className="w-4 h-4" />
              <span className="text-xs tracking-widest font-body text-[oklch(0.5_0_0)]">購買紀錄</span>
            </div>
            <div className="text-2xl font-medium text-blue-700" style={{ fontFamily: "'Noto Sans TC', sans-serif" }}>
              {detailLoading ? "…" : `${detail?.orders.length ?? 0} 筆`}
            </div>
          </div>
          <div className="bg-white border border-[oklch(0.93_0_0)] p-5">
            <div className="flex items-center gap-2 mb-2 text-emerald-600">
              <CalendarDays className="w-4 h-4" />
              <span className="text-xs tracking-widest font-body text-[oklch(0.5_0_0)]">累計消費</span>
            </div>
            <div className="text-2xl font-medium text-emerald-700" style={{ fontFamily: "'Noto Sans TC', sans-serif" }}>
              {formatMoney(totalDetailSpent)}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.45fr)]">
          <section className="bg-white border border-[oklch(0.93_0_0)]">
            <div className="p-5 border-b border-[oklch(0.93_0_0)]">
              <form onSubmit={submitSearch} className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[oklch(0.55_0_0)]" />
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="搜尋姓名、Email 或會員 ID"
                  className="w-full border border-[oklch(0.86_0_0)] pl-9 pr-3 py-2.5 text-sm font-body outline-none focus:border-[oklch(0.2_0_0)]"
                />
              </form>
            </div>
            <div className="divide-y divide-[oklch(0.93_0_0)]">
              {isLoading || authLoading ? (
                <div className="p-10 text-center text-sm font-body text-[oklch(0.5_0_0)]">載入會員中...</div>
              ) : error ? (
                <div className="p-10 text-center text-sm font-body text-red-600">會員資料載入失敗：{error.message}</div>
              ) : items.length === 0 ? (
                <div className="p-10 text-center text-sm font-body text-[oklch(0.5_0_0)]">查無會員</div>
              ) : (
                items.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setSelectedUserId(member.id)}
                    className={`w-full text-left p-4 transition-colors ${
                      selectedUserId === member.id
                        ? "bg-[oklch(0.95_0.01_95)]"
                        : "hover:bg-[oklch(0.985_0_0)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[oklch(0.12_0_0)] truncate">
                          {member.name || "未填姓名"}
                        </p>
                        <p className="text-xs text-[oklch(0.5_0_0)] font-body mt-1 truncate">
                          {member.email || "無 Email"}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] font-body border border-[oklch(0.86_0_0)] px-2 py-1 text-[oklch(0.42_0_0)]">
                        {getVipLabel(member.vipTier)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-3 text-[11px] font-body text-[oklch(0.55_0_0)]">
                      <span>#{member.id}</span>
                      <span>{member.orderCount} 筆訂單</span>
                      <span>{formatMoney(member.totalSpent)}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
            <div className="p-4 border-t border-[oklch(0.93_0_0)] flex items-center justify-between text-xs font-body text-[oklch(0.5_0_0)]">
              <span>第 {currentPage} / {totalPages} 頁</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={currentPage <= 1}
                  className="border border-[oklch(0.86_0_0)] px-3 py-2 disabled:opacity-40"
                >
                  上一頁
                </button>
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  disabled={currentPage >= totalPages}
                  className="border border-[oklch(0.86_0_0)] px-3 py-2 disabled:opacity-40"
                >
                  下一頁
                </button>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="bg-white border border-[oklch(0.93_0_0)] p-5">
              {detailLoading ? (
                <div className="py-10 text-center text-sm font-body text-[oklch(0.5_0_0)]">載入會員明細中...</div>
              ) : selectedMember ? (
                <div className="space-y-5">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 bg-[oklch(0.94_0_0)] flex items-center justify-center shrink-0">
                        <UserRound className="w-5 h-5 text-[oklch(0.28_0_0)]" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-base font-medium text-[oklch(0.12_0_0)] truncate">
                          {selectedMember.name || "未填姓名"}
                        </h2>
                        <div className="mt-2 space-y-1 text-xs font-body text-[oklch(0.5_0_0)]">
                          <p className="flex items-center gap-2 min-w-0">
                            <Mail className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{selectedMember.email || "無 Email"}</span>
                          </p>
                          <p>註冊方式：{selectedMember.loginMethod || "未紀錄"}</p>
                          <p>加入時間：{formatDate(selectedMember.createdAt)}</p>
                          <p>最後登入：{formatDate(selectedMember.lastSignedIn)}</p>
                        </div>
                      </div>
                    </div>
                    <span className="inline-flex self-start items-center gap-1.5 text-xs font-body border border-amber-200 bg-amber-50 text-amber-700 px-3 py-1.5">
                      <Crown className="w-3.5 h-3.5" />
                      {getVipLabel(selectedMember.vipTier)}
                    </span>
                  </div>

                  <div className="border-t border-[oklch(0.93_0_0)] pt-5 grid gap-4 md:grid-cols-[160px_1fr_auto] md:items-end">
                    <label className="block">
                      <span className="block text-[11px] tracking-widest text-[oklch(0.5_0_0)] font-body mb-1">VIP 等級</span>
                      <select
                        value={vipTier}
                        onChange={(event) => setVipTier(event.target.value as typeof vipTier)}
                        className="w-full border border-[oklch(0.86_0_0)] px-3 py-2.5 text-sm font-body bg-white"
                      >
                        {VIP_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="block text-[11px] tracking-widest text-[oklch(0.5_0_0)] font-body mb-1">VIP 備註</span>
                      <input
                        value={vipNote}
                        onChange={(event) => setVipNote(event.target.value)}
                        placeholder="例如：生日月、偏好、人工優惠備註"
                        className="w-full border border-[oklch(0.86_0_0)] px-3 py-2.5 text-sm font-body outline-none focus:border-[oklch(0.2_0_0)]"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={saveVip}
                      disabled={updateVip.isPending}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-body bg-[oklch(0.15_0_0)] text-white disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {updateVip.isPending ? "儲存中" : "儲存"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center text-sm font-body text-[oklch(0.5_0_0)]">請先選擇會員</div>
              )}
            </div>

            <div className="bg-white border border-[oklch(0.93_0_0)]">
              <div className="p-5 border-b border-[oklch(0.93_0_0)] flex items-center justify-between">
                <div>
                  <p className="text-xs tracking-widest font-body text-[oklch(0.5_0_0)] mb-1">PURCHASE HISTORY</p>
                  <h2 className="text-base text-[oklch(0.1_0_0)]" style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 300 }}>
                    購買紀錄
                  </h2>
                </div>
                <p className="text-xs font-body text-[oklch(0.5_0_0)]">{detail?.orders.length ?? 0} 筆</p>
              </div>
              <div className="divide-y divide-[oklch(0.93_0_0)]">
                {detailLoading ? (
                  <div className="p-10 text-center text-sm font-body text-[oklch(0.5_0_0)]">載入購買紀錄中...</div>
                ) : (detail?.orders ?? []).length === 0 ? (
                  <div className="p-10 text-center text-sm font-body text-[oklch(0.5_0_0)]">目前沒有購買紀錄</div>
                ) : (
                  detail?.orders.map((order) => (
                    <div key={order.id} className="p-4">
                      <button
                        type="button"
                        onClick={() => setExpandedOrderId((current) => current === order.id ? null : order.id)}
                        className="w-full text-left"
                      >
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-[oklch(0.12_0_0)]">#{order.merchantTradeNo}</p>
                              {expandedOrderId === order.id ? (
                                <ChevronUp className="w-4 h-4 text-[oklch(0.5_0_0)]" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-[oklch(0.5_0_0)]" />
                              )}
                            </div>
                            <p className="text-xs font-body text-[oklch(0.5_0_0)] mt-1">
                              {formatDate(order.createdAt)} · {order.itemCount} 件商品
                            </p>
                            <p className="text-xs font-body text-[oklch(0.5_0_0)] mt-1">
                              {order.buyerName} · {order.buyerEmail} · {order.buyerPhone}
                            </p>
                          </div>
                          <div className="md:text-right shrink-0">
                            <p className="text-sm font-medium text-[oklch(0.12_0_0)]">{formatMoney(order.totalAmount)}</p>
                            <div className="flex md:justify-end flex-wrap gap-1.5 mt-2">
                              <span className="text-[11px] font-body border border-[oklch(0.86_0_0)] px-2 py-1 text-[oklch(0.42_0_0)]">
                                {ORDER_STATUS_LABEL[order.orderStatus] ?? order.orderStatus}
                              </span>
                              <span className="text-[11px] font-body border border-[oklch(0.86_0_0)] px-2 py-1 text-[oklch(0.42_0_0)]">
                                {PAYMENT_STATUS_LABEL[order.paymentStatus] ?? order.paymentStatus}
                              </span>
                              {order.isPreorder && (
                                <span className="text-[11px] font-body border border-blue-100 bg-blue-50 px-2 py-1 text-blue-700">預購</span>
                              )}
                              {order.isCustomOrder && (
                                <span className="text-[11px] font-body border border-rose-100 bg-rose-50 px-2 py-1 text-rose-700">客製</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                      {expandedOrderId === order.id && <MemberOrderDetail orderId={order.id} />}
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
