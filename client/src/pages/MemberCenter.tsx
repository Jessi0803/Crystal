import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending_payment: "待付款",
  paid: "已付款（待出貨）",
  processing: "備貨中",
  shipped: "已出貨",
  arrived: "已到店 / 已送達",
  completed: "已完成",
  cancelled: "已取消",
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "待付款",
  paid: "已付款",
  transfer_pending: "轉帳待確認",
  confirmed: "已確認收款",
  failed: "付款失敗",
  cancelled: "已取消",
};

const SHIPPING_LABEL: Record<string, string> = {
  cvs_711: "7-11 超商取貨",
  cvs_family: "全家超商取貨",
  home: "宅配到府",
};

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    pending_payment: "bg-yellow-50 text-yellow-700 border-yellow-200",
    paid: "bg-blue-50 text-blue-700 border-blue-200",
    processing: "bg-purple-50 text-purple-700 border-purple-200",
    shipped: "bg-indigo-50 text-indigo-700 border-indigo-200",
    arrived: "bg-teal-50 text-teal-700 border-teal-200",
    completed: "bg-green-50 text-green-700 border-green-200",
    cancelled: "bg-gray-50 text-gray-500 border-gray-200",
  };
  return (
    <span
      className={`inline-block text-[0.65rem] px-2 py-0.5 border rounded-full font-body ${
        colorMap[status] ?? "bg-gray-50 text-gray-500 border-gray-200"
      }`}
    >
      {ORDER_STATUS_LABEL[status] ?? status}
    </span>
  );
}

