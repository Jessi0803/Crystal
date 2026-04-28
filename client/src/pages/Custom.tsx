import { useEffect } from "react";
import {
  Sparkles,
  Wand2,
  Fingerprint,
  Waves,
  ChevronDown,
  MessageCircle,
  ArrowRight,
  Flower2,
  Gem,
  Heart,
  Coins,
  ShieldCheck,
  Star,
  Zap,
} from "lucide-react";
import { Link } from "wouter";

const LINE_URL = "https://line.me/R/ti/p/@011tymeh";

const plans = [
  {
    id: "A",
    title: "純客製水晶手鍊",
    price: "1,500$ ± 300$",
    icon: <Gem className="w-5 h-5" />,
    features: [
      "可提供想要的功效、色系、款式",
      "或是也可以跟我討論",
      "如愛情、溝通能力、財運、疾病等等，",
      "提供初版免費修改 1 次。",
    ],
    bgColor: "bg-[#F5EDD8]",
    formPath: "/custom/form",
  },
  {
    id: "B",
    title: "塔羅 × 水晶手鍊",
    price: "2,399$ ± 300$",
    icon: <Sparkles className="w-5 h-5" />,
    features: [
      "選擇想要搭配的塔羅方案，我會提供解析並透過解析去分析出你缺失的能量是什麼並進行水晶搭配！",
      "題組搭配Top5 「流年運勢、守護神、進化人生、戀愛指南、職涯探索」",
      "解析以文字訊息提供，無需雙方同時在線上，也方便日後反覆審閱🤍",
      "（可以偷偷許願喜歡款式、色系、特別想加強的功效）",
    ],
    bgColor: "bg-[#E8E6F5]",
    formPath: "/custom/form-b",
  },
  {
    id: "C",
    title: "脈輪檢測 × 水晶手鍊",
    price: "2,000$ ± 300$",
    icon: <Zap className="w-5 h-5" />,
    features: [
      "使用塔羅、靈擺，連結你的能量與高我對談，逐一分析七大脈輪個別能量。我會提供一份文字訊息報告，並透過此檢測分析出缺失的脈輪能量進行水晶搭配。",
      "解析以文字訊息提供，無需雙方同時在線上，也方便日後反覆審閱🤍",
      "（可以偷偷許願喜歡款式、色系、特別想加強的功效）",
    ],
    bgColor: "bg-[#D8EFED]",
    formPath: "/custom/form-c",
  },
  {
    id: "D",
    title: "生命靈數 × 水晶手鍊",
    price: "2,000$ ± 300$",
    icon: <Fingerprint className="w-5 h-5" />,
    features: [
      "透過你的生命數、天賦數、星座數、先天數，去找到你的空缺數，並透過你的生命靈數與空缺數去搭配水晶，增強優勢，改善缺點",
      "解析以文字訊息提供，無需雙方同時在線上，也方便日後反覆審閱🤍",
      "（可以偷偷許願喜歡款式、色系、特別想加強的功效）",
    ],
    bgColor: "bg-[#F0DEDE]",
    formPath: "/custom/form-d",
  },
];

