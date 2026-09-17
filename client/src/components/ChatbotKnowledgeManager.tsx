import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { AlertTriangle, Pencil, Plus, RefreshCw, Search, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  FAQ_ANSWER_MAX,
  FAQ_CATEGORIES,
  FAQ_QUESTION_MAX,
  KNOWLEDGE_ANSWER_READ_LIMIT,
  parseKeywords,
  type FaqCategory,
} from "@shared/chatbotKnowledge";

type SourceFilter = "faq" | "product";
type StatusFilter = "all" | "active" | "inactive";

type FaqDraft = {
  id?: string;
  question: string;
  answer: string;
  keywords: string;
  category: FaqCategory;
  active: boolean;
};

const EMPTY_DRAFT: FaqDraft = { question: "", answer: "", keywords: "", category: "常見問題", active: true };

const inputClass =
  "w-full border border-[oklch(0.86_0_0)] bg-white px-3 py-2.5 text-sm font-body outline-none focus:border-[oklch(0.2_0_0)]";
const labelClass = "block text-[11px] tracking-widest text-[oklch(0.5_0_0)] font-body mb-1";
const dialogShellClass =
  "flex flex-col gap-0 overflow-hidden rounded-none p-0 w-[calc(100%-1.5rem)] max-w-none max-h-[calc(100dvh-1.5rem)] sm:max-w-2xl";

/** tRPC 的 zod 驗證錯誤訊息是 JSON 字串，取出第一則 */
function readableError(message: string | undefined, fallback: string) {
  if (!message) return fallback;
  try {
    return (JSON.parse(message) as { message?: string }[])[0]?.message ?? fallback;
  } catch {
    return message;
  }
}

