// 日日好日 — 購物說明頁面
// Design: Vacanza-inspired minimal layout with anchor navigation
import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ChevronRight, CircleHelp, MessageCircle } from "lucide-react";

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
                    q: "手鍊有保固嗎？",
                    a: "我們3個月內有免費1次的保固，項目有：換線、五金汰換、損壞維修；如需改尺寸、改設計屬於重新設計，不包含在免費保固的範圍內，如有需要，需酌收200$重新設計費"
                  },
                  {
                    q: "手鍊要怎麼照顧？",
                    a: "建議最少每月淨化與消磁1次、請勿以緊繃狀態拉扯水晶手鍊許久、飾品不適合佩戴洗澡，但如果非常想要24小時戴著，請選擇金飾"
                  },
                  {
                    q: "手鍊怎麼淨化？",
                    a: "• 水晶碎石或水晶洞的話，就是單純放在他們上面就可以了！\n• 鼠尾草精油的話就是用水氧機把精油蒸出來 那個煙去過手鍊\n• 月光的話就是可以放在照得到月光的地方放置一個晚上然後要注意白天太陽出來的時候不要曬太久\n• 天使音叉就是買來敲敲敲就可以了\n• 另外，水晶碎石我們也有販售 80$一包是一條手鍊的量"
                  },
                  {
                    q: "如何開啟水晶能量？",
                    a: "⁃ 雙手捧著手環，放在胸口\n⁃ 告訴水晶你的名字、你的願望\n⁃ 洗完澡後許願最佳\n⁃ 許願請使用正面訊息，不可詛咒\n⁃ 許願時不要三心二意\n⁃ 一條水晶手鍊只能附載一個願望"
                  },
                  {
                    q: "多久要淨化一次手鍊",
                    a: "當你覺得水晶看起來比較暗沉、霧霧的就代表需要進行淨化囉~平時若有想到也可以隨時淨化"
                  },
                  {
                    q: "淨化後要重新和水晶連結嗎",
                    a: "只要把你想說的話或願望寫在紙上壓在淨化的容器下面就可以了"
                  },
                  {
                    q: "預約客製化BCD，還可以許願特定功效嗎？",
                    a: "可以喔！可以跟我許願，這樣就是幫你搭配能量解析缺乏運勢＋你指定的運勢"
                  },
                  {
                    q: "預約客製化B方案，可以搭配多個題組嗎？",
                    a: "可以喔！需要搭配手鍊的題組都有9折優惠，也會用多題組的解析配置手鍊"
                  },
                  {
                    q: "手圍怎麼量",
                    a: "拿皮尺平貼在想戴手鍊的位置上，計算出「淨手圍」，請不要自行+0.5cm、+1cm，如果需要微鬆、很鬆，可以跟我們說！我們會幫你調整"
                  },
                ].map((item, i) => (
                  <div key={i} className="py-5">
                    <p className="text-sm font-medium text-[oklch(0.1_0_0)] mb-2">Q：{item.q}</p>
                    <p className="text-sm font-body font-light text-[oklch(0.45_0_0)] leading-relaxed pl-4 border-l-2 border-[oklch(0.93_0_0)] whitespace-pre-line">
                      {item.a}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Contact CTA */}
            <div className="relative bg-[#F8F5F2] p-8 sm:p-10 text-center overflow-hidden">
              <div className="pointer-events-none absolute -top-20 -left-16 w-64 h-64 rounded-full bg-[rgba(199,174,255,0.14)] blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -right-10 w-72 h-72 rounded-full bg-[rgba(156,214,255,0.12)] blur-3xl" />
              <p className="eyebrow text-[0.55rem] text-[oklch(0.45_0.01_60)] mb-3">STILL HAVE QUESTIONS?</p>
              <h3 className="text-base font-medium mb-5 text-[oklch(0.28_0.01_40)]" style={{fontFamily: "'Noto Sans TC', 'Helvetica Neue', Helvetica, Arial, sans-serif"}}>還有其他問題？</h3>
              <div className="flex flex-col items-center justify-center gap-5 mt-6">
                <Link href="/contact">
                  <button className="w-full sm:w-[560px] h-16 border border-[oklch(0.78_0.01_60)] bg-white text-[oklch(0.26_0.01_40)] hover:border-[oklch(0.68_0.02_55)] hover:bg-[oklch(0.99_0.003_90)] transition-all duration-300 flex items-center justify-center gap-2.5 text-sm sm:text-base tracking-[0.05em] font-light shadow-[0_6px_20px_rgba(120,100,80,0.08)]"
                    style={{ fontFamily: "'Noto Serif TC', serif" }}>
                    <MessageCircle className="w-4 h-4 text-[oklch(0.48_0.03_55)]" strokeWidth={1.8} />
                    聯絡我們
                  </button>
                </Link>
                <div className="w-full sm:w-[560px]">
                  <button
                    onClick={() => window.dispatchEvent(new Event("open-chatbot"))}
                    className="w-full h-16 bg-gradient-to-r from-[#8E735B] via-[#A8835F] to-[#7A614D] text-white hover:brightness-105 transition-all duration-300 shadow-[0_10px_24px_rgba(122,97,77,0.28)] hover:shadow-[0_14px_28px_rgba(122,97,77,0.34)] flex items-center justify-center gap-2.5 text-sm sm:text-base tracking-[0.02em] font-light"
                    style={{ fontFamily: "'Noto Serif TC', serif" }}
                  >
                    <CircleHelp className="w-4 h-4 text-[#F8F1E9]" strokeWidth={1.8} />
                    問問24小時椛小助人工智能服務
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
