// 日日好日 — 品牌故事頁面
// Design: Vacanza-inspired minimal, asymmetric layout with generous whitespace
import { Link } from "wouter";
import { ChevronRight } from "lucide-react";

const values = [
  {
    en: "NATURAL",
    zh: "天然純粹",
    desc: "每一顆水晶皆來自大地億萬年的孕育，我們嚴選天然無染色原礦，讓你感受最真實的地球能量。",
  },
  {
    en: "HANDCRAFTED",
    zh: "手工設計",
    desc: "每件飾品由職人手工穿製，注入細膩工藝與對能量的尊重，讓配戴者感受到溫度與用心。",
  },
  {
    en: "INTENTION",
    zh: "意念注入",
    desc: "出貨前每件商品皆經過能量淨化儀式，帶著清晰的意念與祝福，讓水晶的能量更純粹地傳遞給你。",
  },
  {
    en: "EVERYDAY",
    zh: "日日好日",
    desc: "我們相信，當你與對的能量共振，每一天都能成為好日子。這是我們品牌名稱背後最深的心意。",
  },
];

const milestones = [
  { year: "2020", text: "品牌創立，從一張工作桌、一盒水晶原石開始" },
  { year: "2021", text: "推出首款招桃花粉水晶手鍊，獲得超過 500 位顧客好評" },
  { year: "2022", text: "與台灣在地礦石職人合作，建立天然水晶直採供應鏈" },
  { year: "2023", text: "累積服務超過 2,000 位顧客，推出能量水晶知識教學系列" },
  { year: "2024", text: "全新品牌形象升級，推出「能量配對測驗」個人化推薦服務" },
  { year: "2025", text: "持續深耕，讓更多人透過水晶找到內在平衡與每日好能量" },
];

