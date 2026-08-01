import { Check } from "lucide-react";

export type CustomAddonId = "pure" | "tarot" | "chakra" | "numerology";

export const CUSTOM_ADDON_OPTIONS: {
  id: CustomAddonId;
  label: string;
  description: string;
}[] = [
  {
    id: "pure",
    label: "純客製水晶手鍊",
    description: "依想要的功效、色系與風格，單純為您搭配專屬水晶手鍊。",
  },
  {
    id: "tarot",
    label: "塔羅 × 水晶手鍊",
    description: "先透過塔羅解析需求與能量狀態，再延伸成水晶搭配方向。",
  },
  {
    id: "chakra",
    label: "脈輪檢測 × 水晶手鍊",
    description: "加做七脈輪能量檢測，依檢測結果補足需要加強的能量。",
  },
  {
    id: "numerology",
    label: "生命靈數 × 水晶手鍊",
    description: "以生日與生命靈數分析能量特質，再搭配對應的水晶設計。",
  },
];

interface CustomFormAddonSelectorProps {
  currentAddonId: CustomAddonId;
  selectedAddonIds: CustomAddonId[];
  onChange: (selectedAddonIds: CustomAddonId[]) => void;
}

export function formatCustomAddonNote(
  selectedAddonIds: CustomAddonId[]
): string {
  const selectedLabels = CUSTOM_ADDON_OPTIONS.filter(option =>
    selectedAddonIds.includes(option.id)
  ).map(option => option.label);

  return [
    "",
    "── 加購其他客製化方案 ──",
    selectedLabels.length > 0 ? selectedLabels.join("、") : "未加購",
  ].join("\n");
}

export default function CustomFormAddonSelector({
  currentAddonId,
  selectedAddonIds,
  onChange,
}: CustomFormAddonSelectorProps) {
  const addonOptions = CUSTOM_ADDON_OPTIONS.filter(
    option => option.id !== currentAddonId
  );

  const toggleAddon = (addonId: CustomAddonId) => {
    if (selectedAddonIds.includes(addonId)) {
      onChange(selectedAddonIds.filter(id => id !== addonId));
      return;
    }

    onChange([...selectedAddonIds, addonId]);
  };

  return (
    <section className="bg-white border border-[oklch(0.92_0_0)] rounded-sm p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4 mb-2">
        <h2
          className="text-lg font-medium text-[oklch(0.1_0_0)]"
          style={{ fontFamily: "'Noto Sans TC', sans-serif" }}
        >
          想一起加購其他客製化嗎？
        </h2>
        <span className="shrink-0 text-xs font-body text-[oklch(0.65_0_0)]">
          選填
        </span>
      </div>
      <p className="text-sm text-[oklch(0.55_0_0)] mb-5 font-body leading-relaxed">
        可同時搭配其他客製服務，我們會一起評估與報價。
      </p>

      <div className="space-y-3">
        {addonOptions.map(option => {
          const checked = selectedAddonIds.includes(option.id);

          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={checked}
              onClick={() => toggleAddon(option.id)}
              className={`w-full rounded-sm border-2 px-4 py-4 text-left transition-colors ${
                checked
                  ? "border-[oklch(0.1_0_0)] bg-[oklch(0.97_0_0)]"
                  : "border-[oklch(0.88_0_0)] hover:border-[oklch(0.6_0_0)]"
              }`}
            >
              <span className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border ${
                    checked
                      ? "border-[oklch(0.1_0_0)] bg-[oklch(0.1_0_0)] text-white"
                      : "border-[oklch(0.78_0_0)] bg-white"
                  }`}
                >
                  {checked && <Check className="h-3.5 w-3.5" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-body font-semibold text-[oklch(0.15_0_0)]">
                    {option.label}
                  </span>
                  <span className="mt-1 block text-xs font-body leading-relaxed text-[oklch(0.5_0_0)]">
                    {option.description}
                  </span>
                  <span className="mt-2 block text-[0.7rem] font-body text-[oklch(0.62_0_0)]">
                    加購價另報
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {selectedAddonIds.length > 0 && (
        <p className="mt-4 text-xs font-body text-[oklch(0.45_0_0)]">
          已選擇 {selectedAddonIds.length} 項加購服務
        </p>
      )}
    </section>
  );
}
