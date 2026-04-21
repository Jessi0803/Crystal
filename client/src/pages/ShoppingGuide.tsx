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

              <div className="space-y-6 text-sm font-body font-light text-[oklch(0.35_0_0)] leading-relaxed">
                <div>
                  <h3 className="text-sm font-medium text-[oklch(0.1_0_0)] mb-2">退貨條件</h3>
                  <ul className="space-y-2 pl-4">
                    <li className="flex gap-2"><span className="text-[oklch(0.72_0.09_70)] shrink-0">·</span>商品自收貨日起 <strong className="text-[oklch(0.1_0_0)]">7 天內</strong>可申請退換貨（鑑賞期）</li>
                    <li className="flex gap-2"><span className="text-[oklch(0.72_0.09_70)] shrink-0">·</span>商品須保持<strong className="text-[oklch(0.1_0_0)]">全新未使用</strong>狀態，含原始包裝、吊牌、附件</li>
                    <li className="flex gap-2"><span className="text-[oklch(0.72_0.09_70)] shrink-0">·</span>因個人喜好或非商品瑕疵的退貨，運費由買家自行負擔</li>
                    <li className="flex gap-2"><span className="text-[oklch(0.72_0.09_70)] shrink-0">·</span>商品瑕疵或寄送錯誤，運費由本店負擔</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-[oklch(0.1_0_0)] mb-2">不接受退換貨情形</h3>
                  <ul className="space-y-2 pl-4">
                    <li className="flex gap-2"><span className="text-[oklch(0.72_0.09_70)] shrink-0">·</span>商品已配戴使用、有磨損或污漬</li>
                    <li className="flex gap-2"><span className="text-[oklch(0.72_0.09_70)] shrink-0">·</span>包裝盒、吊牌已拆除或損毀</li>
                    <li className="flex gap-2"><span className="text-[oklch(0.72_0.09_70)] shrink-0">·</span>特價品、客製化商品、限量商品</li>
                    <li className="flex gap-2"><span className="text-[oklch(0.72_0.09_70)] shrink-0">·</span>超過 7 天鑑賞期</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-[oklch(0.1_0_0)] mb-2">退換貨流程</h3>
                  <ol className="space-y-3 pl-4">
                    {[
                      "聯絡客服（Email 或 LINE），說明退換貨原因並附上訂單編號與商品照片",
                      "客服確認後，將提供退貨地址與包裝說明",
                      "商品寄回後，本店於 3–5 個工作天內完成審核",
                      "退款將於審核通過後 7–14 個工作天內退回原付款帳戶",
                    ].map((step, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="w-5 h-5 bg-[oklch(0.1_0_0)] text-white text-[0.6rem] flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="bg-[oklch(0.97_0_0)] p-5 border-l-2 border-[oklch(0.72_0.09_70)]">
                  <p className="text-xs text-[oklch(0.4_0_0)]">
                    ⚠ 依據消費者保護法，網路購物享有 7 天鑑賞期（非試用期）。鑑賞期內退貨，商品須維持原狀，否則本店有權拒絕退貨或扣除折舊費用。
                  </p>
                </div>
              </div>
            </section>

            {/* ── 運送說明 ── */}
            <section id="shipping" className="scroll-mt-24">
              <p className="eyebrow mb-3">SHIPPING INFO</p>
              <h2 className="text-2xl font-medium mb-6 pb-4 border-b border-[oklch(0.93_0_0)]" style={{fontFamily: "'Noto Sans TC', 'Helvetica Neue', Helvetica, Arial, sans-serif"}}>運送說明</h2>

              <div className="space-y-6 text-sm font-body font-light text-[oklch(0.35_0_0)] leading-relaxed">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: "處理時間", value: "訂單確認後 1–2 個工作天出貨" },
                    { label: "配送時間", value: "出貨後 2–3 個工作天到貨" },
                    { label: "免運門檻", value: "單筆訂單滿 NT$ 1,500 免運費" },
                    { label: "運費", value: "未達門檻收取 NT$ 80 運費" },
                  ].map((item) => (
                    <div key={item.label} className="border border-[oklch(0.93_0_0)] p-4">
                      <p className="text-[0.65rem] tracking-[0.1em] text-[oklch(0.55_0_0)] mb-1">{item.label}</p>
                      <p className="text-sm font-medium text-[oklch(0.1_0_0)]">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <h3 className="text-sm font-medium text-[oklch(0.1_0_0)] mb-2">配送方式</h3>
                  <ul className="space-y-2 pl-4">
                    <li className="flex gap-2"><span className="text-[oklch(0.72_0.09_70)] shrink-0">·</span>黑貓宅急便（宅配到府）</li>
                    <li className="flex gap-2"><span className="text-[oklch(0.72_0.09_70)] shrink-0">·</span>7-ELEVEN 超商取貨</li>
                    <li className="flex gap-2"><span className="text-[oklch(0.72_0.09_70)] shrink-0">·</span>全家便利商店取貨</li>
                  </ul>
                </div>

                <div className="bg-[oklch(0.97_0_0)] p-5 border-l-2 border-[oklch(0.72_0.09_70)]">
                  <p className="text-xs text-[oklch(0.4_0_0)]">
                    📦 所有商品均以精美禮盒包裝出貨，適合自用或送禮。如需加購禮品包裝服務，請在訂單備註欄說明。
                  </p>
                </div>
              </div>
            </section>

            {/* ── 付款方式 ── */}
            <section id="payment" className="scroll-mt-24">
              <p className="eyebrow mb-3">PAYMENT</p>
              <h2 className="text-2xl font-medium mb-6 pb-4 border-b border-[oklch(0.93_0_0)]" style={{fontFamily: "'Noto Sans TC', 'Helvetica Neue', Helvetica, Arial, sans-serif"}}>付款方式</h2>

              <div className="space-y-4 text-sm font-body font-light text-[oklch(0.35_0_0)] leading-relaxed">
                {[
                  { icon: "💳", title: "信用卡付款", desc: "支援 VISA、Mastercard、JCB，可選擇分期付款（3/6/12 期，依各銀行規定）" },
                  { icon: "📱", title: "LINE Pay", desc: "使用 LINE Pay 快速結帳，享有 LINE Points 回饋" },
                  { icon: "🏦", title: "ATM 轉帳", desc: "訂單成立後 24 小時內完成轉帳，逾時訂單將自動取消" },
                  { icon: "🏪", title: "超商代碼繳費", desc: "至 7-ELEVEN、全家、萊爾富、OK 超商繳費，繳費期限為 3 天" },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4 p-5 border border-[oklch(0.93_0_0)] hover:border-[oklch(0.8_0_0)] transition-colors">
                    <span className="text-2xl shrink-0">{item.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-[oklch(0.1_0_0)] mb-1">{item.title}</p>
                      <p className="text-xs text-[oklch(0.5_0_0)]">{item.desc}</p>
                    </div>
                  </div>
                ))}
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
