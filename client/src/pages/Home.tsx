// 日日好日 — Home Page
// Design: Vacanza-inspired Minimalist Modern
// Layout: Announcement → Split Hero → Brand Statement → 2-col Category → TOP ITEMS slider → Members Section → Footer

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { getCustomPriceDisplay } from "@/lib/customOrderingContent";
import { products as staticProducts } from "@/lib/data";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const heroSlides = [
  { src: "/hero-cover.jpg", alt: "白水晶與銀色飾件設計手鍊" },
  { src: "/images/d-design/d003.jpg", alt: "D003 金色珍珠水晶設計手鍊" },
  { src: "/images/d-design/d004.jpg", alt: "D004 淡粉色水晶設計手鍊" },
];
const CATEGORY_LOVE_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663525376407/HsiMZrubGHyjhN4cohRHuH/category-love-X75rNAvxcwjFRqwpUsjeai.webp";
const CATEGORY_WEALTH_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663525376407/HsiMZrubGHyjhN4cohRHuH/category-wealth-SRBHHLNZEuUcHwN4ofwAxa.webp";
const CATEGORY_PROTECT_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663525376407/HsiMZrubGHyjhN4cohRHuH/category-protect-HSkaBEr6CpuJ465gjEc5jR.webp";
const HERO_BANNER2_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663525376407/HsiMZrubGHyjhN4cohRHuH/hero-banner-2-ef9YyJoSCCnxBrg7VtEVxu.webp";

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
    img: HERO_BANNER2_IMG,
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
    const els = document.querySelectorAll(".reveal");
    els.forEach((el) => observer.observe(el));
    return () => { els.forEach((el) => observer.unobserve(el)); observer.disconnect(); };
  }, []);
}

