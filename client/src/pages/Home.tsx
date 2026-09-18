// 日日好日 — Home Page
// Design: Vacanza-inspired Minimalist Modern
// Layout: Announcement → Hero (carousel + tagline) → Top 6 → Categories → Daily quote → Monthly limited → Workshop/Custom banner

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, Sparkles } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { getCustomPriceDisplay } from "@/lib/customOrderingContent";
import { products as staticProducts, type Product } from "@/lib/data";
import { getQuickCartActionLabel, requiresCustomFormBeforeCart, requiresDetailSelectionBeforeCart } from "@/lib/productOptions";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const heroSlides = [
  { src: "/hero-cover.jpg", alt: "白水晶與銀色飾件設計手鍊" },
  { src: "/images/d-design/d003.jpg", alt: "D003 金色珍珠水晶設計手鍊" },
  { src: "/images/d-design/d004.jpg", alt: "D004 淡粉色水晶設計手鍊" },
];
const CATEGORY_LOVE_IMG = "/images/categories/love.jpg";
const CATEGORY_WEALTH_IMG = "/images/categories/wealth.jpg";
const CATEGORY_PROTECT_IMG = "/images/categories/protect.jpg";
const CATEGORY_HEALING_IMG = "/images/categories/healing.jpg";
const HERO_BANNER2_IMG = "/images/best-sellers.jpg";
const DAILY_ENERGY_BOTANICAL_IMG = "/images/home/daily-energy-botanical-transparent-web.png";
const DAILY_ENERGY_RIGHT_BOTANICAL_IMG = "/images/home/daily-energy-right-botanical-transparent-web.png";
const DAILY_ENERGY_SUN_GLYPH_IMG = "/images/home/daily-energy-sun-glyph-web.png";
const categoryCards = [
  {
    en: "LOVE & ROMANCE",
    zh: "愛情桃花",
    desc: "吸引正緣・提升魅力",
    href: "/products?category=love",
    img: CATEGORY_LOVE_IMG,
  },
  {
    en: "WEALTH & CAREER",
    zh: "財運事業",
    desc: "招財進寶・事業順遂",
    href: "/products?category=wealth",
    img: CATEGORY_WEALTH_IMG,
  },
  {
    en: "PROTECTION",
    zh: "能量防護",
    desc: "防小人・淨化磁場",
    href: "/products?category=protect",
    img: CATEGORY_PROTECT_IMG,
  },
  {
    en: "HEALING",
    zh: "療癒系列",
    desc: "舒緩焦慮・內在平衡",
    href: "/products?category=healing",
    img: CATEGORY_HEALING_IMG,
  },
];

// index 0=日 1=一 2=二 3=三 4=四 5=五 6=六
const dailyQuotes = [
  "愛自己，是一切美好的起點。",
  "每一天都是嶄新的開始，讓水晶的能量陪伴你前行。",
  "你所散發的能量，決定你所吸引的一切。",
  "靜下心來，感受水晶傳遞給你的訊息。",
  "相信自己的直覺，它會引導你找到最適合的能量。",
  "放下過去的重量，讓能量自由流動，迎接新的豐盛。",
  "每一顆水晶都在等待與你共鳴的那一刻。",
];

function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("visible");
        });
      },
      { threshold: 0.06, rootMargin: "0px 0px -30px 0px" }
    );

    const observeAll = () => {
      document.querySelectorAll(".reveal:not(.visible)").forEach((el) => observer.observe(el));
    };
    observeAll();

    // 資料載入後才出現的區塊（例如本月限定款）也要納入，否則會一直維持隱藏
    const mutations = new MutationObserver(observeAll);
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutations.disconnect();
      observer.disconnect();
    };
  }, []);
}

