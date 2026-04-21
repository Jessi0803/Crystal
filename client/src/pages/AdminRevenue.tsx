/**
 * 營收報表頁面
 * 路由：/admin/revenue
 * 僅限 admin 角色存取
 */
import { useState } from "react";
import { useLocation } from "wouter";
import {
  TrendingUp,
  BarChart3,
  Package,
  ShoppingBag,
  XCircle,
  ArrowLeft,
  RefreshCw,
  Crown,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

export default function AdminRevenue() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [months, setMonths] = useState(6);

  const { data: monthlyRevenue, isLoading: revenueLoading, refetch: refetchRevenue } =
    trpc.order.getMonthlyRevenue.useQuery({ months }, { enabled: user?.role === "admin" });

  const { data: topProducts, isLoading: productsLoading, refetch: refetchProducts } =
    trpc.order.getTopProducts.useQuery({ limit: 10 }, { enabled: user?.role === "admin" });

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } =
    trpc.order.getStats.useQuery(undefined, { enabled: user?.role === "admin" });

  const isLoading = revenueLoading || productsLoading || statsLoading;

  const refetchAll = () => { refetchRevenue(); refetchProducts(); refetchStats(); };

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

  // 計算月營收圖表的最大值
  const maxRevenue = Math.max(...(monthlyRevenue?.map((m) => m.revenue) ?? [1]), 1);

  return (
    <div className="min-h-screen bg-[oklch(0.97_0_0)]">
      {/* Header */}
      <div className="bg-white border-b border-[oklch(0.93_0_0)] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <button
              onClick={() => setLocation("/admin/orders")}
              className="text-xs tracking-widest font-body text-[oklch(0.5_0_0)] hover:text-[oklch(0.1_0_0)] transition-colors mb-1 flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" /> 訂單管理
            </button>
            <h1 className="text-lg text-[oklch(0.1_0_0)]" style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 300 }}>
              營收報表
            </h1>
          </div>
          <button
            onClick={refetchAll}
            disabled={isLoading}
            className="flex items-center gap-2 text-xs font-body text-[oklch(0.5_0_0)] hover:text-[oklch(0.1_0_0)] transition-colors border border-[oklch(0.88_0_0)] px-3 py-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            重新整理
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* 總覽統計卡片 */}
        {statsLoading || authLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white border border-[oklch(0.93_0_0)] p-5 animate-pulse">
                <div className="h-3 bg-[oklch(0.93_0_0)] rounded mb-3 w-2/3" />
                <div className="h-7 bg-[oklch(0.93_0_0)] rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "總訂單數",
                value: stats?.totalOrders ?? 0,
                icon: <ShoppingBag className="w-4 h-4" />,
                color: "text-[oklch(0.4_0_0)]",
                suffix: " 筆",
              },
              {
                label: "本月訂單",
                value: stats?.paid ?? 0,
                icon: <Package className="w-4 h-4" />,
                color: "text-blue-600",
                suffix: " 筆",
              },
              {
                label: "本月營收",
                value: `NT$ ${(stats?.monthRevenue ?? 0).toLocaleString()}`,
                icon: <TrendingUp className="w-4 h-4" />,
                color: "text-[oklch(0.72_0.09_70)]",
                suffix: "",
              },
              {
                label: "累計總營收",
                value: `NT$ ${(stats?.totalRevenue ?? 0).toLocaleString()}`,
                icon: <BarChart3 className="w-4 h-4" />,
                color: "text-emerald-600",
                suffix: "",
              },
            ].map((stat) => (
              <div key={stat.label} className="bg-white border border-[oklch(0.93_0_0)] p-5">
                <div className={`flex items-center gap-2 mb-2 ${stat.color}`}>
                  {stat.icon}
                  <span className="text-xs tracking-widest font-body text-[oklch(0.5_0_0)]">{stat.label}</span>
                </div>
                <div className={`text-2xl font-medium ${stat.color}`} style={{ fontFamily: "'Noto Sans TC', sans-serif" }}>
                  {stat.value}{stat.suffix}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 月營收趨勢 */}
        <div className="bg-white border border-[oklch(0.93_0_0)] p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs tracking-[0.2em] font-body text-[oklch(0.5_0_0)] mb-1">MONTHLY REVENUE</p>
              <h2 className="text-base text-[oklch(0.1_0_0)]" style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 300 }}>
                月營收趨勢
              </h2>
            </div>
            {/* 月份選擇 */}
            <select
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="text-xs font-body border border-[oklch(0.88_0_0)] px-3 py-2 focus:outline-none text-[oklch(0.4_0_0)]"
            >
              <option value={3}>近 3 個月</option>
              <option value={6}>近 6 個月</option>
              <option value={12}>近 12 個月</option>
            </select>
          </div>

          {revenueLoading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-[oklch(0.1_0_0)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !monthlyRevenue || monthlyRevenue.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-[oklch(0.6_0_0)]">
              <BarChart3 className="w-10 h-10 mb-3 text-[oklch(0.85_0_0)]" />
              <p className="text-sm font-body">尚無營收資料</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 長條圖 */}
              <div className="flex items-end gap-2 h-48">
                {monthlyRevenue.map((m, i) => {
                  const heightPct = maxRevenue > 0 ? (m.revenue / maxRevenue) * 100 : 0;
                  const isCurrentMonth = i === monthlyRevenue.length - 1;
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5 group">
                      <div className="relative w-full flex flex-col items-center">
                        {/* 金額 tooltip */}
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[oklch(0.1_0_0)] text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                          NT$ {m.revenue.toLocaleString()}
                        </div>
                        {/* 長條 */}
                        <div
                          className={`w-full transition-all duration-500 ${
                            isCurrentMonth
                              ? "bg-[oklch(0.72_0.09_70)]"
                              : "bg-[oklch(0.88_0_0)] group-hover:bg-[oklch(0.75_0_0)]"
                          }`}
                          style={{ height: `${Math.max(heightPct, 2)}%`, minHeight: "4px" }}
                        />
                      </div>
                      <span className="text-[10px] font-body text-[oklch(0.55_0_0)] whitespace-nowrap">
                        {m.month.slice(5)} 月
                      </span>
                      <span className="text-[10px] font-body text-[oklch(0.7_0_0)]">
                        {m.orderCount} 筆
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* 月份明細表格 */}
              <div className="border-t border-[oklch(0.93_0_0)] pt-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-body">
                    <thead>
                      <tr className="border-b border-[oklch(0.93_0_0)]">
                        <th className="text-left py-2 text-[oklch(0.5_0_0)] tracking-widest font-normal">月份</th>
                        <th className="text-right py-2 text-[oklch(0.5_0_0)] tracking-widest font-normal">訂單數</th>
                        <th className="text-right py-2 text-[oklch(0.5_0_0)] tracking-widest font-normal">營收</th>
                        <th className="text-right py-2 text-[oklch(0.5_0_0)] tracking-widest font-normal">平均客單</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...monthlyRevenue].reverse().map((m) => (
                        <tr key={m.month} className="border-b border-[oklch(0.97_0_0)] hover:bg-[oklch(0.98_0_0)]">
                          <td className="py-2.5 text-[oklch(0.3_0_0)]">{m.month}</td>
                          <td className="py-2.5 text-right text-[oklch(0.4_0_0)]">{m.orderCount} 筆</td>
                          <td className="py-2.5 text-right font-medium text-[oklch(0.1_0_0)]">
                            NT$ {m.revenue.toLocaleString()}
                          </td>
                          <td className="py-2.5 text-right text-[oklch(0.4_0_0)]">
                            NT$ {m.orderCount > 0 ? Math.round(m.revenue / m.orderCount).toLocaleString() : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 熱銷商品排行 */}
        <div className="bg-white border border-[oklch(0.93_0_0)] p-6">
          <div className="mb-6">
            <p className="text-xs tracking-[0.2em] font-body text-[oklch(0.5_0_0)] mb-1">TOP PRODUCTS</p>
            <h2 className="text-base text-[oklch(0.1_0_0)]" style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 300 }}>
              熱銷商品排行
            </h2>
          </div>

          {productsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="w-8 h-8 bg-[oklch(0.93_0_0)] rounded" />
                  <div className="flex-1 h-3 bg-[oklch(0.93_0_0)] rounded" />
                  <div className="w-20 h-3 bg-[oklch(0.93_0_0)] rounded" />
                </div>
              ))}
            </div>
          ) : !topProducts || topProducts.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-[oklch(0.6_0_0)]">
              <Package className="w-10 h-10 mb-3 text-[oklch(0.85_0_0)]" />
              <p className="text-sm font-body">尚無銷售資料</p>
            </div>
          ) : (
            <div className="space-y-1">
              {topProducts.map((product, i) => {
                const maxQty = topProducts[0]?.totalQty ?? 1;
                const barWidth = maxQty > 0 ? (product.totalQty / maxQty) * 100 : 0;
                const medals = ["🥇", "🥈", "🥉"];
                return (
                  <div key={product.productId} className="group">
                    <div className="flex items-center gap-3 py-3 px-2 hover:bg-[oklch(0.98_0_0)] transition-colors">
                      {/* 排名 */}
                      <div className="w-8 text-center shrink-0">
                        {i < 3 ? (
                          <span className="text-base">{medals[i]}</span>
                        ) : (
                          <span className="text-xs font-body text-[oklch(0.6_0_0)]">#{i + 1}</span>
                        )}
                      </div>

                      {/* 商品圖 */}
                      {(product as any).productImage ? (
                        <img
                          src={(product as any).productImage}
                          alt={product.productName}
                          className="w-10 h-10 object-cover shrink-0 border border-[oklch(0.93_0_0)]"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-[oklch(0.95_0_0)] shrink-0 flex items-center justify-center">
                          <Crown className="w-4 h-4 text-[oklch(0.72_0.09_70)]" />
                        </div>
                      )}

                      {/* 商品名稱 + 進度條 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-body text-[oklch(0.1_0_0)] truncate">{product.productName}</p>
                          <span className="text-xs font-body text-[oklch(0.5_0_0)] shrink-0 ml-2">
                            {product.totalQty} 件
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-[oklch(0.93_0_0)] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${barWidth}%`,
                              background: i === 0
                                ? "oklch(0.72 0.09 70)"
                                : i === 1
                                ? "oklch(0.65 0.05 70)"
                                : "oklch(0.80 0.03 70)",
                            }}
                          />
                        </div>
                      </div>

                      {/* 營收 */}
                      <div className="text-right shrink-0 w-28">
                        <p className="text-sm font-medium text-[oklch(0.1_0_0)]" style={{ fontFamily: "'Noto Sans TC', sans-serif" }}>
                          NT$ {product.totalRevenue.toLocaleString()}
                        </p>
                        <p className="text-xs font-body text-[oklch(0.6_0_0)]">
                          {(product as any).orderCount ?? "—"} 筆訂單
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
