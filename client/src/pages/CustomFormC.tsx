// 椛˙Crystal — 脈輪檢測 × 水晶手鍊報名表單
import { useState } from "react";
import { ChevronRight, ChevronLeft, Check } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useCart } from "@/contexts/CartContext";
import { products } from "@/lib/data";
import { toast } from "sonner";

interface FormData {
  name: string;
  birthday: string;
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
  name: "",
  birthday: "",
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
  return [
    "【脈輪檢測 × 水晶手鍊諮詢表單】",
    "",
    `姓名：${form.name || "（未填）"}`,
    `西元生日：${form.birthday || "（未填）"}`,
    `想額外指定的功效：${form.effect || "無特別指定"}`,
    `手圍：${form.wristSize ? `${form.wristSize} cm` : "（未填）"}`,
    `鬆緊偏好：${form.fitPreference === "just-right" ? "剛好（有水晶壓痕但不掐肉）" : form.fitPreference === "loose" ? "微鬆（可輕微滑動）" : "（未填）"}`,
    `金飾 / 銀飾：${form.metalPreference === "gold" ? "金飾" : form.metalPreference === "silver" ? "銀飾" : form.metalPreference === "either" ? "都可以" : "（未填）"}`,
    `加銀管：${form.silverTube === "yes" ? "要" : form.silverTube === "no" ? "不要" : "（未填）"}`,
    `珠框：${form.beadFrame === "yes" ? "要" : form.beadFrame === "no" ? "不要" : "（未填）"}`,
    `特定顏色水晶：${form.colorPreference || "無特別指定"}`,
    `其餘特殊需求：${form.specialRequests || "無"}`,
  ].join("\n");
}

const ACCENT = "oklch(0.62 0.14 200)";

