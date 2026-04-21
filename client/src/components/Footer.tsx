// 日日好日 — Footer
// Design: Vacanza-inspired — minimal footer, brand only + bottom bar
import { Link } from "wouter";
import { Instagram, MessageCircle } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[oklch(0.1_0_0)] text-white">
      {/* Main Footer — Brand Only */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">

          {/* Brand */}
          <div>
            <div className="mb-4">
              <div className="flex items-baseline gap-1.5">
                <span
                  className="text-[1.5rem] leading-none text-white"
                  style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 300, letterSpacing: "0.05em" }}
                >
                  椛
                </span>
                <span
                  className="text-[0.55rem] text-white/50"
                  style={{ fontFamily: "'Noto Sans TC', sans-serif", fontWeight: 300 }}
                >
                  ˙
                </span>
                <span
                  className="text-[1.3rem] leading-none text-white italic"
                  style={{ fontFamily: "'Cormorant Garamond', 'Georgia', serif", fontWeight: 300, letterSpacing: "0.08em" }}
                >
                  Crystal
                </span>
              </div>
              <div className="text-[0.55rem] tracking-[0.3em] text-white/50 font-body mt-0.5">
                CRYSTAL ENERGY
              </div>
            </div>
            <p className="text-xs font-body font-light leading-relaxed text-white/60 max-w-[260px]">
              結合能量水晶 × 情緒療癒 × 個人轉運，讓每一天都成為好日子。
            </p>
          </div>

          {/* Social Icons */}
          <div className="flex items-center gap-3">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 border border-white/20 flex items-center justify-center hover:border-white/60 transition-colors"
              aria-label="Instagram"
            >
              <Instagram className="w-3.5 h-3.5 text-white/70" />
            </a>
            <a
              href="https://line.me"
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 border border-white/20 flex items-center justify-center hover:border-white/60 transition-colors"
              aria-label="LINE"
            >
              <MessageCircle className="w-3.5 h-3.5 text-white/70" />
            </a>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[0.65rem] font-body font-light text-white/40">
            © 2025 日日好日 能量水晶. All rights reserved.
          </p>
          <p className="text-[0.65rem] font-body font-light text-white/40">
            本網站商品為天然礦石飾品，非醫療用品，不具任何醫療療效。
          </p>
        </div>
      </div>
    </footer>
  );
}
