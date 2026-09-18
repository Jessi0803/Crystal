import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { lineLinkUrl, MemberCouponList } from "@/components/MemberCoupons";
import BirthdayFields, { EMPTY_BIRTHDAY_DRAFT, parseBirthdayDraft, type BirthdayDraft } from "@/components/BirthdayFields";
import { CUSTOM_LINE_URL } from "@/lib/customOrderingContent";
import { birthdayFromUser, formatBirthday } from "@shared/birthday";

type MemberTab = "orders" | "coupons" | "profile";

const LINE_REDIRECT_MESSAGES: Record<string, { type: "success" | "info" | "error"; message: string }> = {
  "line:bound": { type: "success", message: "LINE 綁定成功" },
  "line:line_in_use": { type: "error", message: "這個 LINE 帳號已綁定其他會員，無法重複綁定" },
  "line:user_has_other_line": { type: "error", message: "您的帳號已綁定其他 LINE 帳號" },
  "lineReward:granted": { type: "success", message: "LINE 好友優惠券已放入會員帳戶" },
  "lineReward:already": { type: "info", message: "您已經領取過 LINE 好友禮" },
  "lineReward:not_friend": { type: "info", message: "尚未加入官方 LINE 好友，加入後可在「我的優惠券」領取" },
  "lineReward:unavailable": { type: "error", message: "暫時無法確認好友狀態，請稍後在「我的優惠券」重新領取" },
};

