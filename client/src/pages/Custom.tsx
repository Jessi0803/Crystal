// 椛 ˙Crystal — 客製化方案頁面
import { useState } from "react";
import { ExternalLink, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { useLocation } from "wouter";
import { useCart } from "@/contexts/CartContext";
import { products } from "@/lib/data";
import { toast } from "sonner";

const LINE_URL = "https://line.me/R/ti/p/@011tymeh";

const plans = [
  {
    id: "A",
    title: "純客製水晶手鍊",
    price: "1,500$ ± 300$",
    addons: [],
    description: [
      "可提供想要的功效、色系、款式",
      "或是也可以跟我討論",
      "如愛情、溝通能力、財運、疾病等等，",
      "提供初版免費修改 1 次。",
    ],
    accent: "oklch(0.72 0.09 70)",
    hasForm: true,
  },
  {
    id: "B",
    title: "塔羅 × 水晶手鍊",
    price: "1,500$ ± 300$",
    addons: ["+ 加購的塔羅占卜打 9 折", "（推薦搭配流年運勢或守護神）"],
    description: [
      "提供塔羅解析，並且我將透過解析，分",
      "析出缺失的能量，利用水晶能量補足。",
      "（也可以許願想額外加強的能量！）",
      "提供初版免費修改 1 次。",
    ],
    accent: "oklch(0.65 0.12 290)",
    hasForm: false,
  },
  {
    id: "C",
    title: "脈輪檢測 × 水晶手鍊",
    price: "1,500$ ± 300$",
    addons: ["+ 加購脈輪檢測 500$"],
    description: [
      "以靈擺與塔羅測出你的七脈輪能量狀",
      "況，並提供一份專屬脈輪檢測報告，利",
      "用水晶能量去補足你的脈輪能量缺失。",
      "（也可以許願想額外加強的能量！）",
      "提供初版免費修改 1 次。",
    ],
    accent: "oklch(0.62 0.14 200)",
    hasForm: false,
  },
  {
    id: "D",
    title: "生命靈數 × 水晶手鍊",
    price: "1,500$ ± 300$",
    addons: ["+ 加購生命靈數檢測 500$"],
    description: [
      "會透過西元出生年月日去找出天賦數、",
      "生命數、先天數、星座數，去找出缺數",
      "並透過生命數與缺數去做能量搭配。",
      "（也可以許願想額外加強的能量！）",
      "提供初版免費修改 1 次。",
    ],
    accent: "oklch(0.68 0.11 30)",
    hasForm: false,
  },
];

interface FormData {
  effect: string;
  wristSize: string;
  fitPreference: "" | "just-right" | "loose";
  metalPreference: "" | "gold" | "silver" | "either";
  silverTube: "" | "yes" | "no";
  beadFrame: "" | "yes" | "no";
  colorPreference: string;
  specialRequests: string;
}

const EMPTY_FORM: FormData = {
  effect: "",
  wristSize: "",
  fitPreference: "",
  metalPreference: "",
  silverTube: "",
  beadFrame: "",
  colorPreference: "",
  specialRequests: "",
};

function buildNote(form: FormData): string {
  const lines = [
    `【純客製水晶手鍊諮詢表單】`,
    ``,
    `想要的功效：${form.effect || "（未填）"}`,
    `手圍：${form.wristSize ? `${form.wristSize} cm` : "（未填）"}`,
    `鬆緊偏好：${form.fitPreference === "just-right" ? "剛好（有水晶壓痕但不掐肉）" : form.fitPreference === "loose" ? "微鬆（可輕微滑動）" : "（未填）"}`,
    `金飾 / 銀飾：${form.metalPreference === "gold" ? "金飾" : form.metalPreference === "silver" ? "銀飾" : form.metalPreference === "either" ? "都可以" : "（未填）"}`,
    `加銀管：${form.silverTube === "yes" ? "要" : form.silverTube === "no" ? "不要" : "（未填）"}`,
    `珠框：${form.beadFrame === "yes" ? "要" : form.beadFrame === "no" ? "不要" : "（未填）"}`,
    `特定顏色水晶：${form.colorPreference || "無特別指定"}`,
    `其餘特殊需求：${form.specialRequests || "無"}`,
  ];
  return lines.join("\n");
}

function CustomForm({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [step, setStep] = useState(0);
  const [, navigate] = useLocation();
  const { addToCart, setIsOpen } = useCart();

  const depositProduct = products.find((p) => p.id === "custom-deposit-product");

  const steps = [
    {
      title: "想要什麼功效？",
      subtitle: "例如：提升自信、招財、愛情、療癒、保護氣場……可以自由描述",
      field: (
        <textarea
          value={form.effect}
          onChange={(e) => setForm({ ...form, effect: e.target.value })}
          placeholder="寫下你想要的功效或願望，越詳細越好"
          rows={4}
          className="w-full border border-[oklch(0.88_0_0)] px-4 py-3 text-sm font-body focus:outline-none focus:border-[oklch(0.4_0_0)] resize-none"
        />
      ),
    },
    {
      title: "手圍尺寸",
      subtitle: "請用皮尺量淨手圍（cm），不需要自行加減",
      field: (
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={form.wristSize}
            onChange={(e) => setForm({ ...form, wristSize: e.target.value })}
            placeholder="例如：15.5"
            step="0.5"
            min="10"
            max="25"
            className="w-40 border border-[oklch(0.88_0_0)] px-4 py-3 text-sm font-body focus:outline-none focus:border-[oklch(0.4_0_0)]"
          />
          <span className="text-sm font-body text-[oklch(0.5_0_0)]">cm</span>
        </div>
      ),
    },
    {
      title: "手圍的鬆緊偏好",
      subtitle: "這會影響手鍊的實際製作尺寸",
      field: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { id: "just-right" as const, label: "剛好", desc: "會有水晶壓痕但不掐肉" },
            { id: "loose" as const, label: "微鬆", desc: "可輕微滑動" },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setForm({ ...form, fitPreference: opt.id })}
              className={`px-4 py-3 text-sm font-body border text-left transition-colors ${
                form.fitPreference === opt.id
                  ? "border-[oklch(0.1_0_0)] bg-[oklch(0.97_0_0)]"
                  : "border-[oklch(0.88_0_0)] text-[oklch(0.45_0_0)] hover:border-[oklch(0.6_0_0)]"
              }`}
            >
              <span className="block font-medium">{opt.label}</span>
              <span className="block text-xs mt-0.5 opacity-70">{opt.desc}</span>
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "喜歡金飾還是銀飾？",
      subtitle: "這會影響配件（銀管、珠框等）的材質選擇",
      field: (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: "gold" as const, label: "金飾", img: "/golden.jpg" },
              { id: "silver" as const, label: "銀飾", img: "/silver.jpg" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setForm({ ...form, metalPreference: opt.id })}
                className={`border-2 rounded-sm overflow-hidden text-left transition-colors ${
                  form.metalPreference === opt.id
                    ? "border-[oklch(0.1_0_0)]"
                    : "border-[oklch(0.88_0_0)] hover:border-[oklch(0.6_0_0)]"
                }`}
              >
                <img src={opt.img} alt={opt.label} className="w-full h-32 object-cover" />
                <p className={`text-xs font-body text-center py-2 ${
                  form.metalPreference === opt.id ? "bg-[oklch(0.97_0_0)] font-medium" : "text-[oklch(0.45_0_0)]"
                }`}>
                  {opt.label}
                </p>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setForm({ ...form, metalPreference: "either" })}
            className={`w-full px-4 py-2.5 text-sm font-body border transition-colors ${
              form.metalPreference === "either"
                ? "border-[oklch(0.1_0_0)] bg-[oklch(0.97_0_0)]"
                : "border-[oklch(0.88_0_0)] text-[oklch(0.45_0_0)] hover:border-[oklch(0.6_0_0)]"
            }`}
          >
            都可以
          </button>
        </div>
      ),
    },
    {
      title: "要加銀管嗎？",
      subtitle: "銀管是穿在水晶珠之間的小金屬管，可增加層次感",
      field: (
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: "yes" as const, label: "要" },
            { id: "no" as const, label: "不要" },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setForm({ ...form, silverTube: opt.id })}
              className={`px-4 py-3 text-sm font-body border transition-colors ${
                form.silverTube === opt.id
                  ? "border-[oklch(0.1_0_0)] bg-[oklch(0.97_0_0)]"
                  : "border-[oklch(0.88_0_0)] text-[oklch(0.45_0_0)] hover:border-[oklch(0.6_0_0)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "要加珠框嗎？",
      subtitle: "珠框是套在主石外的金屬框，可突顯主石",
      field: (
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: "yes" as const, label: "要" },
            { id: "no" as const, label: "不要" },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setForm({ ...form, beadFrame: opt.id })}
              className={`px-4 py-3 text-sm font-body border transition-colors ${
                form.beadFrame === opt.id
                  ? "border-[oklch(0.1_0_0)] bg-[oklch(0.97_0_0)]"
                  : "border-[oklch(0.88_0_0)] text-[oklch(0.45_0_0)] hover:border-[oklch(0.6_0_0)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "有想要的水晶顏色嗎？",
      subtitle: "例如：偏粉色系、紫色、透明……或是沒有指定也沒關係",
      field: (
        <textarea
          value={form.colorPreference}
          onChange={(e) => setForm({ ...form, colorPreference: e.target.value })}
          placeholder="寫下喜歡的顏色或色系，沒有指定可以留空"
          rows={3}
          className="w-full border border-[oklch(0.88_0_0)] px-4 py-3 text-sm font-body focus:outline-none focus:border-[oklch(0.4_0_0)] resize-none"
        />
      ),
    },
    {
      title: "其餘特殊需求",
      subtitle: "任何其他想告訴老闆的事情，例如過敏材質、特別風格、紀念意義……",
      field: (
        <textarea
          value={form.specialRequests}
          onChange={(e) => setForm({ ...form, specialRequests: e.target.value })}
          placeholder="有任何其他想說的都可以寫在這裡，沒有的話留空即可"
          rows={4}
          className="w-full border border-[oklch(0.88_0_0)] px-4 py-3 text-sm font-body focus:outline-none focus:border-[oklch(0.4_0_0)] resize-none"
        />
      ),
    },
  ];

  const isLast = step === steps.length - 1;

  const handleNext = () => {
    if (step === 0 && !form.effect.trim()) {
      toast.error("請填寫想要的功效");
      return;
    }
    if (step === 1 && !form.wristSize) {
      toast.error("請填寫手圍尺寸");
      return;
    }
    if (step === 2 && !form.fitPreference) {
      toast.error("請選擇鬆緊偏好");
      return;
    }
    if (step === 3 && !form.metalPreference) {
      toast.error("請選擇金飾 / 銀飾偏好");
      return;
    }
    if (step === 4 && !form.silverTube) {
      toast.error("請選擇是否加銀管");
      return;
    }
    if (step === 5 && !form.beadFrame) {
      toast.error("請選擇是否加珠框");
      return;
    }
    setStep((s) => s + 1);
  };

  const handleSubmit = () => {
    if (!depositProduct) {
      toast.error("找不到訂金商品，請聯繫客服");
      return;
    }
    const note = buildNote(form);
    sessionStorage.setItem("customConsultationNote", note);
    addToCart(depositProduct);
    setIsOpen(false);
    navigate("/checkout");
    toast.success("諮詢內容已儲存，請完成結帳以預約訂金");
  };

  return (
    <div className="mt-8 bg-white border border-[oklch(0.9_0_0)] rounded-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-[oklch(0.97_0.01_70)] border-b border-[oklch(0.92_0_0)]">
        <p className="text-[0.6rem] tracking-[0.2em] text-[oklch(0.55_0_0)] uppercase mb-1">
          純客製水晶手鍊 · 報名表單
        </p>
        <div className="flex items-center gap-1.5 mt-3">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-[oklch(0.72_0.09_70)]" : "bg-[oklch(0.88_0_0)]"
              }`}
            />
          ))}
        </div>
        <p className="text-[0.65rem] text-[oklch(0.55_0_0)] mt-2 font-body">
          步驟 {step + 1} / {steps.length}
        </p>
      </div>

      {/* Step Content */}
      <div className="px-6 py-6">
        <h3
          className="text-base font-medium text-[oklch(0.1_0_0)] mb-1"
          style={{ fontFamily: "'Noto Sans TC', sans-serif" }}
        >
          {steps[step].title}
        </h3>
        <p className="text-xs text-[oklch(0.55_0_0)] mb-4 font-body leading-relaxed">
          {steps[step].subtitle}
        </p>
        {steps[step].field}
      </div>

      {/* Navigation */}
      <div className="px-6 pb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={step === 0 ? onClose : () => setStep((s) => s - 1)}
          className="flex items-center gap-1.5 text-sm font-body text-[oklch(0.5_0_0)] hover:text-[oklch(0.2_0_0)] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          {step === 0 ? "取消" : "上一步"}
        </button>

        {isLast ? (
          <button
            type="button"
            onClick={handleSubmit}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-body text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "oklch(0.72 0.09 70)" }}
          >
            <Check className="w-4 h-4" />
            確認，前往下訂金
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-body text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "oklch(0.72 0.09 70)" }}
          >
            下一步
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function Custom() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="min-h-screen bg-[oklch(0.98_0.005_240)] page-enter">
      {/* ── Hero ── */}
      <section className="pt-16 pb-10 text-center px-4">
        <p className="text-[0.6rem] tracking-[0.3em] text-[oklch(0.55_0_0)] uppercase mb-4">
          CUSTOM CRYSTAL · 客製化服務
        </p>
        <h1
          className="text-3xl sm:text-4xl font-light text-[oklch(0.1_0_0)] mb-4"
          style={{
            fontFamily: "'Noto Serif TC', serif",
            letterSpacing: "0.06em",
            lineHeight: 1.4,
          }}
        >
          專屬於你的<br />
          <em className="not-italic" style={{ color: "oklch(0.72 0.09 70)", fontWeight: 400 }}>
            能量水晶手鍊
          </em>
        </h1>
        <p
          className="text-sm text-[oklch(0.45_0_0)] leading-relaxed max-w-md mx-auto"
          style={{ fontFamily: "'Noto Sans TC', sans-serif", fontWeight: 300 }}
        >
          每一顆水晶都有獨特的能量頻率，<br />
          讓我根據你的需求，為你量身打造最適合的手鍊。
        </p>
      </section>

      {/* ── Plans Grid ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-white border border-[oklch(0.92_0_0)] rounded-sm overflow-hidden hover:shadow-md transition-shadow duration-300"
            >
              {/* Card Header */}
              <div
                className="px-8 pt-8 pb-5 text-center"
                style={{
                  background: `linear-gradient(135deg, oklch(0.97 0.01 240) 0%, oklch(0.95 0.02 240) 100%)`,
                }}
              >
                <div
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full text-white text-sm font-medium mb-4"
                  style={{ backgroundColor: plan.accent }}
                >
                  {plan.id}
                </div>
                <h2
                  className="text-xl font-medium text-[oklch(0.15_0_0)] mb-3"
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    letterSpacing: "0.05em",
                  }}
                >
                  {plan.title}
                </h2>
                <p
                  className="text-base font-medium"
                  style={{ color: plan.accent, fontFamily: "'Noto Sans TC', sans-serif" }}
                >
                  費用：{plan.price}
                </p>
                {plan.addons.map((addon, i) => (
                  <p
                    key={i}
                    className="text-xs text-[oklch(0.45_0_0)] mt-1 leading-relaxed"
                    style={{ fontFamily: "'Noto Sans TC', sans-serif", fontWeight: 300 }}
                  >
                    {addon}
                  </p>
                ))}
              </div>

              {/* Card Body */}
              <div className="px-8 py-6">
                <p
                  className="text-[0.65rem] tracking-[0.15em] text-[oklch(0.55_0_0)] uppercase mb-3"
                  style={{ fontFamily: "'Noto Sans TC', sans-serif" }}
                >
                  服務內容
                </p>
                <div className="space-y-1">
                  {plan.description.map((line, i) => (
                    <p
                      key={i}
                      className="text-sm text-[oklch(0.3_0_0)] leading-relaxed text-center"
                      style={{ fontFamily: "'Noto Sans TC', sans-serif", fontWeight: 300 }}
                    >
                      {line}
                    </p>
                  ))}
                </div>

                {plan.hasForm && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={() => setShowForm((v) => !v)}
                      className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-body text-white transition-opacity hover:opacity-90"
                      style={{ backgroundColor: plan.accent }}
                    >
                      {showForm ? "收起表單" : "填寫報名表單"}
                      <ChevronRight className={`w-4 h-4 transition-transform ${showForm ? "rotate-90" : ""}`} />
                    </button>
                  </div>
                )}
              </div>

              {plan.hasForm && showForm && (
                <div className="px-8 pb-8">
                  <CustomForm onClose={() => setShowForm(false)} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── LINE CTA ── */}
        <div className="mt-12 text-center">
          <div className="inline-block bg-white border border-[oklch(0.9_0_0)] rounded-sm px-10 py-8 max-w-md w-full">
            <p className="text-[0.6rem] tracking-[0.25em] text-[oklch(0.55_0_0)] uppercase mb-3">
              CONTACT US
            </p>
            <h3
              className="text-lg font-light text-[oklch(0.1_0_0)] mb-2"
              style={{ fontFamily: "'Noto Serif TC', serif", letterSpacing: "0.05em" }}
            >
              想了解更多？
            </h3>
            <p
              className="text-sm text-[oklch(0.45_0_0)] leading-relaxed mb-6"
              style={{ fontFamily: "'Noto Sans TC', sans-serif", fontWeight: 300 }}
            >
              歡迎透過 LINE 客服與我們聯繫，<br />
              我們將為你提供專屬的客製化諮詢服務。
            </p>
            <a
              href={LINE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-3 text-white text-sm tracking-[0.1em] transition-opacity hover:opacity-90"
              style={{
                backgroundColor: "#06C755",
                fontFamily: "'Noto Sans TC', sans-serif",
                fontWeight: 400,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.630 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.630 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
              </svg>
              聯繫 LINE 客服
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
