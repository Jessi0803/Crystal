import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { X, Send, Loader2 } from "lucide-react";
import { Link } from "wouter";

interface Message {
  role: "user" | "assistant";
  content: string;
  relatedProducts?: {
    id: string;
    name: string;
    price: number;
    image: string;
    href: string;
  }[];
}

const QUICK_QUESTIONS = [
  "我想提升自信，推薦哪款？",
  "我想招財，推薦哪款？",
  "手鍊怎麼淨化？",
  "手鍊有保固嗎？",
  "手圍怎麼量？",
  "如何開啟水晶能量？",
];

const WELCOME_MESSAGE: Message = {
  role: "assistant",
  content:
    "你好！我是椛小助 ✨\n\n我是椛˙Crystal 的 AI 水晶顧問，可以幫你解答水晶相關問題、推薦適合你的水晶，或介紹客製化方案。\n\n有什麼想問的嗎？",
};

// 水晶訊息 SVG Icon（訊息泡泡 + 水晶菱形）
function CrystalChatIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* 訊息泡泡底部尾巴 */}
      <path
        d="M5 4h18a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H9l-5 4v-4H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z"
        fill="rgba(255,255,255,0.22)"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="1"
      />
      {/* 中央水晶菱形 */}
      <polygon
        points="14,7 18,12 14,17 10,12"
        fill="rgba(255,255,255,0.9)"
        stroke="rgba(255,255,255,0.6)"
        strokeWidth="0.5"
      />
      {/* 菱形高光 */}
      <polygon
        points="14,7 18,12 14,11"
        fill="rgba(255,255,255,0.4)"
      />
      {/* 左右小點 */}
      <circle cx="8" cy="12" r="1.2" fill="rgba(255,255,255,0.7)" />
      <circle cx="20" cy="12" r="1.2" fill="rgba(255,255,255,0.7)" />
    </svg>
  );
}

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [showQuickQuestions, setShowQuickQuestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chatMutation = trpc.chatbot.chat.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
          relatedProducts: data.relatedProducts,
        },
      ]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "抱歉，我現在遇到一點問題，請稍後再試，或透過 LINE 客服聯繫我們 💜",
        },
      ]);
    },
  });

  // 自動捲動到最新訊息
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // 開啟時自動聚焦輸入框
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Allow other pages to open chatbot programmatically.
  useEffect(() => {
    const openHandler = () => {
      setIsOpen(true);
    };
    window.addEventListener("open-chatbot", openHandler);
    return () => window.removeEventListener("open-chatbot", openHandler);
  }, []);

  const sendMessage = async (text: string) => {
    if (!text.trim() || chatMutation.isPending) return;

    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setShowQuickQuestions(false);

    // 組建對話歷史（排除歡迎訊息）
    const history = messages
      .filter((m) => m.role === "user" || (m.role === "assistant" && m !== WELCOME_MESSAGE))
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));

    chatMutation.mutate({ message: text, history });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleQuickQuestion = (q: string) => {
    sendMessage(q);
  };

  return (
    <>
      {/* 懸浮按鈕區域 */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
        {/* 浮動標籤（聊天關閉時常駐顯示） */}
        {!isOpen && (
          <div
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl shadow-md max-w-[min(220px,calc(100vw-5.5rem))]"
            style={{
              background: "white",
              border: "1px solid rgba(192, 132, 212, 0.3)",
              boxShadow: "0 2px 12px rgba(155, 89, 182, 0.15)",
            }}
          >
            <span
              className="text-xs leading-snug text-left"
              style={{
                color: "#9b59b6",
                fontFamily: "'Noto Sans TC', sans-serif",
                fontWeight: 500,
              }}
            >
              你好！我是椛小助 ✨
            </span>
          </div>
        )}

        {/* 主按鈕 */}
        <div className="relative">
          {/* 脈衝光暈（未開啟時顯示） */}
          {!isOpen && (
            <>
              <span
                className="absolute inset-0 rounded-full"
                style={{
                  background: "rgba(192, 132, 212, 0.35)",
                  animation: "ping 2s cubic-bezier(0, 0, 0.2, 1) infinite",
                }}
              />
              <span
                className="absolute inset-0 rounded-full"
                style={{
                  background: "rgba(192, 132, 212, 0.2)",
                  animation: "ping 2s cubic-bezier(0, 0, 0.2, 1) infinite 0.5s",
                }}
              />
            </>
          )}

          <button
            onClick={() => {
              setIsOpen((v) => !v);
            }}
            className="relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95"
            style={{
              background: "linear-gradient(135deg, #d4a0e8 0%, #b06fd4 50%, #8e44ad 100%)",
              boxShadow: isOpen
                ? "0 4px 16px rgba(142, 68, 173, 0.5)"
                : "0 4px 20px rgba(142, 68, 173, 0.45)",
            }}
            aria-label="開啟水晶顧問"
          >
            {isOpen ? (
              <X className="w-5 h-5 text-white" />
            ) : (
              <CrystalChatIcon className="w-7 h-7" />
            )}
          </button>
        </div>
      </div>

      {/* 聊天視窗 */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          style={{
            height: "520px",
            background: "#fdfaf8",
            border: "1px solid rgba(192, 132, 212, 0.2)",
            boxShadow: "0 8px 40px rgba(155, 89, 182, 0.15)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #f3e8f9 0%, #ede0f5 100%)",
              borderBottom: "1px solid rgba(192, 132, 212, 0.2)",
            }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #e8b4d8, #c084d4)" }}
              >
                <CrystalChatIcon className="w-5 h-5" />
              </div>
              <div>
                <p
                  className="text-sm font-medium"
                  style={{ color: "oklch(0.2 0 0)", fontFamily: "'Noto Sans TC', sans-serif" }}
                >
                  椛小助
                </p>
                <p className="text-[0.65rem]" style={{ color: "oklch(0.55 0 0)" }}>
                  水晶能量顧問 · 線上中
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/50 transition-colors"
            >
              <X className="w-4 h-4" style={{ color: "oklch(0.45 0 0)" }} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i}>
                <div
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "rounded-br-sm"
                        : "rounded-bl-sm"
                    }`}
                    style={
                      msg.role === "user"
                        ? {
                            background: "linear-gradient(135deg, #c084d4, #9b59b6)",
                            color: "white",
                            fontFamily: "'Noto Sans TC', sans-serif",
                          }
                        : {
                            background: "white",
                            color: "oklch(0.2 0 0)",
                            border: "1px solid rgba(192, 132, 212, 0.2)",
                            fontFamily: "'Noto Sans TC', sans-serif",
                          }
                    }
                  >
                    {msg.content}
                  </div>
                </div>

                {/* 相關商品卡片 */}
                {msg.relatedProducts && msg.relatedProducts.length > 0 && (
                  <div className="mt-2 ml-0 flex gap-2 overflow-x-auto pb-1">
                    {msg.relatedProducts.map((p) => (
                      <Link key={p.id} href={p.href}>
                        <div
                          className="flex-shrink-0 w-[120px] rounded-xl overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                          style={{
                            border: "1px solid rgba(192, 132, 212, 0.25)",
                            background: "white",
                          }}
                        >
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-full h-[80px] object-cover"
                          />
                          <div className="p-2">
                            <p
                              className="text-[0.65rem] leading-tight line-clamp-2"
                              style={{
                                color: "oklch(0.25 0 0)",
                                fontFamily: "'Noto Sans TC', sans-serif",
                              }}
                            >
                              {p.name}
                            </p>
                            <p
                              className="text-[0.65rem] mt-1 font-medium"
                              style={{ color: "#9b59b6" }}
                            >
                              NT$ {p.price.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* 載入中 */}
            {chatMutation.isPending && (
              <div className="flex justify-start">
                <div
                  className="rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2"
                  style={{
                    background: "white",
                    border: "1px solid rgba(192, 132, 212, 0.2)",
                  }}
                >
                  <Loader2
                    className="w-3.5 h-3.5 animate-spin"
                    style={{ color: "#c084d4" }}
                  />
                  <span className="text-xs" style={{ color: "oklch(0.55 0 0)" }}>
                    椛小助思考中…
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* 快捷問題 */}
          {showQuickQuestions && (
            <div
              className="px-3 py-2 flex-shrink-0"
              style={{ borderTop: "1px solid rgba(192, 132, 212, 0.15)" }}
            >
              <p
                className="text-[0.6rem] tracking-[0.08em] mb-2"
                style={{ color: "oklch(0.6 0 0)" }}
              >
                熱門問題
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleQuickQuestion(q)}
                    className="text-[0.65rem] px-2.5 py-1 rounded-full transition-all hover:scale-105 active:scale-95"
                    style={{
                      background: "rgba(192, 132, 212, 0.1)",
                      color: "#9b59b6",
                      border: "1px solid rgba(192, 132, 212, 0.3)",
                      fontFamily: "'Noto Sans TC', sans-serif",
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 輸入框 */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 px-3 py-2.5 flex-shrink-0"
            style={{ borderTop: "1px solid rgba(192, 132, 212, 0.2)" }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="問問椛小助…"
              className="flex-1 text-sm px-3 py-2 rounded-full outline-none"
              style={{
                background: "rgba(192, 132, 212, 0.08)",
                border: "1px solid rgba(192, 132, 212, 0.25)",
                color: "oklch(0.2 0 0)",
                fontFamily: "'Noto Sans TC', sans-serif",
              }}
              disabled={chatMutation.isPending}
            />
            <button
              type="submit"
              disabled={!input.trim() || chatMutation.isPending}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #c084d4, #9b59b6)",
              }}
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