export default function Custom() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("opacity-100", "translate-y-0");
            entry.target.classList.remove("opacity-0", "translate-y-10");
          }
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="bg-[#FAF9F6] text-[#4A4A4A] min-h-screen font-sans selection:bg-[#D8C3BD] selection:text-white overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,400&family=Noto+Serif+TC:wght@200;300;400;500&display=swap');
        .font-serif-en { font-family: 'Cormorant Garamond', serif; }
        .font-serif-zh { font-family: 'Noto Serif TC', serif; }
        .letter-spacing-huge { letter-spacing: 0.5em; }
        .letter-spacing-wide { letter-spacing: 0.2em; }
      `}</style>

      {/* 背景柔和光暈 */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[70%] h-[70%] bg-[#E8E2DE] opacity-40 rounded-full blur-[120px] animate-pulse" />
        <div
          className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-[#D8C3BD] opacity-20 rounded-full blur-[100px] animate-pulse"
          style={{ animationDelay: "3s" }}
        />
      </div>

      {/* Hero Section */}
      <section className="relative h-screen flex flex-col items-center justify-center text-center px-6">
        <div className="reveal opacity-0 translate-y-10 transition-all duration-[1500ms] ease-out">
          <span className="font-serif-zh text-xs letter-spacing-huge text-[#8E735B] mb-8 block font-light">
            椛．crystal
          </span>
          <h1 className="text-4xl md:text-5xl font-serif-zh font-light leading-relaxed text-[#333] mb-10 tracking-[0.3em]">
            遇見您的 <br />
            <span className="italic text-[#8E735B]">專屬能量對話</span>
          </h1>
          <p className="text-[#666] max-w-xl mx-auto leading-[2.2] font-serif-zh font-light tracking-widest text-sm md:text-base">
            我們透過不同維度的媒介，<br />
            為您的當下狀態找尋最合適的礦石震動。
          </p>
        </div>
        <div className="absolute bottom-12 animate-bounce opacity-30 text-[#8E735B]">
          <ChevronDown size={28} strokeWidth={1} />
        </div>
      </section>

      {/* 四大方案 */}
      <section className="max-w-7xl mx-auto px-6 py-32 relative">
        <div className="text-center mb-24 reveal opacity-0 translate-y-10 transition-all duration-1000">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Star size={14} className="text-[#D8C3BD] fill-[#D8C3BD]" />
            <h2 className="text-2xl font-serif-zh text-[#333] tracking-[0.4em] font-light italic">
              四大客製方案
            </h2>
            <Star size={14} className="text-[#D8C3BD] fill-[#D8C3BD]" />
          </div>
          <p className="text-[10px] text-[#8E735B] tracking-[0.3em] uppercase opacity-60">
            Professional Consultation
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`reveal opacity-0 translate-y-10 transition-all duration-1000 rounded-[3rem] border border-white shadow-[0_15px_45px_rgba(216,195,189,0.06)] hover:shadow-[0_30px_80px_rgba(216,195,189,0.15)] duration-700 group relative overflow-hidden ${plan.bgColor} backdrop-blur-xl flex flex-col`}
              style={{ transitionDelay: `${i * 150}ms` }}
            >
              {/* 背景編號 */}
              <div className="absolute top-[-10px] right-4 text-[12rem] font-serif-en font-light text-[#8E735B] opacity-[0.03] pointer-events-none italic select-none">
                {plan.id}
              </div>

              <div className="p-10 md:p-14 flex flex-col h-full relative z-10">
                {/* Header */}
                <div className="mb-8 text-center">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#8E735B] shadow-sm mx-auto mb-6 group-hover:scale-110 transition-transform duration-700">
                    {plan.icon}
                  </div>
                  <h3 className="text-2xl font-serif-zh text-[#333] mb-4 tracking-[0.15em] font-medium">
                    {plan.title}
                  </h3>
                  <p className="text-lg font-serif-en text-[#8E735B] tracking-[0.1em] font-light italic">
                    費用：{plan.price}
                  </p>
                </div>

                <div className="w-10 h-px bg-[#8E735B]/10 mx-auto mb-10" />

                {/* 服務內容 */}
                <div className="flex-grow">
                  <span className="text-xs text-[#8E735B]/60 tracking-[0.5em] uppercase block mb-8 text-center font-medium">
                    服務內容
                  </span>
                  <ul className="space-y-6">
                    {plan.features.map((feature, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-4 text-base text-[#555] leading-relaxed font-light tracking-widest text-justify"
                      >
                        <div className="mt-2.5 w-1 h-1 rounded-full bg-[#D8C3BD]/60 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 按鈕 */}
                <div className="mt-12 pt-8 border-t border-[#8E735B]/5">
                  <Link href={plan.formPath}>
                    <button className="w-full py-5 rounded-2xl bg-white/50 border border-[#D8C3BD]/20 text-[#8E735B] text-xs tracking-[0.5em] uppercase hover:bg-[#8E735B] hover:text-white hover:border-[#8E735B] transition-all duration-500 shadow-sm flex items-center justify-center gap-3 group/btn">
                      填寫報名表單{" "}
                      <ArrowRight
                        size={14}
                        className="group-hover/btn:translate-x-2 transition-transform"
                      />
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 流程說明 */}
      <section className="py-40 px-6 relative bg-[#FDFCFB]/50 border-t border-[#E8E2DE]/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-28 reveal opacity-0 translate-y-10 transition-all duration-1000">
            <Flower2 size={24} className="mx-auto text-[#D8C3BD] mb-6 opacity-60" />
            <h2 className="text-2xl font-serif-zh text-[#333] mb-4 tracking-[0.4em] font-light italic">
              手鍊誕生的儀式感
            </h2>
            <div className="w-8 h-px bg-[#8E735B] mx-auto opacity-30" />
          </div>

          <div className="space-y-32 relative">
            <div className="absolute left-[20px] md:left-1/2 md:-translate-x-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#D8C3BD]/40 to-transparent hidden md:block" />
            {[
              {
                step: "I",
                title: "訴說願望與初衷",
                content:
                  "填寫客製表單，讓我們了解您現階段最想被照看的能量。",
              },
              {
                step: "II",
                title: "靈數與頻率規劃",
                content:
                  "感應您的能量狀態，挑選出能與您當下頻率產生共振的礦石。",
              },
              {
                step: "III",
                title: "設計初稿與對視",
                content:
                  "拍攝初步排列的設計圖與您確認。這是一個直覺對話的過程。",
              },
              {
                step: "IV",
                title: "淨化編織與送抵",
                content:
                  "完成編織後，透過頌缽與鼠尾草深度淨化，將祝福寄出。",
              },
            ].map((item, i) => (
              <div
                key={i}
                className={`reveal opacity-0 translate-y-10 transition-all duration-1000 flex flex-col md:flex-row items-center ${
                  i % 2 !== 0 ? "md:flex-row-reverse" : ""
                }`}
              >
                <div className="w-full md:w-1/2 flex justify-center md:justify-end md:px-16 mb-8 md:mb-0">
                  <div className="w-10 h-10 rounded-full border border-[#D8C3BD] flex items-center justify-center text-[#8E735B] font-serif-en text-xs bg-white z-10 shadow-sm">
                    {item.step}
                  </div>
                </div>
                <div className="w-full md:w-1/2 text-center md:text-left md:px-16">
                  <h4 className="text-lg font-serif-zh text-[#444] mb-4 tracking-widest">
                    {item.title}
                  </h4>
                  <p className="text-xs text-[#888] font-light leading-loose tracking-wider">
                    {item.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 底部導引 */}
      <section className="py-48 px-6 text-center relative">
        <div className="reveal opacity-0 translate-y-10 transition-all duration-1000 max-w-2xl mx-auto">
          <Sparkles className="mx-auto text-[#D8C3BD] mb-10 opacity-60" size={32} />
          <h2 className="text-3xl font-serif-zh text-[#8E735B] mb-12 tracking-[0.3em] leading-relaxed font-light italic">
            讓水晶，指引您回到最好的頻率
          </h2>
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <a
              href={LINE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-12 py-5 bg-[#8E735B] text-white rounded-full transition-all shadow-[0_15px_35px_rgba(142,115,91,0.15)] hover:shadow-[0_20px_45px_rgba(142,115,91,0.25)] hover:-translate-y-1 flex items-center gap-3 tracking-widest text-sm font-serif-zh"
            >
              私訊店長 Mina <MessageCircle size={18} />
            </a>
          </div>
        </div>
      </section>

      <footer className="py-16 text-center border-t border-[#E8E2DE]/30 bg-white/20">
        <span className="font-serif-zh text-[10px] letter-spacing-huge text-[#8E735B] opacity-60">
          椛．crystal
        </span>
      </footer>
    </div>
  );
}
