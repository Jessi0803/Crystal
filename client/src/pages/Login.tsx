import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

function getSafeReturnTo() {
  const params = new URLSearchParams(window.location.search);
  const value = params.get("returnTo");
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export default function Login() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const returnTo = getSafeReturnTo();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const loginMutation = trpc.member.login.useMutation({
    onSuccess: async (data) => {
      await utils.auth.me.invalidate();
      toast.success("登入成功，歡迎回來！");
      navigate(getSafeReturnTo() ?? (data.user.role === "admin" ? "/admin/orders" : "/products"));
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
    <div className="min-h-screen bg-sf-cream flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/">
            <span
              className="text-2xl tracking-[0.12em] cursor-pointer"
              style={{ fontFamily: "'Noto Serif TC', serif", color: "var(--sf-ink)" }}
            >
              椛 · Crystal
            </span>
          </Link>
          <p className="text-xs tracking-[0.2em] text-sf-muted mt-1 font-body">CRYSTAL ENERGY</p>
        </div>

        <div className="rounded-lg bg-white border border-sf-line p-8 sm:p-10">
          <h1
            className="text-xl font-light tracking-[0.08em] text-sf-ink mb-1"
            style={{ fontFamily: "\'Noto Serif TC\', serif" }}
          >
            會員登入
          </h1>
          <p className="text-xs text-sf-muted font-body mb-8">
            還沒有帳號？{" "}
            <Link href={returnTo ? `/register?returnTo=${encodeURIComponent(returnTo)}` : "/register"}>
              <span className="text-sf-accent underline cursor-pointer hover:text-sf-ink">
                立即註冊
              </span>
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-xs tracking-[0.08em] text-sf-text mb-1.5 font-body">
                EMAIL
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="your@email.com"
                className={`w-full border px-4 py-3 text-sm font-body outline-none transition-colors focus:border-sf-accent ${
                  errors.email ? "border-red-400" : "border-sf-line-strong"
                }`}
              />
              {errors.email && (
                <p className="text-xs text-red-500 mt-1 font-body">{errors.email}</p>
              )}
            </div>

            {/* 密碼 */}
            <div>
              <label className="block text-xs tracking-[0.08em] text-sf-text mb-1.5 font-body">
                密碼
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="請輸入密碼"
                className={`w-full border px-4 py-3 text-sm font-body outline-none transition-colors focus:border-sf-accent ${
                  errors.password ? "border-red-400" : "border-sf-line-strong"
                }`}
              />
              {errors.password && (
                <p className="text-xs text-red-500 mt-1 font-body">{errors.password}</p>
              )}
            </div>

            {/* 忘記密碼 */}
            <div className="text-right">
              <Link href="/forgot-password">
                <span className="text-xs text-sf-muted font-body cursor-pointer hover:text-sf-accent underline">
                  忘記密碼？
                </span>
              </Link>
            </div>

            {/* 送出 */}
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full rounded-full bg-sf-accent text-white py-3 text-sm tracking-[0.12em] font-body hover:bg-sf-accent-hover transition-colors disabled:opacity-60"
            >
              {loginMutation.isPending ? "登入中..." : "登入"}
            </button>

            <p className="text-center text-[10px] text-sf-muted font-body pt-1">或</p>
            <button
              type="button"
              onClick={() => {
                const returnTo = getSafeReturnTo();
                const query = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
                window.location.href = `${window.location.origin}/api/trpc/line-oauth-start${query}`;
              }}
              className="w-full flex items-center justify-center gap-2 rounded-full py-3 text-sm font-body border border-[#06C755] text-[#06C755] hover:bg-[#06C755]/10 transition-colors"
            >
              使用 LINE 登入
            </button>
          </form>
        </div>

        {/* 返回首頁 */}
        <p className="text-center mt-6 text-xs text-sf-muted font-body">
          <Link href="/">
            <span className="cursor-pointer hover:text-sf-accent">← 返回首頁</span>
          </Link>
        </p>
      </div>
    </div>
  );
}
