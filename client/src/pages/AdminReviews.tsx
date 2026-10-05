/**
 * 商品顧客回饋管理
 * 路由：/admin/reviews
 * 僅限 admin 角色存取（API 另以 adminProcedure 驗證）
 *
 * 綁定的商品被刪除後，回饋仍保留為歷史資料：可以查看、編輯、隱藏、刪除，
 * 但不能上架、不能設為首頁精選，必須先改綁到現有商品。
 */
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  MessageSquareQuote,
  Pencil,
  Plus,
  Star,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import ReviewImageUploader from "@/components/ReviewImageUploader";

const MAX_IMAGES = 3;
const CONTENT_MAX = 2000;
const NAME_MAX = 50;

type ReviewStatus = "pending" | "published" | "hidden";

type AdminReviewRow = {
  id: number;
  productId: string;
  productName: string;
  source: "admin" | "customer";
  displayName: string;
  rating: number;
  content: string;
  images: string[];
  status: ReviewStatus;
  isFeatured: boolean;
  sortOrder: number;
  productExists: boolean;
  createdAt: Date;
};

type ReviewForm = {
  productId: string;
  displayName: string;
  rating: number;
  content: string;
  images: string[];
  status: ReviewStatus;
  isFeatured: boolean;
  sortOrder: string;
};

const EMPTY_FORM: ReviewForm = {
  productId: "",
  displayName: "",
  rating: 5,
  content: "",
  images: [],
  status: "published",
  isFeatured: false,
  sortOrder: "0",
};

const inputClass =
  "w-full border border-[oklch(0.86_0_0)] px-3 py-2.5 text-sm font-body outline-none focus:border-[oklch(0.2_0_0)] disabled:bg-[oklch(0.96_0_0)]";
const labelClass =
  "block text-[11px] tracking-widest text-[oklch(0.5_0_0)] font-body mb-1";
const dialogShellClass =
  "flex flex-col gap-0 overflow-hidden rounded-none p-0 w-[calc(100%-1.5rem)] max-w-none max-h-[calc(100dvh-1.5rem)]";
const actionButtonClass =
  "inline-flex items-center justify-center gap-1 whitespace-nowrap border border-[oklch(0.86_0_0)] px-3 py-2 text-xs font-body hover:bg-[oklch(0.96_0_0)] disabled:opacity-50";

/** tRPC 的 zod 驗證錯誤訊息是 JSON 字串，取出第一則給管理員看 */
function readableError(message: string | undefined, fallback: string) {
  if (!message) return fallback;
  try {
    const issues = JSON.parse(message) as { message?: string }[];
    return issues[0]?.message ?? fallback;
  } catch {
    return message;
  }
}

function formatDate(value: Date) {
  return value.toLocaleDateString("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function StarInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(index => (
        <button
          key={index}
          type="button"
          aria-label={`給 ${index} 星`}
          aria-pressed={value === index}
          onClick={() => onChange(index)}
          className="p-0.5"
        >
          <Star
            className={`h-6 w-6 ${index <= value ? "fill-[oklch(0.55_0.12_30)] text-[oklch(0.55_0.12_30)]" : "fill-transparent text-[oklch(0.78_0_0)]"}`}
            strokeWidth={1.25}
          />
        </button>
      ))}
      <span className="ml-2 text-xs font-body text-[oklch(0.5_0_0)]">
        {value} 星
      </span>
    </div>
  );
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <span
      className="whitespace-nowrap text-xs text-[oklch(0.45_0_0)]"
      aria-label={`${rating} 星`}
    >
      {"★".repeat(rating)}
      <span className="text-[oklch(0.8_0_0)]">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

const STATUS_FILTERS = [
  { id: "all", label: "全部" },
  { id: "pending", label: "待審核" },
  { id: "published", label: "已上架" },
  { id: "hidden", label: "已隱藏" },
] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number]["id"];

/** 顧客投稿是系統驗證過購買紀錄的，後台建立的沒有 */
function SourceBadge({ source }: { source: "admin" | "customer" }) {
  if (source === "customer") {
    return (
      <span className="shrink-0 whitespace-nowrap border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-body text-sky-800">
        顧客投稿 · 已購買
      </span>
    );
  }
  return (
    <span className="shrink-0 whitespace-nowrap border border-[oklch(0.88_0_0)] bg-white px-2 py-1 text-[11px] font-body text-[oklch(0.45_0_0)]">
      後台建立
    </span>
  );
}

