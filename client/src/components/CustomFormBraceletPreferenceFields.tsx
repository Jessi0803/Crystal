import ClaspDurabilityNotice from "@/components/ClaspDurabilityNotice";
import AccessoryReferenceGallery, {
  type AccessoryReferenceImage,
} from "@/components/AccessoryReferenceGallery";
import CustomFormPendantCharmField from "@/components/CustomFormPendantCharmField";
import type { CustomPreferenceField } from "@shared/customSpecs";

const ACCESSORY_REFERENCE_IMAGES: AccessoryReferenceImage[] = [
  {
    src: "/bead-frame-1.jpg",
    alt: "磁扣、銀管與珠框配件位置參考",
    label: "磁扣、銀管與珠框",
  },
  {
    src: "/bead-frame-2.jpg",
    alt: "銀管、吊飾與珠框配件位置參考",
    label: "銀管、吊飾與珠框",
  },
];

export interface CustomFormBraceletPreferences {
  fitPreference: "" | "just-right" | "loose";
  metalPreference: "" | "gold" | "silver" | "either";
  silverTube: "" | "yes" | "no";
  beadFrame: "" | "yes" | "no";
  claspType: "" | "lobster" | "magnet" | "elastic";
  pendantCharm: "" | "yes" | "no";
}

/**
 * shared/customSpecs 的欄位清單和下面這個 interface 必須一模一樣。
 * 少一個或多一個都會在這行編譯失敗，不會等到畫面上才發現。
 */
type AssertFieldsInSync =
  CustomPreferenceField extends keyof CustomFormBraceletPreferences
    ? keyof CustomFormBraceletPreferences extends CustomPreferenceField
      ? true
      : never
    : never;
const _assertFieldsInSync: AssertFieldsInSync = true;
void _assertFieldsInSync;

/**
 * 欄位 key 的單一來源在 shared/customSpecs，因為規格定義要靠它決定問哪幾項。
 * 這裡保留別名，既有的四份表單不用改 import。
 */
export type CustomFormBraceletPreferenceField = CustomPreferenceField;

/**
 * 手鍊方案問全部六項；項鍊、吊飾只問其中幾項（沒有手圍就沒有鬆緊與扣具）。
 * 沒有指定時維持原本的全問，四份手鍊表單因此不需要改。
 */
export const ALL_BRACELET_PREFERENCE_FIELDS: CustomFormBraceletPreferenceField[] =
  [
    "fitPreference",
    "metalPreference",
    "silverTube",
    "beadFrame",
    "claspType",
    "pendantCharm",
  ];

type FieldCopy = {
  heading: string;
  error: string;
  note: string;
  /** 只有 pendantCharm 用得到：決定「要加 OO／不要 OO」兩顆按鈕的文字 */
  choiceLabel?: string;
};

const FIELD_COPY: Record<CustomFormBraceletPreferenceField, FieldCopy> = {
  fitPreference: {
    heading: "手圍的鬆緊偏好？",
    error: "請選擇手圍的鬆緊偏好",
    note: "鬆緊偏好",
  },
  metalPreference: {
    heading: "喜歡金飾還是銀飾？",
    error: "請選擇金飾／銀飾偏好",
    note: "金飾 / 銀飾",
  },
  silverTube: { heading: "銀管", error: "請選擇是否加銀管", note: "加銀管" },
  beadFrame: { heading: "珠框", error: "請選擇是否加珠框", note: "珠框" },
  claspType: {
    heading: "要換龍蝦扣或磁扣嗎？",
    error: "請選擇扣具偏好",
    note: "扣具",
  },
  pendantCharm: {
    heading: "要加吊飾嗎？",
    error: "請選擇是否加吊飾",
    note: "吊飾",
    choiceLabel: "吊飾",
  },
};

/**
 * 泛型參數 F 是「這份表單要問哪幾項」。指定 fields 之後，value 只需要帶那幾個
 * 欄位，所以項鍊、吊飾的 FormData 不必為了型別去塞用不到的欄位；
 * 省略 fields 時 F 退回全部六項，四份手鍊表單的檢查強度維持不變。
 */
export type CustomFormBraceletPreferenceOptions<
  F extends CustomFormBraceletPreferenceField = CustomFormBraceletPreferenceField,
> = {
  /** 要問哪幾項；省略即全部六項 */
  fields?: readonly F[];
  /** 覆寫文案，例如吊飾商品把「吊飾」改成「中間主墜」 */
  copy?: Partial<Record<F, Partial<FieldCopy>>>;
};

type AnyOptions = CustomFormBraceletPreferenceOptions<CustomFormBraceletPreferenceField>;

