import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Register() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const registerMutation = trpc.member.register.useMutation({
    onSuccess: () => {
      toast.success("註冊成功！歡迎加入 Crystal Aura");
      navigate("/member");
    },
    onError: (err) => {
      toast.error(err.message || "註冊失敗，請稍後再試");
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "請輸入姓名";
    if (!form.email) newErrors.email = "請輸入 Email";
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = "請輸入有效的 Email";
    if (!form.password) newErrors.password = "請輸入密碼";
    else if (form.password.length < 8) newErrors.password = "密碼至少需要 8 個字元";
    if (form.password !== form.confirmPassword) newErrors.confirmPassword = "兩次密碼不一致";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    registerMutation.mutate({
      name: form.name,
      email: form.email,
      password: form.password,
      origin: window.location.origin,
    });
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
            建立帳號
          </h1>
          <p className="text-xs text-[oklch(0.55_0_0)] font-body mb-8">
            已有帳號？{" "}
            <Link href="/login">
              <span className="text-[oklch(0.55_0.08_60)] underline cursor-pointer hover:text-[oklch(0.45_0.08_60)]">
                直接登入
              </span>
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 姓名 */}
            <div>
              <label className="block text-xs tracking-[0.08em] text-[oklch(0.4_0_0)] mb-1.5 font-body">
                姓名
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="請輸入您的姓名"
                className={`w-full border px-4 py-3 text-sm font-body outline-none transition-colors focus:border-[oklch(0.6_0.08_60)] ${
                  errors.name ? "border-red-400" : "border-[oklch(0.88_0_0)]"
                }`}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1 font-body">{errors.name}</p>}
            </div>

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
              {errors.email && <p className="text-xs text-red-500 mt-1 font-body">{errors.email}</p>}
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
                placeholder="至少 8 個字元"
                className={`w-full border px-4 py-3 text-sm font-body outline-none transition-colors focus:border-[oklch(0.6_0.08_60)] ${
                  errors.password ? "border-red-400" : "border-[oklch(0.88_0_0)]"
                }`}
              />
              {errors.password && <p className="text-xs text-red-500 mt-1 font-body">{errors.password}</p>}
            </div>

            {/* 確認密碼 */}
            <div>
              <label className="block text-xs tracking-[0.08em] text-[oklch(0.4_0_0)] mb-1.5 font-body">
                確認密碼
              </label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                placeholder="再次輸入密碼"
                className={`w-full border px-4 py-3 text-sm font-body outline-none transition-colors focus:border-[oklch(0.6_0.08_60)] ${
                  errors.confirmPassword ? "border-red-400" : "border-[oklch(0.88_0_0)]"
                }`}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-red-500 mt-1 font-body">{errors.confirmPassword}</p>
              )}
            </div>

            {/* 送出 */}
            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="w-full bg-[oklch(0.15_0_0)] text-white py-3.5 text-sm tracking-[0.12em] font-body hover:bg-[oklch(0.25_0_0)] transition-colors disabled:opacity-60"
            >
              {registerMutation.isPending ? "建立中..." : "建立帳號"}
            </button>

            <p className="text-center text-[10px] text-[oklch(0.55_0_0)] font-body pt-1">或</p>
            <button
              type="button"
              onClick={() => {
                window.location.href = `${window.location.origin}/api/trpc/line-oauth-start`;
              }}
              className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-body border border-[#06C755] text-[#06C755] hover:bg-[#06C755]/10 transition-colors"
            >
              使用 LINE 註冊／登入
            </button>

            <p className="text-[0.65rem] text-[oklch(0.6_0_0)] font-body text-center leading-relaxed">
              註冊即表示您同意我們的服務條款與隱私政策
            </p>
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