/** 首頁商品卡（熱銷 Top 6 與本月限定款共用） */
function ProductCard({
  product,
  onAddToCart,
}: {
  product: Product;
  onAddToCart: (product: Product, event: React.MouseEvent) => void;
}) {
  return (
    // 不使用 reveal：商品是資料載入後才渲染，捲動漸顯只在頁面載入時掃描一次，會導致卡片永遠不顯示
    <Link href={`/products/${product.id}`}>
        <div className="product-card home-product-card">
          <div className="product-card-image">
            <img src={product.image} alt={product.name} loading="lazy" />
            <button
              onClick={(event) => onAddToCart(product, event)}
              className="absolute bottom-0 left-0 right-0 bg-sf-accent text-white text-[0.65rem] tracking-[0.15em] py-2.5 font-body translate-y-full group-hover:translate-y-0 transition-transform duration-300 opacity-0 hover:opacity-100 focus:opacity-100"
              style={{ transition: "opacity 0.2s" }}
            >
              {getQuickCartActionLabel(product) ?? "加入購物車"}
            </button>
          </div>
          <div className="product-card-info">
            <div className="tag-scroll mb-1.5">
              {product.tags.map((tag) => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
            <p className="product-card-name">{product.name}</p>
            <div className="flex flex-col gap-0.5 mt-1">
              {product.originalPrice && product.originalPrice > product.price ? (
                <div className="flex items-center gap-2">
                  <p className="text-[0.7rem] font-body text-sf-muted line-through">
                    NT$ {product.originalPrice.toLocaleString()}
                  </p>
                  <p className="product-card-price">NT$ {product.price.toLocaleString()}</p>
                </div>
              ) : product.priceRange ? (
                <p className="product-card-price">{getCustomPriceDisplay(product.id, product.priceRange)}</p>
              ) : (
                <p className="product-card-price">NT$ {product.price.toLocaleString()}</p>
              )}
              {product.originalPrice && product.originalPrice > product.price && product.priceRange && (
                <p className="text-[0.7rem] font-body text-sf-muted">
                  {getCustomPriceDisplay(product.id, product.priceRange)}
                </p>
              )}
            </div>
          </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const { addToCart } = useCart();
  const [, setLocation] = useLocation();
  const [heroSlide, setHeroSlide] = useState(0);
  const [isHeroPaused, setIsHeroPaused] = useState(false);
  const [quote] = useState(() => dailyQuotes[new Date().getDay()]);
  useScrollReveal();

  const { data: dbProducts } = trpc.product.list.useQuery();
  const { data: topSellers } = trpc.product.topSellers.useQuery({ limit: 6 });
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

  // 熱銷 Top 6：銷量與精選由伺服器決定；資料還沒回來時先用現有商品遞補，避免版面跳動
  const topProducts = useMemo(
    () => (topSellers && topSellers.length > 0 ? topSellers : products.slice(0, 6)),
    [topSellers, products]
  );
  const monthlyProducts = useMemo(
    () => products.filter((product) => product.isMonthlyLimited).slice(0, 3),
    [products]
  );

  useEffect(() => {
    if (isHeroPaused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => {
      setHeroSlide((current) => (current + 1) % heroSlides.length);
    }, 2800);

    return () => window.clearInterval(timer);
  }, [isHeroPaused]);

  const handleAddToCart = (product: Product, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (requiresDetailSelectionBeforeCart(product)) {
      toast.message(
        requiresCustomFormBeforeCart(product)
          ? "請先填寫客製化諮詢表單"
          : "請先選擇手圍、鬆緊度與扣件類型"
      );
      setLocation(`/products/${product.id}`);
      return;
    }
    addToCart(product);
    toast.success(`已加入購物車：${product.name}`);
  };

  return (
    <div className="min-h-screen bg-white page-enter">

      {/* ─── HERO ─── */}
      {/* 圖片在右（手機在上），以漸層與左側（手機下方）文字區融合 */}
      <section
        className="home-hero relative overflow-hidden"
        role="region"
        aria-roledescription="carousel"
        aria-label="封面精選設計"
        onMouseEnter={() => setIsHeroPaused(true)}
        onMouseLeave={() => setIsHeroPaused(false)}
        onFocusCapture={() => setIsHeroPaused(true)}
        onBlurCapture={() => setIsHeroPaused(false)}
      >
        <div className="relative h-[82vw] max-h-[520px] sm:h-[60vw] lg:absolute lg:inset-y-0 lg:right-0 lg:h-auto lg:max-h-none lg:w-[64%]">
          <Link href="/products" className="absolute inset-0 block" aria-label="查看全部商品" tabIndex={-1}>
            {heroSlides.map((slide, index) => (
              <img
                key={slide.src}
                src={slide.src}
                alt={index === heroSlide ? slide.alt : ""}
                aria-hidden={index !== heroSlide}
                loading={index === 0 ? "eager" : "lazy"}
                className={`home-hero-image absolute inset-0 w-full h-full object-cover object-[center_42%] transition-opacity duration-[800ms] ease-out ${
                  index === heroSlide ? "opacity-100" : "opacity-0"
                }`}
              />
            ))}
          </Link>
          <div className="home-hero-tint pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="home-hero-fade pointer-events-none absolute inset-x-0 top-0 -bottom-px" aria-hidden="true" />
        </div>

        <div className="relative z-10 mx-auto flex max-w-[1440px] items-center px-5 pb-8 -mt-8 sm:-mt-10 sm:px-8 lg:mt-0 lg:min-h-[clamp(480px,40vw,620px)] lg:px-12 lg:py-16">
          <div className="max-w-[460px]">
            <p className="home-hero-script mb-2 sm:mb-3">Find Your Energy</p>
            <h1 className="home-hero-title mb-4 sm:mb-5">
              找到屬於你的
              <br />
              <span className="home-hero-accent">能量水晶</span>
            </h1>
            <p className="mb-6 text-sm font-body font-light leading-[1.9] tracking-[0.06em] text-sf-text sm:mb-8 sm:text-[15px]">
              每一顆水晶，都是大自然的溫柔回應，
              <br className="hidden sm:inline" />
              讓能量陪你走過生活的每一段旅程。
            </p>
            <div className="inline-flex flex-col gap-3">
              <Link href="/products" className="home-hero-button">
                探索水晶飾品 <ArrowRight className="h-4 w-4" />
              </Link>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/products?category=monthly" className="home-hero-button-outline">每月限量</Link>
                <Link href="/custom" className="home-hero-button-outline">客製款</Link>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-1 sm:mt-10">
              {heroSlides.map((slide, index) => (
                <button
                  key={slide.src}
                  type="button"
                  aria-label={`顯示第 ${index + 1} 張封面照片`}
                  aria-current={index === heroSlide}
                  onClick={() => setHeroSlide(index)}
                  className="group flex h-11 min-w-11 flex-col items-start justify-center gap-1.5 pr-3"
                >
                  <span
                    className={`block h-px transition-all duration-500 ${
                      index === heroSlide ? "w-8 bg-sf-accent" : "w-0 bg-transparent"
                    }`}
                  />
                  <span
                    className={`font-display text-sm tracking-[0.1em] transition-colors ${
                      index === heroSlide ? "text-sf-ink" : "text-[#C9B3A6] group-hover:text-sf-accent"
                    }`}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── TOP 6 ─── */}
      <section className="py-12 sm:py-14">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 text-center reveal sm:mb-8">
            <p className="eyebrow mb-2">BEST SELLERS</p>
            <h2 className="heading-lg">熱銷 Top 6</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {topProducts.map((product) => (
              <ProductCard key={product.id} product={product} onAddToCart={handleAddToCart} />
            ))}
          </div>
          <div className="mt-8 text-center reveal">
            <Link href="/products">
              <button className="btn-ghost">查看全部商品 <ArrowRight className="w-3.5 h-3.5" /></button>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── CATEGORY GRID ─── */}
      <section className="py-0">
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {categoryCards.map((cat, i) => (
            <Link key={i} href={cat.href}>
              <div className="split-card h-[38vw] min-h-[150px] sm:h-[26vw] lg:h-[30vh]">
                <img src={cat.img} alt={cat.zh} loading="lazy" />
                <div className="split-card-overlay">
                  <h3 className="category-title-en">{cat.en}</h3>
                  <p className="category-title-zh">{cat.zh}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── TODAY'S ENERGY QUOTE ─── */}
      <section className="bg-white px-4 py-8 sm:py-10">
        <div className="relative mx-auto w-full max-w-[1280px] pt-7 sm:pt-9">
          <div className="relative isolate overflow-hidden rounded-[1.65rem] bg-[#fff7f1] px-6 pb-6 pt-12 text-center shadow-[0_12px_34px_rgba(128,103,81,0.07)] sm:px-14 sm:pb-7 sm:pt-14">
            <div aria-hidden="true" className="absolute -left-12 -top-16 -z-10 size-48 rounded-full bg-[#efd8c8]/12" />
            <div aria-hidden="true" className="absolute -bottom-24 right-[7%] -z-10 size-56 rounded-full bg-[#f2dfd2]/14" />
            <div aria-hidden="true" className="absolute right-[30%] top-5 -z-10 h-16 w-28 rotate-[-12deg] rounded-full bg-white/15" />
            <img
              src={DAILY_ENERGY_BOTANICAL_IMG}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 left-0 -z-10 h-auto w-[clamp(5.5rem,10vw,8rem)] object-contain opacity-40"
            />
            <img
              src={DAILY_ENERGY_RIGHT_BOTANICAL_IMG}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 right-0 -z-10 h-auto w-[clamp(4.75rem,8vw,6.5rem)] object-contain opacity-40"
            />
            <Sparkles aria-hidden="true" className="absolute left-[22%] top-7 -z-10 h-auto w-4 text-[#d4ad91]/65 sm:left-[24%] sm:top-9 sm:w-5" strokeWidth={1.25} />
            <Sparkles aria-hidden="true" className="absolute right-[20%] top-8 -z-10 h-auto w-3.5 text-[#d4ad91]/60 sm:right-[23%] sm:top-10 sm:w-4" strokeWidth={1.25} />

            <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center">
              <p className="mb-2 text-[0.62rem] font-body font-medium tracking-[0.18em] text-brand-blush sm:mb-3 sm:text-xs sm:tracking-[0.28em]">
                TODAY&apos;S ENERGY <span className="mx-1 text-brand-peach sm:mx-1.5">•</span> 今日能量語錄
              </p>
              <blockquote className="max-w-3xl px-3 text-base font-light leading-[1.75] text-sf-ink [text-wrap:balance] sm:px-12 sm:text-[1.35rem] md:text-2xl" style={{fontFamily: "'Noto Serif TC', 'Noto Sans TC', serif"}}>
                <span aria-hidden="true" className="mr-1 text-[1.4em] leading-none text-brand-peach">“</span>
                {quote}
                <span aria-hidden="true" className="ml-1 text-[1.4em] leading-none text-brand-peach">”</span>
              </blockquote>
            </div>
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-0 z-20 flex size-14 -translate-x-1/2 items-center justify-center rounded-full border-2 border-[#ead9cc]/75 bg-[#fff9f4] sm:size-20"
          >
            <img
              src={DAILY_ENERGY_SUN_GLYPH_IMG}
              alt=""
              className="h-auto w-11 object-contain sm:w-16"
            />
          </div>
        </div>
      </section>

      {/* ─── MONTHLY LIMITED ─── */}
      {monthlyProducts.length > 0 && (
        <section className="py-12 border-t border-sf-line bg-sf-cream sm:py-14">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-6 text-center reveal sm:mb-8">
              <p className="eyebrow mb-2">MONTHLY LIMITED</p>
              <h2 className="heading-lg">本月限定款</h2>
              <p className="mt-2 text-sm font-body font-light text-sf-text">每月限量設計，售完即不再製作。</p>
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              {monthlyProducts.map((product) => (
                <ProductCard key={product.id} product={product} onAddToCart={handleAddToCart} />
              ))}
            </div>
            <div className="mt-8 text-center reveal">
              <Link href="/products?category=monthly">
                <button className="btn-ghost">查看每月限量 <ArrowRight className="w-3.5 h-3.5" /></button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ─── SECOND BANNER: 2-col split ─── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 border-t border-sf-line">
        <Link href="/crystal-workshop" className="split-card h-[62vw] min-h-[320px] sm:h-[42vw] lg:h-[45vh]">
          <img src={HERO_BANNER2_IMG} alt="水晶創業班課程作品" loading="lazy" />
          {/* 圖片較亮，文字加深色遮罩維持可讀性 */}
          <div className="split-card-overlay bg-sf-ink/40">
            <p className="eyebrow text-white/80 mb-1">CRYSTAL WORKSHOP</p>
            <h3 className="text-2xl text-white font-light tracking-[0.06em]" style={{fontFamily: "'Noto Serif TC', 'Noto Sans TC', serif"}}>水晶創業班</h3>
            <p className="mt-2 max-w-xs text-xs font-body font-light leading-relaxed text-white/85">
              從生命靈數體驗課到創業全能班，帶你學會配色美學、手作技法與小資創業 SOP。
            </p>
            <ul className="mt-4 flex flex-wrap justify-center gap-1.5">
              {["體驗課可單堂參加", "3 件作品 × 6 種技法", "創業 SOP 與進貨把關"].map((item) => (
                <li key={item} className="border border-white/40 px-2.5 py-1 text-[0.65rem] font-body text-white/90">
                  {item}
                </li>
              ))}
            </ul>
            <span className="mt-5 inline-flex items-center gap-1.5 border-b border-white/70 pb-1 text-xs font-body tracking-[0.12em] text-white">
              了解課程與報名 <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </Link>
        <div className="split-card h-[62vw] min-h-[320px] sm:h-[42vw] lg:h-[45vh] bg-sf-cream flex flex-col items-center justify-center px-12 text-center">
          <p className="eyebrow mb-4">CUSTOM CRYSTAL</p>
          <h3 className="heading-lg mb-4">想要專屬定制？</h3>
          <p className="text-sm font-body font-light text-sf-text leading-relaxed mb-8 max-w-xs">
            根據你的需求量身打造，提供塔羅、脈輪、生命靈數等多種客製化方案。
          </p>
          <Link href="/custom">
            <button className="btn-primary">了解客製化方案 <ArrowRight className="w-3.5 h-3.5" /></button>
          </Link>
        </div>
      </section>

    </div>
  );
}