export default function CustomFormC() {
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [step, setStep] = useState(0);
  const [, navigate] = useLocation();
  const { addToCart, setIsOpen } = useCart();

  const depositProduct = products.find((p) => p.id === "chakra-crystal-deposit-product");

  const steps = [
    {
      title: "你的姓名是？",
      subtitle: "請填寫真實姓名，老闆將用於脈輪能量解讀",
      required: true,
      field: (
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="請填寫真實姓名"
          className="w-full border border-[oklch(0.88_0_0)] px-4 py-3 text-sm font-body focus:outline-none focus:border-[oklch(0.4_0_0)]"
        />
      ),
    },
    {
      title: "你的西元生日是？",
      subtitle: "老闆將透過生日進行脈輪能量解讀",
      required: true,
      field: (
        <input
          type="text"
          value={form.birthday}
          onChange={(e) => setForm({ ...form, birthday: e.target.value })}
          placeholder="例如：1995/08/22"
          className="w-full border border-[oklch(0.88_0_0)] px-4 py-3 text-sm font-body focus:outline-none focus:border-[oklch(0.4_0_0)]"
        />
      ),
    },
    {
      title: "有想額外指定的功效嗎？",
      subtitle: "老闆會以脈輪檢測結果為主，但你也可以許願想加強的能量！沒有的話留空即可",
      required: false,
      field: (
        <textarea
          value={form.effect}
          onChange={(e) => setForm({ ...form, effect: e.target.value })}
          placeholder="例如：招財、愛情、療癒、保護氣場……沒有指定可以留空"
          rows={5}
          className="w-full border border-[oklch(0.88_0_0)] px-4 py-3 text-sm font-body focus:outline-none focus:border-[oklch(0.4_0_0)] resize-none leading-relaxed"
        />
      ),
    },
    {
      title: "手圍尺寸是多少？",
      subtitle: "請用皮尺量淨手圍（cm），不需要自行加減，我們會幫你調整鬆緊",
      required: true,
      field: (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={form.wristSize}
              onChange={(e) => setForm({ ...form, wristSize: e.target.value })}
              placeholder="例如：15.5"
              step="0.5"
              min="10"
              max="25"
              className="w-48 border border-[oklch(0.88_0_0)] px-4 py-3 text-sm font-body focus:outline-none focus:border-[oklch(0.4_0_0)]"
            />
            <span className="text-sm font-body text-[oklch(0.5_0_0)]">cm</span>
          </div>
          <p className="text-xs font-body text-[oklch(0.6_0_0)] leading-relaxed">
            不知道怎麼量？拿皮尺平貼在想戴的位置，繞一圈的長度就是淨手圍。
          </p>
        </div>
      ),
    },
    {
      title: "手圍的鬆緊偏好？",
      subtitle: "這會影響手鍊的實際製作尺寸",
      required: true,
      field: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { id: "just-right" as const, label: "剛好", desc: "會有水晶壓痕但不掐肉，手鍊緊貼手腕" },
            { id: "loose" as const, label: "微鬆", desc: "可輕微滑動，戴起來較為舒適寬鬆" },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setForm({ ...form, fitPreference: opt.id })}
              className={`px-5 py-4 text-sm font-body border-2 text-left transition-colors rounded-sm ${
                form.fitPreference === opt.id
                  ? "border-[oklch(0.1_0_0)] bg-[oklch(0.97_0_0)]"
                  : "border-[oklch(0.88_0_0)] text-[oklch(0.45_0_0)] hover:border-[oklch(0.6_0_0)]"
              }`}
            >
              <span className="block font-semibold text-base mb-1">{opt.label}</span>
              <span className="block text-xs leading-relaxed opacity-80">{opt.desc}</span>
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "喜歡金飾還是銀飾？",
      subtitle: "這會影響配件（銀管、珠框等）的材質選擇",
      required: true,
      field: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
                <img src={opt.img} alt={opt.label} className="w-full h-44 object-cover" />
                <p className={`text-sm font-body text-center py-2.5 ${
                  form.metalPreference === opt.id
                    ? "bg-[oklch(0.97_0_0)] font-semibold"
                    : "text-[oklch(0.45_0_0)]"
                }`}>
                  {opt.label}
                </p>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setForm({ ...form, metalPreference: "either" })}
            className={`w-full px-4 py-3 text-sm font-body border-2 transition-colors rounded-sm ${
              form.metalPreference === "either"
                ? "border-[oklch(0.1_0_0)] bg-[oklch(0.97_0_0)] font-semibold"
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
      subtitle: "銀管是穿在水晶珠之間的小金屬管，可增加層次感與精緻度",
      required: true,
      field: (
        <div className="grid grid-cols-2 gap-4">
          {[
            { id: "yes" as const, label: "要" },
            { id: "no" as const, label: "不要" },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setForm({ ...form, silverTube: opt.id })}
              className={`px-4 py-5 text-base font-body border-2 transition-colors rounded-sm ${
                form.silverTube === opt.id
                  ? "border-[oklch(0.1_0_0)] bg-[oklch(0.97_0_0)] font-semibold"
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
      subtitle: "珠框是套在主石外的金屬框，可突顯主石、增加立體感",
      required: true,
      field: (
        <div className="grid grid-cols-2 gap-4">
          {[
            { id: "yes" as const, label: "要" },
            { id: "no" as const, label: "不要" },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setForm({ ...form, beadFrame: opt.id })}
              className={`px-4 py-5 text-base font-body border-2 transition-colors rounded-sm ${
                form.beadFrame === opt.id
                  ? "border-[oklch(0.1_0_0)] bg-[oklch(0.97_0_0)] font-semibold"
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
      subtitle: "例如：偏粉色系、紫色、透明……沒有特別指定也沒關係，留空即可",
      required: false,
      field: (
        <textarea
          value={form.colorPreference}
          onChange={(e) => setForm({ ...form, colorPreference: e.target.value })}
          placeholder="寫下喜歡的顏色或色系，沒有指定可以留空"
          rows={5}
          className="w-full border border-[oklch(0.88_0_0)] px-4 py-3 text-sm font-body focus:outline-none focus:border-[oklch(0.4_0_0)] resize-none leading-relaxed"
        />
      ),
    },
    {
      title: "還有其他特殊需求嗎？",
      subtitle: "任何其他想告訴老闆的事情，例如過敏材質、特別風格、紀念意義……沒有的話留空即可",
      required: false,
      field: (
        <textarea
          value={form.specialRequests}
          onChange={(e) => setForm({ ...form, specialRequests: e.target.value })}
          placeholder="有任何其他想說的都可以寫在這裡"
          rows={5}
          className="w-full border border-[oklch(0.88_0_0)] px-4 py-3 text-sm font-body focus:outline-none focus:border-[oklch(0.4_0_0)] resize-none leading-relaxed"
        />
      ),
    },
  ];

  const isLast = step === steps.length - 1;

  const handleNext = () => {
    if (step === 0 && !form.name.trim()) { toast.error("請填寫姓名"); return; }
    if (step === 1 && !form.birthday.trim()) { toast.error("請填寫西元生日"); return; }
    if (step === 3 && !form.wristSize) { toast.error("請填寫手圍尺寸"); return; }
    if (step === 4 && !form.fitPreference) { toast.error("請選擇鬆緊偏好"); return; }
    if (step === 5 && !form.metalPreference) { toast.error("請選擇金飾 / 銀飾偏好"); return; }
    if (step === 6 && !form.silverTube) { toast.error("請選擇是否加銀管"); return; }
    if (step === 7 && !form.beadFrame) { toast.error("請選擇是否加珠框"); return; }
    setStep((s) => s + 1);
  };

  const handleSubmit = () => {
    if (!depositProduct) { toast.error("找不到訂金商品，請聯繫客服"); return; }
    sessionStorage.setItem("customConsultationNote", buildNote(form));
    addToCart(depositProduct);
    setIsOpen(false);
    navigate("/checkout");
    toast.success("諮詢內容已儲存，請完成結帳以預約訂金");
  };

  return (
    <div className="min-h-screen bg-[oklch(0.98_0.005_240)] page-enter">
      {/* Header */}
      <div className="border-b border-[oklch(0.93_0_0)] bg-white">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/custom">
            <button className="flex items-center gap-1.5 text-sm font-body text-[oklch(0.5_0_0)] hover:text-[oklch(0.2_0_0)] transition-colors">
              <ChevronLeft className="w-4 h-4" />
              返回
            </button>
          </Link>
          <div>
            <p className="text-[0.6rem] tracking-[0.2em] text-[oklch(0.55_0_0)] uppercase">脈輪檢測 × 水晶手鍊</p>
            <p className="text-sm font-body font-medium text-[oklch(0.1_0_0)]">報名表單</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center gap-1.5 mb-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= step ? "bg-[oklch(0.62_0.14_200)]" : "bg-[oklch(0.88_0_0)]"
                }`}
              />
            ))}
          </div>
          <p className="text-xs font-body text-[oklch(0.55_0_0)]">
            步驟 {step + 1} / {steps.length}
            {!steps[step].required && <span className="ml-2 text-[oklch(0.65_0_0)]">（選填）</span>}
          </p>
        </div>

        {/* Step Content */}
        <div className="bg-white border border-[oklch(0.92_0_0)] rounded-sm p-6 sm:p-8 mb-6">
          <h2
            className="text-xl font-medium text-[oklch(0.1_0_0)] mb-2"
            style={{ fontFamily: "'Noto Sans TC', sans-serif" }}
          >
            {steps[step].title}
          </h2>
          <p className="text-sm text-[oklch(0.55_0_0)] mb-6 font-body leading-relaxed">
            {steps[step].subtitle}
          </p>
          {steps[step].field}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={step === 0 ? () => navigate("/custom") : () => setStep((s) => s - 1)}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-body text-[oklch(0.5_0_0)] hover:text-[oklch(0.2_0_0)] border border-[oklch(0.88_0_0)] hover:border-[oklch(0.6_0_0)] transition-colors rounded-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 0 ? "返回方案頁" : "上一步"}
          </button>

          {isLast ? (
            <button
              type="button"
              onClick={handleSubmit}
              className="flex items-center gap-2 px-8 py-2.5 text-sm font-body text-white transition-opacity hover:opacity-90 rounded-sm"
              style={{ backgroundColor: ACCENT }}
            >
              <Check className="w-4 h-4" />
              確認，前往下訂金
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 px-8 py-2.5 text-sm font-body text-white transition-opacity hover:opacity-90 rounded-sm"
              style={{ backgroundColor: ACCENT }}
            >
              下一步
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