export default function MemberCenter() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"orders" | "profile">("orders");
  const [profileName, setProfileName] = useState("");
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);

  // 取得目前登入用戶
  const { data: user, isLoading: userLoading } = trpc.auth.me.useQuery();

  // 取得訂單列表
  const { data: orders, isLoading: ordersLoading, error: ordersError } = trpc.member.myOrders.useQuery(undefined, {
    enabled: !!user,
  });

  const utils = trpc.useUtils();

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      toast.success("已登出");
      navigate("/");
      utils.auth.me.invalidate();
    },
  });

  const resendVerificationMutation = trpc.member.resendVerification.useMutation({
    onSuccess: (data) => toast.success(data.message),
    onError: (err) => toast.error(err.message),
  });

  const updateProfileMutation = trpc.member.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("姓名已更新");
      utils.auth.me.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  useEffect(() => {
    if (!userLoading && !user) {
      navigate("/login");
    }
  }, [navigate, user, userLoading]);

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-[oklch(0.55_0_0)] font-body">載入中...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[oklch(0.98_0.005_60)]">
      {/* 頁首 */}
      <div className="bg-white border-b border-[oklch(0.93_0_0)] py-8 px-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs tracking-[0.15em] text-[oklch(0.55_0_0)] font-body mb-1">MEMBER CENTER</p>
            <h1
              className="text-xl font-medium text-[oklch(0.15_0_0)]"
              style={{ fontFamily: "'Noto Sans TC', sans-serif" }}
            >
              歡迎回來，{user?.name ?? "會員"}
            </h1>
            <p className="text-xs text-[oklch(0.6_0_0)] font-body mt-0.5">{user?.email}</p>
          </div>
          <button
            onClick={() => logoutMutation.mutate()}
            className="text-xs text-[oklch(0.55_0_0)] font-body border border-[oklch(0.88_0_0)] px-4 py-2 hover:bg-[oklch(0.96_0_0)] transition-colors"
          >
            登出
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Email 驗證提示（僅 Email+密碼註冊；LINE 登入不要求站內驗證信） */}
        {user &&
          (user as unknown as { loginMethod?: string | null }).loginMethod === "email" &&
          !(user as unknown as { emailVerified?: boolean }).emailVerified &&
          user.email && (
          <div className="mb-6 bg-amber-50 border border-amber-200 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800" style={{ fontFamily: "'Noto Sans TC', sans-serif" }}>
                請驗證您的 Email
              </p>
              <p className="text-xs text-amber-700 font-body mt-0.5">
                發送驗證信到 {user.email}，點擊信中連結即可完成驗證。
              </p>
            </div>
            <button
              onClick={() => resendVerificationMutation.mutate({ origin: window.location.origin })}
              disabled={resendVerificationMutation.isPending}
              className="shrink-0 text-xs font-body border border-amber-400 text-amber-800 px-4 py-2 hover:bg-amber-100 transition-colors disabled:opacity-60"
            >
              {resendVerificationMutation.isPending ? "發送中..." : "重新發送驗證信"}
            </button>
          </div>
        )}

        {/* Tab 切換 */}
        <div className="flex gap-0 border-b border-[oklch(0.9_0_0)] mb-8">
          {[
            { key: "orders", label: "我的訂單" },
            { key: "profile", label: "帳號設定" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`px-6 py-3 text-sm font-body tracking-[0.05em] border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-[oklch(0.15_0_0)] text-[oklch(0.15_0_0)]"
                  : "border-transparent text-[oklch(0.55_0_0)] hover:text-[oklch(0.35_0_0)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 訂單列表 */}
        {activeTab === "orders" && (
          <div>
            {ordersLoading ? (
              <p className="text-sm text-[oklch(0.55_0_0)] font-body text-center py-12">載入訂單中...</p>
            ) : ordersError ? (
              <div className="text-center py-16">
                <p className="text-sm text-red-600 font-body mb-2">載入訂單失敗</p>
                <p className="text-xs text-red-500 font-body break-all">{ordersError.message}</p>
              </div>
            ) : !orders || orders.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🛍️</div>
                <p className="text-sm text-[oklch(0.55_0_0)] font-body mb-6">還沒有任何訂單</p>
                <Link href="/products">
                  <button className="text-sm font-body border border-[oklch(0.2_0_0)] px-6 py-2.5 hover:bg-[oklch(0.15_0_0)] hover:text-white transition-colors">
                    去逛逛
                  </button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white border border-[oklch(0.93_0_0)] overflow-hidden"
                  >
                    {/* 訂單標頭 */}
                    <div
                      className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[oklch(0.985_0_0)] transition-colors"
                      onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-xs text-[oklch(0.5_0_0)] font-body">
                            {new Date(order.createdAt).toLocaleDateString("zh-TW")}
                          </p>
                          <p className="text-sm font-medium text-[oklch(0.2_0_0)] font-body mt-0.5">
                            訂單 #{order.merchantTradeNo}
                          </p>
                        </div>
                        <StatusBadge status={order.orderStatus} />
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="text-sm font-medium text-[oklch(0.2_0_0)] font-body">
                          NT$ {order.totalAmount.toLocaleString()}
                        </p>
                        <span className="text-[oklch(0.6_0_0)] text-xs">
                          {expandedOrder === order.id ? "▲" : "▼"}
                        </span>
                      </div>
                    </div>

                    {/* 展開的訂單詳情 */}
                    {expandedOrder === order.id && (
                      <div className="border-t border-[oklch(0.93_0_0)] px-5 py-4 bg-[oklch(0.985_0_0)]">
                        {/* 商品明細 */}
                        <div className="space-y-2 mb-4">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                {item.productImage && (
                                  <img
                                    src={item.productImage}
                                    alt={item.productName}
                                    className="w-10 h-10 object-cover"
                                  />
                                )}
                                <div>
                                  <p className="text-xs font-body text-[oklch(0.25_0_0)]">
                                    {item.productName}
                                  </p>
                                  <p className="text-[0.65rem] text-[oklch(0.55_0_0)] font-body">
                                    × {item.quantity}
                                  </p>
                                </div>
                              </div>
                              <p className="text-xs font-body text-[oklch(0.35_0_0)]">
                                NT$ {item.subtotal.toLocaleString()}
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* 訂單資訊 */}
                        <div className="border-t border-[oklch(0.93_0_0)] pt-3 space-y-1.5">
                          <div className="flex justify-between text-xs font-body text-[oklch(0.5_0_0)]">
                            <span>付款方式</span>
                            <span>{PAYMENT_STATUS_LABEL[order.paymentStatus]}</span>
                          </div>
                          <div className="flex justify-between text-xs font-body text-[oklch(0.5_0_0)]">
                            <span>配送方式</span>
                            <span>{SHIPPING_LABEL[order.shippingMethod]}</span>
                          </div>
                          {order.cvsStoreName && (
                            <div className="flex justify-between text-xs font-body text-[oklch(0.5_0_0)]">
                              <span>取貨門市</span>
                              <span>{order.cvsStoreName}</span>
                            </div>
                          )}
                          {order.logistics?.cvsPaymentNo && (
                            <div className="flex justify-between text-xs font-body text-[oklch(0.5_0_0)]">
                              <span>超商條碼</span>
                              <span className="font-medium text-[oklch(0.3_0_0)]">
                                {order.logistics.cvsPaymentNo}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 帳號設定 */}
        {activeTab === "profile" && (
          <div className="bg-white border border-[oklch(0.93_0_0)] p-6 sm:p-8 max-w-md">
            <h2
              className="text-base font-medium text-[oklch(0.15_0_0)] mb-6"
              style={{ fontFamily: "'Noto Sans TC', sans-serif" }}
            >
              修改姓名
            </h2>
            <div className="space-y-5">
              <div>
                <label className="block text-xs tracking-[0.08em] text-[oklch(0.4_0_0)] mb-1.5 font-body">
                  EMAIL（不可修改）
                </label>
                <input
                  type="email"
                  value={user?.email ?? ""}
                  disabled
                  className="w-full border border-[oklch(0.88_0_0)] px-4 py-3 text-sm font-body bg-[oklch(0.96_0_0)] text-[oklch(0.55_0_0)]"
                />
              </div>
              <div>
                <label className="block text-xs tracking-[0.08em] text-[oklch(0.4_0_0)] mb-1.5 font-body">
                  姓名
                </label>
                <input
                  type="text"
                  value={profileName || user?.name || ""}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="請輸入姓名"
                  className="w-full border border-[oklch(0.88_0_0)] px-4 py-3 text-sm font-body outline-none focus:border-[oklch(0.6_0.08_60)]"
                />
              </div>
              <button
                onClick={() => {
                  const name = profileName || user?.name || "";
                  if (!name) return;
                  updateProfileMutation.mutate({ name });
                }}
                disabled={updateProfileMutation.isPending}
                className="bg-[oklch(0.15_0_0)] text-white px-6 py-2.5 text-sm font-body hover:bg-[oklch(0.25_0_0)] transition-colors disabled:opacity-60"
              >
                {updateProfileMutation.isPending ? "儲存中..." : "儲存變更"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