function resolveCopy(
  field: CustomFormBraceletPreferenceField,
  options: AnyOptions
): FieldCopy {
  return { ...FIELD_COPY[field], ...options.copy?.[field] };
}

function resolveFields(options: AnyOptions): readonly CustomFormBraceletPreferenceField[] {
  return options.fields ?? ALL_BRACELET_PREFERENCE_FIELDS;
}

/** 回傳尚未完成的第一個配件偏好；全部完成時回傳 null。 */
export function validateCustomBraceletPreferences<
  F extends CustomFormBraceletPreferenceField = CustomFormBraceletPreferenceField,
>(
  value: Pick<CustomFormBraceletPreferences, F>,
  options: CustomFormBraceletPreferenceOptions<F> = {}
): string | null {
  const opts = options as AnyOptions;
  const full = value as CustomFormBraceletPreferences;
  for (const field of resolveFields(opts)) {
    if (!full[field]) return resolveCopy(field, opts).error;
  }
  return null;
}

interface CustomFormBraceletPreferenceFieldsProps<
  F extends CustomFormBraceletPreferenceField,
> extends CustomFormBraceletPreferenceOptions<F> {
  value: Pick<CustomFormBraceletPreferences, F>;
  onChange: (updates: Partial<Pick<CustomFormBraceletPreferences, F>>) => void;
}

const FIELD_VALUE_TEXT: Record<
  CustomFormBraceletPreferenceField,
  (value: CustomFormBraceletPreferences) => string
> = {
  fitPreference: v =>
    v.fitPreference === "just-right"
      ? "剛好（有水晶壓痕但不掐肉）"
      : v.fitPreference === "loose"
        ? "微鬆（可輕微滑動）"
        : "（未填）",
  metalPreference: v =>
    v.metalPreference === "gold"
      ? "金飾"
      : v.metalPreference === "silver"
        ? "銀飾"
        : v.metalPreference === "either"
          ? "都可以"
          : "（未填）",
  silverTube: v =>
    v.silverTube === "yes" ? "要" : v.silverTube === "no" ? "不要" : "（未填）",
  beadFrame: v =>
    v.beadFrame === "yes" ? "要" : v.beadFrame === "no" ? "不要" : "（未填）",
  claspType: v =>
    v.claspType === "lobster"
      ? "龍蝦扣（+200元）"
      : v.claspType === "magnet"
        ? "磁扣（+200元）"
        : v.claspType === "elastic"
          ? "不用，彈力繩就好"
          : "（未填）",
  pendantCharm: v =>
    v.pendantCharm === "yes"
      ? "要加"
      : v.pendantCharm === "no"
        ? "不要"
        : "（未填）",
};

export function formatCustomBraceletPreferenceLines<
  F extends CustomFormBraceletPreferenceField = CustomFormBraceletPreferenceField,
>(
  value: Pick<CustomFormBraceletPreferences, F>,
  options: CustomFormBraceletPreferenceOptions<F> = {}
): string[] {
  const opts = options as AnyOptions;
  const full = value as CustomFormBraceletPreferences;
  return resolveFields(opts).map(
    field => `${resolveCopy(field, opts).note}：${FIELD_VALUE_TEXT[field](full)}`
  );
}

export default function CustomFormBraceletPreferenceFields<
  F extends CustomFormBraceletPreferenceField,
