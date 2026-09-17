import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

type AuditOutcome = "success" | "rejected" | "failed" | "duplicate";
type AuditSource = "admin" | "ecpay" | "paypal" | "logistics" | "system" | "coupon" | "line";

const OUTCOME_STYLE: Record<AuditOutcome, { label: string; className: string }> = {
  success: { label: "成功", className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  rejected: { label: "拒絕", className: "border-amber-200 bg-amber-50 text-amber-800" },
  failed: { label: "失敗", className: "border-red-200 bg-red-50 text-red-800" },
  duplicate: { label: "重複", className: "border-slate-200 bg-slate-50 text-slate-700" },
};

const SOURCE_LABEL: Record<AuditSource, string> = {
  admin: "管理員操作",
  ecpay: "綠界付款",
  paypal: "PayPal",
  logistics: "物流",
  system: "系統",
  coupon: "優惠券",
  line: "LINE",
};

export default function AdminMonitoring() {
  const { user, loading: authLoading } = useAuth();
  const [hours, setHours] = useState(24);
  const [source, setSource] = useState<AuditSource | "all">("all");
  const [outcome, setOutcome] = useState<AuditOutcome | "all">("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const summaryQuery = trpc.audit.summary.useQuery(
    { hours },
    { enabled: user?.role === "admin", staleTime: 30_000, refetchInterval: 60_000 }
  );
  const eventsQuery = trpc.audit.list.useQuery(
    {
      limit: 100,
      hours,
      ...(source === "all" ? {} : { source }),
      ...(outcome === "all" ? {} : { outcome }),
    },
    { enabled: user?.role === "admin", staleTime: 15_000, refetchInterval: 30_000 }
  );

  if (!authLoading && !user) {
    window.location.href = getLoginUrl();
    return null;
  }
  if (!authLoading && user && user.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <XCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />
          <p className="text-sm font-body text-[oklch(0.5_0_0)]">此頁面僅限管理員存取。</p>
        </div>
      </div>
    );
  }

  const summary = summaryQuery.data;
  const events = eventsQuery.data ?? [];
  const refreshing = summaryQuery.isFetching || eventsQuery.isFetching;
  const refresh = () => {
    void summaryQuery.refetch();
    void eventsQuery.refetch();
  };

  return (
    <div className="min-h-screen bg-[oklch(0.97_0_0)]">
      <div className="sticky top-14 z-30 border-b border-[oklch(0.93_0_0)] bg-white lg:top-0">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-[10px] tracking-[0.2em] text-[oklch(0.58_0_0)]">PAYMENT &amp; AUDIT</p>
            <h1 className="mt-1 text-lg text-[oklch(0.1_0_0)]" style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 300 }}>
              操作監控
            </h1>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className="flex h-10 items-center gap-2 border border-[oklch(0.88_0_0)] px-3 text-xs font-body text-[oklch(0.5_0_0)] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">重新整理</span>
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {(["success", "rejected", "failed", "duplicate"] as const).map((key) => (
            <div key={key} className={`border p-4 sm:p-5 ${OUTCOME_STYLE[key].className}`}>
              <p className="text-xs font-body tracking-widest opacity-75">{OUTCOME_STYLE[key].label}</p>
              <p className="mt-2 text-2xl font-medium">{summaryQuery.isLoading ? "…" : summary?.[key] ?? 0}</p>
              <p className="mt-1 text-[10px] font-body opacity-65">最近 {hours === 24 ? "24 小時" : hours === 168 ? "7 天" : "30 天"}</p>
            </div>
          ))}
        </div>

        <section className="border border-[oklch(0.92_0_0)] bg-white">
          <div className="flex flex-col gap-4 border-b border-[oklch(0.93_0_0)] p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-slate-600" />
                <h2 className="text-sm font-medium text-slate-900">付款回呼與管理員操作紀錄</h2>
              </div>
              <p className="mt-1 text-xs font-body text-slate-500">敏感欄位會在寫入前自動遮蔽</p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:flex">
              <select value={hours} onChange={(event) => setHours(Number(event.target.value))} className="h-10 border border-[oklch(0.86_0_0)] bg-white px-2 text-xs font-body">
                <option value={24}>24 小時</option>
                <option value={168}>7 天</option>
                <option value={720}>30 天</option>
              </select>
              <select value={source} onChange={(event) => setSource(event.target.value as AuditSource | "all")} className="h-10 border border-[oklch(0.86_0_0)] bg-white px-2 text-xs font-body">
                <option value="all">全部來源</option>
                {Object.entries(SOURCE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <select value={outcome} onChange={(event) => setOutcome(event.target.value as AuditOutcome | "all")} className="h-10 border border-[oklch(0.86_0_0)] bg-white px-2 text-xs font-body">
                <option value="all">全部結果</option>
                {Object.entries(OUTCOME_STYLE).map(([value, config]) => <option key={value} value={value}>{config.label}</option>)}
              </select>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            {eventsQuery.isLoading ? (
              <p className="py-10 text-center text-xs font-body text-slate-500">載入監控紀錄中…</p>
            ) : events.length === 0 ? (
              <p className="py-10 text-center text-xs font-body text-slate-500">目前篩選範圍內沒有紀錄。</p>
            ) : (
              <div className="space-y-2">
                {events.map((event) => {
                  const eventOutcome = event.outcome as AuditOutcome;
                  const eventSource = event.source as AuditSource;
                  const expanded = expandedId === event.id;
                  return (
                    <article key={event.id} className={`border ${OUTCOME_STYLE[eventOutcome]?.className ?? OUTCOME_STYLE.duplicate.className}`}>
                      <button type="button" onClick={() => setExpandedId(expanded ? null : event.id)} className="w-full p-3 text-left sm:p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              {(eventOutcome === "failed" || eventOutcome === "rejected") && <AlertTriangle className="h-4 w-4 shrink-0" />}
                              <span className="border border-current/20 bg-white/50 px-2 py-0.5 text-[10px] font-body">{SOURCE_LABEL[eventSource] ?? event.source}</span>
                              <span className="text-sm font-medium">{event.summary}</span>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-body opacity-75">
                              <span>{event.action}</span>
                              {event.actorUserId && <span>管理員 #{event.actorUserId}</span>}
                              {event.orderId && <span>訂單 ID {event.orderId}</span>}
                              {event.merchantTradeNo && <span className="font-mono">{event.merchantTradeNo}</span>}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <time className="hidden text-[11px] opacity-70 sm:block">{new Date(event.createdAt).toLocaleString("zh-TW")}</time>
                            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                        </div>
                        <time className="mt-2 block text-[11px] opacity-70 sm:hidden">{new Date(event.createdAt).toLocaleString("zh-TW")}</time>
                      </button>
                      {expanded && (
                        <div className="border-t border-current/10 bg-white/60 p-3 sm:p-4">
                          <p className="mb-2 text-[10px] font-body tracking-widest opacity-60">已去敏感化詳細資料</p>
                          <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all text-[11px] leading-relaxed text-slate-700">
                            {event.details ? JSON.stringify(event.details, null, 2) : "無額外資料"}
                          </pre>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
