import { useEffect, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

export default function VerifyEmail() {
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  const mutation = trpc.member.verifyEmail.useMutation({
    onSuccess: (data) => {
      setStatus("success");
      setMessage(data.message);
    },
    onError: (err) => {
      setStatus("error");
      setMessage(err.message || "驗證失敗，連結可能已過期");
    },
  });

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("無效的驗證連結");
      return;
    }
    mutation.mutate({ token });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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

        <div className="bg-white border border-[oklch(0.93_0_0)] p-8 sm:p-10 text-center">
          {status === "loading" && (
            <>
              <div className="w-8 h-8 border-2 border-[oklch(0.85_0_0)] border-t-[oklch(0.4_0_0)] rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-[oklch(0.5_0_0)] font-body">驗證中，請稍候...</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="text-4xl mb-4">✅</div>
              <h2
                className="text-lg font-medium text-[oklch(0.15_0_0)] mb-3"
                style={{ fontFamily: "'Noto Sans TC', sans-serif" }}
              >
                Email 驗證成功！
              </h2>
              <p className="text-sm text-[oklch(0.5_0_0)] font-body mb-6">
                您的帳號已完成驗證，現在可以享受完整的會員服務。
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/">
                  <button className="bg-[oklch(0.15_0_0)] text-white px-8 py-2.5 text-sm font-body hover:bg-[oklch(0.25_0_0)] transition-colors">
                    前往首頁
                  </button>
                </Link>
                <Link href="/member">
                  <button className="border border-[oklch(0.85_0_0)] text-[oklch(0.4_0_0)] px-8 py-2.5 text-sm font-body hover:bg-[oklch(0.97_0_0)] transition-colors">
                    會員中心
                  </button>
                </Link>
              </div>
            </>
          )}

          {status === "error" && (
            <>
              <div className="text-4xl mb-4">❌</div>
              <h2
                className="text-lg font-medium text-[oklch(0.15_0_0)] mb-3"
                style={{ fontFamily: "'Noto Sans TC', sans-serif" }}
              >
                驗證失敗
              </h2>
              <p className="text-sm text-[oklch(0.5_0_0)] font-body mb-6">{message}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/member">
                  <button className="bg-[oklch(0.15_0_0)] text-white px-8 py-2.5 text-sm font-body hover:bg-[oklch(0.25_0_0)] transition-colors">
                    前往會員中心重新發送
                  </button>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
