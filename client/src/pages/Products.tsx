// 日日好日 — Products Page
// Design: Vacanza-inspired minimal grid layout
import { useState, useEffect, useMemo } from "react";
import { Link, useSearch } from "wouter";
import { SlidersHorizontal, X } from "lucide-react";
import { products as staticProducts } from "@/lib/data";
import { useCart } from "@/contexts/CartContext";
import { getCustomPriceDisplay } from "@/lib/customOrderingContent";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const categories = [
  { id: "all", label: "全部商品" },
  { id: "monthly", label: "每月限量" },
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
  const { addToCart } = useCart();
  const { data: productSalesTotals = [] } = trpc.order.getProductSalesTotals.useQuery();
  const { data: dbProducts } = trpc.product.list.useQuery();
  const salesQtyByProductId = new Map(
    productSalesTotals.map((item) => [item.productId, item.totalQty])
  );

  const products = useMemo(() => {
    if (!dbProducts || dbProducts.length === 0) {
      return staticProducts.filter((p) => p.category !== "test" && p.category !== "custom");
    }
    const dbIds = new Set(dbProducts.map((p) => p.id));
    const staticExtras = staticProducts.filter(
      (p) => !dbIds.has(p.id) && p.category !== "test" && p.category !== "custom"
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
    addToCart(product);
    toast.success(`已加入購物袋：${product.name}`);
  };

  return (
    <div className="min-h-screen bg-white page-enter">

      {/* Page Header */}
      <div className="border-b border-[oklch(0.93_0_0)] py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1440px] mx-auto">
          <p className="eyebrow mb-2">ALL PRODUCTS</p>
          <h1 className="heading-lg">所有商品</h1>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">

        {/* Filter Bar */}
        <div className="flex items-center justify-between py-5 border-b border-[oklch(0.93_0_0)]">
          {/* Category Tabs */}
          <div className="flex items-center gap-0 overflow-x-auto scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`shrink-0 px-4 py-2 text-[0.7rem] tracking-[0.1em] font-body transition-colors border-b-2 ${
                  activeCategory === cat.id
                    ? "border-[oklch(0.1_0_0)] text-[oklch(0.1_0_0)]"
                    : "border-transparent text-[oklch(0.55_0_0)] hover:text-[oklch(0.1_0_0)]"
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
              className="text-[0.7rem] tracking-[0.08em] font-body text-[oklch(0.4_0_0)] bg-transparent border-none outline-none cursor-pointer"
            >
              {sortOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results Count */}
        <div className="py-4 border-b border-[oklch(0.95_0_0)]">
          <p className="text-[0.65rem] font-body text-[oklch(0.55_0_0)] tracking-wide">
            共 {filtered.length} 件商品
          </p>
        </div>

        {/* Product Grid */}
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-2xl font-light text-[oklch(0.7_0_0)] mb-3" style={{fontFamily: "'Noto Sans TC', 'Helvetica Neue', Helvetica, Arial, sans-serif"}}>
              {activeCategory === "energy-perfume" ? "商品即將推出" : "暫無商品"}
            </p>
            {activeCategory === "energy-perfume" && (
              <p className="text-sm font-body text-[oklch(0.55_0_0)] tracking-[0.08em] mb-6">
                敬請期待
              </p>
            )}
            <button onClick={() => setActiveCategory("all")} className="btn-ghost">
              查看全部商品
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 py-10">
            {filtered.map((product) => (
              <Link key={product.id} href={`/products/${product.id}`}>
                <div className="product-card group">
                  <div className="product-card-image">
                    <img src={product.image} alt={product.name} loading="lazy" />
                    {/* Hover Add to Cart */}
                    {(() => {
                      const availability = availabilityByProductId.get(product.id);
                      const soldOut = availability?.isMonthlyLimited === true && availability.available === false;
                      return (
                    <button
                      onClick={(e) => handleAddToCart(product, e)}
                      disabled={soldOut}
                      className="absolute bottom-0 left-0 right-0 bg-[oklch(0.1_0_0)] text-white text-[0.65rem] tracking-[0.15em] py-3 font-body opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    >
                      {soldOut ? "售完" : "加入購物袋"}
                    </button>
                      );
                    })()}
                    {/* Sale Badge */}
                    {product.originalPrice && (
                      <span className="absolute top-3 left-3 bg-white text-[0.6rem] tracking-[0.08em] font-body px-2 py-1">
                        SALE
                      </span>
                    )}
                  </div>
                  <div className="product-card-info">
                    <div className="flex gap-1.5 mb-1.5">
                      {product.tags.slice(0, 4).map((tag) => (
                        <span key={tag} className="tag">{tag}</span>
                      ))}
                    </div>
                    <p className="product-card-name">{product.name}</p>
                    <div className="flex flex-col gap-0.5 mt-1">
                      {product.priceRange ? (
                        <p className="product-card-price">{getCustomPriceDisplay(product.id, product.priceRange)}</p>
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="product-card-price">NT$ {product.price.toLocaleString()}</p>
                          {product.originalPrice && (
                            <p className="text-[0.7rem] font-body text-[oklch(0.7_0_0)] line-through">
                              NT$ {product.originalPrice.toLocaleString()}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
