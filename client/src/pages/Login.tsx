import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Login() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const loginMutation = trpc.member.login.useMutation({
    onSuccess: () => {
      toast.success("登入成功，歡迎回來！");
      navigate("/member");
    },
    onError: (err) => {
      toast.error(err.message || "登入失敗，請稍後再試");
    },
  });

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!form.email) newErrors.email = "請輸入 Email";
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = "請輸入有效的 Email";
    if (!form.password) newErrors.password = "請輸入密碼";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    loginMutation.mutate(form);
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
          <h1
            className="text-xl font-medium text-[oklch(0.15_0_0)] mb-1"
            style={{ fontFamily: "'Noto Sans TC', sans-serif" }}
          >
            會員登入
          </h1>
          <p className="text-xs text-[oklch(0.55_0_0)] font-body mb-8">
            還沒有帳號？{" "}
            <Link href="/register">
              <span className="text-[oklch(0.55_0.08_60)] underline cursor-pointer hover:text-[oklch(0.45_0.08_60)]">
                立即註冊
              </span>
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-xs tracking-[0.08em] text-[oklch(0.4_0_0)] mb-1.5 font-body">
                EMAIL
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="your@email.com"
                className={`w-full border px-4 py-3 text-sm font-body outline-none transition-colors focus:border-[oklch(0.6_0.08_60)] ${
                  errors.email ? "border-red-400" : "border-[oklch(0.88_0_0)]"
                }`}
              />
              {errors.email && (
                <p className="text-xs text-red-500 mt-1 font-body">{errors.email}</p>
              )}
            </div>

            {/* 密碼 */}
            <div>
              <label className="block text-xs tracking-[0.08em] text-[oklch(0.4_0_0)] mb-1.5 font-body">
                密碼
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="請輸入密碼"
                className={`w-full border px-4 py-3 text-sm font-body outline-none transition-colors focus:border-[oklch(0.6_0.08_60)] ${
                  errors.password ? "border-red-400" : "border-[oklch(0.88_0_0)]"
                }`}
              />
              {errors.password && (
                <p className="text-xs text-red-500 mt-1 font-body">{errors.password}</p>
              )}
            </div>

            {/* 忘記密碼 */}
            <div className="text-right">
              <Link href="/forgot-password">
                <span className="text-xs text-[oklch(0.55_0_0)] font-body cursor-pointer hover:text-[oklch(0.35_0_0)] underline">
                  忘記密碼？
                </span>
              </Link>
            </div>

            {/* 送出 */}
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full bg-[oklch(0.15_0_0)] text-white py-3.5 text-sm tracking-[0.12em] font-body hover:bg-[oklch(0.25_0_0)] transition-colors disabled:opacity-60"
            >
              {loginMutation.isPending ? "登入中..." : "登入"}
            </button>
          </form>
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
