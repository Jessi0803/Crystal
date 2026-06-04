import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

const CHECKOUT_PATH = "/checkout";

export default function CheckoutStart() {
  const [, navigate] = useLocation();
  const { data: sessionUser, isLoading } = trpc.auth.me.useQuery();

  // 已登入者直接進結帳，不再出現選擇頁
  useEffect(() => {
    if (!isLoading && sessionUser) {
      navigate(CHECKOUT_PATH, { replace: true });
    }
  }, [isLoading, sessionUser, navigate]);

  // 載入中 / 已登入（等待轉址）：只顯示 spinner，避免閃一下選擇頁
  if (isLoading || sessionUser) {
    return (
      <div className="min-h-screen bg-[oklch(0.98_0.005_60)] flex items-center justify-center px-4 py-16">
        <div className="w-8 h-8 border-2 border-[oklch(0.85_0_0)] border-t-[oklch(0.4_0_0)] rounded-full animate-spin" />
      </div>
    );
  }

  const loginHref = `/login?returnTo=${encodeURIComponent(CHECKOUT_PATH)}`;
  const registerHref = `/register?returnTo=${encodeURIComponent(CHECKOUT_PATH)}`;

  return (
    <div className="min-h-screen bg-[oklch(0.98_0.005_60)] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/">
            <span
              className="text-2xl tracking-[0.12em] cursor-pointer"
              style={{ fontFamily: "'Noto Serif TC', serif", color: "oklch(0.3 0 0)" }}
            >
              椛 · Crystal
            </span>
          </Link>
          <p className="text-xs tracking-[0.2em] text-[oklch(0.55_0_0)] mt-1 font-body">CRYSTAL ENERGY</p>
        </div>

        <div className="bg-white border border-[oklch(0.93_0_0)] p-8 sm:p-10">
          <h1
            className="text-xl font-medium text-[oklch(0.15_0_0)] mb-1"
            style={{ fontFamily: "'Noto Sans TC', sans-serif" }}
          >
            如何結帳
          </h1>
          <p className="text-xs text-[oklch(0.55_0_0)] font-body mb-8">
            選擇登入會員，或以訪客身分結帳
          </p>

          <div className="space-y-5">
            {/* 會員登入 */}
            <div>
              <Link href={loginHref}>
                <button className="w-full bg-[oklch(0.15_0_0)] text-white py-3.5 text-sm tracking-[0.12em] font-body hover:bg-[oklch(0.25_0_0)] transition-colors">
                  會員登入
                </button>
              </Link>
              <p className="text-[11px] text-[oklch(0.55_0_0)] font-body text-center mt-1.5">
                會不定時有專屬優惠
              </p>
            </div>

            {/* 訪客結帳 */}
            <div>
              <Link href={CHECKOUT_PATH}>
                <button className="w-full border border-[oklch(0.2_0_0)] text-[oklch(0.15_0_0)] py-3.5 text-sm tracking-[0.12em] font-body hover:bg-[oklch(0.97_0_0)] transition-colors">
                  以訪客身分結帳
                </button>
              </Link>
            </div>
          </div>

          <p className="text-xs text-[oklch(0.55_0_0)] font-body mt-8 text-center">
            還沒有帳號？{" "}
            <Link href={registerHref}>
              <span className="text-[oklch(0.55_0.08_60)] underline cursor-pointer hover:text-[oklch(0.45_0.08_60)]">
                立即註冊
              </span>
            </Link>
          </p>
        </div>

        {/* 返回首頁 */}
        <p className="text-center mt-6 text-xs text-[oklch(0.55_0_0)] font-body">
          <Link href="/">
            <span className="cursor-pointer hover:text-[oklch(0.35_0_0)]">← 返回首頁</span>
          </Link>
        </p>
      </div>
    </div>
  );
}
