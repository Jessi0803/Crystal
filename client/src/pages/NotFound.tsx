// 日日好日 — 404 Not Found
// Design: Vacanza-inspired minimal
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 bg-white">
      <p className="eyebrow mb-4">404 · PAGE NOT FOUND</p>
      <h1 className="heading-xl mb-6">找不到頁面</h1>
      <p className="text-sm font-body font-light text-[oklch(0.5_0_0)] mb-10 max-w-xs">
        你所尋找的頁面不存在，或許是緣分未到。讓我們帶你回到正確的能量場。
      </p>
      <Link href="/">
        <button className="btn-primary">
          回到首頁 <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </Link>
    </div>
  );
}
