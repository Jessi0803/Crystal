// 日日好日 — Products Page
// Design: Vacanza-inspired minimal grid layout
import { useState, useEffect, useMemo, useRef } from "react";
import ProductCard from "@/components/ProductCard";
import { Link, useLocation, useSearch } from "wouter";
import { SlidersHorizontal, X } from "lucide-react";
import { products as staticProducts } from "@/lib/data";
import { useCart } from "@/contexts/CartContext";
import { requiresCustomFormBeforeCart, requiresDetailSelectionBeforeCart } from "@/lib/productOptions";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const categories = [
  { id: "all", label: "全部商品" },
  { id: "monthly", label: "每月限量" },
  { id: "custom", label: "客製化方案" },
  { id: "love", label: "愛情桃花" },
  { id: "wealth", label: "財運事業" },
  { id: "protect", label: "能量防護" },
  { id: "healing", label: "療癒系列" },
  { id: "necklace", label: "項鍊" },
  { id: "pendant", label: "吊飾" },
  { id: "energy-perfume", label: "能量香水" },
  { id: "other", label: "其他" },
];

const sortOptions = [
  { id: "sales", label: "銷售量" },
  { id: "price-asc", label: "價格低到高" },
  { id: "price-desc", label: "價格高到低" },
  { id: "newest", label: "最新商品" },
];

function getProductCategories(product: { category: string; categories?: string[] }) {
  return product.categories?.length ? product.categories : [product.category];
}

