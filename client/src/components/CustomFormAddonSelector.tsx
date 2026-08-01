import { Check } from "lucide-react";
import {
  CUSTOM_WRIST_SIZE_MAX,
  CUSTOM_WRIST_SIZE_MIN,
  CUSTOM_WRIST_SIZE_STEP,
  isValidCustomWristSize,
} from "@/lib/customOrderingContent";
import ClaspDurabilityNotice from "@/components/ClaspDurabilityNotice";
import CustomFormPendantCharmField from "@/components/CustomFormPendantCharmField";

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

type CommonBraceletFields = {
  effect: string;
  wristSize: string;
  fitPreference: "" | "just-right" | "loose";
  metalPreference: "" | "gold" | "silver" | "either";
  silverTube: "" | "yes" | "no";
  beadFrame: "" | "yes" | "no";
  claspType: "" | "lobster" | "magnet" | "elastic";
  pendantCharm: "" | "yes" | "no";
  colorPreference: string;
  specialRequests: string;
  igHandle: string;
};

type PureAddonFields = CommonBraceletFields;
type TarotAddonFields = CommonBraceletFields & {
  topic: string;
  name: string;
  birthday: string;
  situation: string;
};
type ProfileAddonFields = CommonBraceletFields & {
  name: string;
  birthday: string;
};

export type CustomAddonSupplementData = {
  pure: PureAddonFields;
  tarot: TarotAddonFields;
  chakra: ProfileAddonFields;
  numerology: ProfileAddonFields;
};

