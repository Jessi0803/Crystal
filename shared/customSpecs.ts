/**
 * 客製方案的「規格」：同一個方案（純客製／塔羅／脈輪／生命靈數）都可以做成
 * 手鍊、項鍊或吊飾，三者本體價格不同、客製表單要問的欄位也不同。
 *
 * 為什麼放在共用定義而不是後台的 products.purchaseOptions：
 * 三種規格的價格是全站一致的（A 方案的項鍊不會和 B 方案的項鍊不同價），
 * 放 DB 會變成 4 商品 × 3 規格 = 12 筆要自己維持同步。
 *
 * 重要：規格**不走** orderItems.purchaseOptionId。
 * 1. 塔羅主題已經佔用那個欄位（tarot-topic:<id>）
 * 2. 結帳時伺服器會拿 purchaseOptionId 去比對 products.purchaseOptions，
 *    而我們刻意讓那欄留空，比對一定失敗
 * 規格改走 orderItems.configurationSnapshot.spec，是既有的 JSON 欄位，
 * 不需要 migration。讀不到 spec 的舊訂單一律視為手鍊。
 */

/** 客製表單「配件偏好」區可以問的欄位，與 CustomFormBraceletPreferences 的 key 對應 */
export type CustomPreferenceField =
  | "fitPreference"
  | "metalPreference"
  | "silverTube"
  | "beadFrame"
  | "claspType"
  | "pendantCharm";

export const CUSTOM_SPEC_CODES = ["bracelet", "necklace", "pendant"] as const;
export type CustomSpecCode = (typeof CUSTOM_SPEC_CODES)[number];

/** 讀不到規格的舊訂單一律當手鍊（這之前只做手鍊） */
export const DEFAULT_CUSTOM_SPEC_CODE: CustomSpecCode = "bracelet";

export type CustomSpec = {
  code: CustomSpecCode;
  /** 品項名稱，用在價格標題、訂單品名、表單文案 */
  label: string;
  /** 本體價格區間；訂金不隨規格改變，一律 500 */
  priceDisplay: string;
  /** 商品頁選到這個規格時補充的說明，沒有就留空 */
  fixedNotes: string[];
  /** 客製表單要問的配件欄位，順序即畫面順序 */
  preferenceFields: CustomPreferenceField[];
  /** 是否要問手圍（只有手鍊要） */
  asksWristSize: boolean;
  /** 商品頁選擇器上的一句話說明 */
  selectorNote: string;
  /** 客製表單開頭「訂購流程」第 2 步要客人提供什麼 */
  formStepDescription: string;
  /** 客製表單「配件與佩戴偏好」那一步的副標 */
  preferenceStepSubtitle: string;
};

export const CUSTOM_SPECS: Record<CustomSpecCode, CustomSpec> = {
  bracelet: {
    code: "bracelet",
    label: "手鍊",
    priceDisplay: "NT$2,500 ± NT$500",
    fixedNotes: [],
    preferenceFields: [
      "fitPreference",
      "metalPreference",
      "silverTube",
      "beadFrame",
      "claspType",
      "pendantCharm",
    ],
    asksWristSize: true,
    selectorNote: "可選鬆緊、扣具與配件",
    formStepDescription: "提供手圍、喜歡金飾或銀飾，並確認設計需求",
    preferenceStepSubtitle: "請選擇鬆緊、金銀飾、銀管珠框、扣具與吊飾偏好",
  },
  necklace: {
    code: "necklace",
    label: "項鍊",
    priceDisplay: "NT$1,300 ± NT$300",
    fixedNotes: ["長度固定 45 公分", "僅提供金飾款，不提供銀飾"],
    preferenceFields: ["silverTube", "pendantCharm"],
    asksWristSize: false,
    selectorNote: "長度 45 公分・金飾款",
    formStepDescription: "確認水晶顏色、功效與配件需求",
    preferenceStepSubtitle: "請選擇銀管與吊飾偏好",
  },
  pendant: {
    code: "pendant",
    label: "吊飾",
    priceDisplay: "NT$1,000 ± NT$300",
    fixedNotes: [],
    preferenceFields: ["metalPreference", "pendantCharm"],
    asksWristSize: false,
    selectorNote: "可選金飾或銀飾",
    formStepDescription: "選擇金飾或銀飾，並確認水晶顏色與功效需求",
    preferenceStepSubtitle: "請選擇金銀飾與中間主墜偏好",
  },
};

export const CUSTOM_SPEC_LIST: CustomSpec[] = CUSTOM_SPEC_CODES.map((code) => CUSTOM_SPECS[code]);

export function isCustomSpecCode(value: unknown): value is CustomSpecCode {
  return typeof value === "string" && (CUSTOM_SPEC_CODES as readonly string[]).includes(value);
}

/** 結帳與表單都用這支把外部傳進來的值收斂成合法規格 */
export function resolveCustomSpec(value: unknown): CustomSpec {
  return CUSTOM_SPECS[isCustomSpecCode(value) ? value : DEFAULT_CUSTOM_SPEC_CODE];
}

/**
 * 吊飾商品問的是「中間那顆主墜」，不是手鍊上加掛的吊飾，
 * 所以 pendantCharm 這個欄位要換一套文案。
 */
export const PENDANT_CENTERPIECE_COPY = {
  heading: "要放中間那顆主墜嗎？",
  error: "請選擇是否放中間主墜",
  note: "中間主墜",
  choiceLabel: "中間主墜",
} as const;

/** /custom 方案卡與商品小卡用的價格摘要；實際價格在商品頁選規格時才顯示 */
export const CUSTOM_SPEC_PRICE_SUMMARY = "手鍊／項鍊／吊飾三種規格可選";
