// 日日好日 — 聯絡我們頁面
// Design: Vacanza-inspired minimal contact page
import { Link } from "wouter";
import { ChevronRight, Phone, Instagram } from "lucide-react";

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
              有任何關於商品、訂單或能量水晶的問題，歡迎透過以下方式聯絡我們。
            </p>

            <div className="space-y-6">
              {[
                {
                  icon: <Instagram className="w-4 h-4" strokeWidth={1.5} />,
                  label: "Instagram",
                  value: "gooday_tarot_",
                  sub: "",
                  href: "https://instagram.com/gooday_tarot_",
                },
                {
                  icon: <Phone className="w-4 h-4" strokeWidth={1.5} />,
                  label: "LINE 官方帳號",
                  value: "@011tymeh",
                  sub: "",
                  href: "https://line.me/R/ti/p/@011tymeh",
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
                  { label: "常見問題", href: "/shopping-guide#faq" },
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

          {/* Right: Quick Contact Card */}
          <div className="lg:pt-2">
            <div className="border border-[oklch(0.93_0_0)] bg-[oklch(0.98_0.005_240)] p-8 sm:p-10">
              <p className="eyebrow mb-3">QUICK CONTACT</p>
              <h2
                className="text-xl font-medium text-[oklch(0.12_0_0)] mb-3"
                style={{ fontFamily: "'Noto Sans TC', 'Helvetica Neue', Helvetica, Arial, sans-serif" }}
              >
                立即聯繫我們
              </h2>
              <p className="text-sm font-body font-light text-[oklch(0.45_0_0)] leading-relaxed mb-8">
                官方管道僅提供 LINE 與 Instagram，點擊下方按鈕即可直接前往。
              </p>

              <div className="space-y-3">
                <a
                  href="https://line.me/R/ti/p/@011tymeh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-12 inline-flex items-center justify-center text-sm tracking-[0.08em] text-white bg-[#06C755] hover:opacity-90 transition-opacity"
                >
                  前往官方 LINE
                </a>
                <a
                  href="https://instagram.com/gooday_tarot_"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-12 inline-flex items-center justify-center text-sm tracking-[0.08em] text-[oklch(0.18_0_0)] border border-[oklch(0.85_0_0)] bg-white hover:border-[oklch(0.7_0_0)] transition-colors"
                >
                  前往 Instagram
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
