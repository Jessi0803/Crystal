/**
 * AI 客服紀錄頁面
 * 路由：/admin/chatbot
 * 僅限 admin 角色存取
 */
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Bot, CalendarDays, MessageCircle, RefreshCw, Search, Trash2, User, XCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";

const PAGE_SIZE = 20;

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMonthKey(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "未分類";
  return date.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "long",
  });
}

function normalizeJsonArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object" && "name" in item) return String((item as { name?: unknown }).name ?? "");
          return "";
        })
        .filter(Boolean)
    : [];
}

export default function AdminChatbot() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());

  const utils = trpc.useUtils();
  const offset = (page - 1) * PAGE_SIZE;
  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = trpc.chatbot.listLogs.useQuery(
    { limit: PAGE_SIZE, offset, search: search || undefined },
    { enabled: user?.role === "admin" }
  );

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleIds = useMemo(() => items.map((item) => item.id), [items]);
  const selectedCount = selectedIds.size;
  const selectedVisibleCount = visibleIds.filter((id) => selectedIds.has(id)).length;
  const groupedItems = useMemo(() => {
    const groups: Array<{
      key: string;
      label: string;
      items: typeof items;
    }> = [];

    for (const item of items) {
      const key = formatMonthKey(item.createdAt);
      const existing = groups.find((group) => group.key === key);
      if (existing) {
        existing.items.push(item);
      } else {
        groups.push({
          key,
          label: formatMonthLabel(item.createdAt),
          items: [item],
        });
      }
    }

    return groups;
  }, [items]);

  const deleteLogs = trpc.chatbot.deleteLogs.useMutation({
    onSuccess: async (result) => {
      toast.success(`已刪除 ${result.deletedCount} 筆 chatbot 紀錄`);
      setSelectedIds(new Set());
      setExpandedId(null);
      await utils.chatbot.listLogs.invalidate();
    },
    onError: (err) => toast.error(err.message || "刪除紀錄失敗"),
  });

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
    setExpandedId(null);
    setSelectedIds(new Set());
    setPage(1);
    setSearch(searchInput.trim());
  };

  const toggleSelected = (id: number) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectVisible = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      visibleIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const clearSelected = () => setSelectedIds(new Set());

  const deleteSelected = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const confirmed = window.confirm(`確定要刪除選取的 ${ids.length} 筆 chatbot 紀錄嗎？此操作無法復原。`);
    if (!confirmed) return;
    deleteLogs.mutate({ ids });
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
              AI 客服紀錄
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLocation("/admin/revenue")}
              className="hidden sm:flex items-center gap-2 text-xs font-body text-[oklch(0.5_0_0)] hover:text-[oklch(0.1_0_0)] transition-colors border border-[oklch(0.88_0_0)] px-3 py-2"
            >
              營收報表
            </button>
            <button
              onClick={() => setLocation("/admin/inventory")}
              className="hidden sm:flex items-center gap-2 text-xs font-body text-[oklch(0.5_0_0)] hover:text-[oklch(0.1_0_0)] transition-colors border border-[oklch(0.88_0_0)] px-3 py-2"
            >
              庫存管理
            </button>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-2 text-xs font-body text-[oklch(0.5_0_0)] hover:text-[oklch(0.1_0_0)] transition-colors border border-[oklch(0.88_0_0)] px-3 py-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
              重新整理
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-[oklch(0.93_0_0)] p-5">
            <div className="flex items-center gap-2 text-[oklch(0.4_0_0)] mb-2">
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs tracking-widest font-body text-[oklch(0.5_0_0)]">問答紀錄</span>
            </div>
            <div className="text-2xl font-medium text-[oklch(0.1_0_0)]" style={{ fontFamily: "'Noto Sans TC', sans-serif" }}>
              {isLoading || authLoading ? "..." : `${total.toLocaleString()} 筆`}
            </div>
          </div>
          <div className="bg-white border border-[oklch(0.93_0_0)] p-5 sm:col-span-2">
            <form onSubmit={submitSearch} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[oklch(0.6_0_0)]" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="搜尋顧客問題、AI 回答、會員姓名或 Email"
                  className="w-full border border-[oklch(0.88_0_0)] bg-white pl-9 pr-3 py-3 text-sm font-body focus:outline-none focus:border-[oklch(0.35_0_0)]"
                />
              </div>
              <button className="btn-primary px-6 py-3 text-sm" type="submit">搜尋</button>
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSearchInput("");
                    setPage(1);
                    setExpandedId(null);
                    setSelectedIds(new Set());
                  }}
                  className="border border-[oklch(0.88_0_0)] bg-white px-4 py-3 text-sm font-body text-[oklch(0.45_0_0)] hover:text-[oklch(0.1_0_0)]"
                >
                  清除
                </button>
              )}
            </form>
          </div>
        </div>

        <p className="text-[11px] font-body text-[oklch(0.5_0_0)] mb-4">
          目前顯示第 {currentPage} / {totalPages} 頁，共 {total.toLocaleString()} 筆。
        </p>

        {items.length > 0 && (
          <div className="mb-4 flex flex-col gap-3 border border-[oklch(0.9_0_0)] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={selectVisible}
                disabled={selectedVisibleCount === visibleIds.length}
                className="border border-[oklch(0.86_0_0)] px-3 py-2 text-xs font-body text-[oklch(0.45_0_0)] disabled:opacity-40"
              >
                選取本頁
              </button>
              <button
                type="button"
                onClick={clearSelected}
                disabled={selectedCount === 0}
                className="border border-[oklch(0.86_0_0)] px-3 py-2 text-xs font-body text-[oklch(0.45_0_0)] disabled:opacity-40"
              >
                取消選取
              </button>
              <span className="text-xs font-body text-[oklch(0.5_0_0)]">已選取 {selectedCount} 筆</span>
            </div>
            <button
              type="button"
              onClick={deleteSelected}
              disabled={selectedCount === 0 || deleteLogs.isPending}
              className="inline-flex items-center justify-center gap-2 bg-red-600 px-4 py-2 text-xs font-body text-white transition-colors hover:bg-red-700 disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {deleteLogs.isPending ? "刪除中..." : "刪除選取"}
            </button>
          </div>
        )}

        {isLoading || authLoading ? (
          <div className="bg-white border border-[oklch(0.93_0_0)] p-12 text-center">
            <div className="w-8 h-8 border-2 border-[oklch(0.1_0_0)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-body text-[oklch(0.5_0_0)]">載入紀錄中...</p>
          </div>
        ) : error ? (
          <div className="bg-white border border-red-200 p-12 text-center">
            <XCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
            <p className="text-sm font-body text-red-700 mb-2">載入紀錄失敗</p>
            <p className="text-xs font-body text-red-500 break-all">{error.message}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white border border-[oklch(0.93_0_0)] p-16 text-center">
            <Bot className="w-10 h-10 text-[oklch(0.85_0_0)] mx-auto mb-4" />
            <p className="text-sm font-body text-[oklch(0.5_0_0)]">目前沒有 chatbot 問答紀錄</p>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedItems.map((group) => (
              <section key={group.key} className="space-y-3">
                <div className="flex items-center justify-between border-b border-[oklch(0.9_0_0)] pb-2">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-[oklch(0.35_0_0)]" />
                    <h2 className="text-sm font-medium text-[oklch(0.12_0_0)]" style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 300 }}>
                      {group.label}
                    </h2>
                  </div>
                  <span className="text-[11px] tracking-widest font-body text-[oklch(0.5_0_0)]">
                    {group.items.length} 筆
                  </span>
                </div>

                <div className="space-y-3">
                  {group.items.map((item) => {
                    const isExpanded = expandedId === item.id;
                    const isSelected = selectedIds.has(item.id);
                    const products = normalizeJsonArray(item.relatedProducts);
                    const retrievedQuestions = normalizeJsonArray(item.retrievedQuestions);
                    return (
                      <div key={item.id} className="bg-white border border-[oklch(0.93_0_0)]">
                        <div className="flex items-start gap-3 p-5 transition-colors hover:bg-[oklch(0.985_0_0)]">
                          <label className="flex h-5 w-5 shrink-0 items-center justify-center pt-0.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelected(item.id)}
                              aria-label={`選取 chatbot 紀錄 ${item.id}`}
                              className="h-4 w-4 accent-[oklch(0.18_0_0)]"
                            />
                          </label>
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : item.id)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                            <div className="lg:w-40 shrink-0">
                              <p className="text-xs font-body text-[oklch(0.5_0_0)]">{formatDate(item.createdAt)}</p>
                              <div className="flex items-center gap-1.5 mt-2 text-xs font-body text-[oklch(0.45_0_0)]">
                                <User className="w-3.5 h-3.5" />
                                <span className="truncate">
                                  {item.customerName || item.customerEmail || "匿名訪客"}
                                </span>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs tracking-widest font-body text-[oklch(0.55_0_0)] mb-1">顧客問題</p>
                              <p className="text-sm font-body text-[oklch(0.12_0_0)] line-clamp-2 whitespace-pre-wrap">
                                {item.customerQuestion}
                              </p>
                              <p className="text-xs font-body text-[oklch(0.55_0_0)] mt-2">
                                來源頁面：{item.pagePath || "-"} · 推薦商品：{products.length > 0 ? products.join("、") : "無"}
                              </p>
                            </div>
                          </div>
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-[oklch(0.93_0_0)] p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
                            <div>
                              <p className="text-xs tracking-widest font-body text-[oklch(0.55_0_0)] mb-2">完整問題</p>
                              <p className="text-sm font-body text-[oklch(0.18_0_0)] whitespace-pre-wrap leading-relaxed">
                                {item.customerQuestion}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs tracking-widest font-body text-[oklch(0.55_0_0)] mb-2">AI 回答</p>
                              <p className="text-sm font-body text-[oklch(0.18_0_0)] whitespace-pre-wrap leading-relaxed">
                                {item.botReply}
                              </p>
                            </div>
                            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-body text-[oklch(0.45_0_0)]">
                              <div className="bg-[oklch(0.985_0_0)] border border-[oklch(0.93_0_0)] p-4">
                                <p className="tracking-widest text-[oklch(0.55_0_0)] mb-2">推薦商品</p>
                                <p>{products.length > 0 ? products.join("、") : "無"}</p>
                              </div>
                              <div className="bg-[oklch(0.985_0_0)] border border-[oklch(0.93_0_0)] p-4">
                                <p className="tracking-widest text-[oklch(0.55_0_0)] mb-2">命中的知識庫問題</p>
                                <p>{retrievedQuestions.length > 0 ? retrievedQuestions.join("、") : "無"}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        {!isLoading && total > 0 && (
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => {
                setExpandedId(null);
                setSelectedIds(new Set());
                setPage((p) => Math.max(1, p - 1));
              }}
              disabled={currentPage <= 1}
              className="border border-[oklch(0.88_0_0)] bg-white px-4 py-2 text-sm font-body disabled:opacity-40"
            >
              上一頁
            </button>
            <span className="text-sm font-body text-[oklch(0.5_0_0)]">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => {
                setExpandedId(null);
                setSelectedIds(new Set());
                setPage((p) => Math.min(totalPages, p + 1));
              }}
              disabled={currentPage >= totalPages}
              className="border border-[oklch(0.88_0_0)] bg-white px-4 py-2 text-sm font-body disabled:opacity-40"
            >
              下一頁
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
