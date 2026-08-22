// 椛˙Crystal — 純客製水晶手鍊報名表單頁面
import { useState } from "react";
import { Check, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import CustomFormBraceletPreferenceFields, {
  type CustomFormBraceletPreferences,
  formatCustomBraceletPreferenceLines,
  validateCustomBraceletPreferences,
} from "@/components/CustomFormBraceletPreferenceFields";
import CustomFormDesignStyleField, {
  type CustomDesignStyleChoice,
  formatCustomDesignStyleNote,
} from "@/components/CustomFormDesignStyleField";
import CustomFormFocusField, {
  type CustomFocusChoice,
  formatCustomFocusNote,
  validateCustomFocus,
} from "@/components/CustomFormFocusField";
import CustomFormOrderingIntro from "@/components/CustomFormOrderingIntro";
import {
  CUSTOM_WRIST_SIZE_MAX,
  CUSTOM_WRIST_SIZE_MIN,
  CUSTOM_WRIST_SIZE_STEP,
  isValidCustomWristSize,
} from "@/lib/customOrderingContent";
import {
  CustomFormAccessGate,
  useCustomFormSubmission,
} from "@/lib/customFormSubmission";

interface FormData {
  focus: CustomFocusChoice;
  focusStory: string;
  designStyle: CustomDesignStyleChoice;
  wristSize: string;
  fitPreference: CustomFormBraceletPreferences["fitPreference"];
  metalPreference: CustomFormBraceletPreferences["metalPreference"];
  silverTube: CustomFormBraceletPreferences["silverTube"];
  beadFrame: CustomFormBraceletPreferences["beadFrame"];
  claspType: CustomFormBraceletPreferences["claspType"];
  pendantCharm: CustomFormBraceletPreferences["pendantCharm"];
  colorPreference: string;
  specialRequests: string;
  igHandle: string;
}

const EMPTY_FORM: FormData = {
  focus: "",
  focusStory: "",
  designStyle: "",
  wristSize: "",
  fitPreference: "",
  metalPreference: "",
  silverTube: "",
  beadFrame: "",
  claspType: "",
  pendantCharm: "",
  colorPreference: "",
  specialRequests: "",
  igHandle: "",
};

function buildNote(form: FormData): string {
  return [
    "【純客製水晶手鍊諮詢表單】",
    "",
    `這次最想為自己調整的是：${formatCustomFocusNote(form.focus, form.focusStory)}`,
    `喜歡 / 不喜歡的顏色：${form.colorPreference || "無特別指定"}`,
    `希望整體設計：${formatCustomDesignStyleNote(form.designStyle)}`,
    `手圍：${form.wristSize ? `${form.wristSize} cm` : "（未填）"}`,
    ...formatCustomBraceletPreferenceLines(form),
    `最後想告訴設計師的內容：${form.specialRequests || "無"}`,
    `Instagram 帳號 / LINE ID：${form.igHandle || "（未填）"}`,
  ].join("\n");
}

export default function CustomForm() {
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const formSubmission = useCustomFormSubmission("custom-deposit-product");

  const steps = [
    {
      title: "這次最想為自己調整的是？",
      subtitle: "選一個目前最想被照顧到的面向，設計師會以此為主軸挑選水晶",
      required: true,
      field: (
        <CustomFormFocusField
          value={form.focus}
          otherStory={form.focusStory}
          onChange={focus => setForm({ ...form, focus })}
          onOtherStoryChange={focusStory => setForm({ ...form, focusStory })}
        />
      ),
    },
    {
      title: "有沒有特別喜歡／不喜歡的顏色？",
      subtitle: "例如：喜歡粉色、紫色、透明；不喜歡太深、太亮……沒有特別指定也可以留空",
      required: false,
      field: (
        <textarea
          value={form.colorPreference}
          onChange={e => setForm({ ...form, colorPreference: e.target.value })}
          placeholder="寫下喜歡或不喜歡的顏色，沒有指定可以留空"
          rows={5}
          className="w-full border border-[oklch(0.88_0_0)] px-4 py-3 text-sm font-body focus:outline-none focus:border-[oklch(0.4_0_0)] resize-none leading-relaxed"
        />
      ),
    },
    {
      title: "希望整體設計？",
      subtitle: "選一個最接近你想像的方向",
      required: true,
      field: (
        <CustomFormDesignStyleField
          value={form.designStyle}
          onChange={designStyle => setForm({ ...form, designStyle })}
        />
      ),
    },
    {
      title: "手圍",
      subtitle:
        "請用皮尺量淨手圍（cm），可選 13–19 cm，不需要自行加減，我們會幫您調整鬆緊",
      required: true,
      field: (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={form.wristSize}
              onChange={e => setForm({ ...form, wristSize: e.target.value })}
              placeholder="例如：15.5"
              step={CUSTOM_WRIST_SIZE_STEP}
              min={CUSTOM_WRIST_SIZE_MIN}
              max={CUSTOM_WRIST_SIZE_MAX}
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
      title: "配件與佩戴偏好",
      subtitle: "請選擇鬆緊、金銀飾、銀管珠框、扣具與吊飾偏好",
      required: true,
      field: (
        <CustomFormBraceletPreferenceFields
          value={form}
          onChange={updates => setForm({ ...form, ...updates })}
        />
      ),
    },
    {
      title: "最後，有沒有什麼想告訴設計師的？",
      subtitle:
        "自由填寫。可以補充喜歡／不喜歡的飾品、過敏材質、紀念意義，或其他想讓設計師知道的內容。",
      required: false,
      field: (
        <textarea
          value={form.specialRequests}
          onChange={e => setForm({ ...form, specialRequests: e.target.value })}
          placeholder="例如：不喜歡太華麗、容易過敏不要某種材質、想放入某個紀念意義……"
          rows={7}
          className="w-full border border-[oklch(0.88_0_0)] px-4 py-3 text-sm font-body focus:outline-none focus:border-[oklch(0.4_0_0)] resize-none leading-relaxed"
        />
      ),
    },
    {
      title: "完成！付完訂金後記得加入 LINE",
      subtitle: "",
      required: false,
      field: (
        <div className="space-y-6">
          <div
            className="p-5 rounded-sm"
            style={{
              backgroundColor: "oklch(0.97 0.03 145)",
              border: "1px solid oklch(0.85 0.06 145)",
            }}
          >
            <p className="text-sm font-body text-[oklch(0.15_0_0)] leading-relaxed mb-4">
              付完訂金後，請加入官方 LINE 並傳送
              <br />
              <strong>「訂單編號 ＋ 姓名」</strong>，<br />
              設計師才能將客製化水晶的<strong>初版及成品圖</strong>傳送給您！
            </p>
            <a
              href="https://line.me/R/ti/p/@011tymeh"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-body text-white rounded-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#06C755" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.630 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.630 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
              </svg>
              加入官方 LINE
            </a>
          </div>
          <div>
            <label
              htmlFor="custom-contact-handle"
              className="block text-xs font-body text-[oklch(0.5_0_0)] mb-1.5"
            >
              Instagram 帳號 / LINE ID
            </label>
            <input
              id="custom-contact-handle"
              type="text"
              value={form.igHandle}
              onChange={e => setForm({ ...form, igHandle: e.target.value })}
              placeholder="例如：@your_ig_handle 或 LINE ID"
              className="w-full border border-[oklch(0.88_0_0)] px-4 py-3 text-sm font-body focus:outline-none focus:border-[oklch(0.4_0_0)]"
            />
            <p className="mt-1.5 text-xs font-body text-[oklch(0.6_0_0)]">
              請填寫 IG 帳號；若沒有 IG，請填寫 LINE ID
            </p>
          </div>
        </div>
      ),
    },
  ];

  const validateForm = () => {
    const focusError = validateCustomFocus(
      form.focus,
      form.focusStory,
      "這次最想為自己調整的面向"
    );
    if (focusError) {
      toast.error(focusError);
      return false;
    }
    if (!form.designStyle) {
      toast.error("請選擇希望整體設計");
      return false;
    }
    if (!form.wristSize) {
      toast.error("請填寫手圍尺寸");
      return false;
    }
    if (!isValidCustomWristSize(form.wristSize)) {
      toast.error("手圍尺寸請輸入 13 至 19 cm（以 0.5 cm 為單位）");
      return false;
    }
    const preferenceError = validateCustomBraceletPreferences(form);
    if (preferenceError) {
      toast.error(preferenceError);
      return false;
    }
    if (!form.igHandle.trim()) {
      toast.error("請填寫 IG 帳號；若沒有 IG，請填寫 LINE ID");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    const customConsultationNote = buildNote(form);
    try {
      await formSubmission.submitCustomNote(customConsultationNote);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "客製需求送出失敗，請稍後再試");
    }
  };

  return (
    <div className="min-h-screen bg-[oklch(0.98_0.005_240)] page-enter">
      {/* Header */}
      <div className="border-b border-[oklch(0.93_0_0)] bg-white">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/custom">
            <button className="flex items-center gap-1.5 text-sm font-body text-[oklch(0.5_0_0)] hover:text-[oklch(0.2_0_0)] transition-colors">
              <ArrowLeft className="w-4 h-4" />
              返回
            </button>
          </Link>
          <div>
            <p className="text-[0.6rem] tracking-[0.2em] text-[oklch(0.55_0_0)] uppercase">
              純客製水晶手鍊
            </p>
            <p className="text-sm font-body font-medium text-[oklch(0.1_0_0)]">
              報名表單
            </p>
          </div>
        </div>
      </div>

      <CustomFormAccessGate
        merchantTradeNo={formSubmission.merchantTradeNo}
        isLoading={formSubmission.isLoading}
        isError={formSubmission.isError}
        canFillForm={formSubmission.canFillForm}
        hasExistingNote={formSubmission.hasExistingNote}
      >
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="space-y-5 mb-8">
          <CustomFormOrderingIntro />
          {steps.map((item, index) => (
            <section
              key={item.title}
              className="bg-white border border-[oklch(0.92_0_0)] rounded-sm p-6 sm:p-8"
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <h2
                  className="text-lg font-medium text-[oklch(0.1_0_0)]"
                  style={{ fontFamily: "'Noto Sans TC', sans-serif" }}
                >
                  {index + 1}. {item.title}
                </h2>
                {!item.required &&
                  item.title !== "完成！付完訂金後記得加入 LINE" && (
                    <span className="shrink-0 text-xs font-body text-[oklch(0.65_0_0)]">
                      選填
                    </span>
                  )}
              </div>
              {item.subtitle && (
                <p className="text-sm text-[oklch(0.55_0_0)] mb-6 font-body leading-relaxed">
                  {item.subtitle}
                </p>
              )}
              {item.field}
            </section>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <Link href="/custom">
            <button
              type="button"
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-body text-[oklch(0.5_0_0)] hover:text-[oklch(0.2_0_0)] border border-[oklch(0.88_0_0)] hover:border-[oklch(0.6_0_0)] transition-colors rounded-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              返回方案頁
            </button>
          </Link>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={formSubmission.isSubmitting}
            className="flex items-center gap-2 px-8 py-2.5 text-sm font-body text-white transition-opacity hover:opacity-90 rounded-sm"
            style={{ backgroundColor: "oklch(0.72 0.09 70)" }}
          >
            <Check className="w-4 h-4" />
            {formSubmission.isSubmitting ? "送出中..." : "送出客製需求"}
          </button>
        </div>
      </div>
      </CustomFormAccessGate>
    </div>
  );
}