export default function About() {
  return (
    <div className="min-h-screen bg-white page-enter">

      {/* Breadcrumb */}
      <div className="border-b border-[oklch(0.93_0_0)] py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1440px] mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <Link href="/"><span className="text-[0.65rem] font-body text-[oklch(0.55_0_0)] hover:text-[oklch(0.1_0_0)] transition-colors cursor-pointer">首頁</span></Link>
            <ChevronRight className="w-3 h-3 text-[oklch(0.7_0_0)]" />
            <span className="text-[0.65rem] font-body text-[oklch(0.1_0_0)]">品牌故事</span>
          </div>
          <p className="eyebrow mb-2">OUR STORY</p>
          <h1 className="heading-lg">品牌故事</h1>
        </div>
      </div>

      {/* Hero Statement */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-[0.65rem] tracking-[0.25em] text-[oklch(0.55_0_0)] mb-6">CRYSTAL ENERGY · SINCE 2020</p>
            <h2
              className="text-3xl sm:text-4xl font-light leading-snug text-[oklch(0.1_0_0)] mb-8"
              style={{ fontFamily: "'Noto Serif TC', 'Noto Sans TC', serif", fontWeight: 300 }}
            >
              每一天，<br />
              都值得成為<br />
              <span className="text-[oklch(0.55_0.08_60)]">好日子</span>
            </h2>
            <p className="text-sm font-body font-light text-[oklch(0.45_0_0)] leading-relaxed mb-6 max-w-md">
              日日好日的誕生，源自一個簡單的信念：當我們與對的能量共振，生活就會悄悄改變。
            </p>
            <p className="text-sm font-body font-light text-[oklch(0.45_0_0)] leading-relaxed max-w-md">
              創辦人在人生最迷茫的時期，偶然接觸了能量水晶。那顆粉水晶帶來的平靜感，讓她開始深入研究礦石能量學，並決定將這份療癒的力量，透過手工設計的飾品，分享給更多需要它的人。
            </p>
          </div>

          {/* Decorative image block */}
          <div className="relative">
            <div className="aspect-[4/5] bg-[oklch(0.97_0.005_60)] overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80"
                alt="水晶工作室"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-[oklch(0.95_0.01_60)] border border-[oklch(0.9_0.02_60)] flex flex-col items-center justify-center">
              <p className="text-2xl font-light text-[oklch(0.55_0.08_60)]" style={{ fontFamily: "'Noto Serif TC', serif" }}>5+</p>
              <p className="text-[0.55rem] tracking-[0.15em] text-[oklch(0.5_0_0)] mt-0.5">YEARS</p>
            </div>
          </div>
        </div>
      </section>

      {/* Brand Values */}
      <section className="border-t border-[oklch(0.93_0_0)] bg-[oklch(0.985_0_0)]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="mb-12">
            <p className="eyebrow mb-2">BRAND VALUES</p>
            <h2 className="heading-md">我們的核心理念</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border-l border-t border-[oklch(0.9_0_0)]">
            {values.map((v) => (
              <div key={v.en} className="border-r border-b border-[oklch(0.9_0_0)] p-8 hover:bg-white transition-colors duration-300">
                <p className="text-[0.6rem] tracking-[0.25em] text-[oklch(0.6_0_0)] mb-3">{v.en}</p>
                <h3 className="text-lg font-medium text-[oklch(0.1_0_0)] mb-4" style={{ fontFamily: "'Noto Sans TC', sans-serif" }}>{v.zh}</h3>
                <p className="text-xs font-body font-light text-[oklch(0.5_0_0)] leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Founder Story */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-4">
            <p className="eyebrow mb-2">FOUNDER</p>
            <h2 className="heading-md mb-6">創辦人的話</h2>
            <div className="w-12 h-px bg-[oklch(0.55_0.08_60)] mb-8" />
          </div>
          <div className="lg:col-span-8">
            <blockquote className="text-xl sm:text-2xl font-light text-[oklch(0.2_0_0)] leading-relaxed mb-8"
              style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 300 }}>
              「我不相信水晶能改變命運，但我相信它能改變你看待自己的方式。當你每天戴著一顆粉水晶，你會開始對自己更溫柔——而那份溫柔，才是真正的桃花。」
            </blockquote>
            <p className="text-sm font-body font-light text-[oklch(0.45_0_0)] leading-relaxed mb-4 max-w-2xl">
              我們不過度宣稱水晶的神奇療效，但我們深信：當一個人帶著清晰的意念，選擇了一顆與自己共鳴的水晶，那個選擇本身就已經是一種改變的開始。
            </p>
            <p className="text-sm font-body font-light text-[oklch(0.45_0_0)] leading-relaxed max-w-2xl">
              日日好日，是我每天給自己的一個提醒，也是我希望每一位顧客都能感受到的生活態度。
            </p>
            <p className="mt-8 text-sm font-medium text-[oklch(0.3_0_0)] tracking-[0.1em]" style={{ fontFamily: "'Noto Sans TC', sans-serif" }}>
              — 品牌創辦人
            </p>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="border-t border-[oklch(0.93_0_0)] bg-[oklch(0.985_0_0)]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="mb-12">
            <p className="eyebrow mb-2">MILESTONES</p>
            <h2 className="heading-md">品牌歷程</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 border-l border-t border-[oklch(0.9_0_0)]">
            {milestones.map((m) => (
              <div key={m.year} className="border-r border-b border-[oklch(0.9_0_0)] p-8 hover:bg-white transition-colors duration-300">
                <p className="text-3xl font-light text-[oklch(0.55_0.08_60)] mb-3"
                  style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 300 }}>
                  {m.year}
                </p>
                <p className="text-sm font-body font-light text-[oklch(0.4_0_0)] leading-relaxed">{m.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <p className="eyebrow mb-4">START YOUR JOURNEY</p>
        <h2 className="text-2xl sm:text-3xl font-light text-[oklch(0.1_0_0)] mb-6"
          style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 300 }}>
          找到屬於你的能量水晶
        </h2>
        <p className="text-sm font-body font-light text-[oklch(0.5_0_0)] mb-10 max-w-md mx-auto leading-relaxed">
          不確定從哪裡開始？做個 30 秒能量測驗，讓我們為你推薦最適合的水晶。
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/quiz">
            <button className="btn-primary">做能量測驗</button>
          </Link>
          <Link href="/products">
            <button className="btn-secondary">瀏覽全部商品</button>
          </Link>
        </div>
      </section>
    </div>
  );
}