function initialTab(): MemberTab {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get("tab");
  if (tab === "coupons" || tab === "profile") return tab;
  if (params.has("line") || params.has("lineReward")) return "coupons";
  return "orders";
}

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending_payment: "待付款",
  deposit_paid: "已付訂金",
  paid: "已付款（待出貨）",
  processing: "備貨中",
  shipped: "已出貨",
  arrived: "已到店 / 已送達",
  picked_up: "已取貨",
  not_picked: "未取貨",
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
    deposit_paid: "bg-rose-50 text-rose-700 border-rose-200",
    paid: "bg-blue-50 text-blue-700 border-blue-200",
    processing: "bg-purple-50 text-purple-700 border-purple-200",
    shipped: "bg-indigo-50 text-indigo-700 border-indigo-200",
    arrived: "bg-teal-50 text-teal-700 border-teal-200",
    picked_up: "bg-green-50 text-green-700 border-green-200",
    not_picked: "bg-orange-50 text-orange-700 border-orange-200",
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
  const [activeTab, setActiveTab] = useState<MemberTab>(initialTab);
  const [profileName, setProfileName] = useState("");
  const [birthdayDraft, setBirthdayDraft] = useState<BirthdayDraft>(EMPTY_BIRTHDAY_DRAFT);
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
    onSuccess: (_result, variables) => {
      toast.success(variables.birthday ? "會員資料已更新，生日已儲存" : "會員資料已更新");
      setBirthdayDraft(EMPTY_BIRTHDAY_DRAFT);
      utils.auth.me.invalidate();
    },
    onError: (err) => {
      // zod 驗證錯誤的訊息是 JSON 字串
      let message = err.message;
      try {
        message = (JSON.parse(err.message) as { message?: string }[])[0]?.message ?? message;
      } catch {
        /* 一般錯誤訊息 */
      }
      toast.error(message);
    },
  });

  useEffect(() => {
    if (!userLoading && !user) {
      navigate("/login");
    }
  }, [navigate, user, userLoading]);

  // LINE 綁定／好友禮結果由伺服器帶在網址上，顯示一次後清除
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let handled = false;
    for (const key of ["line", "lineReward"]) {
      const value = params.get(key);
      if (!value) continue;
      handled = true;
      const notice = LINE_REDIRECT_MESSAGES[`${key}:${value}`];
      if (notice) toast[notice.type](notice.message);
      params.delete(key);
    }
    if (!handled) return;
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    utils.coupons.invalidate();
  }, [utils]);

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-sf-muted font-body">載入中...</p>
      </div>
    );
  }

  if (!user) return null;

  const savedBirthday = birthdayFromUser(user);

  return (
    <div className="min-h-screen bg-sf-cream">
      {/* 頁首 */}
      <div className="bg-white border-b border-sf-line py-8 px-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <p className="eyebrow mb-1">MEMBER CENTER</p>
            <h1
              className="text-xl font-light tracking-[0.08em] text-sf-ink"
              style={{ fontFamily: "'Noto Serif TC', serif" }}
            >
              歡迎回來，{user?.name ?? "會員"}
            </h1>
            <p className="text-xs text-sf-muted font-body mt-0.5">{user?.email}</p>
          </div>
          <button
            onClick={() => logoutMutation.mutate()}
            className="rounded-full text-xs text-sf-muted font-body border border-sf-line-strong px-4 py-2 hover:bg-sf-selected transition-colors"
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
          <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
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
              className="shrink-0 rounded-full text-xs font-body border border-amber-400 text-amber-800 px-4 py-2 hover:bg-amber-100 transition-colors disabled:opacity-60"
            >
              {resendVerificationMutation.isPending ? "發送中..." : "重新發送驗證信"}
            </button>
          </div>
        )}

        {/* Tab 切換 */}
        <div className="flex gap-0 border-b border-sf-line mb-8">
          {[
            { key: "orders", label: "我的訂單" },
            { key: "coupons", label: "我的優惠券" },
            { key: "profile", label: "帳號設定" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`px-4 sm:px-6 py-3 text-sm font-body tracking-[0.05em] border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-sf-accent text-sf-ink"
                  : "border-transparent text-sf-muted hover:text-sf-accent"
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
              <p className="text-sm text-sf-muted font-body text-center py-12">載入訂單中...</p>
            ) : ordersError ? (
              <div className="text-center py-16">
                <p className="text-sm text-red-600 font-body mb-2">載入訂單失敗</p>
                <p className="text-xs text-red-500 font-body break-all">{ordersError.message}</p>
              </div>
            ) : !orders || orders.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🛍️</div>
                <p className="text-sm text-sf-muted font-body mb-6">還沒有任何訂單</p>
                <Link href="/products">
                  <button className="rounded-full text-sm font-body border border-sf-accent text-sf-accent px-6 py-2.5 hover:bg-sf-accent hover:text-white transition-colors">
                    去逛逛
                  </button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white border border-sf-line overflow-hidden"
                  >
                    {/* 訂單標頭 */}
                    <div
                      className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-sf-selected transition-colors"
                      onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-xs text-sf-muted font-body">
                            {new Date(order.createdAt).toLocaleDateString("zh-TW")}
                          </p>
                          <p className="text-sm font-medium text-sf-ink font-body mt-0.5">
                            訂單 #{order.merchantTradeNo}
                          </p>
                        </div>
                        <StatusBadge status={order.orderStatus} />
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="text-sm font-medium text-sf-ink font-body">
                          NT$ {order.totalAmount.toLocaleString()}
                        </p>
                        <span className="text-sf-muted text-xs">
                          {expandedOrder === order.id ? "▲" : "▼"}
                        </span>
                      </div>
                    </div>

                    {/* 展開的訂單詳情 */}
                    {expandedOrder === order.id && (
                      <div className="border-t border-sf-line px-5 py-4 bg-sf-cream">
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
                                  <p className="text-xs font-body text-sf-text">
                                    {item.productName}
                                  </p>
                                  <p className="text-[0.65rem] text-sf-muted font-body">
                                    × {item.quantity}
                                  </p>
                                </div>
                              </div>
                              <p className="text-xs font-body text-sf-text">
                                NT$ {item.subtotal.toLocaleString()}
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* 訂單資訊 */}
                        <div className="border-t border-sf-line pt-3 space-y-1.5">
                          <div className="flex justify-between text-xs font-body text-sf-muted">
                            <span>付款方式</span>
                            <span>{PAYMENT_STATUS_LABEL[order.paymentStatus]}</span>
                          </div>
                          <div className="flex justify-between text-xs font-body text-sf-muted">
                            <span>配送方式</span>
                            <span>{SHIPPING_LABEL[order.shippingMethod]}</span>
                          </div>
                          {order.cvsStoreName && (
                            <div className="flex justify-between text-xs font-body text-sf-muted">
                              <span>取貨門市</span>
                              <span>{order.cvsStoreName}</span>
                            </div>
                          )}
                          {order.logistics?.cvsPaymentNo && (
                            <div className="flex justify-between text-xs font-body text-sf-muted">
                              <span>超商條碼</span>
                              <span className="font-medium text-sf-text">
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

        {activeTab === "coupons" && <MemberCouponList />}

        {/* 帳號設定 */}
        {activeTab === "profile" && (
          <div className="rounded-lg bg-white border border-sf-line p-6 sm:p-8 max-w-md">
            <h2
              className="text-base font-light tracking-[0.08em] text-sf-ink mb-6"
              style={{ fontFamily: "'Noto Serif TC', serif" }}
            >
              會員資料
            </h2>
            <div className="space-y-5">
              <div>
                <label className="block text-xs tracking-[0.08em] text-sf-text mb-1.5 font-body">
                  EMAIL（不可修改）
                </label>
                <input
                  type="email"
                  value={user?.email ?? ""}
                  disabled
                  className="w-full border border-sf-line-strong px-4 py-3 text-sm font-body bg-sf-cream text-sf-muted"
                />
              </div>
              <div>
                <label className="block text-xs tracking-[0.08em] text-sf-text mb-1.5 font-body">
                  姓名
                </label>
                <input
                  type="text"
                  value={profileName || user?.name || ""}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="請輸入姓名"
                  className="w-full border border-sf-line-strong px-4 py-3 text-sm font-body outline-none focus:border-sf-accent"
                />
              </div>
              <div>
                <p className="block text-xs tracking-[0.08em] text-sf-text mb-1.5 font-body">生日</p>
                {savedBirthday ? (
                  <>
                    <p className="w-full border border-sf-line-strong px-4 py-3 text-sm font-body bg-sf-cream text-sf-text">
                      {formatBirthday(savedBirthday)}
                    </p>
                    <p className="mt-1.5 text-xs font-body text-sf-muted leading-relaxed">
                      生日填寫後無法自行修改，如需更正請
                      <a href={CUSTOM_LINE_URL} target="_blank" rel="noopener noreferrer" className="underline mx-0.5">
                        聯絡客服
                      </a>
                      。
                    </p>
                  </>
                ) : (
                  <>
                    <BirthdayFields
                      value={birthdayDraft}
                      onChange={setBirthdayDraft}
                      disabled={updateProfileMutation.isPending}
                      inputClassName="w-full min-w-0 border border-sf-line-strong bg-white px-3 py-3 text-sm font-body outline-none focus:border-sf-accent"
                    />
                    <p className="mt-1.5 text-xs font-body text-sf-muted leading-relaxed">
                      未來將規劃生日月份的會員生日禮優惠。出生年份可不填；生日儲存後無法自行修改，請確認後再送出。
                    </p>
                  </>
                )}
              </div>
              <button
                onClick={() => {
                  const name = (profileName || user?.name || "").trim();
                  if (!name) {
                    toast.error("請輸入姓名");
                    return;
                  }
                  const parsed = savedBirthday ? { birthday: null, error: null } : parseBirthdayDraft(birthdayDraft);
                  if (parsed.error) {
                    toast.error(parsed.error);
                    return;
                  }
                  if (
                    parsed.birthday &&
                    !window.confirm(`生日將儲存為 ${formatBirthday(parsed.birthday)}，儲存後無法自行修改，確定嗎？`)
                  ) {
                    return;
                  }
                  updateProfileMutation.mutate({ name, birthday: parsed.birthday ?? undefined });
                }}
                disabled={updateProfileMutation.isPending}
                className="rounded-full bg-sf-accent text-white px-6 py-2.5 text-sm font-body hover:bg-sf-accent-hover transition-colors disabled:opacity-60"
              >
                {updateProfileMutation.isPending ? "儲存中..." : "儲存變更"}
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-sf-line">
              <p className="text-xs tracking-[0.08em] text-sf-text mb-2 font-body">LINE 帳號</p>
              {user.openId?.startsWith("line:") ? (
                <p className="text-sm font-body text-sf-text">已綁定 LINE</p>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-body text-sf-muted">尚未綁定</p>
                  <a
                    href={lineLinkUrl("/member?tab=profile")}
                    className="rounded-full text-xs font-body bg-[#06C755] text-white px-4 py-2 hover:opacity-90"
                  >
                    綁定 LINE
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
