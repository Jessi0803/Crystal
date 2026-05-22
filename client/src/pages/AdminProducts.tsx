import { useRef, useState, useMemo, type ChangeEvent } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, Package, Plus, Search, Save, X, Upload, ImageIcon,
  Eye, EyeOff, Pencil, ChevronDown, ChevronUp, CalendarClock, Trash2
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { products as staticProducts } from "@/lib/data";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import type { DbProduct } from "../../../drizzle/schema";

const CATEGORY_OPTIONS = [
  { id: "love", label: "愛情桃花" },
  { id: "wealth", label: "財運事業" },
  { id: "protect", label: "能量防護" },
  { id: "healing", label: "療癒系列" },
  { id: "necklace", label: "項鍊" },
  { id: "pendant", label: "吊飾" },
  { id: "energy-perfume", label: "能量香水" },
  { id: "other", label: "其他" },
];

type FormState = {
  name: string;
  subtitle: string;
  categories: string[];
  price: string;
  priceRange: string;
  image: string;
  tags: string;
  benefits: string;    // 每行一項功效（非客製化）
  crystalType: string; // 每行一項內容，存檔時用 ｜ 串接
  howToUse: string;    // 每行一個步驟（客製化下單流程）
  disclaimer: string;  // 注意事項（客製化）
  featured: boolean;
  active: boolean;
  isMonthlyLimited: boolean;
  scheduledPublishAt: string;
  initialStock: string;
};

const DEFAULT_FORM: FormState = {
  name: "",
  subtitle: "",
  categories: ["healing"],
  price: "",
  priceRange: "",
  image: "",
  tags: "",
  benefits: "",
  crystalType: "",
  howToUse: "",
  disclaimer: "",
  featured: false,
  active: true,
  isMonthlyLimited: false,
  scheduledPublishAt: "",
  initialStock: "5",
};

function formatDateTimeLocal(value?: Date | string | null) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-") + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatAdminDateTime(value?: Date | string | null) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function parseScheduledPublishAt(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatPriceRange(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const normalized = trimmed.replace(/\s*~\s*/g, " ~ ");
  const numbers = normalized.match(/\d[\d,]*/g);

  if (numbers && numbers.length >= 2 && /^[\s$NTnt,.~\d-]+$/.test(normalized)) {
    const [min, max] = numbers.map((n) => Number(n.replace(/,/g, "")));
    if (Number.isFinite(min) && Number.isFinite(max)) {
      return `NT$${min.toLocaleString()} ~ ${max.toLocaleString()}`;
    }
  }

  if (numbers && numbers.length === 1 && /^[\s$NTnt,.\d]+$/.test(normalized)) {
    const amount = Number(numbers[0].replace(/,/g, ""));
    if (Number.isFinite(amount)) return `NT$${amount.toLocaleString()}`;
  }

  return /^NT\$/i.test(normalized) ? normalized.replace(/^nt\$/i, "NT$") : normalized;
}

function getCategoryLabel(category: string) {
  return CATEGORY_OPTIONS.find((c) => c.id === category)?.label ?? category;
}

function getProductCategoryLabels(product: DbProduct) {
  return product.categoryLabels?.length ? product.categoryLabels : [product.categoryLabel];
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 900;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
        else { width = Math.round(width * MAX / height); height = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.78));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("圖片讀取失敗")); };
    img.src = url;
  });
}