export default function Products() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initialCategory = params.get("category") || "all";
  const initialSort = params.get("sort") || "sales";

  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [sortBy, setSortBy] = useState(initialSort);
  const [showFilter, setShowFilter] = useState(false);
  const categoryTabsRef = useRef<HTMLDivElement>(null);
  const categoryButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [, setLocation] = useLocation();
  const { addToCart } = useCart();
  const { data: productSalesTotals = [] } = trpc.order.getProductSalesTotals.useQuery();
  const { data: dbProducts, isLoading: productsLoading } = trpc.product.list.useQuery();
  const salesQtyByProductId = new Map(
    productSalesTotals.map((item) => [item.productId, item.totalQty])
  );

  const products = useMemo(() => {
    if (!dbProducts) {
      return staticProducts.filter((p) => p.category !== "test");
    }
    if (dbProducts.length === 0) {
      return staticProducts.filter((p) => p.category !== "test");
    }
    const dbIds = new Set(dbProducts.map((p) => p.id));
    const staticExtras = staticProducts.filter(
      (p) => !dbIds.has(p.id) && p.category !== "test"
    );
    return [...dbProducts, ...staticExtras];
  }, [dbProducts]);
  const { data: batchAvailability = [] } = trpc.inventory.getBatchAvailability.useQuery(
    { productIds: products.map((p) => p.id) },
    { enabled: products.length > 0 }
  );

  const availabilityByProductId = new Map(
    batchAvailability.map((item) => [item.productId, item])
  );

  useEffect(() => {
    const p = new URLSearchParams(search);
    setActiveCategory(p.get("category") || "all");
    setSortBy(p.get("sort") || "sales");
  }, [search]);

  useEffect(() => {
    const container = categoryTabsRef.current;
    const target = categoryButtonRefs.current[activeCategory];
    if (!container || !target) return;

    const frame = window.requestAnimationFrame(() => {
      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const centeredOffset =
        targetRect.left - containerRect.left - (containerRect.width - targetRect.width) / 2;
      container.scrollTo({
        left: container.scrollLeft + centeredOffset,
        behavior: "smooth",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeCategory]);

  const filtered = products
    .filter((p) => {
      if (activeCategory === "all") return true;
      if (activeCategory === "monthly") return "isMonthlyLimited" in p && p.isMonthlyLimited === true;
      return getProductCategories(p).includes(activeCategory);
    })
    .sort((a, b) => {
      if (sortBy === "sales" || sortBy === "default") {
        return (salesQtyByProductId.get(b.id) ?? 0) - (salesQtyByProductId.get(a.id) ?? 0);
      }
      if (sortBy === "price-asc") return a.price - b.price;
      if (sortBy === "price-desc") return b.price - a.price;
      return 0;
    });

  const handleAddToCart = (product: typeof staticProducts[0], e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const availability = availabilityByProductId.get(product.id);
    if (availability?.isMonthlyLimited === true && availability.available === false) {
      toast.error("此每月限量商品已售完，無法預購");
      return;
    }
    if (requiresDetailSelectionBeforeCart(product)) {
      toast.message(
        requiresCustomFormBeforeCart(product)
          ? "請先填寫客製化諮詢表單"
          : "請先選擇手圍、鬆緊度與扣件類型"
      );
      setLocation(`/products/${product.id}`);
      return;
    }
    addToCart(product, { isPreorder: availability?.isPreorder === true });
    toast.success(`已加入購物袋：${product.name}`);
  };

  return (
    <div className="min-h-screen bg-white page-enter">

      {/* Page Header */}
      <div className="border-b border-sf-line py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1440px] mx-auto">
          <p className="eyebrow mb-2">ALL PRODUCTS</p>
          <h1 className="heading-lg">所有商品</h1>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">

        {/* Filter Bar */}
        <div className="flex items-center justify-between py-5 border-b border-sf-line">
          {/* Category Tabs */}
          <div
            ref={categoryTabsRef}
            className="flex min-w-0 flex-1 items-center gap-0 overflow-x-auto scrollbar-hide"
          >
            {categories.map((cat) => (
              <button
                key={cat.id}
                ref={(element) => {
                  categoryButtonRefs.current[cat.id] = element;
                }}
                onClick={() => setActiveCategory(cat.id)}
                aria-current={activeCategory === cat.id ? "page" : undefined}
                className={`shrink-0 px-4 py-2 text-[0.7rem] tracking-[0.1em] font-body transition-colors border-b-2 ${
                  activeCategory === cat.id
                    ? "border-sf-accent text-sf-ink"
                    : "border-transparent text-sf-muted hover:text-sf-ink"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-3 shrink-0 ml-4">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-[0.7rem] tracking-[0.08em] font-body text-sf-text bg-transparent border-none outline-none cursor-pointer"
            >
              {sortOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results Count */}
        <div className="py-4 border-b border-sf-line">
          <p className="text-[0.65rem] font-body text-sf-muted tracking-wide">
            {productsLoading ? "商品載入中…" : `共 ${filtered.length} 件商品`}
          </p>
        </div>

        {/* Product Grid */}
        {productsLoading && products.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-4 sm:gap-x-4 sm:gap-y-6 py-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-[0.6rem] border border-sf-line bg-sf-cream p-[0.4rem]">
                <div className="aspect-[4/5] rounded-md bg-white" />
                <div className="mx-auto mt-3 h-3 w-2/3 rounded bg-white" />
                <div className="mx-auto mt-2 mb-1 h-3 w-1/3 rounded bg-white" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-2xl font-light text-sf-muted mb-3" style={{fontFamily: "'Noto Sans TC', 'Helvetica Neue', Helvetica, Arial, sans-serif"}}>
              {activeCategory === "energy-perfume" ? "商品即將推出" : "暫無商品"}
            </p>
            {activeCategory === "energy-perfume" && (
              <p className="text-sm font-body text-sf-muted tracking-[0.08em] mb-6">
                敬請期待
              </p>
            )}
            <button onClick={() => setActiveCategory("all")} className="btn-ghost">
              查看全部商品
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-4 sm:gap-x-4 sm:gap-y-6 py-8">
            {filtered.map((product, index) => {
              const availability = availabilityByProductId.get(product.id);
              const soldOut = availability?.isMonthlyLimited === true && availability.available === false;
              return (
              <ProductCard
                key={product.id}
                product={product}
                soldOut={soldOut}
                priority={index < 8}
                onAddToCart={handleAddToCart}
              />
            );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
