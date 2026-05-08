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

/** 手鍊初版／維修與修改規範（與 Custom 頁一致） */
export const CUSTOM_BRACELET_NOTICES: { title: string | null; body: string }[] = [
  {
    title: "《初版、維修》",
    body:
      "我們提供免費一次改初版和維修，但是不接受改手圍、新增條件（要銀管、要珠框、不要紫色、要磁扣等等）～因為這樣屬重新打掉設計，需加收費用 200 元，請在預約時直接跟店家說🤍",
  },
  {
    title: null,
    body:
      "初版、維修可調整的部分為有不喜歡的配飾可以更改、水晶／配飾擺放順序，有不清楚的也可以詢問店家～🤍",
  },
  {
    title: null,
    body: "另外，如想要再改第二次，需加收 200 元的費用～",
  },
];