>({
  value,
  onChange,
  fields,
  copy,
}: CustomFormBraceletPreferenceFieldsProps<F>) {
  // 每個區塊都被 active.has(...) 擋住，只有問到的欄位會被讀寫，
  // 所以這裡放寬成完整型別，讓 JSX 可以直接寫 v.claspType 之類的存取。
  const v = value as CustomFormBraceletPreferences;
  const update = onChange as (
    updates: Partial<CustomFormBraceletPreferences>
  ) => void;
  const options = { fields, copy } as AnyOptions;
  const active = new Set(resolveFields(options));
  const headingOf = (field: CustomFormBraceletPreferenceField) =>
    resolveCopy(field, options).heading;
  // 銀管與珠框共用同一個參考圖區塊，標題要跟著實際問到的項目走
  const accessoryHeading = active.has("silverTube")
    ? active.has("beadFrame")
      ? "要加銀管或珠框嗎？"
      : "要加銀管嗎？"
    : "要加珠框嗎？";

  return (
    <div className="space-y-8">
      {active.has("fitPreference") && (
        <div>
          <p className="text-sm font-body font-medium text-sf-ink mb-3">
            {headingOf("fitPreference")}
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
                onClick={() => update({ fitPreference: opt.id })}
                className={`px-5 py-4 text-sm font-body border text-left transition-colors rounded-md ${
                  v.fitPreference === opt.id
                    ? "border-sf-accent bg-sf-selected text-sf-ink font-medium"
                    : "border-sf-line-strong text-sf-text hover:border-sf-accent/50"
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
      )}

      {active.has("metalPreference") && (
        <div>
          <p className="text-sm font-body font-medium text-sf-ink mb-3">
            {headingOf("metalPreference")}
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
                  onClick={() => update({ metalPreference: opt.id })}
                  className={`border rounded-md overflow-hidden text-left transition-colors ${
                    v.metalPreference === opt.id
                      ? "border-sf-accent"
                      : "border-sf-line-strong hover:border-sf-accent/50"
                  }`}
                >
                  <img
                    src={opt.img}
                    alt={opt.label}
                    className="w-full h-44 object-cover"
                  />
                  <p
                    className={`text-sm font-body text-center py-2.5 ${
                      v.metalPreference === opt.id
                        ? "bg-sf-cream font-semibold"
                        : "text-sf-text"
                    }`}
                  >
                    {opt.label}
                  </p>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => update({ metalPreference: "either" })}
              className={`w-full px-4 py-3 text-sm font-body border transition-colors rounded-md ${
                v.metalPreference === "either"
                  ? "border-sf-accent bg-sf-selected text-sf-ink font-medium"
                  : "border-sf-line-strong text-sf-text hover:border-sf-accent/50"
              }`}
            >
              都可以
            </button>
          </div>
        </div>
      )}

      {(active.has("silverTube") || active.has("beadFrame")) && (
        <div>
          <p className="text-sm font-body font-medium text-sf-ink mb-1">
            {accessoryHeading}
          </p>
          <p className="text-xs font-body text-sf-muted mb-3">
            {active.has("silverTube") && active.has("beadFrame")
              ? "可分開選擇，以下附上參考圖片"
              : "以下附上參考圖片"}
          </p>
          <div className="space-y-5">
            <AccessoryReferenceGallery images={ACCESSORY_REFERENCE_IMAGES} />
            <p className="-mt-2 text-center text-[0.68rem] font-body text-sf-muted">
              點擊圖片可查看完整原圖；手機可雙指縮放，電腦可使用滾輪
            </p>
            {active.has("silverTube") && (
              <div>
                <p className="text-sm font-body font-medium text-sf-ink mb-1">
                  {headingOf("silverTube")}
                </p>
                <p className="text-xs font-body text-sf-muted mb-3">
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
                      onClick={() => update({ silverTube: opt.id })}
                      className={`px-4 py-4 text-base font-body border transition-colors rounded-md ${v.silverTube === opt.id ? "border-sf-accent bg-sf-selected text-sf-ink font-medium" : "border-sf-line-strong text-sf-text hover:border-sf-accent/50"}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {active.has("beadFrame") && (
              <div>
                <p className="text-sm font-body font-medium text-sf-ink mb-1">
                  {headingOf("beadFrame")}
                </p>
                <p className="text-xs font-body text-sf-muted mb-3">
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
                      onClick={() => update({ beadFrame: opt.id })}
                      className={`px-4 py-4 text-base font-body border transition-colors rounded-md ${v.beadFrame === opt.id ? "border-sf-accent bg-sf-selected text-sf-ink font-medium" : "border-sf-line-strong text-sf-text hover:border-sf-accent/50"}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {active.has("claspType") && (
        <div>
          <p className="text-sm font-body font-medium text-sf-ink mb-3">
            {headingOf("claspType")}
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
                  onClick={() => update({ claspType: opt.id })}
                  className={`border rounded-md overflow-hidden text-center transition-colors ${
                    v.claspType === opt.id
                      ? "border-sf-accent"
                      : "border-sf-line-strong hover:border-sf-accent/50"
                  }`}
                >
                  <div className="flex aspect-square items-center justify-center bg-sf-cream p-1">
                    <img
                      src={opt.img}
                      alt={opt.label}
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <p
                    className={`text-xs font-body py-2 ${v.claspType === opt.id ? "bg-sf-cream font-semibold" : "text-sf-text"}`}
                  >
                    {opt.label}
                    <br />
                    <span className="text-[0.6rem] text-sf-muted">
                      （{opt.sub}）
                    </span>
                  </p>
                </button>
              ))}
            </div>
            <ClaspDurabilityNotice />
          </div>
        </div>
      )}

      {active.has("pendantCharm") && (
        <div>
          <p className="text-sm font-body font-medium text-sf-ink mb-3">
            {headingOf("pendantCharm")}
          </p>
          <CustomFormPendantCharmField
            value={v.pendantCharm}
            onChange={pendantCharm => update({ pendantCharm })}
            itemLabel={resolveCopy("pendantCharm", options).choiceLabel}
          />
        </div>
      )}
    </div>
  );
}