// ── 庫存行內編輯（沿用 AdminInventory 的模式）──────────────────────────────
function StockCell({ productId, productName }: { productId: string; productName: string }) {
  const utils = trpc.useUtils();
  const { data: inventory, isLoading } = trpc.inventory.getInventory.useQuery({ productId });
  const [editing, setEditing] = useState(false);
  const [stockVal, setStockVal] = useState("");

  const saveMutation = trpc.inventory.setInventory.useMutation({
    onSuccess: async () => {
      toast.success("庫存已更新");
      setEditing(false);
      await utils.inventory.getInventory.invalidate({ productId });
    },
    onError: (err) => toast.error(err.message || "更新失敗"),
  });

  const currentStock = inventory?.stock ?? 5;

  const startEdit = () => {
    setStockVal(String(currentStock));
    setEditing(true);
  };

  const save = () => {
    const n = parseInt(stockVal, 10);
    if (!Number.isInteger(n) || n < -1) {
      toast.error("庫存請輸入 -1 或 0 以上的整數");
      return;
    }
    saveMutation.mutate({ productId, productName, stock: n, allowPreorder: inventory?.allowPreorder ?? false });
  };

  if (isLoading) return <span className="text-xs text-[oklch(0.6_0_0)] font-body">—</span>;

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min={-1}
          value={stockVal}
          onChange={(e) => setStockVal(e.target.value)}
          className="w-16 border border-[oklch(0.86_0_0)] px-2 py-1 text-xs font-body"
          autoFocus
        />
        <button
          onClick={save}
          disabled={saveMutation.isPending}
          aria-label="儲存庫存"
          className="p-1 text-[oklch(0.15_0_0)] hover:opacity-70"
        >
          <Save className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setEditing(false)}
          aria-label="取消庫存編輯"
          className="p-1 text-[oklch(0.5_0_0)] hover:opacity-70"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={startEdit}
      aria-label={`編輯 ${productName} 庫存`}
      className="w-16 border border-[oklch(0.82_0_0)] px-2 py-1 text-xs font-body text-[oklch(0.3_0_0)] hover:border-[oklch(0.4_0_0)] bg-white text-center"
    >
      {currentStock === -1 ? "無限" : currentStock}
    </button>
  );
}

