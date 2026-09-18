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

export default function Register() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const returnTo = getSafeReturnTo();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const registerMutation = trpc.member.register.useMutation({
    onSuccess: async (data) => {
      await utils.auth.me.invalidate();
      if (data.verificationEmailSent) {
        toast.success("註冊成功！Email 驗證信已寄出，請至信箱完成驗證");
      } else {
        toast.warning("註冊成功，但驗證信暫時無法寄出，請稍後到會員中心重新發送");
      }
      navigate(returnTo ?? "/member");
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
            建立帳號
          </h1>
          <p className="text-xs text-sf-muted font-body mb-8">
            已有帳號？{" "}
            <Link href={returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : "/login"}>
              <span className="text-sf-accent underline cursor-pointer hover:text-sf-ink">
                直接登入
              </span>
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 姓名 */}
            <div>
              <label className="block text-xs tracking-[0.08em] text-sf-text mb-1.5 font-body">
                姓名
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="請輸入您的姓名"
                className={`w-full border px-4 py-3 text-sm font-body outline-none transition-colors focus:border-sf-accent ${
                  errors.name ? "border-red-400" : "border-sf-line-strong"
                }`}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1 font-body">{errors.name}</p>}
            </div>

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
              {errors.email && <p className="text-xs text-red-500 mt-1 font-body">{errors.email}</p>}
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
                placeholder="至少 8 個字元"
                className={`w-full border px-4 py-3 text-sm font-body outline-none transition-colors focus:border-sf-accent ${
                  errors.password ? "border-red-400" : "border-sf-line-strong"
                }`}
              />
              {errors.password && <p className="text-xs text-red-500 mt-1 font-body">{errors.password}</p>}
            </div>

            {/* 確認密碼 */}
            <div>
              <label className="block text-xs tracking-[0.08em] text-sf-text mb-1.5 font-body">
                確認密碼
              </label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                placeholder="再次輸入密碼"
                className={`w-full border px-4 py-3 text-sm font-body outline-none transition-colors focus:border-sf-accent ${
                  errors.confirmPassword ? "border-red-400" : "border-sf-line-strong"
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
              className="w-full rounded-full bg-sf-accent text-white py-3 text-sm tracking-[0.12em] font-body hover:bg-sf-accent-hover transition-colors disabled:opacity-60"
            >
              {registerMutation.isPending ? "建立帳號並寄送驗證信..." : "建立帳號"}
            </button>

            <p className="text-center text-[10px] text-sf-muted font-body pt-1">或</p>
            <button
              type="button"
              onClick={() => {
                window.location.href = `${window.location.origin}/api/trpc/line-oauth-start`;
              }}
              className="w-full flex items-center justify-center gap-2 rounded-full py-3 text-sm font-body border border-[#06C755] text-[#06C755] hover:bg-[#06C755]/10 transition-colors"
            >
              使用 LINE 註冊／登入
            </button>

            <p className="text-[0.65rem] text-sf-muted font-body text-center leading-relaxed">
              註冊即表示您同意我們的
              <Link href="/terms">
                <span className="mx-1 cursor-pointer text-sf-accent underline underline-offset-4 transition-colors hover:text-sf-ink">
                  服務條款
                </span>
              </Link>
              與
              <Link href="/privacy">
                <span className="ml-1 cursor-pointer text-sf-accent underline underline-offset-4 transition-colors hover:text-sf-ink">
                  隱私政策
                </span>
              </Link>
            </p>
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
