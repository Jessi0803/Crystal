// 日日好日 — Navbar
// Design: Vacanza-inspired — announcement bar + centered logo + full nav row + icons
import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Search, ShoppingBag, Heart, User, Menu, X, ChevronDown } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { BrandTextMark } from "./BrandMark";

const effectSeriesLinks = [
  { label: "愛情桃花", href: "/products?category=love", desc: "粉水晶・草莓晶", icon: "💖" },
  { label: "財運事業", href: "/products?category=wealth", desc: "黃水晶・金髮晶", icon: "💰" },
  { label: "能量防護", href: "/products?category=protect", desc: "黑曜石・黑碧璽", icon: "🛡️" },
  { label: "療癒系列", href: "/products?category=healing", desc: "紫水晶・月光石", icon: "🧘" },
  { label: "項鍊", href: "/products?category=necklace", desc: "日常疊戴・優雅配搭", icon: "📿" },
  { label: "吊飾", href: "/products?category=pendant", desc: "隨身小物・能量點綴", icon: "🧿" },
  { label: "能量香水", href: "/products?category=energy-perfume", desc: "香氣能量・即將推出", icon: "🌙" },
  { label: "其他", href: "/products?category=other", desc: "更多周邊與特別款", icon: "✨" },
];

// 購物說明下拉選單
function ShoppingGuideDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const guideItems = [
    { label: "退換貨說明", href: "/shopping-guide#return" },
    { label: "運送說明", href: "/shopping-guide#shipping" },
    { label: "付款方式", href: "/shopping-guide#payment" },
    { label: "常見問題", href: "/shopping-guide#faq" },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`h-4 inline-flex items-center gap-1 text-[0.7rem] leading-none tracking-[0.12em] font-body transition-colors duration-200 whitespace-nowrap ${
          open ? "text-[oklch(0.1_0_0)]" : "text-[oklch(0.25_0_0)] hover:text-[oklch(0.55_0_0)]"
        }`}
      >
        購物說明
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} strokeWidth={1.5} />
      </button>

      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-44 bg-white border border-[oklch(0.93_0_0)] shadow-lg z-50">
          <div className="absolute -top-[5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border-l border-t border-[oklch(0.93_0_0)] rotate-45" />
          <div className="py-1.5">
            {guideItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <div
                  onClick={() => setOpen(false)}
                  className="px-4 py-2.5 text-[0.7rem] tracking-[0.05em] text-[oklch(0.3_0_0)] hover:bg-[oklch(0.97_0_0)] hover:text-[oklch(0.1_0_0)] transition-colors cursor-pointer"
                >
                  {item.label}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 商品分類下拉選單
function CategoryDropdown() {
  const [open, setOpen] = useState(false);
  const [effectOpen, setEffectOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`h-4 inline-flex items-center gap-1 text-[0.7rem] leading-none tracking-[0.12em] font-body transition-colors duration-200 whitespace-nowrap ${
          open ? "text-[oklch(0.1_0_0)]" : "text-[oklch(0.25_0_0)] hover:text-[oklch(0.55_0_0)]"
        }`}
      >
        商品分類
        <ChevronDown
          className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          strokeWidth={1.5}
        />
      </button>

      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-64 bg-white border border-[oklch(0.93_0_0)] shadow-lg z-50">
          <div className="absolute -top-[5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border-l border-t border-[oklch(0.93_0_0)] rotate-45" />
          <div className="px-5 pt-4 pb-3 border-b border-[oklch(0.95_0_0)]">
            <p className="text-[0.6rem] tracking-[0.2em] text-[oklch(0.55_0_0)] uppercase">SHOP BY CATEGORY</p>
          </div>
          <div className="border-b border-[oklch(0.95_0_0)] px-5 py-3">
            <Link href="/products">
              <div
                onClick={() => setOpen(false)}
                className="flex items-center justify-between cursor-pointer group"
              >
                <span className="text-[0.65rem] tracking-[0.15em] text-[oklch(0.4_0_0)] group-hover:text-[oklch(0.1_0_0)] transition-colors">
                  查看全部商品
                </span>
                <span className="text-[0.65rem] text-[oklch(0.6_0_0)] group-hover:text-[oklch(0.1_0_0)] transition-colors">→</span>
              </div>
            </Link>
          </div>
          <div className="border-b border-[oklch(0.95_0_0)] px-5 py-3" style={{background: "oklch(0.97 0.01 70)"}}>
            <Link href="/custom">
              <div
                onClick={() => setOpen(false)}
                className="flex items-center justify-between cursor-pointer group"
              >
                <span className="text-[0.65rem] tracking-[0.15em] text-[oklch(0.55_0.08_70)] group-hover:text-[oklch(0.4_0.1_70)] transition-colors font-medium">
                  客製化方案
                </span>
                <span className="text-[0.65rem] text-[oklch(0.65_0.08_70)] group-hover:text-[oklch(0.4_0.1_70)] transition-colors">→</span>
              </div>
            </Link>
          </div>
          <div className="py-2">
            <button
              type="button"
              onClick={() => setEffectOpen((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-[oklch(0.97_0_0)] transition-colors group"
            >
              <span className="text-[0.65rem] tracking-[0.15em] text-[oklch(0.4_0_0)] group-hover:text-[oklch(0.1_0_0)] transition-colors">
                功效系列
              </span>
              <ChevronDown
                className={`w-3 h-3 text-[oklch(0.6_0_0)] transition-transform duration-200 ${effectOpen ? "rotate-180" : ""}`}
                strokeWidth={1.5}
              />
            </button>
            {effectOpen && (
              <div className="pb-1">
                {effectSeriesLinks.map((cat) => (
                  <Link key={cat.href} href={cat.href}>
                    <div
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-5 py-3 pl-7 hover:bg-[oklch(0.97_0_0)] transition-colors group cursor-pointer"
                    >
                      <span className="text-base w-6 text-center shrink-0">{cat.icon}</span>
                      <div className="min-w-0">
                        <p className="text-[0.75rem] font-medium text-[oklch(0.1_0_0)] tracking-[0.05em] group-hover:text-[oklch(0.3_0_0)] transition-colors">
                          {cat.label}
                        </p>
                        <p className="text-[0.6rem] text-[oklch(0.6_0_0)] mt-0.5 tracking-wide">
                          {cat.desc}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileCatOpen, setMobileCatOpen] = useState(false);
  const [mobileEffectOpen, setMobileEffectOpen] = useState(false);
  const [mobileGuideOpen, setMobileGuideOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { totalItems, setIsOpen } = useCart();
  const [location] = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setMobileCatOpen(false);
    setMobileEffectOpen(false);
    setMobileGuideOpen(false);
  }, [location]);

  return (
    <>
      {/* ── Main Header ── */}
      <header
        className={`sticky top-0 z-50 bg-white transition-shadow duration-300 ${
          scrolled ? "shadow-[0_1px_0_0_oklch(0.9_0_0)]" : "border-b border-[oklch(0.93_0_0)]"
        }`}
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-8">
              {/* Left: Logo */}
              <Link href="/" className="flex items-center shrink-0">
                <BrandTextMark />
              </Link>

              {/* Left nav: 每月限量、商品分類、購物說明 */}
              <nav className="hidden lg:flex items-center gap-6">
                <Link href="/products?category=monthly">
                  <span className="text-[0.7rem] tracking-[0.12em] font-body text-[oklch(0.25_0_0)] hover:text-[oklch(0.55_0_0)] transition-colors duration-200 whitespace-nowrap">
                    每月限量
                  </span>
                </Link>
                <CategoryDropdown />
                <Link href="/crystal-workshop">
                  <span className="text-[0.7rem] tracking-[0.12em] font-body text-[oklch(0.25_0_0)] hover:text-[oklch(0.55_0_0)] transition-colors duration-200 whitespace-nowrap">
                    水晶創業班
                  </span>
                </Link>
                <ShoppingGuideDropdown />
                <Link href="/about">
                  <span className="text-[0.7rem] tracking-[0.12em] font-body text-[oklch(0.25_0_0)] hover:text-[oklch(0.55_0_0)] transition-colors duration-200 whitespace-nowrap">
                    品牌故事
                  </span>
                </Link>
              </nav>
            </div>

            {/* Right: Icons */}
            <div className="flex items-center gap-5">
              {/* Icons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toast.info("搜尋功能即將上線")}
                  className="p-1.5 text-[oklch(0.25_0_0)] hover:text-[oklch(0.55_0_0)] transition-colors"
                  aria-label="搜尋"
                >
                  <Search className="w-4 h-4" strokeWidth={1.5} />
                </button>
                <button
                  onClick={() => toast.info("收藏功能即將上線")}
                  className="p-1.5 text-[oklch(0.25_0_0)] hover:text-[oklch(0.55_0_0)] transition-colors hidden sm:block"
                  aria-label="收藏"
                >
                  <Heart className="w-4 h-4" strokeWidth={1.5} />
                </button>
                <MemberIconButton />
                <button
                  onClick={() => setIsOpen(true)}
                  className="relative p-1.5 text-[oklch(0.25_0_0)] hover:text-[oklch(0.55_0_0)] transition-colors"
                  aria-label="購物車"
                >
                  <ShoppingBag className="w-4 h-4" strokeWidth={1.5} />
                  {totalItems > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[oklch(0.1_0_0)] text-white text-[0.55rem] flex items-center justify-center font-body">
                      {totalItems}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setMobileOpen(!mobileOpen)}
                  className="lg:hidden p-1.5 text-[oklch(0.25_0_0)]"
                  aria-label="選單"
                >
                  {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-[oklch(0.93_0_0)] bg-white">
            <nav className="max-w-[1440px] mx-auto px-4 py-4 flex flex-col gap-0">
              <Link href="/products?category=monthly">
                <span className="block py-3 text-sm tracking-[0.1em] font-body text-[oklch(0.25_0_0)] border-b border-[oklch(0.95_0_0)] hover:text-[oklch(0.55_0_0)] transition-colors">
                  每月限量
                </span>
              </Link>

              {/* 商品分類展開 */}
              <div>
                <button
                  onClick={() => setMobileCatOpen((v) => !v)}
                  className="w-full flex items-center justify-between py-3 text-sm tracking-[0.1em] font-body text-[oklch(0.25_0_0)] border-b border-[oklch(0.95_0_0)] hover:text-[oklch(0.55_0_0)] transition-colors"
                >
                  <span>商品分類</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${mobileCatOpen ? "rotate-180" : ""}`} strokeWidth={1.5} />
                </button>
                {mobileCatOpen && (
                  <div className="bg-[oklch(0.98_0_0)] border-b border-[oklch(0.95_0_0)]">
                    <Link href="/products">
                      <div className="flex items-center justify-between px-5 py-3 hover:bg-[oklch(0.95_0_0)] transition-colors cursor-pointer">
                        <span className="text-xs tracking-[0.1em] text-[oklch(0.4_0_0)]">查看全部商品</span>
                        <span className="text-xs text-[oklch(0.6_0_0)]">→</span>
                      </div>
                    </Link>
                    <Link href="/custom">
                      <div className="flex items-center justify-between px-5 py-3 transition-colors cursor-pointer" style={{background: "oklch(0.97 0.01 70)"}}>
                        <span className="text-xs tracking-[0.1em] text-[oklch(0.55_0.08_70)] font-medium">客製化方案</span>
                        <span className="text-xs text-[oklch(0.65_0.08_70)]">→</span>
                      </div>
                    </Link>
                    <button
                      type="button"
                      onClick={() => setMobileEffectOpen((v) => !v)}
                      className="w-full flex items-center justify-between px-5 py-3 hover:bg-[oklch(0.95_0_0)] transition-colors"
                    >
                      <span className="text-xs tracking-[0.1em] text-[oklch(0.4_0_0)]">功效系列</span>
                      <ChevronDown className={`w-4 h-4 text-[oklch(0.6_0_0)] transition-transform duration-200 ${mobileEffectOpen ? "rotate-180" : ""}`} strokeWidth={1.5} />
                    </button>
                    {mobileEffectOpen && (
                      <div className="pb-1">
                        {effectSeriesLinks.map((cat) => (
                          <Link key={cat.href} href={cat.href}>
                            <div className="flex items-center gap-3 px-5 py-3 pl-7 hover:bg-[oklch(0.95_0_0)] transition-colors cursor-pointer">
                              <span className="text-base w-5 shrink-0">{cat.icon}</span>
                              <div>
                                <p className="text-sm font-medium text-[oklch(0.1_0_0)]">{cat.label}</p>
                                <p className="text-[0.6rem] text-[oklch(0.6_0_0)]">{cat.desc}</p>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Link href="/crystal-workshop">
                <span className="block py-3 text-sm tracking-[0.1em] font-body text-[oklch(0.25_0_0)] border-b border-[oklch(0.95_0_0)] hover:text-[oklch(0.55_0_0)] transition-colors">
                  水晶創業班
                </span>
              </Link>

              {/* 購物說明展開 */}
              <div>
                <button
                  onClick={() => setMobileGuideOpen((v) => !v)}
                  className="w-full flex items-center justify-between py-3 text-sm tracking-[0.1em] font-body text-[oklch(0.25_0_0)] border-b border-[oklch(0.95_0_0)] hover:text-[oklch(0.55_0_0)] transition-colors"
                >
                  <span>購物說明</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${mobileGuideOpen ? "rotate-180" : ""}`} strokeWidth={1.5} />
                </button>
                {mobileGuideOpen && (
                  <div className="bg-[oklch(0.98_0_0)] border-b border-[oklch(0.95_0_0)]">
                    {[
                      { label: "退換貨說明", href: "/shopping-guide#return" },
                      { label: "運送說明", href: "/shopping-guide#shipping" },
                      { label: "付款方式", href: "/shopping-guide#payment" },
                      { label: "常見問題", href: "/shopping-guide#faq" },
                    ].map((item) => (
                      <Link key={item.href} href={item.href}>
                        <div className="px-5 py-3 text-sm text-[oklch(0.3_0_0)] hover:bg-[oklch(0.95_0_0)] transition-colors cursor-pointer">
                          {item.label}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* 品牌故事 */}
              <Link href="/about">
                <span className="block py-3 text-sm tracking-[0.1em] font-body text-[oklch(0.25_0_0)] border-b border-[oklch(0.95_0_0)] hover:text-[oklch(0.55_0_0)] transition-colors">
                  品牌故事
                </span>
              </Link>

              <MobileMemberLinks />
            </nav>
          </div>
        )}
      </header>

      {/* ── 跑馬燈公告 ── */}
      <div className="bg-[oklch(0.96_0_0)] border-b border-[oklch(0.92_0_0)] py-2 overflow-hidden">
        <div className="marquee-track">
          {Array(8).fill(null).map((_, i) => (
            <span key={i} className="px-8 shrink-0 text-[0.6rem] tracking-[0.25em] font-body text-[oklch(0.45_0_0)] uppercase">
              任選兩條手鍊免運 ·&nbsp;
            </span>
          ))}
        </div>
      </div>
    </>
  );
}

/** 桌面版會員 icon：已登入 → 連到會員中心，未登入 → 連到登入頁 */
function MemberIconButton() {
  const { data: user } = trpc.auth.me.useQuery();
  const [, navigate] = useLocation();

  return (
    <button
      onClick={() => navigate(user ? "/member" : "/login")}
      className="relative p-1.5 text-[oklch(0.25_0_0)] hover:text-[oklch(0.55_0_0)] transition-colors hidden sm:block"
      aria-label={user ? "會員中心" : "登入"}
      title={user ? `${user.name ?? user.email}` : "登入 / 註冊"}
    >
      <User className="w-4 h-4" strokeWidth={1.5} />
      {user && (
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[oklch(0.6_0.12_60)] rounded-full" />
      )}
    </button>
  );
}

/** 手機版 mobile menu 底部的登入/會員連結 */
function MobileMemberLinks() {
  const { data: user } = trpc.auth.me.useQuery();
  const utils = trpc.useUtils();

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      toast.success("已登出");
    },
  });

  if (user) {
    return (
      <>
        <Link href="/member">
          <span className="block py-3 text-sm tracking-[0.1em] font-body text-[oklch(0.25_0_0)] border-b border-[oklch(0.95_0_0)] hover:text-[oklch(0.55_0_0)] transition-colors">
            會員中心（{user.name ?? user.email}）
          </span>
        </Link>
        <button
          onClick={() => logoutMutation.mutate()}
          className="w-full text-left py-3 text-sm tracking-[0.1em] font-body text-[oklch(0.55_0_0)] hover:text-[oklch(0.35_0_0)] transition-colors"
        >
          登出
        </button>
      </>
    );
  }

  return (
    <Link href="/login">
      <span className="block py-3 text-sm tracking-[0.1em] font-body text-[oklch(0.25_0_0)] hover:text-[oklch(0.55_0_0)] transition-colors">
        會員登入
      </span>
    </Link>
  );
}
