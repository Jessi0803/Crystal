// 椛 ˙Crystal — 客製化方案頁面
import { ExternalLink } from "lucide-react";

const LINE_URL = "https://line.me/R/ti/p/@011tymeh";

const plans = [
  {
    id: "A",
    title: "純客製水晶手鍊",
    price: "1,500$ ± 300$",
    addons: [],
    description: [
      "可提供想要的功效、色系、款式",
      "或是也可以跟我討論",
      "如愛情、溝通能力、財運、疾病等等，",
      "提供初版免費修改 1 次。",
    ],
    accent: "oklch(0.72 0.09 70)",
  },
  {
    id: "B",
    title: "塔羅 × 水晶手鍊",
    price: "1,500$ ± 300$",
    addons: ["+ 加購的塔羅占卜打 9 折", "（推薦搭配流年運勢或守護神）"],
    description: [
      "提供塔羅解析，並且我將透過解析，分",
      "析出缺失的能量，利用水晶能量補足。",
      "（也可以許願想額外加強的能量！）",
      "提供初版免費修改 1 次。",
    ],
    accent: "oklch(0.65 0.12 290)",
  },
  {
    id: "C",
    title: "脈輪檢測 × 水晶手鍊",
    price: "1,500$ ± 300$",
    addons: ["+ 加購脈輪檢測 500$"],
    description: [
      "以靈擺與塔羅測出你的七脈輪能量狀",
      "況，並提供一份專屬脈輪檢測報告，利",
      "用水晶能量去補足你的脈輪能量缺失。",
      "（也可以許願想額外加強的能量！）",
      "提供初版免費修改 1 次。",
    ],
    accent: "oklch(0.62 0.14 200)",
  },
  {
    id: "D",
    title: "生命靈數 × 水晶手鍊",
    price: "1,500$ ± 300$",
    addons: ["+ 加購生命靈數檢測 500$"],
    description: [
      "會透過西元出生年月日去找出天賦數、",
      "生命數、先天數、星座數，去找出缺數",
      "並透過生命數與缺數去做能量搭配。",
      "（也可以許願想額外加強的能量！）",
      "提供初版免費修改 1 次。",
    ],
    accent: "oklch(0.68 0.11 30)",
  },
];

export default function Custom() {
  return (
    <div className="min-h-screen bg-[oklch(0.98_0.005_240)] page-enter">
      {/* ── Hero ── */}
      <section className="pt-16 pb-10 text-center px-4">
        <p className="text-[0.6rem] tracking-[0.3em] text-[oklch(0.55_0_0)] uppercase mb-4">
          CUSTOM CRYSTAL · 客製化服務
        </p>
        <h1
          className="text-3xl sm:text-4xl font-light text-[oklch(0.1_0_0)] mb-4"
          style={{
            fontFamily: "'Noto Serif TC', serif",
            letterSpacing: "0.06em",
            lineHeight: 1.4,
          }}
        >
          專屬於你的<br />
          <em className="not-italic" style={{ color: "oklch(0.72 0.09 70)", fontWeight: 400 }}>
            能量水晶手鍊
          </em>
        </h1>
        <p
          className="text-sm text-[oklch(0.45_0_0)] leading-relaxed max-w-md mx-auto"
          style={{ fontFamily: "'Noto Sans TC', sans-serif", fontWeight: 300 }}
        >
          每一顆水晶都有獨特的能量頻率，<br />
          讓我根據你的需求，為你量身打造最適合的手鍊。
        </p>
      </section>

      {/* ── Plans Grid ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-white border border-[oklch(0.92_0_0)] rounded-sm overflow-hidden hover:shadow-md transition-shadow duration-300"
            >
              {/* Card Header */}
              <div
                className="px-8 pt-8 pb-5 text-center"
                style={{
                  background: `linear-gradient(135deg, oklch(0.97 0.01 240) 0%, oklch(0.95 0.02 240) 100%)`,
                }}
              >
                <div
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full text-white text-sm font-medium mb-4"
                  style={{ backgroundColor: plan.accent }}
                >
                  {plan.id}
                </div>
                <h2
                  className="text-xl font-medium text-[oklch(0.15_0_0)] mb-3"
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    letterSpacing: "0.05em",
                  }}
                >
                  {plan.title}
                </h2>
                <p
                  className="text-base font-medium"
                  style={{ color: plan.accent, fontFamily: "'Noto Sans TC', sans-serif" }}
                >
                  費用：{plan.price}
                </p>
                {plan.addons.map((addon, i) => (
                  <p
                    key={i}
                    className="text-xs text-[oklch(0.45_0_0)] mt-1 leading-relaxed"
                    style={{ fontFamily: "'Noto Sans TC', sans-serif", fontWeight: 300 }}
                  >
                    {addon}
                  </p>
                ))}
              </div>

              {/* Card Body */}
              <div className="px-8 py-6">
                <p
                  className="text-[0.65rem] tracking-[0.15em] text-[oklch(0.55_0_0)] uppercase mb-3"
                  style={{ fontFamily: "'Noto Sans TC', sans-serif" }}
                >
                  服務內容
                </p>
                <div className="space-y-1">
                  {plan.description.map((line, i) => (
                    <p
                      key={i}
                      className="text-sm text-[oklch(0.3_0_0)] leading-relaxed text-center"
                      style={{ fontFamily: "'Noto Sans TC', sans-serif", fontWeight: 300 }}
                    >
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── LINE CTA ── */}
        <div className="mt-12 text-center">
          <div className="inline-block bg-white border border-[oklch(0.9_0_0)] rounded-sm px-10 py-8 max-w-md w-full">
            <p className="text-[0.6rem] tracking-[0.25em] text-[oklch(0.55_0_0)] uppercase mb-3">
              CONTACT US
            </p>
            <h3
              className="text-lg font-light text-[oklch(0.1_0_0)] mb-2"
              style={{ fontFamily: "'Noto Serif TC', serif", letterSpacing: "0.05em" }}
            >
              想了解更多？
            </h3>
            <p
              className="text-sm text-[oklch(0.45_0_0)] leading-relaxed mb-6"
              style={{ fontFamily: "'Noto Sans TC', sans-serif", fontWeight: 300 }}
            >
              歡迎透過 LINE 客服與我們聯繫，<br />
              我們將為你提供專屬的客製化諮詢服務。
            </p>
            <a
              href={LINE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-3 text-white text-sm tracking-[0.1em] transition-opacity hover:opacity-90"
              style={{
                backgroundColor: "#06C755",
                fontFamily: "'Noto Sans TC', sans-serif",
                fontWeight: 400,
              }}
            >
              {/* LINE 官方綠色 icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
              </svg>
              聯繫 LINE 客服
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
