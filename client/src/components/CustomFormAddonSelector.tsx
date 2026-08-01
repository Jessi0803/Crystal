import { Check } from "lucide-react";

export type CustomAddonId = "pure" | "tarot" | "chakra" | "numerology";

export const CUSTOM_ADDON_PRODUCT_IDS: Record<CustomAddonId, string> = {
  pure: "custom-deposit-product",
  tarot: "tarot-crystal-deposit-product",
  chakra: "chakra-crystal-deposit-product",
  numerology: "numerology-crystal-deposit-product",
};

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

export type CustomAddonSupplementData = {
  pure: {
    effect: string;
  };
  tarot: {
    topic: string;
    name: string;
    birthday: string;
    situation: string;
  };
  chakra: {
    name: string;
    birthday: string;
  };
  numerology: {
    name: string;
    birthday: string;
  };
};

export const EMPTY_CUSTOM_ADDON_SUPPLEMENTS: CustomAddonSupplementData = {
  pure: { effect: "" },
  tarot: { topic: "", name: "", birthday: "", situation: "" },
  chakra: { name: "", birthday: "" },
  numerology: { name: "", birthday: "" },
};

interface CustomFormAddonSelectorProps {
  currentAddonId: CustomAddonId;
  selectedAddonIds: CustomAddonId[];
  onChange: (selectedAddonIds: CustomAddonId[]) => void;
  supplements: CustomAddonSupplementData;
  onSupplementsChange: (supplements: CustomAddonSupplementData) => void;
}

export function formatCustomAddonNote(
  selectedAddonIds: CustomAddonId[]
): string {
  const selectedLabels = CUSTOM_ADDON_OPTIONS.filter(option =>
    selectedAddonIds.includes(option.id)
  ).map(option => option.label);

  return [
    "",
    "── 一併選擇其他客製化方案 ──",
    selectedLabels.length > 0 ? selectedLabels.join("、") : "未選擇其他方案",
  ].join("\n");
}

export function formatCustomAddonSupplementNote(
  addonId: CustomAddonId,
  supplements: CustomAddonSupplementData
): string {
  if (addonId === "pure") {
    return [`純客製補充功效：${supplements.pure.effect || "無特別指定"}`].join(
      "\n"
    );
  }

  if (addonId === "tarot") {
    return [
      `占卜主題：${supplements.tarot.topic || "（未填）"}`,
      `姓名：${supplements.tarot.name || "（未填）"}`,
      `西元生日：${supplements.tarot.birthday || "（未填）"}`,
      `占卜概況：${supplements.tarot.situation || "（未填）"}`,
    ].join("\n");
  }

  if (addonId === "chakra") {
    return [
      `姓名：${supplements.chakra.name || "（未填）"}`,
      `西元生日：${supplements.chakra.birthday || "（未填）"}`,
    ].join("\n");
  }

  return [
    `姓名：${supplements.numerology.name || "（未填）"}`,
    `西元生日：${supplements.numerology.birthday || "（未填）"}`,
  ].join("\n");
}

export function validateCustomAddonSupplements(
  selectedAddonIds: CustomAddonId[],
  supplements: CustomAddonSupplementData
): string | null {
  if (selectedAddonIds.includes("tarot")) {
    if (!supplements.tarot.topic.trim()) return "請填寫塔羅占卜主題";
    if (!supplements.tarot.name.trim()) return "請填寫塔羅方案姓名";
    if (!supplements.tarot.birthday.trim()) return "請填寫塔羅方案西元生日";
    if (!supplements.tarot.situation.trim()) return "請填寫塔羅占卜概況";
  }

  if (selectedAddonIds.includes("chakra")) {
    if (!supplements.chakra.name.trim()) return "請填寫脈輪檢測姓名";
    if (!supplements.chakra.birthday.trim()) return "請填寫脈輪檢測西元生日";
  }

  if (selectedAddonIds.includes("numerology")) {
    if (!supplements.numerology.name.trim()) return "請填寫生命靈數姓名";
    if (!supplements.numerology.birthday.trim())
      return "請填寫生命靈數西元生日";
  }

  return null;
}

