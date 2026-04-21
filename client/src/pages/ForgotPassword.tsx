import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const mutation = trpc.member.forgotPassword.useMutation({
    onSuccess: () => {
      setSent(true);
    },
    onError: (err) => {
      toast.error(err.message || "發生錯誤，請稍後再試");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    mutation.mutate({ email, origin: window.location.origin });
  };

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
          {sent ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">✉️</div>
              <h2
                className="text-lg font-medium text-[oklch(0.15_0_0)] mb-3"
                style={{ fontFamily: "'Noto Sans TC', sans-serif" }}
              >
                重設連結已發送
              </h2>
              <p className="text-sm text-[oklch(0.5_0_0)] font-body leading-relaxed mb-6">
                若此 Email 已在我們系統中註冊，您將收到密碼重設連結。
                <br />
                請記得檢查垃圾信件夾。
              </p>
              <Link href="/login">
                <button className="text-sm text-[oklch(0.55_0.08_60)] font-body underline hover:text-[oklch(0.45_0.08_60)]">
                  返回登入
                </button>
              </Link>
            </div>
          ) : (
            <>
              <h1
                className="text-xl font-medium text-[oklch(0.15_0_0)] mb-1"
                style={{ fontFamily: "'Noto Sans TC', sans-serif" }}
              >
                忘記密碼
              </h1>
              <p className="text-xs text-[oklch(0.55_0_0)] font-body mb-8">
                輸入您的 Email，我們將發送密碼重設連結
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs tracking-[0.08em] text-[oklch(0.4_0_0)] mb-1.5 font-body">
                    EMAIL
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full border border-[oklch(0.88_0_0)] px-4 py-3 text-sm font-body outline-none transition-colors focus:border-[oklch(0.6_0.08_60)]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={mutation.isPending || !email}
                  className="w-full bg-[oklch(0.15_0_0)] text-white py-3.5 text-sm tracking-[0.12em] font-body hover:bg-[oklch(0.25_0_0)] transition-colors disabled:opacity-60"
                >
                  {mutation.isPending ? "發送中..." : "發送重設連結"}
                </button>
              </form>

              <p className="text-center mt-6 text-xs text-[oklch(0.55_0_0)] font-body">
                <Link href="/login">
                  <span className="cursor-pointer hover:text-[oklch(0.35_0_0)]">← 返回登入</span>
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
