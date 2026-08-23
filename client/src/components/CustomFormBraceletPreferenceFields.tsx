import ClaspDurabilityNotice from "@/components/ClaspDurabilityNotice";
import CustomFormPendantCharmField from "@/components/CustomFormPendantCharmField";

export interface CustomFormBraceletPreferences {
  fitPreference: "" | "just-right" | "loose";
  metalPreference: "" | "gold" | "silver" | "either";
  silverTube: "" | "yes" | "no";
  beadFrame: "" | "yes" | "no";
  claspType: "" | "lobster" | "magnet" | "elastic";
  pendantCharm: "" | "yes" | "no";
}

interface CustomFormBraceletPreferenceFieldsProps {
  value: CustomFormBraceletPreferences;
  onChange: (updates: Partial<CustomFormBraceletPreferences>) => void;
}

export function formatCustomBraceletPreferenceLines(
  value: CustomFormBraceletPreferences
): string[] {
  return [
    `鬆緊偏好：${value.fitPreference === "just-right" ? "剛好（有水晶壓痕但不掐肉）" : value.fitPreference === "loose" ? "微鬆（可輕微滑動）" : "（未填）"}`,
    `金飾 / 銀飾：${value.metalPreference === "gold" ? "金飾" : value.metalPreference === "silver" ? "銀飾" : value.metalPreference === "either" ? "都可以" : "（未填）"}`,
    `加銀管：${value.silverTube === "yes" ? "要" : value.silverTube === "no" ? "不要" : "（未填）"}`,
    `珠框：${value.beadFrame === "yes" ? "要" : value.beadFrame === "no" ? "不要" : "（未填）"}`,
    `扣具：${value.claspType === "lobster" ? "龍蝦扣（+200元）" : value.claspType === "magnet" ? "磁扣（+200元）" : value.claspType === "elastic" ? "不用，彈力繩就好" : "（未填）"}`,
    `吊飾：${value.pendantCharm === "yes" ? "要加" : value.pendantCharm === "no" ? "不要" : "（未填）"}`,
  ];
}

