// 日日好日 — Footer
// Design: Vacanza-inspired — minimal footer, brand only + bottom bar
import { useState } from "react";
import { Link } from "wouter";
import { Instagram, MessageCircle } from "lucide-react";
import { BRAND_LOGO_SRC, BrandTextMark } from "./BrandMark";

export default function Footer() {
  const [footerLogoFailed, setFooterLogoFailed] = useState(false);

  return (
    <footer className="bg-[oklch(0.1_0_0)] text-white">
      {/* Main Footer — Brand Only */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">

          {/* Brand */}
          <div>
            <div className="mb-4">
              {footerLogoFailed ? (
                <BrandTextMark variant="light" align="start" />
              ) : (
                <img
                  src={BRAND_LOGO_SRC}
                  alt="椛 Crystal 能量水晶"
                  width={160}
                  height={44}
                  className="h-10 w-auto max-w-[200px] object-contain object-left opacity-95"
                  onError={() => setFooterLogoFailed(true)}
                  decoding="async"
                />
              )}
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

    </footer>
  );
}
