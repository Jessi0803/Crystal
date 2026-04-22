import { useEffect } from "react";
import { Anchor, Leaf } from "lucide-react";
import { Link } from "wouter";

export default function About() {
  // 滾動漸顯動畫
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("opacity-100");
          entry.target.classList.remove("opacity-0", "translate-y-10");
        }
      });
    }, observerOptions);

    document.querySelectorAll(".fade-in-section").forEach((section) => {
      observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="bg-[#FAF9F6] text-[#333333] min-h-screen font-sans selection:bg-[#D8C3BD] selection:text-white">
      {/* 載入與官網風格一致的字體組合 */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400&family=Noto+Serif+TC:wght@400;500;700&family=Noto+Sans+TC:wght@300;400&display=swap');
        
        .font-serif-en { font-family: 'Cormorant Garamond', serif; }
        .font-serif-zh { font-family: 'Noto Serif TC', serif; }
        .font-sans-zh { font-family: 'Noto Sans TC', sans-serif; }
        
        .letter-spacing-huge { letter-spacing: 0.3em; }
        .letter-spacing-wide { letter-spacing: 0.15em; }
      `}</style>

      {/* Hero Section */}
      <section className="h-[88vh] flex flex-col items-center justify-center px-6 text-center">
        <div className="fade-in-section opacity-0 translate-y-10 transition-all duration-1000 ease-out">
          <span className="font-serif-en text-sm tracking-[0.5em] text-[#8E735B] mb-8 block uppercase font-light">
            椛 · CRYSTAL
          </span>
          <h1 className="text-2xl md:text-4xl font-serif-zh leading-tight letter-spacing-wide mb-6 font-medium">
            每一顆水晶，都在等一個對的人
          </h1>
          <div className="w-16 h-px bg-[#D8C3BD] mx-auto mt-12 opacity-60" />
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="max-w-4xl mx-auto px-6 py-32">
        <div className="fade-in-section opacity-0 translate-y-10 transition-all duration-1000 ease-out space-y-16">
          <div className="relative">
            <p className="text-xl md:text-2xl font-serif-zh leading-[2] text-gray-700 md:text-left border-l-2 border-[#D8C3BD] pl-8 py-2">
              椛 · Crystal 相信，每一顆水晶都帶著自己的頻率，
              <br />
              <span className="text-[#8E735B] font-semibold block mt-4">它不修復你，它提醒你，你本來就是完整的。</span>
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-16 mt-24">
            <div className="w-full md:w-5/12 aspect-[4/5] bg-[#E5DCD5] rounded-t-full overflow-hidden relative group">
              <img
                src="/images/about-crystal.jpg"
                alt="水晶手鍊細節"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors duration-500" />
            </div>
            <div className="w-full md:w-7/12">
              <p className="text-lg font-sans-zh leading-[2.2] font-light text-gray-600 tracking-wide">
                我們做的不只是手鍊。
                <br />
                是一個讓你每天早晨戴上它、記得善待自己的理由。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Meaning Section - Momiji */}
      <section className="bg-[#F3EFEC] py-48 px-6 relative overflow-hidden">
        {/* 背景裝飾 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-serif-zh text-[18rem] opacity-[0.03] pointer-events-none select-none">
          椛
        </div>

        <div className="max-w-3xl mx-auto text-center fade-in-section opacity-0 translate-y-10 transition-all duration-1000 ease-out z-10 relative">
          <Leaf className="w-6 h-6 mx-auto mb-12 text-[#8E735B] opacity-50" />
          <h2 className="text-2xl font-serif-zh mb-12 letter-spacing-wide font-medium">椛，是日文裡楓葉的字。</h2>
          <div className="space-y-6">
            <p className="text-lg font-serif-zh leading-[2.4] tracking-wider text-gray-700">
              它在最美的時刻落下，卻從不覺得自己在消逝
            </p>
            <p className="text-lg font-serif-zh leading-[2.4] tracking-wider text-[#8E735B] italic">
              那是一種溫柔的、向內的力量。
            </p>
          </div>
        </div>
      </section>

      {/* Healing & Anchor Section */}
      <section className="max-w-5xl mx-auto px-6 py-48">
        <div className="grid md:grid-cols-2 gap-24 items-start">
          <div className="fade-in-section opacity-0 translate-y-10 transition-all duration-1000 ease-out delay-200">
            <p className="text-lg font-sans-zh leading-[2.2] mb-12 text-gray-600 font-light">
              我們相信療癒不是一個目的地，
              <br />
              而是你每天與自己相處的方式。
            </p>
            <div className="flex items-center gap-4 text-[#8E735B]">
              <Anchor className="w-4 h-4" />
              <span className="font-serif-en text-[10px] tracking-[0.4em] uppercase font-light">The Soul&apos;s Anchor</span>
            </div>
          </div>

          <div className="fade-in-section opacity-0 translate-y-10 transition-all duration-1000 ease-out delay-500">
            <p className="text-lg font-serif-zh leading-[2.6] text-gray-700">
              水晶不是魔法，但它是一個錨點，
              <br />
              讓你在忙碌、混亂、或疲憊的日子裡，
              <br />
              摸到手腕上的那條手鍊，
              <br />
              <span className="bg-[#D8C3BD]/20 px-1 py-1 italic">想起自己值得被好好對待</span>
            </p>
          </div>
        </div>
      </section>

      {/* Final Section */}
      <section className="h-[80vh] flex items-center justify-center px-6 bg-[#3D3D3D] text-[#FAF9F6]">
        <div className="text-center fade-in-section opacity-0 translate-y-10 transition-all duration-1000 ease-out">
          <p className="text-2xl md:text-3xl font-serif-zh tracking-[0.25em] leading-relaxed font-light mb-20">
            我們的每一條手鍊，
            <br />
            都是為了那個正在修復中的你而存在。
          </p>

          <Link href="/products">
            <button className="group relative overflow-hidden px-12 py-5 border border-[#FAF9F6] border-opacity-30 hover:border-opacity-100 transition-all duration-500">
              <span className="relative z-10 font-serif-zh text-xs tracking-[0.4em] uppercase">探索與你有緣的頻率</span>
              <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-500 opacity-5" />
            </button>
          </Link>
        </div>
      </section>

    </div>
  );
}