export default function Home() {
  const { addToCart } = useCart();
  const sliderRef = useRef<HTMLDivElement>(null);
  const [heroSlide, setHeroSlide] = useState(0);
  const [isHeroPaused, setIsHeroPaused] = useState(false);
  const [isSliderPaused, setIsSliderPaused] = useState(false);
  const [quote] = useState(() => dailyQuotes[new Date().getDay()]);
  useScrollReveal();

  const { data: dbProducts } = trpc.product.list.useQuery();
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

  const scrollSlider = (dir: "left" | "right") => {
    const slider = sliderRef.current;
    if (!slider) return;
    const firstItem = slider.querySelector<HTMLElement>('.scroll-item');
    const gap = firstItem ? (parseFloat(getComputedStyle(slider).gap) || 16) : 16;
    const itemPlusGap = firstItem ? firstItem.offsetWidth + gap : slider.clientWidth;
    const pageWidth = Math.round(slider.clientWidth / itemPlusGap) * itemPlusGap;
    slider.scrollBy({ left: dir === "right" ? pageWidth : -pageWidth, behavior: "smooth" });
  };

  useEffect(() => {
    if (isHeroPaused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => {
      setHeroSlide((current) => (current + 1) % heroSlides.length);
    }, 2800);

    return () => window.clearInterval(timer);
  }, [isHeroPaused]);

  useEffect(() => {
    if (isSliderPaused) return;
    const timer = window.setInterval(() => {
      const slider = sliderRef.current;
      if (!slider) return;

      const maxScrollLeft = slider.scrollWidth - slider.clientWidth;
      if (maxScrollLeft <= 0) return;

      if (slider.scrollLeft >= maxScrollLeft - 8) {
        slider.scrollTo({ left: 0, behavior: "smooth" });
        return;
      }

      const firstItem = slider.querySelector<HTMLElement>('.scroll-item');
      const gap = firstItem ? (parseFloat(getComputedStyle(slider).gap) || 16) : 16;
      const itemPlusGap = firstItem ? firstItem.offsetWidth + gap : slider.clientWidth;
      const pageWidth = Math.round(slider.clientWidth / itemPlusGap) * itemPlusGap;
      slider.scrollBy({ left: pageWidth, behavior: "smooth" });
    }, 1800);

    return () => window.clearInterval(timer);
  }, [isSliderPaused]);

  const handleAddToCart = (product: typeof products[0], e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
    toast.success(`已加入購物車：${product.name}`);
  };

  return (
    <div className="min-h-screen bg-white page-enter">

      {/* ─── HERO SPLIT ─── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 lg:min-h-[85vh]">
        {/* Left: Image */}
        <div
          className="relative overflow-hidden bg-[oklch(0.97_0_0)] h-[46svh] min-h-[330px] max-h-[470px] lg:h-auto lg:min-h-[85vh] lg:max-h-none"
          role="region"
          aria-roledescription="carousel"
          aria-label="封面精選設計"
          onMouseEnter={() => setIsHeroPaused(true)}
          onMouseLeave={() => setIsHeroPaused(false)}
          onFocusCapture={() => setIsHeroPaused(true)}
          onBlurCapture={() => setIsHeroPaused(false)}
        >
          <Link href="/products" className="absolute inset-0 block" aria-label="查看全部商品">
            {heroSlides.map((slide, index) => (
              <img
                key={slide.src}
                src={slide.src}
                alt={index === heroSlide ? slide.alt : ""}
                aria-hidden={index !== heroSlide}
                loading={index === 0 ? "eager" : "lazy"}
                className={`absolute inset-0 w-full h-full object-cover object-[center_38%] sm:object-center transition-opacity duration-[800ms] ease-out ${
                  index === heroSlide ? "opacity-100" : "opacity-0"
                }`}
              />
            ))}
          </Link>
          <div className="absolute inset-x-0 bottom-2 z-10 flex justify-center">
            {heroSlides.map((slide, index) => (
              <button
                key={slide.src}
                type="button"
                aria-label={`顯示第 ${index + 1} 張封面照片`}
                aria-current={index === heroSlide}
                onClick={() => setHeroSlide(index)}
                className="flex h-11 w-12 items-center justify-center"
              >
                <span
                  className={`block h-px transition-all duration-500 ${
                    index === heroSlide ? "w-10 bg-[oklch(0.2_0_0)]" : "w-6 bg-[oklch(0.2_0_0)]/30"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Right: Text */}
        <div className="flex flex-col justify-center px-5 pt-8 pb-9 sm:px-12 sm:py-16 lg:px-16 xl:px-20 bg-white">
          <h1 className="mb-3 sm:mb-4" style={{
            fontFamily: "'Noto Serif TC', 'Noto Sans TC', serif",
            fontSize: "clamp(2.2rem, 5vw, 3.5rem)",
            fontWeight: 300,
            lineHeight: 1.25,
            letterSpacing: "0.04em",
            color: "oklch(0.1 0 0)"
          }}>
            找到屬於你的<br />
            <em className="not-italic" style={{color: "oklch(0.72 0.09 70)", fontWeight: 400}}>能量水晶</em>
          </h1>
          <p className="text-sm font-body font-light text-[oklch(0.45_0_0)] leading-relaxed mb-7 sm:mb-10 max-w-sm">
            提升愛情、財運與內在平衡，從今天開始改變你的能量場。
            每一顆天然水晶，都是大地億萬年的結晶。
          </p>
          <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-row sm:flex-wrap sm:gap-3">
            <Link href="/products?category=monthly" className="col-span-2 sm:col-auto">
              <button className="btn-primary w-full justify-between sm:w-auto sm:justify-center">
                每月限量 <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </Link>
            <Link href="/products">
              <button className="btn-outline w-full justify-center">
                固定設計款
              </button>
            </Link>
            <Link href="/custom">
              <button className="btn-outline w-full justify-center">
                客製款
              </button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-x-3 mt-9 pt-6 sm:flex sm:gap-8 sm:mt-12 sm:pt-8 border-t border-[oklch(0.93_0_0)]">
            {[
              { num: "10,000+", label: "滿意顧客" },
              { num: "4.9", label: "平均評分" },
              { num: "100%", label: "天然水晶", note: "無染色・無酸洗・無加工・有合作檢定廠商" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-xl sm:text-2xl font-medium text-[oklch(0.1_0_0)]" style={{fontFamily: "'Noto Sans TC', 'Helvetica Neue', Helvetica, Arial, sans-serif"}}>{s.num}</div>
                <div className="eyebrow mt-0.5">{s.label}</div>
                {"note" in s && s.note && (
                  <div className="text-[0.58rem] font-body text-[oklch(0.55_0_0)] mt-0.5 leading-relaxed">（{s.note}）</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── BRAND STATEMENT ─── */}
      <section className="py-6 border-y border-[oklch(0.93_0_0)] overflow-hidden">
        <div className="marquee-track">
          {Array(6).fill(null).map((_, i) => (
            <span key={i} className="px-10 shrink-0 text-[0.65rem] tracking-[0.3em] font-body text-[oklch(0.55_0_0)] uppercase">
              天然水晶 · 能量淨化 · 手工設計 · 正緣桃花 · 招財轉運 · 情緒療癒 ·&nbsp;
            </span>
          ))}
        </div>
      </section>

      {/* ─── CATEGORY GRID ─── */}
      <section className="py-0">
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {categoryCards.map((cat, i) => (
            <Link key={i} href={cat.href}>
              <div className="split-card h-[55vw] sm:h-[40vw] lg:h-[60vh]">
                <img src={cat.img} alt={cat.zh} loading="lazy" />
                <div className="split-card-overlay">
                  <p className="text-[0.6rem] tracking-[0.2em] text-white/80 font-body mb-1">{cat.en}</p>
                  <h3 className="text-xl text-white font-medium" style={{fontFamily: "'Noto Sans TC', 'Helvetica Neue', Helvetica, Arial, sans-serif"}}>{cat.zh}</h3>
                  <p className="text-[0.65rem] text-white/70 font-body mt-1">{cat.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── TODAY'S ENERGY QUOTE ─── */}
      <section className="py-12 px-4 text-center border-b border-[oklch(0.93_0_0)]">
        <p className="eyebrow mb-3">TODAY'S ENERGY · 今日能量語錄</p>
          <blockquote className="text-xl sm:text-2xl font-light text-[oklch(0.2_0_0)] max-w-xl mx-auto leading-relaxed" style={{fontFamily: "'Noto Sans TC', 'Helvetica Neue', Helvetica, Arial, sans-serif"}}>
          "{quote}"
        </blockquote>
      </section>

      {/* ─── TOP ITEMS ─── */}
      <section className="py-14">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex items-end justify-between mb-8 reveal">
            <div>
              <p className="eyebrow mb-2">FEATURED PRODUCTS</p>
              <h2 className="heading-lg">人氣熱銷</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => scrollSlider("left")}
                className="w-9 h-9 border border-[oklch(0.85_0_0)] flex items-center justify-center hover:bg-[oklch(0.97_0_0)] transition-colors"
                aria-label="向左"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scrollSlider("right")}
                className="w-9 h-9 border border-[oklch(0.85_0_0)] flex items-center justify-center hover:bg-[oklch(0.97_0_0)] transition-colors"
                aria-label="向右"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Horizontal Scroll */}
          <div
            ref={sliderRef}
            className="scroll-container gap-4 pb-2"
            onMouseEnter={() => setIsSliderPaused(true)}
            onMouseLeave={() => setIsSliderPaused(false)}
            onTouchStart={() => setIsSliderPaused(true)}
            onTouchEnd={() => window.setTimeout(() => setIsSliderPaused(false), 2500)}
          >
            {products.map((product) => (
              <div key={product.id} className="scroll-item w-[calc(50%-0.5rem)] sm:w-[calc(33.333%-0.75rem)] lg:w-[calc(25%-0.75rem)]">
                <Link href={`/products/${product.id}`}>
                  <div className="product-card">
                    <div className="product-card-image">
                      <img src={product.image} alt={product.name} loading="lazy" />
                      {/* Quick Add */}
                      <button
                        onClick={(e) => handleAddToCart(product, e)}
                        className="absolute bottom-0 left-0 right-0 bg-[oklch(0.1_0_0)] text-white text-[0.65rem] tracking-[0.15em] py-2.5 font-body translate-y-full group-hover:translate-y-0 transition-transform duration-300 opacity-0 hover:opacity-100 focus:opacity-100"
                        style={{ transition: "opacity 0.2s" }}
                      >
                        加入購物車
                      </button>
                    </div>
                    <div className="product-card-info">
                      <div className="flex gap-1.5 mb-1.5">
                        {product.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="tag">{tag}</span>
                        ))}
                      </div>
                      <p className="product-card-name">{product.name}</p>
                      {product.priceRange ? (
                        <p className="product-card-price">{getCustomPriceDisplay(product.id, product.priceRange)}</p>
                      ) : (
                        <p className="product-card-price">NT$ {product.price.toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>

          {/* View All */}
          <div className="mt-8 text-center reveal">
            <Link href="/products">
              <button className="btn-ghost">查看全部商品 <ArrowRight className="w-3.5 h-3.5" /></button>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── SECOND BANNER: 2-col split ─── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 border-t border-[oklch(0.93_0_0)]">
        <div className="split-card h-[60vw] sm:h-[45vw] lg:h-[55vh]">
          <img src={HERO_BANNER2_IMG} alt="水晶系列" loading="lazy" />
          <div className="split-card-overlay">
            <p className="eyebrow text-white/80 mb-1">BEST SELLERS</p>
            <h3 className="text-2xl text-white font-medium" style={{fontFamily: "'Noto Sans TC', 'Helvetica Neue', Helvetica, Arial, sans-serif"}}>經典熱銷系列</h3>
            <p className="text-xs text-white/70 font-body mt-1">回購率 TOP</p>
          </div>
        </div>
        <div className="split-card h-[60vw] sm:h-[45vw] lg:h-[55vh] bg-[oklch(0.97_0_0)] flex flex-col items-center justify-center px-12 text-center">
          <p className="eyebrow mb-4">CUSTOM CRYSTAL</p>
          <h3 className="heading-lg mb-4">想要專屬定制？</h3>
          <p className="text-sm font-body font-light text-[oklch(0.45_0_0)] leading-relaxed mb-8 max-w-xs">
            根據你的需求量身打造，提供塔羅、脈輪、生命靈數等多種客製化方案。
          </p>
          <Link href="/custom">
            <button className="btn-primary">了解客製化方案 <ArrowRight className="w-3.5 h-3.5" /></button>
          </Link>
        </div>
      </section>

      {/* ─── CRYSTAL WORKSHOP INTRO ─── */}
      <section className="py-16 border-t border-[oklch(0.93_0_0)] bg-[oklch(0.985_0.008_75)]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
            <div className="reveal">
              <p className="eyebrow mb-3">CRYSTAL WORKSHOP</p>
              <h2 className="heading-lg mb-5">水晶創業班</h2>
              <p className="text-sm font-body font-light text-[oklch(0.45_0_0)] leading-relaxed mb-8 max-w-xl">
                從生命靈數體驗課到水晶創業全能班，帶你完整學會配色美學、手作技法、淨化保養與小資創業 SOP。
                如果你想把熱愛變成專業，這裡會是最好的起點。
              </p>
              <Link href="/crystal-workshop">
                <button className="btn-primary">
                  前往水晶創業班 <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </Link>
            </div>

            <div className="reveal reveal-delay-1">
              <div className="bg-white border border-[oklch(0.92_0_0)] p-6 sm:p-8">
                <p className="text-[0.65rem] tracking-[0.18em] text-[oklch(0.55_0_0)] mb-5">課程亮點</p>
                <div className="space-y-3">
                  {[
                    "生命靈數水晶手鍊體驗課",
                    "3 件作品實戰 + 6 種核心技法",
                    "小資創業 SOP 與進貨品質分辨",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <span className="text-[oklch(0.72_0.09_70)] mt-0.5">◇</span>
                      <span className="text-sm font-body font-light text-[oklch(0.35_0_0)]">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