function FaqEditorDialog({ draft, onClose }: { draft: FaqDraft | null; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState<FaqDraft>(EMPTY_DRAFT);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!draft) return;
    setForm(draft);
    setError(null);
  }, [draft]);

  const save = trpc.chatbot.knowledgeSave.useMutation({
    onSuccess: async (result) => {
      if (result.vectorReady) toast.success(form.id ? "問答已更新" : "問答已新增");
      else toast.warning("已儲存，但暫時無法產生向量；這則問答目前只能靠關鍵字被找到，請稍後按「重新產生向量」");
      await utils.chatbot.knowledgeList.invalidate();
      onClose();
    },
    onError: (err) => setError(readableError(err.message, "儲存失敗")),
  });

  const set = <K extends keyof FaqDraft>(key: K, value: FaqDraft[K]) => setForm((current) => ({ ...current, [key]: value }));
  const keywordList = parseKeywords(form.keywords);
  const answerLength = form.answer.trim().length;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.question.trim()) return setError("請輸入問題");
    if (!form.answer.trim()) return setError("請輸入回答");
    setError(null);
    save.mutate({
      id: form.id,
      question: form.question.trim(),
      answer: form.answer.trim(),
      keywords: keywordList,
      category: form.category,
      active: form.active,
    });
  };

  return (
    <Dialog open={draft != null} onOpenChange={(open) => !open && !save.isPending && onClose()}>
      <DialogContent className={dialogShellClass}>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 border-b border-[oklch(0.93_0_0)] px-5 py-4 pr-12 sm:px-6">
            <DialogTitle className="text-lg font-normal" style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 300 }}>
              {form.id ? "編輯問答" : "新增問答"}
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs font-body text-[oklch(0.52_0_0)]">
              AI 會用「問題＋關鍵字」判斷顧客在問什麼，再參考「回答」的內容回覆顧客。
            </DialogDescription>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
            <div className="flex items-start justify-between gap-4 border border-[oklch(0.9_0_0)] bg-[oklch(0.985_0_0)] px-4 py-3">
              <div>
                <p className="text-sm font-medium text-[oklch(0.15_0_0)]">狀態：{form.active ? "啟用中" : "已停用"}</p>
                <p className="mt-0.5 text-xs font-body text-[oklch(0.52_0_0)]">停用後 AI 不會參考這則問答。</p>
              </div>
              <Switch aria-label="啟用這則問答" checked={form.active} onCheckedChange={(value) => set("active", value)} />
            </div>

            <label className="block">
              <span className={labelClass}>分類</span>
              <select value={form.category} onChange={(e) => set("category", e.target.value as FaqCategory)} className={inputClass}>
                {FAQ_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className={labelClass}>問題（顧客可能怎麼問）</span>
              <input
                value={form.question}
                maxLength={FAQ_QUESTION_MAX}
                onChange={(e) => set("question", e.target.value)}
                placeholder="例如：手鍊有保固嗎？"
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className={labelClass}>回答</span>
              <textarea
                value={form.answer}
                maxLength={FAQ_ANSWER_MAX}
                onChange={(e) => set("answer", e.target.value)}
                rows={6}
                className={`${inputClass} leading-relaxed`}
              />
              <span
                className={`mt-1 block text-right text-[11px] font-body ${
                  answerLength > KNOWLEDGE_ANSWER_READ_LIMIT ? "text-amber-700" : "text-[oklch(0.58_0_0)]"
                }`}
              >
                {answerLength > KNOWLEDGE_ANSWER_READ_LIMIT
                  ? `${answerLength} 字：AI 只會讀取前 ${KNOWLEDGE_ANSWER_READ_LIMIT} 字，重要資訊請放在前面`
                  : `${answerLength} / ${KNOWLEDGE_ANSWER_READ_LIMIT} 字（AI 讀取上限）`}
              </span>
            </label>

            <label className="block">
              <span className={labelClass}>關鍵字（以空白或逗號分隔）</span>
              <textarea
                value={form.keywords}
                onChange={(e) => set("keywords", e.target.value)}
                rows={2}
                placeholder="保固, 維修, 換線, 壞掉"
                className={inputClass}
              />
              {keywordList.length > 0 && (
                <span className="mt-2 flex flex-wrap gap-1.5">
                  {keywordList.map((keyword) => (
                    <span key={keyword} className="border border-[oklch(0.88_0_0)] bg-white px-2 py-0.5 text-[11px] font-body text-[oklch(0.35_0_0)]">
                      {keyword}
                    </span>
                  ))}
                </span>
              )}
              <span className="mt-1 block text-[11px] font-body text-[oklch(0.58_0_0)]">
                顧客的問題含有關鍵字時，這則問答會優先被找到；可放同義詞、常見錯字或口語說法。
              </span>
            </label>

            {error && <p className="text-xs font-body text-red-600">{error}</p>}
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-[oklch(0.93_0_0)] px-5 py-3 sm:px-6">
            <button type="button" onClick={onClose} disabled={save.isPending} className="px-4 py-2 text-xs font-body text-[oklch(0.4_0_0)]">
              取消
            </button>
            <button
              type="submit"
              disabled={save.isPending}
              className="px-5 py-2 text-xs font-body bg-[oklch(0.15_0_0)] text-white hover:bg-[oklch(0.25_0_0)] disabled:opacity-50"
            >
              {save.isPending ? "儲存中…" : "儲存"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TestSearchPanel() {
  const [question, setQuestion] = useState("");
  const test = trpc.chatbot.knowledgeTestSearch.useMutation({
    onError: (err) => toast.error(err.message || "測試失敗"),
  });

  return (
    <section className="bg-white border border-[oklch(0.93_0_0)] p-4 sm:p-5">
      <p className="flex items-center gap-2 text-sm font-medium text-[oklch(0.12_0_0)]">
        <Sparkles className="w-4 h-4" />
        測試提問
      </p>
      <p className="mt-1 text-xs font-body text-[oklch(0.52_0_0)]">
        輸入顧客可能的問法，查看 AI 會參考哪些知識（分數 0.45 以上才會使用），不會產生回答，也不會留下對話紀錄。
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (question.trim()) test.mutate({ question: question.trim() });
        }}
        className="mt-3 flex flex-col gap-2 sm:flex-row"
      >
        <input
          value={question}
          maxLength={500}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="例如：手鍊斷掉可以修嗎？"
          className={inputClass}
        />
        <button
          type="submit"
          disabled={test.isPending || !question.trim()}
          className="shrink-0 px-5 py-2.5 text-xs font-body bg-[oklch(0.15_0_0)] text-white disabled:opacity-50"
        >
          {test.isPending ? "查詢中…" : "測試"}
        </button>
      </form>

      {test.data && (
        <div className="mt-4 space-y-2">
          {test.data.results.length === 0 ? (
            <p className="text-xs font-body text-amber-700">沒有找到相關知識，AI 會改用客製化服務與 LINE 客服的備援說明回覆。</p>
          ) : (
            <ol className="divide-y divide-[oklch(0.93_0_0)] border border-[oklch(0.93_0_0)]">
              {test.data.results.map((result, index) => (
                <li key={result.id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs font-body">
                  <span className="min-w-0">
                    <span className="text-[oklch(0.55_0_0)]">{index + 1}.</span>{" "}
                    <span className="text-[oklch(0.2_0_0)]">{result.question}</span>
                    <span className="ml-2 text-[oklch(0.55_0_0)]">{result.category}</span>
                  </span>
                  <span className={`shrink-0 tabular-nums ${result.score >= 0.5 ? "text-emerald-700" : "text-[oklch(0.5_0_0)]"}`}>
                    {result.score.toFixed(2)}
                  </span>
                </li>
              ))}
            </ol>
          )}
          {test.data.results.length > 0 && test.data.usesFallback && (
            <p className="text-xs font-body text-amber-700">分數都低於 0.5，AI 會另外附上客製化服務與 LINE 客服的備援說明。</p>
          )}
          {test.data.products.length > 0 && (
            <p className="text-xs font-body text-[oklch(0.45_0_0)]">
              可能顯示的商品卡：{test.data.products.map((product) => product.name).join("、")}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

export default function ChatbotKnowledgeManager() {
  const utils = trpc.useUtils();
  const { data: entries = [], isLoading, error } = trpc.chatbot.knowledgeList.useQuery();
  const [source, setSource] = useState<SourceFilter>("faq");
  const [category, setCategory] = useState<string>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [keyword, setKeyword] = useState("");
  const [draft, setDraft] = useState<FaqDraft | null>(null);

  const invalidate = () => utils.chatbot.knowledgeList.invalidate();
  const setActive = trpc.chatbot.knowledgeSetActive.useMutation({
    onSuccess: async (_result, variables) => {
      toast.success(variables.active ? "已啟用" : "已停用");
      await invalidate();
    },
    onError: (err) => toast.error(err.message || "更新失敗"),
  });
  const remove = trpc.chatbot.knowledgeDelete.useMutation({
    onSuccess: async () => {
      toast.success("已刪除");
      await invalidate();
    },
    onError: (err) => toast.error(err.message || "刪除失敗"),
  });
  const refreshVector = trpc.chatbot.knowledgeRefreshVector.useMutation({
    onSuccess: async (result) => {
      if (result.vectorReady) toast.success("向量已產生");
      else toast.error("仍無法產生向量，請稍後再試");
      await invalidate();
    },
    onError: (err) => toast.error(err.message || "重新產生失敗"),
  });

  const counts = useMemo(
    () => ({
      faq: entries.filter((entry) => entry.sourceType === "faq").length,
      product: entries.filter((entry) => entry.sourceType === "product").length,
      missingVector: entries.filter((entry) => entry.active && !entry.hasVector).length,
    }),
    [entries]
  );

  const visible = useMemo(() => {
    const term = keyword.trim().toLowerCase();
    return entries.filter((entry) => {
      if (entry.sourceType !== source) return false;
      if (category !== "all" && entry.category !== category) return false;
      if (status === "active" && !entry.active) return false;
      if (status === "inactive" && entry.active) return false;
      if (!term) return true;
      return [entry.question, entry.answer, ...entry.keywords].some((text) => text.toLowerCase().includes(term));
    });
  }, [entries, source, category, status, keyword]);

  return (
    <div className="space-y-5">
      <TestSearchPanel />

      <section className="bg-white border border-[oklch(0.93_0_0)]">
        <div className="flex flex-col gap-3 border-b border-[oklch(0.93_0_0)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex gap-1.5">
            {(
              [
                ["faq", `問答 ${counts.faq}`],
                ["product", `商品知識 ${counts.product}`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSource(key);
                  setCategory("all");
                }}
                className={`border px-3 py-1.5 text-xs font-body ${
                  source === key
                    ? "border-[oklch(0.15_0_0)] bg-[oklch(0.15_0_0)] text-white"
                    : "border-[oklch(0.86_0_0)] text-[oklch(0.45_0_0)] hover:bg-[oklch(0.96_0_0)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {source === "faq" && (
            <button
              type="button"
              onClick={() => setDraft({ ...EMPTY_DRAFT })}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-body bg-[oklch(0.15_0_0)] text-white hover:bg-[oklch(0.25_0_0)] disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" />
              新增問答
            </button>
          )}
        </div>

        {counts.missingVector > 0 && (
          <p className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs font-body text-amber-800 sm:px-5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            有 {counts.missingVector} 則啟用中的知識沒有向量，只能靠關鍵字被找到，建議按「重新產生向量」。
          </p>
        )}

        <div className="grid grid-cols-1 gap-2 border-b border-[oklch(0.93_0_0)] p-4 sm:grid-cols-[1fr_auto_auto] sm:px-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[oklch(0.6_0_0)]" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜尋問題、回答或關鍵字"
              className={`${inputClass} pl-9`}
            />
          </div>
          {source === "faq" && (
            <select aria-label="分類" value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
              <option value="all">全部分類</option>
              {FAQ_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          )}
          <select aria-label="狀態" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className={inputClass}>
            <option value="all">全部狀態</option>
            <option value="active">啟用中</option>
            <option value="inactive">已停用</option>
          </select>
        </div>

        {source === "product" && (
          <p className="border-b border-[oklch(0.93_0_0)] px-4 py-2 text-xs font-body text-[oklch(0.52_0_0)] sm:px-5">
            商品知識由商品資料自動產生，並跟著商品上下架啟用或停用；要修改內容請到
            <Link href="/admin/products" className="mx-1 underline">
              商品與庫存
            </Link>
            。
          </p>
        )}

        {isLoading ? (
          <p className="p-10 text-center text-sm font-body text-[oklch(0.5_0_0)]">載入知識庫中...</p>
        ) : error ? (
          <p className="p-10 text-center text-sm font-body text-red-600">載入知識庫失敗，請稍後再試</p>
        ) : visible.length === 0 ? (
          <p className="p-10 text-center text-sm font-body text-[oklch(0.5_0_0)]">
            {source === "faq" && counts.faq === 0 ? "還沒有任何問答，按「新增問答」開始建立。" : "沒有符合條件的知識"}
          </p>
        ) : (
          <ul className="divide-y divide-[oklch(0.93_0_0)]">
            {visible.map((entry) => (
              <li key={entry.id} className={`p-4 sm:px-5 ${entry.active ? "" : "bg-[oklch(0.985_0_0)]"}`}>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="border border-[oklch(0.88_0_0)] px-1.5 py-0.5 text-[10px] font-body text-[oklch(0.45_0_0)]">
                        {entry.category}
                      </span>
                      {!entry.active && (
                        <span className="border border-[oklch(0.86_0_0)] bg-[oklch(0.96_0_0)] px-1.5 py-0.5 text-[10px] font-body text-[oklch(0.45_0_0)]">
                          已停用
                        </span>
                      )}
                      {!entry.hasVector && (
                        <span className="border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-body text-amber-800">
                          缺少向量
                        </span>
                      )}
                    </div>
                    <p className={`mt-1.5 text-sm ${entry.active ? "text-[oklch(0.15_0_0)]" : "text-[oklch(0.5_0_0)]"}`}>
                      {entry.question}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs font-body leading-relaxed text-[oklch(0.5_0_0)]">{entry.answer}</p>
                    {entry.keywords.length > 0 && (
                      <p className="mt-1 truncate text-[11px] font-body text-[oklch(0.6_0_0)]">關鍵字：{entry.keywords.join("、")}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    {!entry.hasVector && (
                      <button
                        type="button"
                        onClick={() => refreshVector.mutate({ id: entry.id })}
                        disabled={refreshVector.isPending}
                        className="inline-flex items-center gap-1 border border-[oklch(0.86_0_0)] px-2.5 py-1.5 text-xs font-body hover:bg-[oklch(0.96_0_0)] disabled:opacity-50"
                      >
                        <RefreshCw className="w-3 h-3" />
                        重新產生向量
                      </button>
                    )}
                    {entry.sourceType === "faq" && (
                      <>
                        <label className="inline-flex items-center gap-1.5 px-1 text-xs font-body text-[oklch(0.4_0_0)]">
                          <Switch
                            aria-label={`啟用：${entry.question}`}
                            checked={entry.active}
                            disabled={setActive.isPending}
                            onCheckedChange={(value) => setActive.mutate({ id: entry.id, active: value })}
                          />
                          {entry.active ? "啟用" : "停用"}
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setDraft({
                              id: entry.id,
                              question: entry.question,
                              answer: entry.answer,
                              keywords: entry.keywords.join(", "),
                              category: (FAQ_CATEGORIES as readonly string[]).includes(entry.category)
                                ? (entry.category as FaqCategory)
                                : "常見問題",
                              active: entry.active,
                            })
                          }
                          className="inline-flex items-center gap-1 border border-[oklch(0.86_0_0)] px-2.5 py-1.5 text-xs font-body hover:bg-[oklch(0.96_0_0)]"
                        >
                          <Pencil className="w-3 h-3" />
                          編輯
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`確定刪除「${entry.question}」？刪除後無法復原，若只是暫時不用可以改為停用。`)) {
                              remove.mutate({ id: entry.id });
                            }
                          }}
                          disabled={remove.isPending}
                          className="inline-flex items-center gap-1 border border-red-200 px-2.5 py-1.5 text-xs font-body text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 className="w-3 h-3" />
                          刪除
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <FaqEditorDialog draft={draft} onClose={() => setDraft(null)} />
    </div>
  );
}
