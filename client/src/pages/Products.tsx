// 日日好日 — Products Page
// Design: Vacanza-inspired minimal grid layout
import { useState, useEffect } from "react";
import { Link, useSearch } from "wouter";
import { SlidersHorizontal, X } from "lucide-react";
import { products } from "@/lib/data";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

const categories = [
  { id: "all", label: "全部商品" },
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
  { id: "default", label: "推薦排序" },
  { id: "price-asc", label: "價格低到高" },
  { id: "price-desc", label: "價格高到低" },
  { id: "newest", label: "最新商品" },
];

export default function Products() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initialCategory = params.get("category") || "all";
  const initialSort = params.get("sort") || "default";

  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [sortBy, setSortBy] = useState(initialSort);
  const [showFilter, setShowFilter] = useState(false);
  const { addToCart } = useCart();

  useEffect(() => {
    const p = new URLSearchParams(search);
    setActiveCategory(p.get("category") || "all");
    setSortBy(p.get("sort") || "default");
  }, [search]);

  const filtered = products
    .filter((p) =>
      activeCategory === "all" || p.category === activeCategory
    )
    .sort((a, b) => {
      if (sortBy === "price-asc") return a.price - b.price;
      if (sortBy === "price-desc") return b.price - a.price;
      return 0;
    });

  const handleAddToCart = (product: typeof products[0], e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
                    <button
                      onClick={(e) => handleAddToCart(product, e)}
                      className="absolute bottom-0 left-0 right-0 bg-[oklch(0.1_0_0)] text-white text-[0.65rem] tracking-[0.15em] py-3 font-body opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    >
                      加入購物袋
                    </button>
                    {/* Sale Badge */}
                    {product.originalPrice && (
                      <span className="absolute top-3 left-3 bg-white text-[0.6rem] tracking-[0.08em] font-body px-2 py-1">
                        SALE
                      </span>
                    )}
                  </div>
                  <div className="product-card-info">
                    <div className="flex gap-1.5 mb-1.5">
                      {product.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="tag">{tag}</span>
                      ))}
                    </div>
                    <p className="product-card-name">{product.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="product-card-price">NT$ {product.price.toLocaleString()}</p>
                      {product.originalPrice && (
                        <p className="text-[0.7rem] font-body text-[oklch(0.7_0_0)] line-through">
                          NT$ {product.originalPrice.toLocaleString()}
                        </p>
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
