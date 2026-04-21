// 日日好日 — Knowledge Page
// Design: Vacanza-inspired minimal accordion layout
import { useState } from "react";
import { Link } from "wouter";
import { ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { crystalKnowledge, energyQuotes } from "@/lib/data";

const additionalKnowledge = [
  {
    id: 5,
    title: "水晶的顏色代表什麼意思？",
    category: "水晶入門",
    content: "水晶的顏色與其能量特性密切相關。粉色（粉水晶）對應心輪，主愛情與療癒；紫色（紫水晶）對應頂輪，主靈性與智慧；黃色（黃水晶）對應太陽神經叢，主財富與自信；黑色（黑曜石）對應根輪，主保護與接地氣；白色（白水晶）被稱為萬用水晶，可放大其他水晶的能量。",
    icon: "◈"
  },
  {
    id: 6,
    title: "第一次買水晶，從哪裡開始？",
    category: "選購指南",
    content: "建議初學者從白水晶或粉水晶開始。白水晶是最通用的能量石，適合所有人；粉水晶能量溫柔，適合想提升自我愛與人際關係者。選購時，最重要的是「感覺」——哪顆讓你有吸引力就選哪顆，直覺往往是最好的嚮導。",
    icon: "◇"
  },
  {
    id: 7,
    title: "水晶可以多人共用嗎？",
    category: "常見問題",
    content: "能量學說認為水晶會吸收配戴者的能量，因此不建議多人共用，尤其是用於個人能量調整的手鍊。若要送人，建議在送出前先進行淨化，讓水晶恢復中性狀態，再由新主人重新設定意圖。",
    icon: "◉"
  },
  {
    id: 8,
    title: "水晶碎了或裂了，代表什麼？",
    category: "常見問題",
    content: "水晶碎裂可能有幾個原因：物理碰撞、溫差過大、或能量飽和。部分能量學說認為水晶碎裂是因為它「完成了使命」或「吸收了過多負能量」。無論如何，碎裂的水晶可以感謝它的陪伴，然後以自然方式處理（如埋入土中）。",
    icon: "◆"
  }
];

const allKnowledge = [...crystalKnowledge, ...additionalKnowledge];

export default function Knowledge() {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState("全部");

  const categories = ["全部", "水晶入門", "選購指南", "保養方法", "配戴方式", "常見問題"];

  const filtered = activeCategory === "全部"
    ? allKnowledge
    : allKnowledge.filter((k) => k.category === activeCategory);

  return (
    <div className="min-h-screen bg-white page-enter">

      {/* Page Header */}
      <div className="border-b border-[oklch(0.93_0_0)] py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1440px] mx-auto">
          <p className="eyebrow mb-2">CRYSTAL KNOWLEDGE</p>
          <h1 className="heading-lg">水晶知識小教室</h1>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

          {/* Left: Accordion */}
          <div className="lg:col-span-2">
            {/* Category Filter */}
            <div className="flex items-center gap-0 overflow-x-auto mb-8 border-b border-[oklch(0.93_0_0)]">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`shrink-0 px-4 py-2.5 text-[0.7rem] tracking-[0.1em] font-body border-b-2 transition-colors ${
                    activeCategory === cat
                      ? "border-[oklch(0.1_0_0)] text-[oklch(0.1_0_0)]"
                      : "border-transparent text-[oklch(0.55_0_0)] hover:text-[oklch(0.1_0_0)]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Accordion */}
            <div className="divide-y divide-[oklch(0.93_0_0)]">
              {filtered.map((item) => (
                <div key={item.id}>
                  <button
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    className="w-full flex items-center justify-between py-5 text-left group"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-lg text-[oklch(0.72_0.09_70)]">{item.icon}</span>
                      <div>
                        <span className="tag mb-1 inline-block">{item.category}</span>
                        <h3 className="text-sm font-body font-medium text-[oklch(0.1_0_0)] group-hover:text-[oklch(0.4_0_0)] transition-colors">
                          {item.title}
                        </h3>
                      </div>
                    </div>
                    {expandedId === item.id
                      ? <ChevronUp className="w-4 h-4 text-[oklch(0.55_0_0)] shrink-0 ml-4" />
                      : <ChevronDown className="w-4 h-4 text-[oklch(0.55_0_0)] shrink-0 ml-4" />
                    }
                  </button>
                  {expandedId === item.id && (
                    <div className="pb-5 pl-10">
                      <p className="text-sm font-body font-light text-[oklch(0.4_0_0)] leading-relaxed">
                        {item.content}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Sidebar */}
          <div className="space-y-8">
            {/* Energy Quotes */}
            <div className="border border-[oklch(0.93_0_0)] p-6">
              <p className="eyebrow mb-5">ENERGY QUOTES · 能量語錄</p>
              <div className="space-y-5">
                {energyQuotes.slice(0, 4).map((quote, i) => (
                  <blockquote key={i} className="text-base font-light text-[oklch(0.2_0_0)] leading-relaxed border-l-2 border-[oklch(0.88_0.04_15)] pl-4" style={{fontFamily: "'Noto Sans TC', 'Helvetica Neue', Helvetica, Arial, sans-serif"}}>
                    {quote}
                  </blockquote>
                ))}
              </div>
            </div>

            {/* Quiz CTA */}
            <div className="bg-[oklch(0.1_0_0)] p-6 text-white">
              <p className="eyebrow text-white/50 mb-3">ENERGY QUIZ</p>
              <h3 className="text-xl font-medium mb-3" style={{fontFamily: "'Noto Sans TC', 'Helvetica Neue', Helvetica, Arial, sans-serif"}}>不確定選哪個？</h3>
              <p className="text-xs font-body font-light text-white/60 leading-relaxed mb-5">
                做個 30 秒能量測驗，找到最適合你的水晶。
              </p>
              <Link href="/quiz">
                <button className="flex items-center gap-2 text-xs font-body tracking-[0.12em] text-white border-b border-white/40 pb-0.5 hover:border-white transition-colors">
                  立即測驗 <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </Link>
            </div>

            {/* Shop CTA */}
            <div className="border border-[oklch(0.93_0_0)] p-6">
              <p className="eyebrow mb-3">SHOP NOW</p>
              <h3 className="text-xl font-medium text-[oklch(0.1_0_0)] mb-3" style={{fontFamily: "'Noto Sans TC', 'Helvetica Neue', Helvetica, Arial, sans-serif"}}>開始選購</h3>
              <p className="text-xs font-body font-light text-[oklch(0.5_0_0)] leading-relaxed mb-5">
                探索我們精選的天然能量水晶系列。
              </p>
              <Link href="/products">
                <button className="btn-primary w-full justify-center text-xs">
                  查看所有商品 <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