// ── 商品列表行 ──────────────────────────────────────────────────────────────
function ProductRow({
  product,
  onEdit,
}: {
  product: DbProduct;
  onEdit: (p: DbProduct) => void;
}) {
  const utils = trpc.useUtils();
  const isScheduled = !product.active && product.scheduledPublishAt && new Date(product.scheduledPublishAt).getTime() > Date.now();
  const toggleActive = trpc.product.toggleActive.useMutation({
    onSuccess: async () => {
      toast.success(product.active ? "商品已下架" : "商品已上架");
      await utils.product.adminList.invalidate();
    },
    onError: (err) => toast.error(err.message || "操作失敗"),
  });
  const removeProduct = trpc.product.remove.useMutation({
    onSuccess: async () => {
      toast.success("商品已刪除");
      await utils.product.adminList.invalidate();
    },
    onError: (err) => toast.error(err.message || "刪除失敗"),
  });

  const handleRemove = () => {
    const confirmed = window.confirm(`確定要刪除「${product.name}」嗎？刪除後前台不會再顯示此商品。`);
    if (!confirmed) return;
    removeProduct.mutate({ id: product.id });
  };

  return (
    <div className="bg-white border border-[oklch(0.9_0_0)] px-4 py-3">
      <div className="grid gap-3 items-center" style={{ gridTemplateColumns: "56px 1fr 80px 70px 80px 176px" }}>
        <img
          src={product.image}
          alt={product.name}
          className="w-14 h-14 object-cover bg-[oklch(0.94_0_0)] border border-[oklch(0.9_0_0)]"
        />

        <div className="min-w-0">
          <p className="text-sm font-medium text-[oklch(0.12_0_0)] truncate">{product.name}</p>
          <p className="text-xs text-[oklch(0.5_0_0)] font-body mt-0.5">{getProductCategoryLabels(product).join("、")}</p>
          {isScheduled && (
            <p className="text-xs text-amber-700 font-body mt-0.5 flex items-center gap-1">
              <CalendarClock className="w-3 h-3" />
              {formatAdminDateTime(product.scheduledPublishAt)} 上架
            </p>
          )}
          {product.priceRange ? (
            <p className="text-xs text-[oklch(0.4_0_0)] font-body mt-0.5">{product.priceRange}</p>
          ) : (
            <p className="text-xs text-[oklch(0.4_0_0)] font-body mt-0.5">NT$ {product.price.toLocaleString()}</p>
          )}
        </div>

        <div className="text-center">
          {product.category === "custom" ? (
            <span className="text-xs font-body text-[oklch(0.6_0_0)]">—</span>
          ) : (
            <>
              <p className="text-[10px] tracking-widest text-[oklch(0.5_0_0)] font-body mb-1">庫存</p>
              <StockCell productId={product.id} productName={product.name} />
            </>
          )}
        </div>

        <div className="text-center">
          <span className={`inline-block text-[10px] tracking-widest px-2 py-0.5 font-body ${
            isScheduled
              ? "bg-amber-50 text-amber-700 border border-amber-200"
              : product.active
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-[oklch(0.94_0_0)] text-[oklch(0.5_0_0)] border border-[oklch(0.88_0_0)]"
          }`}>
            {isScheduled ? "預約" : product.active ? "上架" : "下架"}
          </span>
        </div>

        <div className="text-center">
          <div className="flex flex-col items-center gap-1">
            {product.featured && (
              <span className="inline-block text-[10px] tracking-widest px-2 py-0.5 font-body bg-amber-50 text-amber-700 border border-amber-200">
                精選
              </span>
            )}
            {product.isMonthlyLimited && (
              <span className="inline-block text-[10px] tracking-widest px-2 py-0.5 font-body bg-rose-50 text-rose-700 border border-rose-200">
                月限
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => onEdit(product)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-body border border-[oklch(0.86_0_0)] text-[oklch(0.35_0_0)] hover:border-[oklch(0.2_0_0)]"
          >
            <Pencil className="w-3 h-3" />
            編輯
          </button>
          <button
            onClick={() => toggleActive.mutate({ id: product.id, active: !product.active })}
            disabled={toggleActive.isPending || removeProduct.isPending}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-body border disabled:opacity-50 ${
              product.active
                ? "border-[oklch(0.86_0_0)] text-[oklch(0.45_0_0)] hover:border-red-300 hover:text-red-600"
                : "border-green-300 text-green-700 hover:bg-green-50"
            }`}
          >
            {product.active ? <><EyeOff className="w-3 h-3" />下架</> : <><Eye className="w-3 h-3" />上架</>}
          </button>
          <button
            onClick={handleRemove}
            disabled={removeProduct.isPending || toggleActive.isPending}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-body border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="w-3 h-3" />
            刪除
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 新增 / 編輯 Modal ─────────────────────────────────────────────────────────
function ProductModal({
  editing,
  onClose,
}: {
  editing: DbProduct | null;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState>(() =>
    editing
      ? {
          name: editing.name,
          subtitle: editing.subtitle ?? "",
          categories: editing.categories?.length ? editing.categories : [editing.category],
          price: String(editing.price),
          priceRange: editing.priceRange ?? "",
          image: editing.image,
          tags: ((editing.tags as string[]) ?? []).join(", "),
          benefits: ((editing.benefits as string[]) ?? []).join("\n"),
          crystalType: (editing.crystalType ?? "").split("｜").filter(Boolean).join("\n"),
          howToUse: ((editing.howToUse as string[]) ?? []).join("\n"),
          disclaimer: editing.disclaimer ?? "",
          featured: editing.featured,
          active: editing.active,
          isMonthlyLimited: editing.isMonthlyLimited,
          scheduledPublishAt: formatDateTimeLocal(editing.scheduledPublishAt),
          initialStock: "5",
        }
      : DEFAULT_FORM
  );
  const [imagePreview, setImagePreview] = useState<string>(editing?.image ?? "");
  const [compressing, setCompressing] = useState(false);
  const [showMoreFields, setShowMoreFields] = useState(false);

  const selectedCategories = form.categories;
  const primaryCategory = selectedCategories[0] ?? "";
  const categoryLabels = selectedCategories.map(getCategoryLabel);

  const setInventory = trpc.inventory.setInventory.useMutation();
  const createProduct = trpc.product.create.useMutation({
    onSuccess: async ({ id }) => {
      if (form.initialStock !== "") {
        const stock = parseInt(form.initialStock, 10);
        if (Number.isInteger(stock) && stock >= -1) {
          await setInventory.mutateAsync({
            productId: id,
            productName: form.name,
            stock,
            allowPreorder: false,
          });
        }
      }
      toast.success("商品已新增");
      await utils.product.adminList.invalidate();
      onClose();
    },
    onError: (err) => toast.error(err.message || "新增失敗"),
  });
  const updateProduct = trpc.product.update.useMutation({
    onSuccess: async () => {
      toast.success("商品已更新");
      await utils.product.adminList.invalidate();
      onClose();
    },
    onError: (err) => toast.error(err.message || "更新失敗"),
  });

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("圖片請小於 10MB");
      return;
    }
    setCompressing(true);
    try {
      const dataUrl = await compressImage(file);
      setImagePreview(dataUrl);
      setForm((p) => ({ ...p, image: dataUrl }));
    } catch {
      toast.error("圖片讀取失敗，請改用圖片網址");
    }
    setCompressing(false);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error("請填寫商品名稱"); return; }
    if (!form.price || isNaN(Number(form.price))) { toast.error("請填寫正確價格"); return; }
    if (selectedCategories.length === 0) { toast.error("請至少選擇一個分類"); return; }

    const imageUrl = form.image;
    if (!imageUrl) { toast.error("請上傳圖片或填入圖片網址"); return; }
    const scheduledPublishAt = parseScheduledPublishAt(form.scheduledPublishAt);
    if (form.scheduledPublishAt && !scheduledPublishAt) { toast.error("請填寫正確的預約上架時間"); return; }
    if (scheduledPublishAt && scheduledPublishAt.getTime() <= Date.now()) {
      toast.error("預約上架時間需晚於現在");
      return;
    }

    const formattedPriceRange = formatPriceRange(form.priceRange);
    const data = {
      name: form.name.trim(),
      subtitle: form.subtitle.trim(),
      category: primaryCategory,
      categoryLabel: categoryLabels[0] ?? primaryCategory,
      categories: selectedCategories,
      categoryLabels,
      price: parseInt(form.price, 10),
      priceRange: formattedPriceRange || undefined,
      image: imageUrl,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      description: editing?.description ?? "",
      story: editing?.story ?? "",
      benefits: form.benefits.split("\n").map((s) => s.trim()).filter(Boolean),
      suitableFor: [],
      howToUse: form.howToUse.split("\n").map((s) => s.trim()).filter(Boolean),
      disclaimer: form.disclaimer.trim(),
      crystalType: form.crystalType.split("\n").map((s) => s.trim()).filter(Boolean).join("｜"),
      color: editing?.color ?? "",
      featured: form.featured,
      isMonthlyLimited: form.isMonthlyLimited,
      active: scheduledPublishAt ? false : form.active,
      scheduledPublishAt,
      sortOrder: editing?.sortOrder ?? 0,
    };

    if (editing) {
      await updateProduct.mutateAsync({ id: editing.id, ...data });
    } else {
      await createProduct.mutateAsync(data);
    }
  };

  const isPending = createProduct.isPending || updateProduct.isPending || compressing;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8 px-4">
      <div className="bg-white w-full max-w-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[oklch(0.93_0_0)]">
          <h2 className="text-base font-medium text-[oklch(0.1_0_0)]" style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 300 }}>
            {editing ? "編輯商品" : "新增商品"}
          </h2>
          <button onClick={onClose} className="text-[oklch(0.5_0_0)] hover:text-[oklch(0.1_0_0)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-4">
          {/* Image */}
          <div>
            <label className="block text-[11px] tracking-widest text-[oklch(0.5_0_0)] font-body mb-2">商品圖片</label>
            <div className="flex gap-3 items-start">
              <div
                className="w-20 h-20 flex-shrink-0 border border-[oklch(0.88_0_0)] bg-[oklch(0.96_0_0)] flex items-center justify-center overflow-hidden cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-[oklch(0.7_0_0)]" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-body border border-[oklch(0.86_0_0)] text-[oklch(0.35_0_0)] hover:border-[oklch(0.2_0_0)] w-full"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {compressing ? "處理中…" : "選擇圖片"}
                </button>
                <input
                  value={form.image}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, image: e.target.value }));
                    setImagePreview(e.target.value);
                  }}
                  placeholder="或貼上圖片網址"
                  className="w-full border border-[oklch(0.86_0_0)] px-3 py-2 text-xs font-body outline-none focus:border-[oklch(0.2_0_0)]"
                />
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>

          {/* Name */}
          <label className="block">
            <span className="block text-[11px] tracking-widest text-[oklch(0.5_0_0)] font-body mb-1">商品名稱 *</span>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="例：紫水晶手鍊"
              className="w-full border border-[oklch(0.86_0_0)] px-3 py-2 text-sm font-body outline-none focus:border-[oklch(0.2_0_0)]"
            />
          </label>

          {/* Category + Price row */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <span className="block text-[11px] tracking-widest text-[oklch(0.5_0_0)] font-body mb-1">分類 *</span>
              <div className="grid grid-cols-2 gap-2 border border-[oklch(0.86_0_0)] p-2">
                {CATEGORY_OPTIONS.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-xs font-body text-[oklch(0.35_0_0)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.categories.includes(c.id)}
                      onChange={(e) => setForm((p) => {
                        const categories = e.target.checked
                          ? [...p.categories, c.id]
                          : p.categories.filter((id) => id !== c.id);
                        return { ...p, categories };
                      })}
                      className="w-4 h-4"
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="block text-[11px] tracking-widest text-[oklch(0.5_0_0)] font-body mb-1">價格（NT$）*</span>
              <input
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                placeholder="1200"
                className="w-full border border-[oklch(0.86_0_0)] px-3 py-2 text-sm font-body outline-none focus:border-[oklch(0.2_0_0)]"
              />
            </label>
          </div>

          {/* Tags + Initial Stock row */}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-[11px] tracking-widest text-[oklch(0.5_0_0)] font-body mb-1">標籤（逗號分隔）</span>
              <input
                value={form.tags}
                onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
                placeholder="紫水晶, 愛情"
                className="w-full border border-[oklch(0.86_0_0)] px-3 py-2 text-sm font-body outline-none focus:border-[oklch(0.2_0_0)]"
              />
            </label>
            {!editing && (
              <label className="block">
                <span className="block text-[11px] tracking-widest text-[oklch(0.5_0_0)] font-body mb-1">初始庫存（-1=無限）</span>
                <input
                  type="number"
                  min={-1}
                  value={form.initialStock}
                  onChange={(e) => setForm((p) => ({ ...p, initialStock: e.target.value }))}
                  className="w-full border border-[oklch(0.86_0_0)] px-3 py-2 text-sm font-body outline-none focus:border-[oklch(0.2_0_0)]"
                />
              </label>
            )}
          </div>

          {/* 非客製化：功效說明 / 客製化：下單流程 + 注意事項 */}
          {primaryCategory !== "custom" ? (
            <label className="block">
              <span className="block text-[11px] tracking-widest text-[oklch(0.5_0_0)] font-body mb-1">功效說明（每行一項）</span>
              <textarea
                value={form.benefits}
                onChange={(e) => setForm((p) => ({ ...p, benefits: e.target.value }))}
                rows={4}
                placeholder={"提升桃花運與人際魅力\n增強直覺力與情緒穩定\n帶來平靜、安定的能量"}
                className="w-full border border-[oklch(0.86_0_0)] px-3 py-2 text-sm font-body outline-none focus:border-[oklch(0.2_0_0)] resize-none"
              />
            </label>
          ) : (
            <>
              <label className="block">
                <span className="block text-[11px] tracking-widest text-[oklch(0.5_0_0)] font-body mb-1">下單流程（每行一個步驟）</span>
                <textarea
                  value={form.howToUse}
                  onChange={(e) => setForm((p) => ({ ...p, howToUse: e.target.value }))}
                  rows={4}
                  placeholder={"填寫報名表單\n支付訂金\n加入官方 LINE 等待設計師確認\n確認後支付尾款出貨"}
                  className="w-full border border-[oklch(0.86_0_0)] px-3 py-2 text-sm font-body outline-none focus:border-[oklch(0.2_0_0)] resize-none"
                />
              </label>
              <label className="block">
                <span className="block text-[11px] tracking-widest text-[oklch(0.5_0_0)] font-body mb-1">注意事項</span>
                <textarea
                  value={form.disclaimer}
                  onChange={(e) => setForm((p) => ({ ...p, disclaimer: e.target.value }))}
                  rows={4}
                  placeholder={"手鍊屬易碎品，請輕拿輕放…"}
                  className="w-full border border-[oklch(0.86_0_0)] px-3 py-2 text-sm font-body outline-none focus:border-[oklch(0.2_0_0)] resize-none"
                />
              </label>
            </>
          )}

          {/* Crystal Type / Content */}
          <label className="block">
            <span className="block text-[11px] tracking-widest text-[oklch(0.5_0_0)] font-body mb-1">商品內容（每行一項水晶或材質）</span>
            <textarea
              value={form.crystalType}
              onChange={(e) => setForm((p) => ({ ...p, crystalType: e.target.value }))}
              rows={3}
              placeholder={"紫水晶\n白水晶\n925 純銀配件"}
              className="w-full border border-[oklch(0.86_0_0)] px-3 py-2 text-sm font-body outline-none focus:border-[oklch(0.2_0_0)] resize-none"
            />
          </label>

          {/* More fields toggle */}
          <button
            type="button"
            onClick={() => setShowMoreFields((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-body text-[oklch(0.5_0_0)] hover:text-[oklch(0.2_0_0)]"
          >
            {showMoreFields ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showMoreFields ? "收起" : "更多選項（副標題、價格區間）"}
          </button>

          {showMoreFields && (
            <div className="space-y-3 border-t border-[oklch(0.94_0_0)] pt-3">
              <label className="block">
                <span className="block text-[11px] tracking-widest text-[oklch(0.5_0_0)] font-body mb-1">副標題</span>
                <input
                  value={form.subtitle}
                  onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))}
                  placeholder="例：搭配月光石，平衡情緒能量"
                  className="w-full border border-[oklch(0.86_0_0)] px-3 py-2 text-sm font-body outline-none focus:border-[oklch(0.2_0_0)]"
                />
              </label>
              <label className="block">
                <span className="block text-[11px] tracking-widest text-[oklch(0.5_0_0)] font-body mb-1">價格區間（如有）</span>
                <input
                  value={form.priceRange}
                  onChange={(e) => setForm((p) => ({ ...p, priceRange: e.target.value }))}
                  onBlur={() => setForm((p) => ({ ...p, priceRange: formatPriceRange(p.priceRange) }))}
                  placeholder="例：NT$1,200 ~ 1,800"
                  className="w-full border border-[oklch(0.86_0_0)] px-3 py-2 text-sm font-body outline-none focus:border-[oklch(0.2_0_0)]"
                />
              </label>
            </div>
          )}

          {/* Toggles */}
          <div className="space-y-3 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isMonthlyLimited}
                onChange={(e) => setForm((p) => ({ ...p, isMonthlyLimited: e.target.checked }))}
                className="w-4 h-4"
              />
              <span className="text-xs font-body text-[oklch(0.35_0_0)]">每月限量</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.active}
                disabled={Boolean(form.scheduledPublishAt)}
                onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
                className="w-4 h-4"
              />
              <span className="text-xs font-body text-[oklch(0.35_0_0)]">
                {form.scheduledPublishAt ? "已設定預約，時間到自動上架" : "立即上架"}
              </span>
            </label>
            <label className="block">
              <span className="block text-[11px] tracking-widest text-[oklch(0.5_0_0)] font-body mb-1">預約上架時間</span>
              <div className="relative">
                <CalendarClock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[oklch(0.55_0_0)]" />
                <input
                  type="datetime-local"
                  value={form.scheduledPublishAt}
                  onChange={(e) => setForm((p) => ({ ...p, scheduledPublishAt: e.target.value, active: e.target.value ? false : p.active }))}
                  className="w-full border border-[oklch(0.86_0_0)] pl-9 pr-3 py-2 text-sm font-body outline-none focus:border-[oklch(0.2_0_0)]"
                />
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[oklch(0.93_0_0)] bg-[oklch(0.98_0_0)]">
          <button onClick={onClose} className="px-4 py-2 text-xs font-body border border-[oklch(0.86_0_0)] text-[oklch(0.45_0_0)] hover:text-[oklch(0.1_0_0)]">
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="flex items-center gap-2 px-5 py-2 text-xs font-body bg-[oklch(0.15_0_0)] text-white disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {compressing ? "處理圖片中…" : isPending ? "儲存中…" : (editing ? "儲存變更" : "新增商品")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 主頁面 ────────────────────────────────────────────────────────────────────
export default function AdminProducts() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<DbProduct | null>(null);

  const utils = trpc.useUtils();
  const { data: dbProductList = [], isLoading } = trpc.product.adminList.useQuery();

  const seedMutation = trpc.product.seed.useMutation({
    onSuccess: async ({ count }) => {
      toast.success(`已匯入 ${count} 個商品`);
      await utils.product.adminList.invalidate();
    },
    onError: (err) => toast.error(err.message || "匯入失敗"),
  });

  const handleSeed = () => {
    const toSeed = staticProducts
      .filter((p) => p.category !== "test")
      .map(({ inStock, ...rest }) => ({ ...rest, active: inStock, sortOrder: 0 }));
    seedMutation.mutate(toSeed);
  };

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return dbProductList;
    return dbProductList.filter(
      (p) =>
        p.name.toLowerCase().includes(keyword) ||
        getProductCategoryLabels(p).join("、").toLowerCase().includes(keyword)
    );
  }, [dbProductList, query]);

  const openCreate = () => { setEditingProduct(null); setModalOpen(true); };
  const openEdit = (p: DbProduct) => { setEditingProduct(p); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditingProduct(null); };

  if (!authLoading && !user) {
    window.location.href = getLoginUrl();
    return null;
  }
  if (!authLoading && user && user.role !== "admin") {
    return (
      <div className="min-h-screen bg-[oklch(0.97_0_0)] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-sm font-body text-[oklch(0.5_0_0)] mb-4">此頁面僅限管理員存取。</p>
          <button className="btn-primary" onClick={() => setLocation("/")}>返回首頁</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[oklch(0.97_0_0)]">
      {/* Sticky header */}
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
              商品管理
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLocation("/admin/revenue")}
              className="hidden sm:flex items-center gap-2 text-xs font-body text-[oklch(0.5_0_0)] hover:text-[oklch(0.1_0_0)] border border-[oklch(0.88_0_0)] px-3 py-2"
            >
              營收報表
            </button>
            <button
              onClick={() => setLocation("/admin/chatbot")}
              className="hidden sm:flex items-center gap-2 text-xs font-body text-[oklch(0.5_0_0)] hover:text-[oklch(0.1_0_0)] border border-[oklch(0.88_0_0)] px-3 py-2"
            >
              AI 客服
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 text-xs font-body bg-[oklch(0.15_0_0)] text-white px-4 py-2 hover:bg-[oklch(0.25_0_0)]"
            >
              <Plus className="w-3.5 h-3.5" />
              新增商品
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Seed banner */}
        {!isLoading && dbProductList.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-amber-800">尚無商品資料</p>
              <p className="text-xs font-body text-amber-700 mt-1">可以點右邊按鈕把現有商品一鍵匯入資料庫，之後就能在這裡管理所有商品。</p>
            </div>
            <button
              onClick={handleSeed}
              disabled={seedMutation.isPending}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 text-xs font-body bg-amber-700 text-white hover:bg-amber-800 disabled:opacity-50"
            >
              <Package className="w-3.5 h-3.5" />
              {seedMutation.isPending ? "匯入中…" : "一鍵匯入現有商品"}
            </button>
          </div>
        )}

        {/* Toolbar */}
        <div className="bg-white border border-[oklch(0.93_0_0)] p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center bg-[oklch(0.94_0_0)]">
                <Package className="w-5 h-5 text-[oklch(0.25_0_0)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[oklch(0.12_0_0)]">商品與庫存管理</p>
                <p className="text-xs text-[oklch(0.52_0_0)] font-body mt-1">
                  點「編輯」修改商品資訊，點庫存數字調整庫存，也可設定預約上架時間。
                </p>
              </div>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[oklch(0.55_0_0)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜尋商品名稱或分類"
                className="w-full border border-[oklch(0.86_0_0)] pl-9 pr-3 py-2.5 text-sm font-body outline-none focus:border-[oklch(0.2_0_0)]"
              />
            </div>
          </div>
        </div>

        {/* Product list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-[oklch(0.9_0_0)] px-4 py-4 animate-pulse h-20" />
            ))}
          </div>
        ) : filtered.length === 0 && dbProductList.length > 0 ? (
          <div className="bg-white border border-[oklch(0.93_0_0)] p-10 text-center">
            <p className="text-sm font-body text-[oklch(0.45_0_0)]">找不到符合的商品</p>
          </div>
        ) : (
          <>
            {(() => {
              const activeProducts = filtered.filter((p) => p.active);
              const scheduledProducts = filtered.filter(
                (p) => !p.active && p.scheduledPublishAt && new Date(p.scheduledPublishAt).getTime() > Date.now()
              );
              const inactiveProducts = filtered.filter(
                (p) => !p.active && (!p.scheduledPublishAt || new Date(p.scheduledPublishAt).getTime() <= Date.now())
              );

              return (
                <>
            {/* 已上架 */}
            {activeProducts.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs tracking-widest font-body text-[oklch(0.4_0_0)] pb-1 border-b border-[oklch(0.92_0_0)]">
                  已上架 · {activeProducts.length} 件
                </p>
                <div className="space-y-2">
                  {activeProducts.map((product) => (
                    <ProductRow key={product.id} product={product} onEdit={openEdit} />
                  ))}
                </div>
              </div>
            )}

            {/* 預約上架 */}
            {scheduledProducts.length > 0 && (
              <div className="space-y-2 mt-6">
                <p className="text-xs tracking-widest font-body text-amber-700 pb-1 border-b border-amber-200">
                  預約上架 · {scheduledProducts.length} 件
                </p>
                <div className="space-y-2">
                  {scheduledProducts.map((product) => (
                    <ProductRow key={product.id} product={product} onEdit={openEdit} />
                  ))}
                </div>
              </div>
            )}

            {/* 已下架 */}
            {inactiveProducts.length > 0 && (
              <div className="space-y-2 mt-6">
                <p className="text-xs tracking-widest font-body text-[oklch(0.55_0_0)] pb-1 border-b border-[oklch(0.92_0_0)]">
                  已下架 · {inactiveProducts.length} 件
                </p>
                <div className="space-y-2 opacity-60">
                  {inactiveProducts.map((product) => (
                    <ProductRow key={product.id} product={product} onEdit={openEdit} />
                  ))}
                </div>
              </div>
            )}
                </>
              );
            })()}
          </>
        )}
      </div>

      {modalOpen && <ProductModal editing={editingProduct} onClose={closeModal} />}
    </div>
  );
}
