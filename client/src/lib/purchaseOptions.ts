// 購買方案相關的共用工具

/** 將 Google Drive 分享連結轉成可直接嵌入的縮圖網址，其餘網址原樣回傳。 */
export function normalizeImageUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed.includes("drive.google.com")) return trimmed;
  const fileMatch = trimmed.match(/\/file\/d\/([^/?#]+)/);
  const idMatch = trimmed.match(/[?&]id=([^&#]+)/);
  const id = fileMatch?.[1] ?? idMatch?.[1];
  return id ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1600` : trimmed;
}

type PurchaseOptionImageSource = {
  image: string;
  purchaseOptions?: { id: string; image?: string | null }[];
};

/**
 * 取得所選方案的圖片。方案沒設圖、或方案已被停用而查不到時，沿用商品主圖。
 */
export function getPurchaseOptionImage(
  product: PurchaseOptionImageSource,
  purchaseOptionId?: string
): string {
  if (!purchaseOptionId) return product.image;
  const option = product.purchaseOptions?.find((item) => item.id === purchaseOptionId);
  const image = option?.image?.trim();
  return image ? normalizeImageUrl(image) : product.image;
}