export default function CustomFormBraceletPreferenceFields({
  value,
  onChange,
}: CustomFormBraceletPreferenceFieldsProps) {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-body font-medium text-[oklch(0.15_0_0)] mb-3">
          手圍的鬆緊偏好？
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              id: "just-right" as const,
              label: "剛好",
              desc: "會有水晶壓痕但不掐肉，手鍊緊貼手腕",
            },
            {
              id: "loose" as const,
              label: "微鬆",
              desc: "可輕微滑動，戴起來較為舒適寬鬆",
            },
          ].map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange({ fitPreference: opt.id })}
              className={`px-5 py-4 text-sm font-body border-2 text-left transition-colors rounded-sm ${
                value.fitPreference === opt.id
                  ? "border-[oklch(0.1_0_0)] bg-[oklch(0.97_0_0)]"
                  : "border-[oklch(0.88_0_0)] text-[oklch(0.45_0_0)] hover:border-[oklch(0.6_0_0)]"
              }`}
            >
              <span className="block font-semibold text-base mb-1">
                {opt.label}
              </span>
              <span className="block text-xs leading-relaxed opacity-80">
                {opt.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-body font-medium text-[oklch(0.15_0_0)] mb-3">
          喜歡金飾還是銀飾？
        </p>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { id: "gold" as const, label: "金飾", img: "/golden.jpg" },
              { id: "silver" as const, label: "銀飾", img: "/silver.jpg" },
            ].map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange({ metalPreference: opt.id })}
                className={`border-2 rounded-sm overflow-hidden text-left transition-colors ${
                  value.metalPreference === opt.id
                    ? "border-[oklch(0.1_0_0)]"
                    : "border-[oklch(0.88_0_0)] hover:border-[oklch(0.6_0_0)]"
                }`}
              >
                <img
                  src={opt.img}
                  alt={opt.label}
                  className="w-full h-44 object-cover"
                />
                <p
                  className={`text-sm font-body text-center py-2.5 ${
                    value.metalPreference === opt.id
                      ? "bg-[oklch(0.97_0_0)] font-semibold"
                      : "text-[oklch(0.45_0_0)]"
                  }`}
                >
                  {opt.label}
                </p>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onChange({ metalPreference: "either" })}
            className={`w-full px-4 py-3 text-sm font-body border-2 transition-colors rounded-sm ${
              value.metalPreference === "either"
                ? "border-[oklch(0.1_0_0)] bg-[oklch(0.97_0_0)] font-semibold"
                : "border-[oklch(0.88_0_0)] text-[oklch(0.45_0_0)] hover:border-[oklch(0.6_0_0)]"
            }`}
          >
            都可以
          </button>
        </div>
      </div>

      <div>
        <p className="text-sm font-body font-medium text-[oklch(0.15_0_0)] mb-1">
          要加銀管或珠框嗎？
        </p>
        <p className="text-xs font-body text-[oklch(0.55_0_0)] mb-3">
          可分開選擇，以下附上參考圖片
        </p>
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <img
              src="/bead-frame-1.jpg"
              alt="珠框銀管參考1"
              className="w-full h-56 object-cover rounded-sm"
            />
            <img
              src="/bead-frame-2.jpg"
              alt="珠框銀管參考2"
              className="w-full h-56 object-cover rounded-sm"
            />
          </div>
          <div>
            <p className="text-sm font-body font-medium text-[oklch(0.15_0_0)] mb-1">
              銀管
            </p>
            <p className="text-xs font-body text-[oklch(0.55_0_0)] mb-3">
              穿在水晶珠之間的小金屬管，可增加層次感與精緻度
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: "yes" as const, label: "要" },
                { id: "no" as const, label: "不要" },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChange({ silverTube: opt.id })}
                  className={`px-4 py-4 text-base font-body border-2 transition-colors rounded-sm ${value.silverTube === opt.id ? "border-[oklch(0.1_0_0)] bg-[oklch(0.97_0_0)] font-semibold" : "border-[oklch(0.88_0_0)] text-[oklch(0.45_0_0)] hover:border-[oklch(0.6_0_0)]"}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-body font-medium text-[oklch(0.15_0_0)] mb-1">
              珠框
            </p>
            <p className="text-xs font-body text-[oklch(0.55_0_0)] mb-3">
              套在主石外的金屬框，可突顯主石、增加立體感
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: "yes" as const, label: "要" },
                { id: "no" as const, label: "不要" },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChange({ beadFrame: opt.id })}
                  className={`px-4 py-4 text-base font-body border-2 transition-colors rounded-sm ${value.beadFrame === opt.id ? "border-[oklch(0.1_0_0)] bg-[oklch(0.97_0_0)] font-semibold" : "border-[oklch(0.88_0_0)] text-[oklch(0.45_0_0)] hover:border-[oklch(0.6_0_0)]"}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div>
        <p className="text-sm font-body font-medium text-[oklch(0.15_0_0)] mb-3">
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
            ].map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange({ claspType: opt.id })}
                className={`border-2 rounded-sm overflow-hidden text-center transition-colors ${
                  value.claspType === opt.id
                    ? "border-[oklch(0.1_0_0)]"
                    : "border-[oklch(0.88_0_0)] hover:border-[oklch(0.6_0_0)]"
                }`}
              >
                <div className="flex aspect-square items-center justify-center bg-[oklch(0.97_0_0)] p-1">
                  <img
                    src={opt.img}
                    alt={opt.label}
                    className="h-full w-full object-contain"
                  />
                </div>
                <p
                  className={`text-xs font-body py-2 ${value.claspType === opt.id ? "bg-[oklch(0.97_0_0)] font-semibold" : "text-[oklch(0.45_0_0)]"}`}
                >
                  {opt.label}
                  <br />
                  <span className="text-[0.6rem] text-[oklch(0.55_0_0)]">
                    （{opt.sub}）
                  </span>
                </p>
              </button>
            ))}
          </div>
          <ClaspDurabilityNotice />
        </div>
      </div>

      <div>
        <p className="text-sm font-body font-medium text-[oklch(0.15_0_0)] mb-3">
          要加吊飾嗎？
        </p>
        <CustomFormPendantCharmField
          value={value.pendantCharm}
          onChange={pendantCharm => onChange({ pendantCharm })}
        />
      </div>
    </div>
  );
}
