/** 客製訂金商品／Custom 頁共用：官方 LINE */
export const CUSTOM_LINE_URL = "https://line.me/R/ti/p/@011tymeh";

/** 客製表單「吊飾」示意圖（檔案於 client/public，來源為專案 images/吊飾.jpg） */
export const CUSTOM_PENDANT_CHARM_SCHEMATIC_URL = "/吊飾.jpg";

/** 四種客製化訂金商品 id（商品詳情與表單路徑對應） */
export const CUSTOM_DEPOSIT_PRODUCT_IDS = [
  "custom-deposit-product",
  "tarot-crystal-deposit-product",
  "chakra-crystal-deposit-product",
  "numerology-crystal-deposit-product",
] as const;

export type CustomDepositProductId = (typeof CUSTOM_DEPOSIT_PRODUCT_IDS)[number];

export function isCustomDepositProduct(id: string): id is CustomDepositProductId {
  return (CUSTOM_DEPOSIT_PRODUCT_IDS as readonly string[]).includes(id);
}

export const CUSTOM_FORM_PATH_BY_PRODUCT_ID: Record<CustomDepositProductId, string> = {
  "custom-deposit-product": "/custom/form",
  "tarot-crystal-deposit-product": "/custom/form-b",
  "chakra-crystal-deposit-product": "/custom/form-c",
  "numerology-crystal-deposit-product": "/custom/form-d",
};

export const CUSTOM_PRODUCT_ID_BY_FORM_PATH: Record<string, CustomDepositProductId> =
  Object.fromEntries(
    Object.entries(CUSTOM_FORM_PATH_BY_PRODUCT_ID).map(([productId, formPath]) => [formPath, productId])
  ) as Record<string, CustomDepositProductId>;

export function getCustomFormPath(productId: string) {
  return isCustomDepositProduct(productId) ? CUSTOM_FORM_PATH_BY_PRODUCT_ID[productId] : null;
}

export const CUSTOM_BRACELET_PRICE_DISPLAY = "NT$1,500 ± NT$300";

/**
 * 客製手鍊本身的訂金。
 * 脈輪／生命靈數商品的訂金 = 這筆 + 解析（檢測）費，所以解析費可由商品售價反推，
 * 不需要另外寫死，顯示金額也就不會和實際收款脫節。
 */
export const CUSTOM_BRACELET_DEPOSIT = 500;

export const CUSTOM_WRIST_SIZE_MIN = 13;
export const CUSTOM_WRIST_SIZE_MAX = 19;
export const CUSTOM_WRIST_SIZE_STEP = 0.5;

export function isValidCustomWristSize(value: string) {
  const size = Number(value);
  if (!Number.isFinite(size) || size < CUSTOM_WRIST_SIZE_MIN || size > CUSTOM_WRIST_SIZE_MAX) {
    return false;
  }
  return Number.isInteger((size - CUSTOM_WRIST_SIZE_MIN) / CUSTOM_WRIST_SIZE_STEP);
}

/**
 * 初版設計與修改規範；由 <CustomRevisionNotice /> 渲染在四份客製表單開頭。
 *
 * 商品詳細頁的「注意事項」分欄不使用這份，那邊是後台各商品自填的 product.disclaimer。
 */
export const CUSTOM_REVISION_NOTICE = {
  title: "《初版設計＆修改注意事項》",
  lead: "✨ 初版享有 1 次免費修改",
  leadNote: "收到初版後，如有不喜歡或想調整的地方，第一次皆可免費修改",
  groups: [
    {
      heading: "【第一次免費修改包含】",
      items: [
        "更換水晶／配飾",
        "調整水晶顏色",
        "增加／減少配飾",
        "調整水晶、配飾排列順序",
        "更改整體風格或配色",
        "其他設計上的調整需求",
      ],
    },
    {
      heading: "【以下情況需加收 $200】",
      items: [
        "第 1 次修改完成後，再提出第 2 次修改",
        "原「彈力繩款」改為「龍蝦扣款」",
        "原「彈力繩款」改為「磁扣款」",
      ],
    },
  ],
  warning: "⚠️ 龍蝦扣／磁扣屬於製作結構上的更改，因此即使是第一次修改，也需酌收 $200",
  footer: "有任何不清楚的也可以再私訊官方詢問🤍",
} as const;
