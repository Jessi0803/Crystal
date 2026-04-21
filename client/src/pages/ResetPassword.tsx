import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  const mutation = trpc.member.resetPassword.useMutation({
    onSuccess: () => {
      setDone(true);
      toast.success("密碼已重設，請重新登入");
    },
    onError: (err) => {
      toast.error(err.message || "重設失敗，連結可能已過期");
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.password) newErrors.password = "請輸入新密碼";
    else if (form.password.length < 8) newErrors.password = "密碼至少需要 8 個字元";
    if (form.password !== form.confirmPassword) newErrors.confirmPassword = "兩次密碼不一致";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate({ token, newPassword: form.password });
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[oklch(0.98_0.005_60)] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-sm text-[oklch(0.55_0_0)] font-body mb-4">無效的重設連結</p>
          <Link href="/forgot-password">
            <button className="text-sm text-[oklch(0.55_0.08_60)] underline font-body">重新申請</button>
          </Link>
        </div>
      </div>
    );
  }

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
          {done ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">✅</div>
              <h2
                className="text-lg font-medium text-[oklch(0.15_0_0)] mb-3"
                style={{ fontFamily: "'Noto Sans TC', sans-serif" }}
              >
                密碼已重設
              </h2>
              <p className="text-sm text-[oklch(0.5_0_0)] font-body mb-6">
                請使用新密碼重新登入
              </p>
              <Link href="/login">
                <button className="bg-[oklch(0.15_0_0)] text-white px-8 py-2.5 text-sm font-body hover:bg-[oklch(0.25_0_0)] transition-colors">
                  前往登入
                </button>
              </Link>
            </div>
          ) : (
            <>
              <h1
                className="text-xl font-medium text-[oklch(0.15_0_0)] mb-1"
                style={{ fontFamily: "'Noto Sans TC', sans-serif" }}
              >
                設定新密碼
              </h1>
              <p className="text-xs text-[oklch(0.55_0_0)] font-body mb-8">
                請輸入您的新密碼（至少 8 個字元）
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs tracking-[0.08em] text-[oklch(0.4_0_0)] mb-1.5 font-body">
                    新密碼
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
                  {errors.password && (
                    <p className="text-xs text-red-500 mt-1 font-body">{errors.password}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs tracking-[0.08em] text-[oklch(0.4_0_0)] mb-1.5 font-body">
                    確認新密碼
                  </label>
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    placeholder="再次輸入新密碼"
                    className={`w-full border px-4 py-3 text-sm font-body outline-none transition-colors focus:border-[oklch(0.6_0.08_60)] ${
                      errors.confirmPassword ? "border-red-400" : "border-[oklch(0.88_0_0)]"
                    }`}
                  />
                  {errors.confirmPassword && (
                    <p className="text-xs text-red-500 mt-1 font-body">{errors.confirmPassword}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="w-full bg-[oklch(0.15_0_0)] text-white py-3.5 text-sm tracking-[0.12em] font-body hover:bg-[oklch(0.25_0_0)] transition-colors disabled:opacity-60"
                >
                  {mutation.isPending ? "重設中..." : "確認重設密碼"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
