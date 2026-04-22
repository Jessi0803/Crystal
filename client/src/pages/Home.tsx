// 日日好日 — Home Page
// Design: Vacanza-inspired Minimalist Modern
// Layout: Announcement → Split Hero → Brand Statement → 2-col Category → TOP ITEMS slider → Members Section → Footer

import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { products } from "@/lib/data";
import { toast } from "sonner";

const HERO_SPLIT_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663525376407/HsiMZrubGHyjhN4cohRHuH/hero-split-crystal-Jkr4xbR2BHRgjvpbW4VUS2.webp";
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
    zh: "情緒療癒",
    desc: "舒緩焦慮・內在平衡",
    href: "/products?category=heal",
    img: HERO_BANNER2_IMG,
  },
];

const dailyQuotes = [
  "每一天都是嶄新的開始，讓水晶的能量陪伴你前行。",
  "你所散發的能量，決定你所吸引的一切。",
  "靜下心來，感受水晶傳遞給你的訊息。",
  "相信自己的直覺，它會引導你找到最適合的能量。",
  "愛自己，是一切美好的起點。",
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
  const [quote] = useState(() => dailyQuotes[new Date().getDay() % dailyQuotes.length]);
  useScrollReveal();

  const scrollSlider = (dir: "left" | "right") => {
    if (!sliderRef.current) return;
    const w = sliderRef.current.clientWidth;
    sliderRef.current.scrollBy({ left: dir === "right" ? w * 0.8 : -w * 0.8, behavior: "smooth" });
  };

  const handleAddToCart = (product: typeof products[0], e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
    toast.success(`已加入購物車：${product.name}`);
  };

  return (
    <div className="min-h-screen bg-white page-enter">

      {/* ─── HERO SPLIT ─── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 min-h-[75vh]">
        {/* Left: Image */}
        <div className="relative overflow-hidden bg-[oklch(0.97_0_0)] min-h-[42vw] lg:min-h-[75vh]">
          <img
            src={HERO_SPLIT_IMG}
            alt="日日好日能量水晶"
            className="w-full h-full object-cover object-center"
            style={{ minHeight: "320px" }}
          />
        </div>

        {/* Right: Text */}
        <div className="flex flex-col justify-center px-8 sm:px-12 lg:px-16 xl:px-20 py-16 bg-white">
          <h1 className="mb-4" style={{
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
          <p className="text-sm font-body font-light text-[oklch(0.45_0_0)] leading-relaxed mb-10 max-w-sm">
            提升愛情、財運與內在平衡，從今天開始改變你的能量場。
            每一顆天然水晶，都是大地億萬年的結晶。
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/products">
              <button className="btn-primary">
                開始探索 <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </Link>
            <Link href="/custom">
              <button className="btn-outline">
                客製化方案
              </button>
            </Link>
          </div>

          {/* Stats */}
          <div className="flex gap-8 mt-12 pt-8 border-t border-[oklch(0.93_0_0)]">
            {[
              { num: "10,000+", label: "滿意顧客" },
              { num: "100%", label: "天然水晶" },
              { num: "4.9", label: "平均評分" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-2xl font-medium text-[oklch(0.1_0_0)]" style={{fontFamily: "'Noto Sans TC', 'Helvetica Neue', Helvetica, Arial, sans-serif"}}>{s.num}</div>
                <div className="eyebrow mt-0.5">{s.label}</div>
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
          <div ref={sliderRef} className="scroll-container gap-4 pb-2">
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
                      <p className="product-card-price">NT$ {product.price.toLocaleString()}</p>
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

    </div>
  );
}
