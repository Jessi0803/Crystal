// 日日好日 — 購物說明頁面
// Design: Vacanza-inspired minimal layout with anchor navigation
import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ChevronRight } from "lucide-react";

const sections = [
  { id: "return", label: "退換貨說明" },
  { id: "shipping", label: "運送說明" },
  { id: "payment", label: "付款方式" },
  { id: "faq", label: "常見問題" },
];

export default function ShoppingGuide() {
  const [location] = useLocation();

  // 處理 hash 錨點滾動
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash) {
      setTimeout(() => {
        const el = document.getElementById(hash);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [location]);

  return (
    <div className="min-h-screen bg-white page-enter">

      {/* Page Header */}
      <div className="border-b border-[oklch(0.93_0_0)] py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1440px] mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <Link href="/"><span className="text-[0.65rem] font-body text-[oklch(0.55_0_0)] hover:text-[oklch(0.1_0_0)] transition-colors">首頁</span></Link>
            <ChevronRight className="w-3 h-3 text-[oklch(0.7_0_0)]" />
            <span className="text-[0.65rem] font-body text-[oklch(0.1_0_0)]">購物說明</span>
          </div>
          <p className="eyebrow mb-2">SHOPPING GUIDE</p>
          <h1 className="heading-lg">購物說明</h1>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-12">

          {/* Left: Sticky Nav */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-1">
              <p className="eyebrow mb-4">目錄</p>
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="flex items-center gap-2 py-2.5 text-[0.75rem] tracking-[0.05em] text-[oklch(0.45_0_0)] hover:text-[oklch(0.1_0_0)] transition-colors border-l-2 border-transparent hover:border-[oklch(0.1_0_0)] pl-3 group"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </aside>

          {/* Right: Content */}
          <div className="space-y-16 max-w-2xl">

            {/* ── 退換貨說明 ── */}
            <section id="return" className="scroll-mt-24">
              <p className="eyebrow mb-3">RETURN POLICY</p>
              <h2 className="text-2xl font-medium mb-6 pb-4 border-b border-[oklch(0.93_0_0)]" style={{fontFamily: "'Noto Sans TC', 'Helvetica Neue', Helvetica, Arial, sans-serif"}}>退換貨說明</h2>

              <div className="space-y-4 text-sm font-body font-light text-[oklch(0.35_0_0)] leading-relaxed">
                <p>
                  每一條手鍊出貨前皆經過細心檢查，出貨後恕不提供退換貨服務。
                </p>
                <p>
                  若收到商品有瑕疵，或手圍尺寸有任何疑慮，歡迎透過官方 LINE 與我們聯繫，我們將盡力為您協助處理。
                </p>
              </div>
            </section>

            {/* ── 運送說明 ── */}
            <section id="shipping" className="scroll-mt-24">
              <p className="eyebrow mb-3">SHIPPING INFO</p>
              <h2 className="text-2xl font-medium mb-6 pb-4 border-b border-[oklch(0.93_0_0)]" style={{fontFamily: "'Noto Sans TC', 'Helvetica Neue', Helvetica, Arial, sans-serif"}}>運送說明</h2>

              <div className="space-y-6 text-sm font-body font-light text-[oklch(0.35_0_0)] leading-relaxed">
                <div className="space-y-2">
                  <p>• 台灣地區（含離島）：黑貓宅急便（$100）、7-11店到店（$60）單次購買兩條以上免運。</p>
                  <p>• 台灣地區以外：馬來西亞、香港、新加波、美國、英國、澳洲</p>
                </div>
              </div>
            </section>

            {/* ── 付款方式 ── */}
            <section id="payment" className="scroll-mt-24">
              <p className="eyebrow mb-3">PAYMENT</p>
              <h2 className="text-2xl font-medium mb-6 pb-4 border-b border-[oklch(0.93_0_0)]" style={{fontFamily: "'Noto Sans TC', 'Helvetica Neue', Helvetica, Arial, sans-serif"}}>付款方式</h2>

              <div className="space-y-2 text-sm font-body font-light text-[oklch(0.35_0_0)] leading-relaxed">
                <p>• 台灣地區（含離島）：轉帳、信用卡、Apple pay（信用卡、Apple pay需額外支付2%手續費）</p>
                <p>• 台灣以外：Paypal（需額外支付6%手續費）</p>
              </div>
            </section>

            {/* ── 常見問題 ── */}
            <section id="faq" className="scroll-mt-24">
              <p className="eyebrow mb-3">FAQ</p>
              <h2 className="text-2xl font-medium mb-6 pb-4 border-b border-[oklch(0.93_0_0)]" style={{fontFamily: "'Noto Sans TC', 'Helvetica Neue', Helvetica, Arial, sans-serif"}}>常見問題</h2>

              <div className="space-y-0 divide-y divide-[oklch(0.93_0_0)]">
                {[
                  {
                    q: "水晶真的有效果嗎？",
                    a: "我們的商品為天然礦石飾品，不具任何醫療療效。水晶的能量效果因人而異，許多顧客表示配戴後有心理上的安定感與正向暗示效果。我們建議以開放的心態體驗，並將水晶視為輔助心理與能量的工具。"
                  },
                  {
                    q: "如何保養水晶？",
                    a: "建議每月進行一次淨化：可將水晶放在月光下照射一夜，或使用音缽聲波淨化。避免長時間陽光直射（可能褪色）、避免接觸化學物品（香水、保養品）。洗手或游泳時建議取下。"
                  },
                  {
                    q: "水晶手鍊的尺寸如何選擇？",
                    a: "我們的手鍊採用彈性繩設計，適合大多數手腕尺寸（約 14–18cm）。如有特殊尺寸需求，歡迎聯絡客服客製化訂製。"
                  },
                  {
                    q: "可以同時配戴多條水晶手鍊嗎？",
                    a: "可以！多種水晶的能量可以相互加乘。建議根據你目前最需要的能量方向選擇 2–3 條搭配，避免能量過於複雜。如不確定如何搭配，可以做我們的能量測驗獲得個人化建議。"
                  },
                  {
                    q: "商品是否有保固？",
                    a: "我們提供購買後 30 天的品質保固。如因製作瑕疵（如繩子斷裂、配件脫落），可免費維修或更換。因人為損壞（如拉扯、碰撞）不在保固範圍內，但可付費維修。"
                  },
                  {
                    q: "可以指定送禮包裝嗎？",
                    a: "所有商品均以精美禮盒包裝出貨。如需加購緞帶包裝、手寫祝福卡片等禮品服務，請在訂單備註欄說明，我們將盡力配合。"
                  },
                ].map((item, i) => (
                  <div key={i} className="py-5">
                    <p className="text-sm font-medium text-[oklch(0.1_0_0)] mb-2">Q：{item.q}</p>
                    <p className="text-sm font-body font-light text-[oklch(0.45_0_0)] leading-relaxed pl-4 border-l-2 border-[oklch(0.93_0_0)]">
                      {item.a}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Contact CTA */}
            <div className="bg-[oklch(0.1_0_0)] p-8 text-white text-center">
              <p className="eyebrow text-white/50 mb-3">STILL HAVE QUESTIONS?</p>
              <h3 className="text-xl font-medium mb-2" style={{fontFamily: "'Noto Sans TC', 'Helvetica Neue', Helvetica, Arial, sans-serif"}}>還有其他問題？</h3>
              <p className="text-xs text-white/60 leading-relaxed mb-6">我們的客服團隊週一至週五 10:00–18:00 線上服務</p>
              <Link href="/contact">
                <button className="btn-primary bg-white text-[oklch(0.1_0_0)] hover:bg-[oklch(0.95_0_0)]">
                  聯絡我們
                </button>
              </Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