const EMPTY_COMMON_BRACELET_FIELDS: CommonBraceletFields = {
  effect: "",
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

export const EMPTY_CUSTOM_ADDON_SUPPLEMENTS: CustomAddonSupplementData = {
  pure: { ...EMPTY_COMMON_BRACELET_FIELDS },
  tarot: {
    ...EMPTY_COMMON_BRACELET_FIELDS,
    topic: "",
    name: "",
    birthday: "",
    situation: "",
  },
  chakra: { ...EMPTY_COMMON_BRACELET_FIELDS, name: "", birthday: "" },
  numerology: { ...EMPTY_COMMON_BRACELET_FIELDS, name: "", birthday: "" },
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

function formatCommonBraceletNote(fields: CommonBraceletFields): string[] {
  return [
    `想額外指定的功效：${fields.effect || "無特別指定"}`,
    `手圍：${fields.wristSize ? `${fields.wristSize} cm` : "（未填）"}`,
    `鬆緊偏好：${fields.fitPreference === "just-right" ? "剛好（有水晶壓痕但不掐肉）" : fields.fitPreference === "loose" ? "微鬆（可輕微滑動）" : "（未填）"}`,
    `金飾 / 銀飾：${fields.metalPreference === "gold" ? "金飾" : fields.metalPreference === "silver" ? "銀飾" : fields.metalPreference === "either" ? "都可以" : "（未填）"}`,
    `加銀管：${fields.silverTube === "yes" ? "要" : fields.silverTube === "no" ? "不要" : "（未填）"}`,
    `珠框：${fields.beadFrame === "yes" ? "要" : fields.beadFrame === "no" ? "不要" : "（未填）"}`,
    `扣具：${fields.claspType === "lobster" ? "龍蝦扣（+200元）" : fields.claspType === "magnet" ? "磁扣（+200元）" : fields.claspType === "elastic" ? "不用，彈力繩就好" : "（未填）"}`,
    `吊飾：${fields.pendantCharm === "yes" ? "要加" : fields.pendantCharm === "no" ? "不要" : "（未填）"}`,
    `特定顏色水晶：${fields.colorPreference || "無特別指定"}`,
    `其餘特殊需求：${fields.specialRequests || "無"}`,
    `Instagram 帳號 / LINE ID：${fields.igHandle || "（未填）"}`,
  ];
}

export function formatCustomAddonSupplementNote(
  addonId: CustomAddonId,
  supplements: CustomAddonSupplementData
): string {
  if (addonId === "pure") {
    return [
      "【純客製水晶手鍊完整表單】",
      "",
      ...formatCommonBraceletNote(supplements.pure),
    ].join("\n");
  }

  if (addonId === "tarot") {
    return [
      "【塔羅 × 水晶手鍊完整表單】",
      "",
      "── 塔羅占卜資料 ──",
      `占卜主題：${supplements.tarot.topic || "（未填）"}`,
      `姓名：${supplements.tarot.name || "（未填）"}`,
      `西元生日：${supplements.tarot.birthday || "（未填）"}`,
      `占卜概況：${supplements.tarot.situation || "（未填）"}`,
      "",
      "── 水晶手鍊偏好 ──",
      ...formatCommonBraceletNote(supplements.tarot),
    ].join("\n");
  }

  if (addonId === "chakra") {
    return [
      "【脈輪檢測 × 水晶手鍊完整表單】",
      "",
      `姓名：${supplements.chakra.name || "（未填）"}`,
      `西元生日：${supplements.chakra.birthday || "（未填）"}`,
      ...formatCommonBraceletNote(supplements.chakra),
    ].join("\n");
  }

  return [
    "【生命靈數 × 水晶手鍊完整表單】",
    "",
    `姓名：${supplements.numerology.name || "（未填）"}`,
    `西元生日：${supplements.numerology.birthday || "（未填）"}`,
    ...formatCommonBraceletNote(supplements.numerology),
  ].join("\n");
}

function validateCommonBraceletFields(
  label: string,
  fields: CommonBraceletFields
): string | null {
  if (!fields.wristSize) return `請填寫${label}手圍尺寸`;
  if (!isValidCustomWristSize(fields.wristSize)) {
    return `${label}手圍尺寸請輸入 13 至 19 cm（以 0.5 cm 為單位）`;
  }
  if (!fields.fitPreference) return `請選擇${label}鬆緊偏好`;
  if (!fields.metalPreference) return `請選擇${label}金飾 / 銀飾偏好`;
  if (!fields.silverTube || !fields.beadFrame)
    return `請選擇${label}銀管和珠框偏好`;
  if (!fields.claspType) return `請選擇${label}扣具`;
  if (!fields.pendantCharm) return `請選擇${label}是否要加吊飾`;
  if (!fields.igHandle.trim())
    return `請填寫${label}IG 帳號；若沒有 IG，請填寫 LINE ID`;
  return null;
}

export function validateCustomAddonSupplements(
  selectedAddonIds: CustomAddonId[],
  supplements: CustomAddonSupplementData
): string | null {
  if (selectedAddonIds.includes("pure")) {
    if (!supplements.pure.effect.trim()) return "請填寫純客製想要的功效";
    const error = validateCommonBraceletFields("純客製", supplements.pure);
    if (error) return error;
  }

  if (selectedAddonIds.includes("tarot")) {
    if (!supplements.tarot.topic.trim()) return "請填寫塔羅占卜主題";
    if (!supplements.tarot.name.trim()) return "請填寫塔羅方案姓名";
    if (!supplements.tarot.birthday.trim()) return "請填寫塔羅方案西元生日";
    if (!supplements.tarot.situation.trim()) return "請填寫塔羅占卜概況";
    const error = validateCommonBraceletFields("塔羅方案", supplements.tarot);
    if (error) return error;
  }

  if (selectedAddonIds.includes("chakra")) {
    if (!supplements.chakra.name.trim()) return "請填寫脈輪檢測姓名";
    if (!supplements.chakra.birthday.trim()) return "請填寫脈輪檢測西元生日";
    const error = validateCommonBraceletFields("脈輪檢測", supplements.chakra);
    if (error) return error;
  }

  if (selectedAddonIds.includes("numerology")) {
    if (!supplements.numerology.name.trim()) return "請填寫生命靈數姓名";
    if (!supplements.numerology.birthday.trim())
      return "請填寫生命靈數西元生日";
    const error = validateCommonBraceletFields(
      "生命靈數",
      supplements.numerology
    );
    if (error) return error;
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
        可同時搭配其他客製服務，勾選後請直接填寫該方案的完整表單。
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
            已選擇 {selectedOptions.length} 項其他客製服務，請填寫以下完整表單。
          </p>
          <div className="mt-4 space-y-4">
            {selectedOptions.map(option => (
              <AddonFullForm
                key={option.id}
                addonId={option.id}
                label={option.label}
                value={supplements[option.id]}
                onChange={value => updateSupplement(option.id, value as never)}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function AddonFullForm<T extends CustomAddonId>({
  addonId,
  label,
  value,
  onChange,
}: {
  addonId: T;
  label: string;
  value: CustomAddonSupplementData[T];
  onChange: (value: CustomAddonSupplementData[T]) => void;
}) {
  const fields = value as CustomAddonSupplementData[CustomAddonId];

  return (
    <div
      data-testid={`custom-addon-full-form-${addonId}`}
      className="rounded-sm border border-[oklch(0.86_0_0)] bg-white p-4"
    >
      <p className="text-sm font-body font-semibold text-[oklch(0.16_0_0)]">
        {label}
      </p>

      {addonId === "tarot" && (
        <div className="mt-3 space-y-3">
          <TextField
            label="想占卜的主題"
            value={(fields as TarotAddonFields).topic}
            onChange={topic =>
              onChange({
                ...(value as TarotAddonFields),
                topic,
              } as CustomAddonSupplementData[T])
            }
            placeholder="例如：財富密碼、戀愛指南、職涯探索……"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="姓名"
              value={(fields as TarotAddonFields).name}
              onChange={name =>
                onChange({
                  ...(value as TarotAddonFields),
                  name,
                } as CustomAddonSupplementData[T])
              }
              placeholder="請填寫真實姓名"
            />
            <TextField
              label="西元生日"
              value={(fields as TarotAddonFields).birthday}
              onChange={birthday =>
                onChange({
                  ...(value as TarotAddonFields),
                  birthday,
                } as CustomAddonSupplementData[T])
              }
              placeholder="例如：1995/08/22"
            />
          </div>
          <TextAreaField
            label="占卜概況"
            value={(fields as TarotAddonFields).situation}
            onChange={situation =>
              onChange({
                ...(value as TarotAddonFields),
                situation,
              } as CustomAddonSupplementData[T])
            }
            placeholder="簡單描述目前情況與想詢問的方向"
          />
        </div>
      )}

      {(addonId === "chakra" || addonId === "numerology") && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <TextField
            label="姓名"
            value={(fields as ProfileAddonFields).name}
            onChange={name =>
              onChange({
                ...(value as ProfileAddonFields),
                name,
              } as CustomAddonSupplementData[T])
            }
            placeholder="請填寫真實姓名"
          />
          <TextField
            label="西元生日"
            value={(fields as ProfileAddonFields).birthday}
            onChange={birthday =>
              onChange({
                ...(value as ProfileAddonFields),
                birthday,
              } as CustomAddonSupplementData[T])
            }
            placeholder="例如：1995/08/22"
          />
        </div>
      )}

      <CommonBraceletForm
        value={fields}
        onChange={next =>
          onChange({ ...value, ...next } as CustomAddonSupplementData[T])
        }
      />
    </div>
  );
}

function CommonBraceletForm({
  value,
  onChange,
}: {
  value: CommonBraceletFields;
  onChange: (value: CommonBraceletFields) => void;
}) {
  return (
    <div className="mt-4 space-y-4 border-t border-[oklch(0.9_0_0)] pt-4">
      <TextAreaField
        label="想要的功效"
        value={value.effect}
        onChange={effect => onChange({ ...value, effect })}
        placeholder="例如：招財、愛情、療癒、保護氣場……"
      />
      <div>
        <label className="mb-1.5 block text-xs font-body text-[oklch(0.5_0_0)]">
          手圍尺寸
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={value.wristSize}
            onChange={event =>
              onChange({ ...value, wristSize: event.target.value })
            }
            placeholder="例如：15.5"
            step={CUSTOM_WRIST_SIZE_STEP}
            min={CUSTOM_WRIST_SIZE_MIN}
            max={CUSTOM_WRIST_SIZE_MAX}
            className="w-40 border border-[oklch(0.88_0_0)] px-3 py-2.5 text-sm font-body focus:border-[oklch(0.4_0_0)] focus:outline-none"
          />
          <span className="text-sm font-body text-[oklch(0.5_0_0)]">cm</span>
        </div>
      </div>
      <OptionButtons
        label="手圍的鬆緊偏好"
        value={value.fitPreference}
        options={[
          { id: "just-right", label: "剛好" },
          { id: "loose", label: "微鬆" },
        ]}
        onChange={fitPreference =>
          onChange({
            ...value,
            fitPreference:
              fitPreference as CommonBraceletFields["fitPreference"],
          })
        }
      />
      <MetalPreferenceField
        value={value.metalPreference}
        onChange={metalPreference => onChange({ ...value, metalPreference })}
      />
      <BeadFrameField
        silverTube={value.silverTube}
        beadFrame={value.beadFrame}
        onSilverTubeChange={silverTube => onChange({ ...value, silverTube })}
        onBeadFrameChange={beadFrame => onChange({ ...value, beadFrame })}
      />
      <ClaspTypeField
        value={value.claspType}
        onChange={claspType => onChange({ ...value, claspType })}
      />
      <div>
        <p className="mb-2 text-xs font-body text-[oklch(0.5_0_0)]">吊飾</p>
        <CustomFormPendantCharmField
          value={value.pendantCharm}
          onChange={pendantCharm => onChange({ ...value, pendantCharm })}
        />
      </div>
      <TextAreaField
        label="想要的水晶顏色"
        value={value.colorPreference}
        onChange={colorPreference => onChange({ ...value, colorPreference })}
        placeholder="例如：偏粉色系、紫色、透明……沒有指定可以留空"
      />
      <TextAreaField
        label="其他特殊需求"
        value={value.specialRequests}
        onChange={specialRequests => onChange({ ...value, specialRequests })}
        placeholder="例如過敏材質、特別風格、紀念意義……"
      />
      <TextField
        label="Instagram 帳號 / LINE ID"
        value={value.igHandle}
        onChange={igHandle => onChange({ ...value, igHandle })}
        placeholder="例如：@your_ig_handle 或 LINE ID"
      />
    </div>
  );
}

function MetalPreferenceField({
  value,
  onChange,
}: {
  value: CommonBraceletFields["metalPreference"];
  onChange: (value: CommonBraceletFields["metalPreference"]) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-body text-[oklch(0.5_0_0)]">
        喜歡金飾還是銀飾
      </p>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: "gold" as const, label: "金飾", img: "/golden.jpg" },
            { id: "silver" as const, label: "銀飾", img: "/silver.jpg" },
          ].map(option => (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={`overflow-hidden rounded-sm border-2 text-left transition-colors ${
                value === option.id
                  ? "border-[oklch(0.1_0_0)]"
                  : "border-[oklch(0.88_0_0)] hover:border-[oklch(0.6_0_0)]"
              }`}
            >
              <img
                src={option.img}
                alt={option.label}
                className="h-32 w-full object-cover sm:h-40"
              />
              <p
                className={`py-2.5 text-center text-sm font-body ${
                  value === option.id
                    ? "bg-[oklch(0.97_0_0)] font-semibold"
                    : "text-[oklch(0.45_0_0)]"
                }`}
              >
                {option.label}
              </p>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onChange("either")}
          className={`w-full rounded-sm border-2 px-4 py-3 text-sm font-body transition-colors ${
            value === "either"
              ? "border-[oklch(0.1_0_0)] bg-[oklch(0.97_0_0)] font-semibold"
              : "border-[oklch(0.88_0_0)] text-[oklch(0.45_0_0)] hover:border-[oklch(0.6_0_0)]"
          }`}
        >
          都可以
        </button>
      </div>
    </div>
  );
}

function BeadFrameField({
  silverTube,
  beadFrame,
  onSilverTubeChange,
  onBeadFrameChange,
}: {
  silverTube: CommonBraceletFields["silverTube"];
  beadFrame: CommonBraceletFields["beadFrame"];
  onSilverTubeChange: (value: CommonBraceletFields["silverTube"]) => void;
  onBeadFrameChange: (value: CommonBraceletFields["beadFrame"]) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-body text-[oklch(0.5_0_0)]">
        要加銀管或珠框嗎？
      </p>
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <img
            src="/bead-frame-1.jpg"
            alt="珠框銀管參考1"
            className="h-40 w-full rounded-sm object-cover sm:h-56"
          />
          <img
            src="/bead-frame-2.jpg"
            alt="珠框銀管參考2"
            className="h-40 w-full rounded-sm object-cover sm:h-56"
          />
        </div>
        <ChoicePair
          label="銀管"
          description="穿在水晶珠之間的小金屬管，可增加層次感與精緻度"
          value={silverTube}
          onChange={onSilverTubeChange}
        />
        <ChoicePair
          label="珠框"
          description="套在主石外的金屬框，可突顯主石、增加立體感"
          value={beadFrame}
          onChange={onBeadFrameChange}
        />
      </div>
    </div>
  );
}

function ChoicePair({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: "" | "yes" | "no";
  onChange: (value: "yes" | "no") => void;
}) {
  return (
    <div>
      <p className="mb-1 text-sm font-body font-medium text-[oklch(0.15_0_0)]">
        {label}
      </p>
      <p className="mb-3 text-xs font-body leading-relaxed text-[oklch(0.55_0_0)]">
        {description}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {[
          { id: "yes" as const, label: "要" },
          { id: "no" as const, label: "不要" },
        ].map(option => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`rounded-sm border-2 px-4 py-4 text-base font-body transition-colors ${
              value === option.id
                ? "border-[oklch(0.1_0_0)] bg-[oklch(0.97_0_0)] font-semibold"
                : "border-[oklch(0.88_0_0)] text-[oklch(0.45_0_0)] hover:border-[oklch(0.6_0_0)]"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ClaspTypeField({
  value,
  onChange,
}: {
  value: CommonBraceletFields["claspType"];
  onChange: (value: CommonBraceletFields["claspType"]) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-body text-[oklch(0.5_0_0)]">
        要換龍蝦扣或磁扣嗎？
      </p>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              id: "lobster" as const,
              label: "龍蝦扣",
              sub: "+200元",
              img: "/lobster-clasp.jpg",
            },
            {
              id: "magnet" as const,
              label: "磁扣",
              sub: "+200元",
              img: "/magnet-clasp.png",
            },
            {
              id: "elastic" as const,
              label: "彈力繩",
              sub: "免費",
              img: "/elastic-cord.jpg",
            },
          ].map(option => (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={`overflow-hidden rounded-sm border-2 text-center transition-colors ${
                value === option.id
                  ? "border-[oklch(0.1_0_0)]"
                  : "border-[oklch(0.88_0_0)] hover:border-[oklch(0.6_0_0)]"
              }`}
            >
              <div className="flex aspect-square items-center justify-center bg-[oklch(0.97_0_0)] p-1">
                <img
                  src={option.img}
                  alt={option.label}
                  className="h-full w-full object-contain"
                />
              </div>
              <p
                className={`py-2 text-xs font-body ${
                  value === option.id
                    ? "bg-[oklch(0.97_0_0)] font-semibold"
                    : "text-[oklch(0.45_0_0)]"
                }`}
              >
                {option.label}
                <br />
                <span className="text-[0.6rem] text-[oklch(0.55_0_0)]">
                  （{option.sub}）
                </span>
              </p>
            </button>
          ))}
        </div>
        <ClaspDurabilityNotice />
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-body text-[oklch(0.5_0_0)]">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full border border-[oklch(0.88_0_0)] px-3 py-2.5 text-sm font-body focus:border-[oklch(0.4_0_0)] focus:outline-none"
      />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-body text-[oklch(0.5_0_0)]">
        {label}
      </label>
      <textarea
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full resize-none border border-[oklch(0.88_0_0)] px-3 py-2.5 text-sm font-body leading-relaxed focus:border-[oklch(0.4_0_0)] focus:outline-none"
      />
    </div>
  );
}

function OptionButtons({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-body text-[oklch(0.5_0_0)]">{label}</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {options.map(option => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`min-h-10 rounded-sm border-2 px-3 py-2 text-sm font-body transition-colors ${
              value === option.id
                ? "border-[oklch(0.1_0_0)] bg-[oklch(0.97_0_0)] font-semibold"
                : "border-[oklch(0.88_0_0)] text-[oklch(0.45_0_0)] hover:border-[oklch(0.6_0_0)]"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
