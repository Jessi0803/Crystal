export default function About() {
  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#4A4A4A]">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Section 1: Hero */}
      <section className="min-h-[72vh] flex items-center justify-center px-6 text-center">
        <h1
          className="text-3xl sm:text-5xl lg:text-6xl tracking-widest opacity-0 [animation:fadeIn_1.2s_ease-out_forwards]"
          style={{ fontFamily: "'Noto Serif TC', serif" }}
        >
          每一顆水晶，都在等一個對的人
        </h1>
      </section>

      {/* Section 2: The Philosophy */}
      <section className="max-w-6xl mx-auto px-6 py-20 sm:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <blockquote
            className="text-base sm:text-lg leading-relaxed whitespace-pre-line"
            style={{ fontFamily: "'Noto Sans TC', sans-serif" }}
          >
            「椛 · Crystal 相信，每一顆水晶都帶著自己的頻率，它不修復你，它提醒你，你本來就是完整的。
            我們做的不持續手鍊。
            是一個讓你每天早晨戴上它、記得善待自己的理由。」
          </blockquote>
          <div className="order-first lg:order-none">
            <div className="aspect-[4/5] overflow-hidden rounded-[2px]">
              <img
                src="https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=1200&q=80"
                alt="柔焦的水晶手鍊生活照"
                className="w-full h-full object-cover saturate-75 blur-[0.2px]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Brand Name Meaning */}
      <section className="relative px-6 py-24 sm:py-32">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span
            className="text-[170px] sm:text-[240px] leading-none opacity-[0.06]"
            style={{ fontFamily: "'Noto Serif TC', serif" }}
          >
            楓
          </span>
        </div>
        <div className="relative max-w-3xl mx-auto text-center">
          <blockquote
            className="text-base sm:text-lg leading-relaxed whitespace-pre-line"
            style={{ fontFamily: "'Noto Sans TC', sans-serif" }}
          >
            「椛，是日文裡楓葉的字。
            它在最美的時刻落下，卻從不覺得自己在消逝
            那是一種溫柔的、向內的力量。」
          </blockquote>
        </div>
      </section>

      {/* Section 4: The Anchor */}
      <section className="max-w-6xl mx-auto px-6 py-20 sm:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className="aspect-[4/5] overflow-hidden rounded-[2px]">
            <img
              src="https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1200&q=80"
              alt="手部觸摸手鍊的特寫圖"
              className="w-full h-full object-cover"
            />
          </div>
          <blockquote
            className="text-base sm:text-lg leading-relaxed whitespace-pre-line"
            style={{ fontFamily: "'Noto Sans TC', sans-serif" }}
          >
            「我們相信療癒不是一個目的地，而是你每天與自己相處的方式。
            水晶不是魔法，但它是一個錨點，讓你在忙碌、混亂、或疲憊的日子裡，摸到手腕上的那條手鍊，想起自己值得被好好對待」
          </blockquote>
        </div>
      </section>

      {/* Section 5: Final Message */}
      <section className="px-6 pt-20 pb-32 sm:pt-24 sm:pb-40">
        <div className="max-w-5xl mx-auto min-h-[32vh] flex items-end justify-center text-center">
          <p
            className="text-xl sm:text-3xl md:text-4xl font-semibold leading-relaxed"
            style={{ fontFamily: "'Noto Serif TC', serif" }}
          >
            我們的每一條手鍊，都是為了那個正在修復中的你而存在。
          </p>
        </div>
      </section>
    </div>
  );
}
