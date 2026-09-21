import { useEffect } from "react";
import { Anchor, Gem, Leaf } from "lucide-react";
import { Link } from "wouter";

const customerReviewImages = Array.from(
  { length: 15 },
  (_, index) => `/reviews/review-${String(index + 1).padStart(2, "0")}.jpg`
);

export default function About() {
  // 滾動漸顯動畫
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("opacity-100");
          entry.target.classList.remove("opacity-0", "translate-y-10");
        }
      });
    }, observerOptions);

    document.querySelectorAll(".fade-in-section").forEach((section) => {
      observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="bg-sf-cream text-sf-ink min-h-screen font-sans selection:bg-brand-peach selection:text-white">
      {/* 載入與官網風格一致的字體組合 */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400&family=Noto+Serif+TC:wght@400;500;700&family=Noto+Sans+TC:wght@300;400&display=swap');
        
        .font-serif-en { font-family: 'Cormorant Garamond', serif; }
        .font-serif-zh { font-family: 'Noto Serif TC', serif; }
        .font-sans-zh { font-family: 'Noto Sans TC', sans-serif; }
        
        .letter-spacing-huge { letter-spacing: 0.3em; }
        .letter-spacing-wide { letter-spacing: 0.15em; }
      `}</style>

      {/* Hero Section */}
      <section className="h-[88vh] flex flex-col items-center justify-center px-6 text-center">
        <div className="fade-in-section opacity-0 translate-y-10 transition-all duration-1000 ease-out">
          <span className="font-serif-en text-sm tracking-[0.5em] text-sf-accent mb-8 block uppercase font-light">
            椛 · CRYSTAL
          </span>
          <h1 className="text-2xl md:text-4xl font-serif-zh leading-tight letter-spacing-wide mb-6 font-medium">
            每一顆水晶，都在等一個對的人
          </h1>
          <div className="rule-ornament mt-12" aria-hidden="true">✦</div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="max-w-4xl mx-auto px-6 py-32">
        <div className="fade-in-section opacity-0 translate-y-10 transition-all duration-1000 ease-out space-y-16">
          <div className="relative">
            <p className="text-xl md:text-2xl font-serif-zh leading-[2] text-sf-text md:text-left border-l-2 border-brand-peach pl-8 py-2">
              椛 · Crystal 相信，每一顆水晶都帶著自己的頻率，
              <br />
              <span className="text-sf-accent font-semibold block mt-4">它不修復你，它提醒你，你本來就是完整的。</span>
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-16 mt-24">
            {/* 拱形圖：形狀不變，外圍加兩道細線與角落星點 */}
            <div className="arch-line-frame mx-auto w-[calc(100%-2.5rem)] md:mx-0 md:w-5/12">
              <span className="arch-corner arch-corner-left" aria-hidden="true">✦</span>
              <span className="arch-corner arch-corner-right" aria-hidden="true">✦</span>
              <div className="aspect-[4/5] w-full overflow-hidden rounded-t-full bg-sf-line relative group">
                <img
                  src="/images/about-crystal.jpg"
                  alt="水晶手鍊細節"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-sf-ink/10 group-hover:bg-transparent transition-colors duration-500" />
              </div>
            </div>
            <div className="w-full md:w-7/12">
              <p className="text-lg font-sans-zh leading-[2.2] font-light text-sf-text tracking-wide">
                我們做的不只是手鍊。
                <br />
                是一個讓你每天早晨戴上它、記得善待自己的理由。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Meaning Section - Momiji */}
      <section
        className="paper-emboss lace-top lace-bottom py-40 px-6 relative overflow-hidden"
        style={{ ["--lace-outside" as string]: "var(--sf-cream)" }}
      >
        {/* 背景裝飾 */}
        {/* 背景的「椛」字：以浮雕方式壓印在紙上 */}
        <span
          aria-hidden="true"
          className="emboss-motif font-serif-zh pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none text-[clamp(11rem,34vw,20rem)] leading-none"
        >
          椛
        </span>

        <div className="max-w-3xl mx-auto text-center fade-in-section opacity-0 translate-y-10 transition-all duration-1000 ease-out z-10 relative">
          <Leaf className="w-6 h-6 mx-auto mb-12 text-sf-accent opacity-50" />
          <h2 className="text-2xl font-serif-zh mb-12 letter-spacing-wide font-medium">椛，是日文裡楓葉的字。</h2>
          <div className="space-y-6">
            <p className="text-lg font-serif-zh leading-[2.4] tracking-wider text-sf-text">
              它在最美的時刻落下，卻從不覺得自己在消逝
            </p>
            <p className="text-lg font-serif-zh leading-[2.4] tracking-wider text-sf-accent italic">
              那是一種溫柔的、向內的力量。
            </p>
          </div>
        </div>
      </section>

      {/* Healing & Anchor Section */}
      <section className="max-w-5xl mx-auto px-6 py-48">
        <div className="grid md:grid-cols-2 gap-24 items-start">
          <div className="fade-in-section opacity-0 translate-y-10 transition-all duration-1000 ease-out delay-200">
            <p className="text-lg font-sans-zh leading-[2.2] mb-12 text-sf-text font-light">
              我們相信療癒不是一個目的地，
              <br />
              而是你每天與自己相處的方式。
            </p>
            <div className="flex items-center gap-4 text-sf-accent">
              <Anchor className="w-4 h-4" />
              <span className="font-serif-en text-[10px] tracking-[0.4em] uppercase font-light">The Soul&apos;s Anchor</span>
            </div>
          </div>

          <div className="fade-in-section opacity-0 translate-y-10 transition-all duration-1000 ease-out delay-500">
            <p className="text-lg font-serif-zh leading-[2.6] text-sf-text">
              水晶不是魔法，但它是一個錨點，
              <br />
              讓你在忙碌、混亂、或疲憊的日子裡，
              <br />
              摸到手腕上的那條手鍊，
              <br />
              <span className="bg-brand-peach/20 px-1 py-1 italic">想起自己值得被好好對待</span>
            </p>
          </div>
        </div>
      </section>

      {/* 天然水晶保證 */}
      <section
        className="paper-surface lace-top lace-bottom px-6 py-24"
        style={{ ["--lace-outside" as string]: "var(--sf-cream)" }}
      >
        <div className="mx-auto max-w-4xl text-center fade-in-section opacity-0 translate-y-10 transition-all duration-1000 ease-out">
          <Gem className="mx-auto mb-6 h-5 w-5 text-sf-accent" aria-hidden="true" />
          <h2 className="mb-4 font-serif-zh text-2xl font-medium letter-spacing-wide">100% 天然水晶</h2>
          <div className="rule-ornament mb-6" aria-hidden="true">✦</div>
          <p className="font-sans-zh text-base font-light leading-[2.2] text-sf-text">
            無染色、無酸洗，與合作檢定廠商把關品質。
            <br />
            每一顆水晶都是大地億萬年的結晶，我們只想把最真實的能量交到你手上。
          </p>
          <p className="mt-8 font-serif-en text-[10px] uppercase tracking-[0.4em] text-sf-accent">
            天然水晶 · 能量淨化 · 手工設計 · 正緣桃花 · 招財轉運 · 情緒療癒
          </p>
        </div>
      </section>

      {/* 顧客回饋 */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center fade-in-section opacity-0 translate-y-10 transition-all duration-1000 ease-out">
            <p className="mb-3 font-serif-en text-[10px] uppercase tracking-[0.4em] text-sf-accent">Customer Reviews</p>
            <h2 className="font-serif-zh text-2xl font-medium letter-spacing-wide">來自顧客的真實回饋</h2>
            <div className="rule-ornament mt-4" aria-hidden="true">✦</div>
            <p className="mt-4 font-sans-zh text-sm font-light text-sf-muted">謝謝每一位把能量故事分享給我們的人。</p>
          </div>
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
            {customerReviewImages.map((src, index) => (
              <figure key={src} className="mb-4 break-inside-avoid overflow-hidden border border-stone-200 bg-white">
                <img
                  src={src}
                  alt={`顧客好評截圖 ${index + 1}`}
                  loading={index < 3 ? "eager" : "lazy"}
                  className="h-auto w-full"
                />
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Final Section */}
      <section className="h-[80vh] flex items-center justify-center px-6 bg-sf-ink text-sf-cream">
        <div className="text-center fade-in-section opacity-0 translate-y-10 transition-all duration-1000 ease-out">
          <p className="text-2xl md:text-3xl font-serif-zh tracking-[0.25em] leading-relaxed font-light mb-20">
            我們的每一條手鍊，
            <br />
            都是為了那個正在修復中的你而存在。
          </p>

          <Link href="/products">
            <button className="group relative overflow-hidden px-12 py-5 border border-sf-cream border-opacity-30 hover:border-opacity-100 transition-all duration-500">
              <span className="relative z-10 font-serif-zh text-xs tracking-[0.4em] uppercase">探索與你有緣的頻率</span>
              <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-500 opacity-5" />
            </button>
          </Link>
        </div>
      </section>

    </div>
  );
}
