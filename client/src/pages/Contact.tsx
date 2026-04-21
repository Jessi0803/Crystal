// 日日好日 — 聯絡我們頁面
// Design: Vacanza-inspired minimal contact page
import { Link } from "wouter";
import { ChevronRight, Mail, Phone, Instagram, Clock } from "lucide-react";

export default function Contact() {
  return (
    <div className="min-h-screen bg-white page-enter">

      {/* Page Header */}
      <div className="border-b border-[oklch(0.93_0_0)] py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1440px] mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <Link href="/"><span className="text-[0.65rem] font-body text-[oklch(0.55_0_0)] hover:text-[oklch(0.1_0_0)] transition-colors">首頁</span></Link>
            <ChevronRight className="w-3 h-3 text-[oklch(0.7_0_0)]" />
            <span className="text-[0.65rem] font-body text-[oklch(0.1_0_0)]">聯絡我們</span>
          </div>
          <p className="eyebrow mb-2">CONTACT US</p>
          <h1 className="heading-lg">聯絡我們</h1>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">

          {/* Left: Contact Info */}
          <div>
            <p className="text-sm font-body font-light text-[oklch(0.45_0_0)] leading-relaxed mb-10 max-w-md">
              有任何關於商品、訂單或能量水晶的問題，歡迎透過以下方式聯絡我們。我們將在 1–2 個工作天內回覆您。
            </p>

            <div className="space-y-6">
              {[
                {
                  icon: <Mail className="w-4 h-4" strokeWidth={1.5} />,
                  label: "電子信箱",
                  value: "hello@rijihori.com",
                  sub: "一般詢問、訂單問題",
                  href: "mailto:hello@rijihori.com",
                },
                {
                  icon: <Instagram className="w-4 h-4" strokeWidth={1.5} />,
                  label: "Instagram",
                  value: "@rijihori.crystal",
                  sub: "商品諮詢、新品資訊",
                  href: "https://instagram.com",
                },
                {
                  icon: <Phone className="w-4 h-4" strokeWidth={1.5} />,
                  label: "LINE 官方帳號",
                  value: "@rijihori",
                  sub: "即時客服、訂單查詢",
                  href: "https://line.me",
                },
                {
                  icon: <Clock className="w-4 h-4" strokeWidth={1.5} />,
                  label: "客服時間",
                  value: "週一至週五 10:00–18:00",
                  sub: "例假日及國定假日休息",
                  href: null,
                },
              ].map((item) => (
                <div key={item.label} className="flex gap-4 py-5 border-b border-[oklch(0.93_0_0)]">
                  <div className="w-8 h-8 border border-[oklch(0.93_0_0)] flex items-center justify-center shrink-0 text-[oklch(0.4_0_0)]">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-[0.65rem] tracking-[0.1em] text-[oklch(0.55_0_0)] mb-0.5">{item.label}</p>
                    {item.href ? (
                      <a href={item.href} target={item.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
                        className="text-sm font-medium text-[oklch(0.1_0_0)] hover:text-[oklch(0.4_0_0)] transition-colors">
                        {item.value}
                      </a>
                    ) : (
                      <p className="text-sm font-medium text-[oklch(0.1_0_0)]">{item.value}</p>
                    )}
                    <p className="text-xs text-[oklch(0.6_0_0)] mt-0.5">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Links */}
            <div className="mt-10">
              <p className="eyebrow mb-4">常見問題快速連結</p>
              <div className="space-y-2">
                {[
                  { label: "退換貨說明", href: "/shopping-guide#return" },
                  { label: "運送說明", href: "/shopping-guide#shipping" },
                  { label: "付款方式", href: "/shopping-guide#payment" },
                  { label: "水晶保養方式", href: "/knowledge" },
                ].map((item) => (
                  <Link key={item.href} href={item.href}>
                    <div className="flex items-center justify-between py-2.5 text-sm font-body text-[oklch(0.35_0_0)] hover:text-[oklch(0.1_0_0)] transition-colors group cursor-pointer">
                      <span>{item.label}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-[oklch(0.7_0_0)] group-hover:text-[oklch(0.3_0_0)] transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Message Form */}
          <div>
            <div className="border border-[oklch(0.93_0_0)] p-8">
              <p className="eyebrow mb-2">SEND A MESSAGE</p>
              <h2 className="text-xl font-medium mb-6" style={{fontFamily: "'Noto Sans TC', 'Helvetica Neue', Helvetica, Arial, sans-serif"}}>傳送訊息</h2>

              <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); alert("訊息已送出！我們將於 1–2 個工作天內回覆您。"); }}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[0.65rem] tracking-[0.1em] text-[oklch(0.4_0_0)] mb-1.5">姓名 *</label>
                    <input
                      type="text"
                      required
                      placeholder="您的姓名"
                      className="w-full border border-[oklch(0.9_0_0)] px-3 py-2.5 text-sm font-body text-[oklch(0.1_0_0)] placeholder:text-[oklch(0.75_0_0)] focus:outline-none focus:border-[oklch(0.1_0_0)] transition-colors bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[0.65rem] tracking-[0.1em] text-[oklch(0.4_0_0)] mb-1.5">電話</label>
                    <input
                      type="tel"
                      placeholder="09XX-XXX-XXX"
                      className="w-full border border-[oklch(0.9_0_0)] px-3 py-2.5 text-sm font-body text-[oklch(0.1_0_0)] placeholder:text-[oklch(0.75_0_0)] focus:outline-none focus:border-[oklch(0.1_0_0)] transition-colors bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[0.65rem] tracking-[0.1em] text-[oklch(0.4_0_0)] mb-1.5">電子信箱 *</label>
                  <input
                    type="email"
                    required
                    placeholder="your@email.com"
                    className="w-full border border-[oklch(0.9_0_0)] px-3 py-2.5 text-sm font-body text-[oklch(0.1_0_0)] placeholder:text-[oklch(0.75_0_0)] focus:outline-none focus:border-[oklch(0.1_0_0)] transition-colors bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[0.65rem] tracking-[0.1em] text-[oklch(0.4_0_0)] mb-1.5">詢問類別</label>
                  <select className="w-full border border-[oklch(0.9_0_0)] px-3 py-2.5 text-sm font-body text-[oklch(0.1_0_0)] focus:outline-none focus:border-[oklch(0.1_0_0)] transition-colors bg-white appearance-none">
                    <option value="">請選擇</option>
                    <option value="order">訂單問題</option>
                    <option value="product">商品諮詢</option>
                    <option value="return">退換貨申請</option>
                    <option value="shipping">運送查詢</option>
                    <option value="custom">客製化訂製</option>
                    <option value="other">其他</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[0.65rem] tracking-[0.1em] text-[oklch(0.4_0_0)] mb-1.5">訊息內容 *</label>
                  <textarea
                    required
                    rows={5}
                    placeholder="請描述您的問題或需求..."
                    className="w-full border border-[oklch(0.9_0_0)] px-3 py-2.5 text-sm font-body text-[oklch(0.1_0_0)] placeholder:text-[oklch(0.75_0_0)] focus:outline-none focus:border-[oklch(0.1_0_0)] transition-colors bg-white resize-none"
                  />
                </div>

                <button type="submit" className="btn-primary w-full justify-center">
                  送出訊息
                </button>

                <p className="text-[0.65rem] text-[oklch(0.6_0_0)] text-center leading-relaxed">
                  我們將於 1–2 個工作天內回覆。緊急事項請透過 LINE 官方帳號聯絡。
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
