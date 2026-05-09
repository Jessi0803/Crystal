/**
 * 庫存管理後台
 * 路由：/admin/inventory
 * 僅限 admin 角色存取
 */
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Boxes, CheckCircle, RefreshCw, Save, Search, XCircle } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { products, type Product } from "@/lib/data";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { CUSTOM_PRODUCT_IDS } from "@shared/const";
import { IN_STOCK_FULFILLMENT_NOTE, PREORDER_FULFILLMENT_NOTE } from "@shared/fulfillment";

type InventoryForm = {
  stock: string;
  allowPreorder: boolean;
  preorderNote: string;
};

function AdminInventoryRow({ product }: { product: Product }) {
  const utils = trpc.useUtils();
  const { data: inventory, isLoading } = trpc.inventory.getInventory.useQuery({ productId: product.id });
  const [form, setForm] = useState<InventoryForm | null>(null);

  const saveInventory = trpc.inventory.setInventory.useMutation({
    onSuccess: async () => {
      toast.success("庫存已更新");
      setForm(null);
      await utils.inventory.getInventory.invalidate({ productId: product.id });
    },
    onError: (err) => toast.error(err.message || "更新庫存失敗"),
  });

  const currentStock = inventory?.stock ?? -1;
  const currentAllowPreorder = inventory?.allowPreorder ?? false;
  const currentPreorderNote = inventory?.preorderNote ?? "";
  const editing = form !== null;
  const visibleStock = editing ? form.stock : String(currentStock);
  const visibleAllowPreorder = editing ? form.allowPreorder : currentAllowPreorder;
  const visiblePreorderNote = editing ? form.preorderNote : currentPreorderNote;

  const startEditing = () => {
    setForm({
      stock: String(currentStock),
      allowPreorder: currentAllowPreorder,
      preorderNote: currentPreorderNote,
    });
  };

  const save = () => {
    const parsedStock = Number.parseInt(visibleStock, 10);
    if (!Number.isInteger(parsedStock) || parsedStock < -1) {
      toast.error("庫存請輸入 -1 或 0 以上的整數");
      return;
    }
    saveInventory.mutate({
      productId: product.id,
      productName: product.name,
      stock: parsedStock,
      allowPreorder: visibleAllowPreorder,
      preorderNote: visibleAllowPreorder
        ? visiblePreorderNote.trim() || PREORDER_FULFILLMENT_NOTE
        : undefined,
    });
  };

  return (
    <div className="bg-white border border-[oklch(0.9_0_0)] px-4 py-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_130px_140px_minmax(180px,1fr)_110px] lg:items-center">
        <div className="flex items-center gap-3 min-w-0">
          <img src={product.image} alt={product.name} className="w-14 h-14 object-cover bg-[oklch(0.94_0_0)] border border-[oklch(0.9_0_0)]" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-[oklch(0.12_0_0)] truncate">{product.name}</p>
            <p className="text-xs text-[oklch(0.5_0_0)] font-body mt-1">{product.categoryLabel}</p>
            <p className="text-[11px] text-[oklch(0.6_0_0)] font-mono mt-1 truncate">{product.id}</p>
          </div>
        </div>

        <label className="block">
          <span className="block text-[11px] tracking-widest text-[oklch(0.5_0_0)] font-body mb-1">庫存</span>
          <input
            type="number"
            min={-1}
            value={visibleStock}
            disabled={!editing || isLoading || saveInventory.isPending}
            onChange={(e) => setForm((prev) => prev ? { ...prev, stock: e.target.value } : prev)}
            className="w-full border border-[oklch(0.86_0_0)] px-3 py-2 text-sm font-body disabled:bg-[oklch(0.96_0_0)]"
          />
          <span className="block text-[10px] text-[oklch(0.58_0_0)] mt-1">-1 為無限庫存</span>
        </label>

        <label className="flex items-center gap-2 text-sm font-body text-[oklch(0.25_0_0)]">
          <input
            type="checkbox"
            checked={visibleAllowPreorder}
            disabled={!editing || isLoading || saveInventory.isPending}
            onChange={(e) => setForm((prev) => prev ? { ...prev, allowPreorder: e.target.checked } : prev)}
            className="w-4 h-4 accent-[oklch(0.2_0_0)]"
          />
          允許預購
        </label>

        <label className="block">
          <span className="block text-[11px] tracking-widest text-[oklch(0.5_0_0)] font-body mb-1">預購說明</span>
          <input
            type="text"
            value={visiblePreorderNote}
            disabled={!editing || isLoading || saveInventory.isPending}
            onChange={(e) => setForm((prev) => prev ? { ...prev, preorderNote: e.target.value } : prev)}
            placeholder={PREORDER_FULFILLMENT_NOTE}
            className="w-full border border-[oklch(0.86_0_0)] px-3 py-2 text-sm font-body disabled:bg-[oklch(0.96_0_0)]"
          />
        </label>

        <div className="flex lg:justify-end gap-2">
          {editing ? (
            <>
              <button
                type="button"
                onClick={() => setForm(null)}
                disabled={saveInventory.isPending}
                className="px-3 py-2 text-xs font-body border border-[oklch(0.86_0_0)] text-[oklch(0.45_0_0)] hover:text-[oklch(0.1_0_0)] disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saveInventory.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-body bg-[oklch(0.15_0_0)] text-white disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {saveInventory.isPending ? "儲存中" : "儲存"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={startEditing}
              disabled={isLoading}
              className="px-3 py-2 text-xs font-body border border-[oklch(0.86_0_0)] text-[oklch(0.35_0_0)] hover:border-[oklch(0.2_0_0)] disabled:opacity-50"
            >
              編輯
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminInventory() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [query, setQuery] = useState("");

  const inventoryProducts = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return products
      .filter((product) => product.category !== "custom" && !CUSTOM_PRODUCT_IDS.includes(product.id))
      .filter((product) => {
        if (!keyword) return true;
        return (
          product.name.toLowerCase().includes(keyword) ||
          product.id.toLowerCase().includes(keyword) ||
          product.categoryLabel.toLowerCase().includes(keyword)
        );
      });
  }, [query]);

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
              庫存管理
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
              onClick={() => setLocation("/admin/chatbot")}
              className="hidden sm:flex items-center gap-2 text-xs font-body text-[oklch(0.5_0_0)] hover:text-[oklch(0.1_0_0)] transition-colors border border-[oklch(0.88_0_0)] px-3 py-2"
            >
              AI 客服
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-white border border-[oklch(0.93_0_0)] p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center bg-[oklch(0.94_0_0)]">
                <Boxes className="w-5 h-5 text-[oklch(0.25_0_0)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[oklch(0.12_0_0)]">一般商品庫存</p>
                <p className="text-xs text-[oklch(0.52_0_0)] font-body mt-1">
                  客製化商品不列入庫存管理；庫存 -1 代表無限庫存。{IN_STOCK_FULFILLMENT_NOTE}；{PREORDER_FULFILLMENT_NOTE}。
                </p>
              </div>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[oklch(0.55_0_0)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜尋商品名稱、分類或 ID"
                className="w-full border border-[oklch(0.86_0_0)] pl-9 pr-3 py-2.5 text-sm font-body outline-none focus:border-[oklch(0.2_0_0)]"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs font-body text-[oklch(0.5_0_0)]">
            共 {inventoryProducts.length} 個商品
          </p>
          <div className="flex items-center gap-2 text-xs font-body text-[oklch(0.5_0_0)]">
            <CheckCircle className="w-3.5 h-3.5 text-green-600" />
            儲存後立即套用到結帳庫存檢查
          </div>
        </div>

        <div className="space-y-3">
          {inventoryProducts.map((product) => (
            <AdminInventoryRow key={product.id} product={product} />
          ))}
        </div>

        {inventoryProducts.length === 0 && (
          <div className="bg-white border border-[oklch(0.93_0_0)] p-10 text-center">
            <RefreshCw className="w-8 h-8 text-[oklch(0.6_0_0)] mx-auto mb-3" />
            <p className="text-sm font-body text-[oklch(0.45_0_0)]">找不到符合條件的商品</p>
          </div>
        )}
      </div>
    </div>
  );
}
