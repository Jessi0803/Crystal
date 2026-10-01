import { useEffect, useState } from "react";
import { IconBadge } from "@/components/LineIcon";
import { CircleCheck, CircleX } from "lucide-react";
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

        <div className="rounded-lg bg-white border border-sf-line p-8 sm:p-10 text-center">
          {status === "loading" && (
            <>
              <div className="w-8 h-8 border-2 border-sf-line-strong border-t-sf-line-strong rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-sf-muted font-body">驗證中，請稍候...</p>
            </>
          )}

          {status === "success" && (
            <>
              <IconBadge icon={CircleCheck} tone="success" />
              <h2
                className="text-lg font-medium text-sf-ink mb-3"
                style={{ fontFamily: "'Noto Sans TC', sans-serif" }}
              >
                Email 驗證成功！
              </h2>
              <p className="text-sm text-sf-muted font-body mb-6">
                您的帳號已完成驗證，現在可以享受完整的會員服務。
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/">
                  <button className="rounded-full bg-sf-accent text-white px-8 py-2.5 text-sm font-body hover:bg-sf-accent-hover transition-colors">
                    前往首頁
                  </button>
                </Link>
                <Link href="/member">
                  <button className="border border-sf-line-strong text-sf-text px-8 py-2.5 text-sm font-body hover:bg-sf-selected transition-colors">
                    會員中心
                  </button>
                </Link>
              </div>
            </>
          )}

          {status === "error" && (
            <>
              <IconBadge icon={CircleX} tone="danger" />
              <h2
                className="text-lg font-medium text-sf-ink mb-3"
                style={{ fontFamily: "'Noto Sans TC', sans-serif" }}
              >
                驗證失敗
              </h2>
              <p className="text-sm text-sf-muted font-body mb-6">{message}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/member">
                  <button className="rounded-full bg-sf-accent text-white px-8 py-2.5 text-sm font-body hover:bg-sf-accent-hover transition-colors">
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
