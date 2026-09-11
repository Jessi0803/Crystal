// 椛˙Crystal — 客製化表單「想調整的面向 / 額外指定功效」選擇題

export const CUSTOM_FOCUS_OPTIONS = [
  { id: "love", label: "感情" },
  { id: "career", label: "工作" },
  { id: "wealth", label: "財運" },
  { id: "relationship", label: "人際" },
  { id: "emotion", label: "情緒" },
  { id: "confidence", label: "自信" },
  { id: "new-start", label: "新的開始" },
  { id: "other", label: "其他（可以跟我們說明你的故事）" },
  { id: "designer", label: "沒有想法，交給設計師" },
] as const;

export type CustomFocusId = (typeof CUSTOM_FOCUS_OPTIONS)[number]["id"];
export type CustomFocusChoice = CustomFocusId[];

const FOCUS_LABELS: Record<CustomFocusId, string> = CUSTOM_FOCUS_OPTIONS.reduce(
  (acc, opt) => {
    acc[opt.id] = opt.label;
    return acc;
  },
  {} as Record<CustomFocusId, string>
);

/** 回傳錯誤訊息；通過驗證時回傳 null */
export function validateCustomFocus(
  value: CustomFocusChoice,
  otherStory: string,
  questionLabel: string
): string | null {
  if (value.length === 0) return `請選擇${questionLabel}`;
  if (value.includes("other") && !otherStory.trim()) {
    return "選擇「其他」時，請跟我們說明你的故事";
  }
  return null;
}

export function formatCustomFocusNote(
  value: CustomFocusChoice,
  otherStory: string
): string {
  if (value.length === 0) return "（未填）";
  return value
    .map(choice => choice === "other"
      ? `其他：${otherStory.trim() || "（未說明）"}`
      : FOCUS_LABELS[choice])
    .join("、");
}

export function toggleCustomFocusChoice(
  value: CustomFocusChoice,
  choice: CustomFocusId,
  multiple: boolean
): CustomFocusChoice {
  if (!multiple) return [choice];
  if (choice === "designer") {
    return value.includes("designer") ? [] : ["designer"];
  }
  const choicesWithoutDesigner = value.filter(item => item !== "designer");
  return choicesWithoutDesigner.includes(choice)
    ? choicesWithoutDesigner.filter(item => item !== choice)
    : [...choicesWithoutDesigner, choice];
}

interface CustomFormFocusFieldProps {
  value: CustomFocusChoice;
  otherStory: string;
  onChange: (value: CustomFocusChoice) => void;
  onOtherStoryChange: (value: string) => void;
  multiple?: boolean;
}

export default function CustomFormFocusField({
  value,
  otherStory,
  onChange,
  onOtherStoryChange,
  multiple = false,
}: CustomFormFocusFieldProps) {
  const toggleChoice = (choice: CustomFocusId) => {
    onChange(toggleCustomFocusChoice(value, choice, multiple));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {CUSTOM_FOCUS_OPTIONS.map(opt => (
          <button
            key={opt.id}
            type="button"
            onClick={() => toggleChoice(opt.id)}
            className={`px-4 py-3.5 text-sm font-body border-2 transition-colors rounded-sm ${
              opt.id === "designer" || opt.id === "other"
                ? "col-span-2 sm:col-span-3"
                : ""
            } ${
              value.includes(opt.id)
                ? "border-[oklch(0.1_0_0)] bg-[oklch(0.97_0_0)] font-semibold"
                : "border-[oklch(0.88_0_0)] text-[oklch(0.45_0_0)] hover:border-[oklch(0.6_0_0)]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {value.includes("other") && (
        <div>
          <label className="block text-xs font-body text-[oklch(0.5_0_0)] mb-1.5">
            可以跟我們說明你的故事
          </label>
          <textarea
            value={otherStory}
            onChange={e => onOtherStoryChange(e.target.value)}
            placeholder="寫下你的狀況或想調整的地方，越詳細越好"
            rows={4}
            className="w-full border border-[oklch(0.88_0_0)] px-4 py-3 text-sm font-body focus:outline-none focus:border-[oklch(0.4_0_0)] resize-none leading-relaxed"
          />
        </div>
      )}
    </div>
  );
}