export default function CustomFormAddonSelector({
  currentAddonId,
  selectedAddonIds,
  onChange,
  supplements,
  onSupplementsChange,
}: CustomFormAddonSelectorProps) {
  const addonOptions = CUSTOM_ADDON_OPTIONS.filter(
    option => option.id !== currentAddonId
  );
  const selectedOptions = CUSTOM_ADDON_OPTIONS.filter(option =>
    selectedAddonIds.includes(option.id)
  );

  const toggleAddon = (addonId: CustomAddonId) => {
    if (selectedAddonIds.includes(addonId)) {
      onChange(selectedAddonIds.filter(id => id !== addonId));
      return;
    }

    onChange([...selectedAddonIds, addonId]);
  };

  const updateSupplement = <T extends CustomAddonId>(
    addonId: T,
    value: CustomAddonSupplementData[T]
  ) => {
    onSupplementsChange({ ...supplements, [addonId]: value });
  };

  return (
    <section className="bg-white border border-[oklch(0.92_0_0)] rounded-sm p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4 mb-2">
        <h2
          className="text-lg font-medium text-[oklch(0.1_0_0)]"
          style={{ fontFamily: "'Noto Sans TC', sans-serif" }}
        >
          想一併選擇其他客製化嗎？
        </h2>
        <span className="shrink-0 text-xs font-body text-[oklch(0.65_0_0)]">
          選填
        </span>
      </div>
      <p className="text-sm text-[oklch(0.55_0_0)] mb-5 font-body leading-relaxed">
        可同時搭配其他客製服務，我們會一起確認需求。
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
                    一併安排
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {selectedOptions.length > 0 && (
        <div className="mt-5 rounded-sm border border-[oklch(0.9_0_0)] bg-[oklch(0.98_0_0)] p-4">
          <p className="text-xs font-body text-[oklch(0.45_0_0)]">
            已選擇 {selectedOptions.length} 項其他客製服務，請補充以下資料。
          </p>
          <div className="mt-4 space-y-4">
            {selectedOptions.map(option => (
              <div
                key={option.id}
                className="rounded-sm border border-[oklch(0.86_0_0)] bg-white p-4"
              >
                <p className="text-sm font-body font-semibold text-[oklch(0.16_0_0)]">
                  {option.label}
                </p>
                {option.id === "pure" && (
                  <div className="mt-3">
                    <label className="mb-1.5 block text-xs font-body text-[oklch(0.5_0_0)]">
                      想補充的功效
                    </label>
                    <textarea
                      value={supplements.pure.effect}
                      onChange={event =>
                        updateSupplement("pure", {
                          effect: event.target.value,
                        })
                      }
                      placeholder="例如：希望加強財運、穩定情緒、提升自信……"
                      rows={3}
                      className="w-full resize-none border border-[oklch(0.88_0_0)] px-3 py-2.5 text-sm font-body leading-relaxed focus:border-[oklch(0.4_0_0)] focus:outline-none"
                    />
                  </div>
                )}

                {option.id === "tarot" && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-body text-[oklch(0.5_0_0)]">
                        想占卜的主題
                      </label>
                      <input
                        type="text"
                        value={supplements.tarot.topic}
                        onChange={event =>
                          updateSupplement("tarot", {
                            ...supplements.tarot,
                            topic: event.target.value,
                          })
                        }
                        placeholder="例如：財富密碼、戀愛指南、職涯探索……"
                        className="w-full border border-[oklch(0.88_0_0)] px-3 py-2.5 text-sm font-body focus:border-[oklch(0.4_0_0)] focus:outline-none"
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-body text-[oklch(0.5_0_0)]">
                          姓名
                        </label>
                        <input
                          type="text"
                          value={supplements.tarot.name}
                          onChange={event =>
                            updateSupplement("tarot", {
                              ...supplements.tarot,
                              name: event.target.value,
                            })
                          }
                          placeholder="請填寫真實姓名"
                          className="w-full border border-[oklch(0.88_0_0)] px-3 py-2.5 text-sm font-body focus:border-[oklch(0.4_0_0)] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-body text-[oklch(0.5_0_0)]">
                          西元生日
                        </label>
                        <input
                          type="text"
                          value={supplements.tarot.birthday}
                          onChange={event =>
                            updateSupplement("tarot", {
                              ...supplements.tarot,
                              birthday: event.target.value,
                            })
                          }
                          placeholder="例如：1995/08/22"
                          className="w-full border border-[oklch(0.88_0_0)] px-3 py-2.5 text-sm font-body focus:border-[oklch(0.4_0_0)] focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-body text-[oklch(0.5_0_0)]">
                        占卜概況
                      </label>
                      <textarea
                        value={supplements.tarot.situation}
                        onChange={event =>
                          updateSupplement("tarot", {
                            ...supplements.tarot,
                            situation: event.target.value,
                          })
                        }
                        placeholder="簡單描述目前情況與想詢問的方向"
                        rows={3}
                        className="w-full resize-none border border-[oklch(0.88_0_0)] px-3 py-2.5 text-sm font-body leading-relaxed focus:border-[oklch(0.4_0_0)] focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {(option.id === "chakra" || option.id === "numerology") && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-body text-[oklch(0.5_0_0)]">
                        姓名
                      </label>
                      <input
                        type="text"
                        value={supplements[option.id].name}
                        onChange={event =>
                          updateSupplement(option.id, {
                            ...supplements[option.id],
                            name: event.target.value,
                          })
                        }
                        placeholder="請填寫真實姓名"
                        className="w-full border border-[oklch(0.88_0_0)] px-3 py-2.5 text-sm font-body focus:border-[oklch(0.4_0_0)] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-body text-[oklch(0.5_0_0)]">
                        西元生日
                      </label>
                      <input
                        type="text"
                        value={supplements[option.id].birthday}
                        onChange={event =>
                          updateSupplement(option.id, {
                            ...supplements[option.id],
                            birthday: event.target.value,
                          })
                        }
                        placeholder="例如：1995/08/22"
                        className="w-full border border-[oklch(0.88_0_0)] px-3 py-2.5 text-sm font-body focus:border-[oklch(0.4_0_0)] focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
