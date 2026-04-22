import { useEffect, useState } from "react";
import {
  Award,
  BookOpen,
  Briefcase,
  Calendar,
  Gem,
  Gift,
  Leaf,
  MapPin,
  Sparkles,
  Users,
} from "lucide-react";

export default function CrystalWorkshop() {
  const [activeTab, setActiveTab] = useState<"experience" | "entrepreneur">("entrepreneur");

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("opacity-100", "translate-y-0");
          entry.target.classList.remove("opacity-0", "translate-y-10");
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll(".scroll-fade").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [activeTab]);

  return (
    <div className="bg-[#FAF9F6] text-[#333333] min-h-screen font-sans selection:bg-[#D8C3BD]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400&family=Noto+Serif+TC:wght@400;500;700&family=Noto+Sans+TC:wght@300;400&display=swap');
        .font-serif-en { font-family: 'Cormorant Garamond', serif; }
        .font-serif-zh { font-family: 'Noto Serif TC', serif; }
        .font-sans-zh { font-family: 'Noto Sans TC', sans-serif; }
      `}</style>

      <section className="relative py-24 px-6 text-center overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full opacity-5 pointer-events-none">
          <Gem className="w-96 h-96 absolute -top-20 -left-20 rotate-12" />
        </div>

        <div className="max-w-4xl mx-auto scroll-fade opacity-0 translate-y-10 transition-all duration-1000">
          <span className="font-serif-en text-sm tracking-[0.5em] text-[#8E735B] mb-6 block uppercase">Workshop & Course</span>
          <h1 className="text-4xl md:text-5xl font-serif-zh tracking-widest mb-8 leading-tight">
            在頻率中，遇見更好的自己
          </h1>
          <p className="text-gray-500 font-sans-zh font-light tracking-widest text-sm md:text-base max-w-2xl mx-auto leading-loose">
            無論是想開啟一段療癒的時光，或是想將愛好轉化為事業，我們都為您準備了最細緻的引導。
          </p>
        </div>

        <div className="mt-16 flex justify-center gap-4 scroll-fade opacity-0 translate-y-10 transition-all duration-1000 delay-200">
          <button
            onClick={() => setActiveTab("experience")}
            className={`px-8 py-3 rounded-full text-sm font-serif-zh tracking-widest transition-all duration-500 ${activeTab === "experience" ? "bg-[#8E735B] text-white shadow-lg" : "bg-white text-[#8E735B] border border-[#8E735B]/20 hover:border-[#8E735B]"}`}
          >
            生命靈數體驗課
          </button>
          <button
            onClick={() => setActiveTab("entrepreneur")}
            className={`px-8 py-3 rounded-full text-sm font-serif-zh tracking-widest transition-all duration-500 ${activeTab === "entrepreneur" ? "bg-[#8E735B] text-white shadow-lg" : "bg-white text-[#8E735B] border border-[#8E735B]/20 hover:border-[#8E735B]"}`}
          >
            水晶創業全能班
          </button>
        </div>
      </section>

      <section className="pb-32 px-6">
        <div className="max-w-6xl mx-auto">
          {activeTab === "experience" ? (
            <div className="grid md:grid-cols-12 gap-16 items-start">
              <div className="md:col-span-5 scroll-fade opacity-0 translate-y-10 transition-all duration-1000">
                <div className="aspect-[3/4] bg-white p-4 shadow-xl rotate-[-2deg] transition-transform hover:rotate-0 duration-700">
                  <div className="w-full h-full bg-[#E5DCD5] flex items-center justify-center overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1515377905703-c4788e51af15?q=80&w=2070&auto=format&fit=crop" alt="體驗課情境圖" className="object-cover w-full h-full opacity-80" />
                  </div>
                  <p className="mt-4 font-serif-zh text-xs tracking-widest text-center text-[#8E735B]">生命靈數 · 水晶手鍊體驗</p>
                </div>
              </div>

              <div className="md:col-span-7 space-y-12 scroll-fade opacity-0 translate-y-10 transition-all duration-1000 delay-300">
                <div>
                  <h2 className="text-3xl font-serif-zh mb-6 tracking-widest">生命靈數水晶手鍊體驗課</h2>
                  <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-8">
                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-gray-100">
                      <MapPin className="w-3 h-3" /> 桃園火車站開車 7 分鐘
                    </div>
                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-gray-100">
                      <Users className="w-3 h-3" /> 1-4 人小班制
                    </div>
                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-gray-100">
                      <Calendar className="w-3 h-3" /> 1.5 - 2 小時
                    </div>
                  </div>
                  <p className="text-gray-600 leading-loose font-light font-sans-zh">
                    這堂課會讓你學到：
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {[
                    "完整生命靈數計算方法",
                    "全生命靈數/缺數/連線解析",
                    "手鍊搭配色彩學+輔導設計",
                    "獨門手鍊堅實綁法",
                    "水晶保養、淨化、連結方式",
                    "水晶能量知識探討",
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#D8C3BD]" />
                      <span className="text-sm font-light text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-white p-8 border-l-4 border-[#8E735B] shadow-sm">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs text-gray-400 tracking-widest mb-2 uppercase">課程費用 Pricing</p>
                      <h4 className="text-2xl font-serif-en text-[#8E735B]">$2,500 <span className="text-xs text-gray-400 ml-2">(含所有材料費)</span></h4>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[#8E735B] font-medium mb-1">多人同行優惠</p>
                      <p className="text-xs text-gray-500">2 人同行 -$100/人 | 3 人同行 -$150/人</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-24">
              <div className="grid md:grid-cols-2 gap-16 items-center">
                <div className="scroll-fade opacity-0 translate-y-10 transition-all duration-1000">
                  <h2 className="text-3xl font-serif-zh mb-8 tracking-[0.2em]">水晶創業全能班</h2>
                  <p className="text-gray-600 leading-[2] font-light mb-10">
                    不只是手作，更是一套完整的創業思維。我們將從水晶理論、基礎美學，到少見的技術細節，甚至連「小資創業 SOP」都毫無保留地分享給您，陪您建立自己的個人品牌。
                  </p>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-6 bg-white border border-[#E5DCD5] rounded-xl hover:shadow-md transition-shadow">
                      <BookOpen className="w-6 h-6 text-[#8E735B] mb-4" />
                      <h4 className="font-serif-zh text-sm mb-2">3件作品實戰</h4>
                      <p className="text-xs text-gray-400">掌握 6 種核心製作方法</p>
                    </div>
                    <div className="p-6 bg-white border border-[#E5DCD5] rounded-xl hover:shadow-md transition-shadow">
                      <Briefcase className="w-6 h-6 text-[#8E735B] mb-4" />
                      <h4 className="font-serif-zh text-sm mb-2">創業 SOP</h4>
                      <p className="text-xs text-gray-400">進貨、庫存、品質分辨</p>
                    </div>
                  </div>
                </div>
                <div className="scroll-fade opacity-0 translate-y-10 transition-all duration-1000 delay-300">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="aspect-square bg-[#E5DCD5] rounded-2xl overflow-hidden shadow-lg">
                      <img src="https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?q=80&w=2070&auto=format&fit=crop" className="w-full h-full object-cover" alt="課程細節圖" />
                    </div>
                    <div className="aspect-square bg-[#D8C3BD]/30 rounded-2xl p-6 flex flex-col justify-center">
                      <Sparkles className="w-8 h-8 text-[#8E735B] mb-4" />
                      <p className="font-serif-zh text-sm leading-relaxed text-[#8E735B]">
                        包含少見的「U型扣技法」，更有效的保護線材與水晶連結。
                      </p>
                    </div>
                    <div className="col-span-2 aspect-[16/9] bg-[#3D3D3D] rounded-2xl overflow-hidden relative group">
                      <img src="https://images.unsplash.com/photo-1515377905703-c4788e51af15?q=80&w=2070&auto=format&fit=crop" className="w-full h-full object-cover opacity-60 transition-transform duration-700 group-hover:scale-110" alt="水晶課程圖" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-white font-serif-zh tracking-[0.5em] text-lg">小班制教、學、體、驗</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="py-20 bg-white rounded-[3rem] px-8 md:px-20 shadow-sm scroll-fade opacity-0 translate-y-10 transition-all duration-1000">
                <h3 className="text-center font-serif-zh text-2xl mb-20 tracking-widest">課程大綱 Syllabus</h3>
                <div className="relative">
                  <div className="absolute left-[15px] md:left-1/2 md:-translate-x-1/2 top-0 bottom-0 w-px bg-[#E5DCD5]" />

                  {[
                    { time: "2HR", title: "理論與知識", desc: "基礎美學、金屬材質與常用配件配飾、各水晶能量統整" },
                    { time: "3HR", title: "實戰手作", desc: "瞭解獨門配色秘訣、獨門打結與製作手法 (有效保護線材)" },
                    { time: "0.5HR", title: "喚醒與連結", desc: "手把手教授製作技巧、上述知識運用、淨化保養" },
                  ].map((step, i) => (
                    <div key={i} className={`relative flex items-center mb-16 last:mb-0 ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}>
                      <div className="hidden md:block w-1/2 px-12" />
                      <div className="absolute left-0 md:left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white border-2 border-[#8E735B] flex items-center justify-center z-10">
                        <div className="w-2 h-2 rounded-full bg-[#8E735B]" />
                      </div>
                      <div className={`w-full md:w-1/2 pl-12 md:pl-0 ${i % 2 === 0 ? "md:pl-12" : "md:pr-12 md:text-right"}`}>
                        <span className="font-serif-en text-[#8E735B] text-sm tracking-widest">{step.time}</span>
                        <h4 className="font-serif-zh text-lg mb-2 mt-1">{step.title}</h4>
                        <p className="text-sm text-gray-400 font-light leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-8 scroll-fade opacity-0 translate-y-10 transition-all duration-1000">
                {[
                  { title: "小資創業 SOP", icon: <Award className="w-5 h-5" />, list: ["水晶創業應知道的大小事", "進貨方式與庫存管理", "真假分辨與挑選品質"] },
                  { title: "全能技法", icon: <Gem className="w-5 h-5" />, list: ["彈力繩、磁扣、龍蝦扣", "調節繩、項鍊、吊飾", "獨門 U 型扣技法"] },
                  { title: "專屬贈禮", icon: <Gift className="w-5 h-5" />, list: ["早鳥優惠 -$888/人", "IG 分享送許願蠟燭", "淨化水晶一包"] },
                ].map((box, i) => (
                  <div key={i} className="p-10 bg-white border-t-2 border-[#8E735B] flex flex-col items-center text-center">
                    <div className="mb-6 text-[#8E735B]">{box.icon}</div>
                    <h4 className="font-serif-zh mb-6 tracking-widest text-lg">{box.title}</h4>
                    <ul className="space-y-4">
                      {box.list.map((li, j) => <li key={j} className="text-xs text-gray-500 font-light">{li}</li>)}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="bg-[#8E735B] rounded-[2rem] p-12 text-center text-white scroll-fade opacity-0 translate-y-10 transition-all duration-1000">
                <span className="font-serif-en tracking-[0.5em] text-xs opacity-70 block mb-4">ENROLLMENT OPEN</span>
                <h3 className="text-3xl font-serif-zh mb-8 tracking-widest">早鳥優惠價 $12,888 <span className="text-sm opacity-60">/ 共 6 小時</span></h3>
                <div className="flex flex-col md:flex-row justify-center gap-8 items-center mb-12">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 opacity-50" />
                    <span className="text-sm tracking-widest">兩人同行 再減 -$888 / 人</span>
                  </div>
                  <div className="w-1 h-1 rounded-full bg-white opacity-30 hidden md:block" />
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 opacity-50" />
                    <span className="text-sm tracking-widest">桃園小檜溪區 (預約制)</span>
                  </div>
                </div>
                <button className="bg-white text-[#8E735B] px-12 py-5 rounded-full font-serif-zh text-sm tracking-[0.3em] hover:shadow-2xl transition-all hover:-translate-y-1">
                  私訊報名「人數 + 日期」
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <footer className="py-20 bg-[#FAF9F6] border-t border-gray-100 text-center">
        <Leaf className="w-6 h-6 mx-auto mb-8 text-[#D8C3BD]" />
        <p className="font-serif-zh text-sm tracking-widest text-gray-400">
          願每一顆水晶，都能指引您找到內在的完整。
        </p>
      </footer>
    </div>
  );
}