function StatusBadge({ status }: { status: ReviewStatus }) {
  const style =
    status === "published"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : status === "pending"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-[oklch(0.86_0_0)] bg-[oklch(0.96_0_0)] text-[oklch(0.45_0_0)]";
  const label =
    status === "published"
      ? "已上架"
      : status === "pending"
        ? "待審核"
        : "已隱藏";
  return (
    <span
      className={`shrink-0 whitespace-nowrap border px-2 py-1 text-[11px] font-body ${style}`}
    >
      {label}
    </span>
  );
}

/** 可搜尋的商品選擇；管理員不需要知道 productId */
function ProductPicker({
  value,
  fallbackName,
  productExists,
  onChange,
}: {
  value: string;
  fallbackName: string;
  productExists: boolean;
  onChange: (productId: string) => void;
}) {
  const { data: products = [] } = trpc.product.adminList.useQuery();
  const [keyword, setKeyword] = useState("");

  const matched = useMemo(() => {
    const text = keyword.trim().toLowerCase();
    if (!text) return products;
    return products.filter(product =>
      product.name.toLowerCase().includes(text)
    );
  }, [products, keyword]);

  const selected = products.find(product => product.id === value);

  return (
    <div>
      <span className={labelClass}>對應商品 *</span>
      {value && !selected && (
        <p className="mb-2 border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-body text-amber-900">
          目前綁定的「{fallbackName}」{productExists ? "尚未載入" : "已被刪除"}
          。
          {!productExists && "回饋會保留，但要重新上架必須先改綁下方現有商品。"}
        </p>
      )}
      <input
        value={keyword}
        onChange={e => setKeyword(e.target.value)}
        placeholder="搜尋商品名稱"
        className={`${inputClass} mb-2`}
      />
      <div className="max-h-44 overflow-y-auto border border-[oklch(0.9_0_0)]">
        {matched.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs font-body text-[oklch(0.55_0_0)]">
            找不到符合的商品
          </p>
        ) : (
          <ul className="divide-y divide-[oklch(0.95_0_0)]">
            {matched.map(product => (
              <li key={product.id}>
                <button
                  type="button"
                  onClick={() => onChange(product.id)}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-body hover:bg-[oklch(0.97_0_0)] ${
                    product.id === value
                      ? "bg-[oklch(0.94_0_0)] text-[oklch(0.15_0_0)]"
                      : "text-[oklch(0.35_0_0)]"
                  }`}
                >
                  <span className="truncate">{product.name}</span>
                  {!product.active && (
                    <span className="shrink-0 text-[11px] text-[oklch(0.6_0_0)]">
                      未上架
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="mt-1 text-xs font-body text-[oklch(0.55_0_0)]">
        {selected ? `已選擇：${selected.name}` : "尚未選擇商品"}
      </p>
    </div>
  );
}

function ReviewFormDialog({
  open,
  review,
  onClose,
}: {
  open: boolean;
  review: AdminReviewRow | null;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState<ReviewForm>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      review
        ? {
            productId: review.productId,
            displayName: review.displayName,
            rating: review.rating,
            content: review.content,
            images: review.images,
            status: review.status,
            isFeatured: review.isFeatured,
            sortOrder: String(review.sortOrder),
          }
        : EMPTY_FORM
    );
    setError(null);
  }, [open, review]);

  const onSaved = async () => {
    toast.success(review ? "回饋已更新" : "回饋已建立");
    await utils.reviews.adminList.invalidate();
    await utils.reviews.listByProduct.invalidate();
    onClose();
  };
  const onFailed = (err: { message?: string }) =>
    setError(readableError(err.message, "儲存回饋失敗"));
  const createReview = trpc.reviews.adminCreate.useMutation({
    onSuccess: onSaved,
    onError: onFailed,
  });
  const updateReview = trpc.reviews.adminUpdate.useMutation({
    onSuccess: onSaved,
    onError: onFailed,
  });
  const uploadImage = trpc.reviews.uploadImage.useMutation();
  const saving = createReview.isPending || updateReview.isPending;

  const set = <K extends keyof ReviewForm>(key: K, value: ReviewForm[K]) =>
    setForm(current => ({ ...current, [key]: value }));

  // 綁定的商品已刪除且沒有改綁，就不給上架與精選
  const productMissing = Boolean(
    review && !review.productExists && form.productId === review.productId
  );
  // 首頁精選只能掛在「已上架而且商品還在」的回饋上（伺服器端也會擋）
  const featureDisabled = productMissing || form.status !== "published";

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const sortOrder = Number(form.sortOrder.trim());
    if (!form.productId) return setError("請選擇對應商品");
    if (!form.displayName.trim()) return setError("請輸入顯示名稱");
    if (!form.content.trim()) return setError("請輸入回饋內容");
    if (!Number.isInteger(sortOrder)) return setError("排序需為整數");
    if (productMissing && form.status === "published") {
      return setError("這則回饋綁定的商品已刪除，請先改綁現有商品才能上架");
    }

    // 伺服器會重新驗證所有欄位
    const data = {
      productId: form.productId,
      displayName: form.displayName.trim(),
      rating: form.rating,
      content: form.content.trim(),
      images: form.images,
      status: form.status,
      isFeatured: featureDisabled ? false : form.isFeatured,
      sortOrder,
    };
    setError(null);
    if (review) updateReview.mutate({ id: review.id, ...data });
    else createReview.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={next => !next && !saving && onClose()}>
      <DialogContent className={`${dialogShellClass} sm:max-w-xl`}>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 border-b border-[oklch(0.93_0_0)] px-5 py-4 pr-12 sm:px-6 sm:py-5">
            <DialogTitle
              className="text-lg font-normal"
              style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 300 }}
            >
              {review ? "編輯商品回饋" : "新增商品回饋"}
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs font-body text-[oklch(0.52_0_0)]">
              回饋內容是針對「商品本身」，不是整體購物體驗。上架後會直接顯示在該商品的商品頁。
            </DialogDescription>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
            {review?.source === "customer" && (
              <p className="border border-sky-200 bg-sky-50 px-4 py-3 text-xs font-body leading-relaxed text-sky-900">
                這是顧客投稿，系統已驗證過購買紀錄。顯示名稱、評分、內容、圖片、排序都可以修改，
                但來源、會員與訂單品項的關聯由系統維護，不開放修改。
              </p>
            )}

            <ProductPicker
              value={form.productId}
              fallbackName={review?.productName ?? ""}
              productExists={review?.productExists ?? true}
              onChange={productId => set("productId", productId)}
            />

            <label className="block">
              <span className={labelClass}>顯示名稱 *</span>
              <input
                value={form.displayName}
                maxLength={NAME_MAX}
                onChange={e => set("displayName", e.target.value)}
                placeholder="例如：Ducky"
                className={inputClass}
              />
            </label>

            <div>
              <span className={labelClass}>商品評分 *</span>
              <StarInput
                value={form.rating}
                onChange={rating => set("rating", rating)}
              />
            </div>

            <label className="block">
              <span className={labelClass}>
                回饋內容 *（{form.content.length} / {CONTENT_MAX}）
              </span>
              <textarea
                value={form.content}
                maxLength={CONTENT_MAX}
                rows={5}
                onChange={e => set("content", e.target.value)}
                placeholder="例如：實體比照片還漂亮，月光石的光很明顯，配戴起來也很舒服。"
                className={`${inputClass} resize-y`}
              />
            </label>

            <div>
              <span className={labelClass}>
                回饋圖片（最多 {MAX_IMAGES} 張）
              </span>
              <ReviewImageUploader
                images={form.images}
                onChange={(images) => set("images", images)}
                uploadBase64={async (dataBase64) => {
                  const { url } = await uploadImage.mutateAsync({ contentType: "image/jpeg", dataBase64 });
                  return url;
                }}
                max={MAX_IMAGES}
                onUploadingChange={setUploading}
                buttonClassName={actionButtonClass}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={labelClass}>狀態</span>
                <select
                  value={form.status}
                  onChange={e => set("status", e.target.value as ReviewStatus)}
                  className={inputClass}
                >
                  <option value="published" disabled={productMissing}>
                    上架（商品頁顯示）
                  </option>
                  <option value="hidden">隱藏</option>
                  {/* 待審核保留給第二階段的顧客投稿，後台仍可手動改回 */}
                  <option value="pending">待審核</option>
                </select>
              </label>
              <label className="block">
                <span className={labelClass}>排序（數字小的在前）</span>
                <input
                  inputMode="numeric"
                  value={form.sortOrder}
                  onChange={e => set("sortOrder", e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>

            <label className="flex items-start gap-3 border border-[oklch(0.9_0_0)] bg-[oklch(0.985_0_0)] px-4 py-3">
              <input
                type="checkbox"
                checked={form.isFeatured && !featureDisabled}
                disabled={featureDisabled}
                onChange={e => set("isFeatured", e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0"
              />
              <span className="min-w-0">
                <span className="block text-sm text-[oklch(0.15_0_0)]">
                  設為首頁精選
                </span>
                <span className="mt-0.5 block text-xs font-body leading-relaxed text-[oklch(0.52_0_0)]">
                  目前只儲存設定，首頁精選區塊尚未建立。
                  {form.status !== "published" && "　只有已上架的回饋可以設為精選。"}
                </span>
              </span>
            </label>

            {productMissing && (
              <p className="border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-body leading-relaxed text-amber-900">
                這則回饋綁定的商品已被刪除。內容、評分、圖片都還能修改，也可以隱藏或刪除，
                但要重新上架或設為首頁精選，必須先在上方改綁到現有商品。
              </p>
            )}

            {error && <p className="text-sm font-body text-red-600">{error}</p>}
          </div>

          <div className="shrink-0 border-t border-[oklch(0.93_0_0)] px-5 py-4 sm:px-6">
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className={actionButtonClass}
              >
                取消
              </button>
              <button
                type="submit"
                disabled={saving || uploading}
                className="inline-flex items-center gap-2 bg-[oklch(0.15_0_0)] px-4 py-2 text-xs font-body text-white hover:bg-[oklch(0.25_0_0)] disabled:opacity-50"
              >
                {saving ? "儲存中…" : "儲存"}
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminReviews() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();
  const [productFilter, setProductFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminReviewRow | null>(null);

  const {
    data: reviews = [],
    isLoading,
    error,
  } = trpc.reviews.adminList.useQuery(
    productFilter ? { productId: productFilter } : {},
    { enabled: isAdmin }
  );
  // 狀態篩選只影響畫面，不用再打一次 API
  const visibleReviews = useMemo(
    () => (statusFilter === "all" ? reviews : reviews.filter((review) => review.status === statusFilter)),
    [reviews, statusFilter]
  );
  const pendingCount = useMemo(() => reviews.filter((review) => review.status === "pending").length, [reviews]);
  const { data: products = [] } = trpc.product.adminList.useQuery(undefined, {
    enabled: isAdmin,
  });

  const refresh = async () => {
    await utils.reviews.adminList.invalidate();
    await utils.reviews.listByProduct.invalidate();
  };
  const setStatus = trpc.reviews.adminSetStatus.useMutation({
    onSuccess: refresh,
    onError: err => toast.error(readableError(err.message, "更新狀態失敗")),
  });
  const removeReview = trpc.reviews.adminRemove.useMutation({
    onSuccess: async () => {
      toast.success("回饋已刪除");
      await refresh();
    },
    onError: err => toast.error(readableError(err.message, "刪除失敗")),
  });

  if (!authLoading && !user) {
    window.location.href = getLoginUrl();
    return null;
  }

  if (!authLoading && user && !isAdmin) {
    return (
      <div className="min-h-screen bg-[oklch(0.97_0_0)] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1
            className="text-xl mb-2 text-[oklch(0.1_0_0)]"
            style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 300 }}
          >
            無存取權限
          </h1>
          <p className="text-sm font-body text-[oklch(0.5_0_0)] mb-6">
            此頁面僅限管理員存取。
          </p>
          <button className="btn-primary" onClick={() => setLocation("/")}>
            返回首頁
          </button>
        </div>
      </div>
    );
  }

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (review: AdminReviewRow) => {
    setEditing(review);
    setFormOpen(true);
  };
  const confirmRemove = (review: AdminReviewRow) => {
    if (
      !window.confirm(
        `確定要刪除「${review.displayName}」對「${review.productName}」的這則回饋嗎？刪除後無法復原。`
      )
    )
      return;
    removeReview.mutate({ id: review.id });
  };
  const togglePublished = (review: AdminReviewRow, next: boolean) => {
    if (next && !review.productExists) {
      toast.error("這則回饋綁定的商品已刪除，請先改綁現有商品才能上架");
      return;
    }
    setStatus.mutate({ id: review.id, status: next ? "published" : "hidden" });
  };

  return (
    <div className="min-h-screen bg-[oklch(0.97_0_0)]">
      <div className="bg-white border-b border-[oklch(0.93_0_0)] sticky top-14 lg:top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.2em] text-[oklch(0.58_0_0)]">
              REVIEWS
            </p>
            <h1
              className="mt-1 text-lg text-[oklch(0.1_0_0)]"
              style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 300 }}
            >
              商品回饋管理
            </h1>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex shrink-0 items-center gap-2 px-4 py-2.5 text-xs font-body bg-[oklch(0.15_0_0)] text-white hover:bg-[oklch(0.25_0_0)]"
          >
            <Plus className="w-3.5 h-3.5" />
            新增回饋
          </button>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-[11px] tracking-widest text-[oklch(0.5_0_0)] font-body">
            篩選商品
          </span>
          <select
            value={productFilter}
            onChange={e => setProductFilter(e.target.value)}
            className="border border-[oklch(0.86_0_0)] bg-white px-3 py-2 text-sm font-body outline-none focus:border-[oklch(0.2_0_0)]"
          >
            <option value="">全部商品</option>
            {products.map(product => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>

          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map(filter => (
              <button
                key={filter.id}
                type="button"
                aria-pressed={statusFilter === filter.id}
                onClick={() => setStatusFilter(filter.id)}
                className={`border px-3 py-2 text-xs font-body ${
                  statusFilter === filter.id
                    ? "border-[oklch(0.2_0_0)] bg-[oklch(0.15_0_0)] text-white"
                    : "border-[oklch(0.86_0_0)] bg-white text-[oklch(0.4_0_0)] hover:bg-[oklch(0.96_0_0)]"
                }`}
              >
                {filter.label}
                {filter.id === "pending" && pendingCount > 0 && `（${pendingCount}）`}
              </button>
            ))}
          </div>
        </div>

        <section className="bg-white border border-[oklch(0.93_0_0)]">
          {isLoading ? (
            <p className="p-10 text-center text-sm font-body text-[oklch(0.5_0_0)]">
              載入回饋中...
            </p>
          ) : error ? (
            <p className="p-10 text-center text-sm font-body text-red-600">
              載入回饋失敗，請稍後再試
            </p>
          ) : visibleReviews.length === 0 ? (
            <div className="p-10 text-center">
              <MessageSquareQuote className="w-8 h-8 text-[oklch(0.7_0_0)] mx-auto mb-3" />
              <p className="text-sm font-body text-[oklch(0.5_0_0)]">
                {reviews.length > 0
                  ? "沒有符合這個狀態的回饋"
                  : productFilter
                    ? "這個商品還沒有回饋"
                    : "尚未建立任何商品回饋"}
              </p>
            </div>
          ) : (
            <>
              {/* 手機：卡片 */}
              <ul className="divide-y divide-[oklch(0.93_0_0)] md:hidden">
                {visibleReviews.map(review => (
                  <li key={review.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-[oklch(0.15_0_0)]">
                          {review.productName}
                        </p>
                        {!review.productExists && (
                          <p className="text-[11px] font-body text-amber-700">
                            商品已刪除
                          </p>
                        )}
                      </div>
                      <StatusBadge status={review.status} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StarDisplay rating={review.rating} />
                      <span className="text-xs font-body text-[oklch(0.45_0_0)]">
                        {review.displayName}
                      </span>
                      <SourceBadge source={review.source} />
                    </div>
                    <p className="line-clamp-2 text-xs font-body leading-relaxed text-[oklch(0.4_0_0)]">
                      {review.content}
                    </p>
                    {review.images.length > 0 && (
                      <div className="flex gap-2">
                        {review.images.map(src => (
                          <img
                            key={src}
                            src={src}
                            alt=""
                            className="h-12 w-12 border border-[oklch(0.9_0_0)] object-cover"
                          />
                        ))}
                      </div>
                    )}
                    <dl className="grid grid-cols-3 gap-2 text-xs font-body">
                      <div>
                        <dt className="text-[oklch(0.55_0_0)]">排序</dt>
                        <dd className="text-[oklch(0.3_0_0)]">
                          {review.sortOrder}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[oklch(0.55_0_0)]">首頁精選</dt>
                        <dd className="text-[oklch(0.3_0_0)]">
                          {review.isFeatured ? "是" : "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[oklch(0.55_0_0)]">建立</dt>
                        <dd className="text-[oklch(0.3_0_0)]">
                          {formatDate(review.createdAt)}
                        </dd>
                      </div>
                    </dl>
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2 text-xs font-body text-[oklch(0.45_0_0)]">
                        <Switch
                          aria-label={`上架「${review.displayName}」的回饋`}
                          checked={review.status === "published"}
                          onCheckedChange={next =>
                            togglePublished(review, next)
                          }
                        />
                        上架
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(review)}
                          className={actionButtonClass}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          編輯
                        </button>
                        <button
                          type="button"
                          onClick={() => confirmRemove(review)}
                          className={actionButtonClass}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          刪除
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {/* 桌機：表格 */}
              <div className="hidden md:block">
                <table className="w-full text-left text-sm font-body">
                  <thead className="border-b border-[oklch(0.93_0_0)] text-[11px] tracking-widest text-[oklch(0.5_0_0)]">
                    <tr>
                      <th className="px-4 py-3 font-normal">商品</th>
                      <th className="px-4 py-3 font-normal">評分</th>
                      <th className="px-4 py-3 font-normal">顯示名稱</th>
                      <th className="px-4 py-3 font-normal">來源</th>
                      <th className="px-4 py-3 font-normal">回饋內容</th>
                      <th className="px-4 py-3 font-normal">圖片</th>
                      <th className="px-4 py-3 font-normal">狀態</th>
                      <th className="px-4 py-3 font-normal">精選</th>
                      <th className="px-4 py-3 font-normal text-right">排序</th>
                      <th className="px-4 py-3 font-normal">建立</th>
                      <th className="px-4 py-3 font-normal text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[oklch(0.93_0_0)]">
                    {visibleReviews.map(review => (
                      <tr key={review.id}>
                        <td className="max-w-[10rem] px-4 py-3">
                          <p className="truncate text-[oklch(0.15_0_0)]">
                            {review.productName}
                          </p>
                          {!review.productExists && (
                            <p className="text-[11px] text-amber-700">
                              商品已刪除
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StarDisplay rating={review.rating} />
                        </td>
                        <td className="px-4 py-3 text-[oklch(0.4_0_0)]">
                          {review.displayName}
                        </td>
                        <td className="px-4 py-3">
                          <SourceBadge source={review.source} />
                        </td>
                        <td className="max-w-[16rem] px-4 py-3">
                          <p className="line-clamp-2 text-xs text-[oklch(0.4_0_0)]">
                            {review.content}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          {review.images.length === 0 ? (
                            <span className="text-xs text-[oklch(0.6_0_0)]">
                              —
                            </span>
                          ) : (
                            <div className="flex gap-1">
                              {review.images.map(src => (
                                <img
                                  key={src}
                                  src={src}
                                  alt=""
                                  className="h-9 w-9 border border-[oklch(0.9_0_0)] object-cover"
                                />
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={review.status} />
                        </td>
                        <td className="px-4 py-3 text-xs text-[oklch(0.4_0_0)]">
                          {review.isFeatured ? "是" : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {review.sortOrder}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-[oklch(0.45_0_0)]">
                          {formatDate(review.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <Switch
                              aria-label={`上架「${review.displayName}」的回饋`}
                              checked={review.status === "published"}
                              onCheckedChange={next =>
                                togglePublished(review, next)
                              }
                            />
                            <button
                              type="button"
                              onClick={() => openEdit(review)}
                              className={actionButtonClass}
                            >
                              <Pencil className="w-3 h-3" />
                              編輯
                            </button>
                            <button
                              type="button"
                              onClick={() => confirmRemove(review)}
                              className={actionButtonClass}
                            >
                              <Trash2 className="w-3 h-3" />
                              刪除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
        <p className="mt-3 text-xs font-body text-[oklch(0.55_0_0)]">
          只有「已上架」的回饋會出現在商品頁，依排序由小到大、同排序再依建立時間由新到舊顯示。
          商品被刪除後回饋仍保留為歷史資料，但必須先改綁現有商品才能重新上架。
        </p>
      </main>

      <ReviewFormDialog
        open={formOpen}
        review={editing}
        onClose={() => setFormOpen(false)}
      />
    </div>
  );
}
