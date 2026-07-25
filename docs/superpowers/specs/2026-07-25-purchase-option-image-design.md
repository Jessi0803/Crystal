# 購買方案圖片 — 設計文件

日期：2026-07-25
分支：`codex/product-purchase-options`

## 目標

商品可以有多個購買方案（`purchaseOptions`）。目前方案只有名稱、價格、原價、庫存、說明，沒有圖片。使用者選了不同方案時，看到的都是同一張商品主圖。

本設計讓每個方案帶自己的一張圖，使用者選擇方案時，商品頁主圖、購物車、結帳頁都換成該方案的圖。

## 範圍

**包含**

- 方案資料結構新增 `image` 欄位
- 商品頁：選方案時主圖切換
- 購物車、結帳頁：顯示所選方案的圖
- 訂單快照存方案圖（後台訂單因此也會顯示方案圖）
- 後台商品編輯：方案圖上傳 / 貼網址 / 移除

**不包含**

- 每個方案一組多張圖（YAGNI；目前一張就夠）
- 方案圖插入商品相簿縮圖列
- 訂單確認信件模板調整

## 資料層

`ProductPurchaseOption` 新增一個可選欄位：

```ts
image?: string | null;   // data URL 或圖片網址；未設定則 fallback 商品主圖
```

需同步三處定義：

| 檔案 | 內容 |
|---|---|
| `drizzle/schema.ts` | `ProductPurchaseOption` type |
| `client/src/lib/data.ts` | `Product.purchaseOptions` 的 inline type |
| `server/routers/products.ts` | `PurchaseOptionSchema` (zod) |

zod 驗證：`image: z.string().trim().nullable().optional()`。不設嚴格長度上限 — 壓縮後的 data URL 約 100–300KB，跟既有商品 `image` 欄位的處理方式一致。空字串一律在送出前轉為 `undefined`，資料庫中不存空字串。

**不需要新的 migration。** `products.purchaseOptions` 是 MySQL JSON 欄位，新增 key 不動 schema。`drizzle/0032_products_purchase_options.sql` 維持原樣。

## 商品頁（`client/src/pages/ProductDetail.tsx`）

核心問題：方案圖與使用者手動點選的相簿縮圖會互相覆蓋。解法是讓 `selectedGalleryImage` 只代表「使用者手動選過的圖」，空字串代表「還沒手動選」。

**顯示優先序**（計算 `activeGalleryImage`）：

1. `selectedGalleryImage`，且該圖存在於 `galleryImages` 中
2. 所選方案的 `image`
3. `galleryImages[0]`
4. `product.image`

**行為**

- 切換方案 → `setSelectedGalleryImage("")`，主圖顯示新方案的圖
- 點任一相簿縮圖 → `selectedGalleryImage` 設為該圖，主圖切回相簿圖；方案選擇不受影響
- 方案沒設圖 → 顯示 `galleryImages[0]`，與現行行為相同
- 切換商品時，既有的 `useEffect`（依賴 `id, product?.id`）已經會重設 `selectedGalleryImage`，維持不變

**縮圖列**：結構不變。當主圖顯示的是方案圖時，沒有任何縮圖處於選中狀態 — 這是正確的，因為方案圖不屬於相簿。

## 購物車與結帳

新增 `client/src/lib/purchaseOptions.ts`：

```ts
export function getPurchaseOptionImage(
  product: Product,
  purchaseOptionId?: string
): string
```

回傳所選方案的 `image`，查不到則回傳 `product.image`。

**呼叫端**

| 位置 | 用途 |
|---|---|
| `client/src/components/CartDrawer.tsx`（商品縮圖） | 購物袋列表 |
| `client/src/pages/Checkout.tsx`（訂單摘要縮圖） | 結帳頁 |
| `client/src/pages/Checkout.tsx`（送出訂單的 `image` 欄位） | 訂單快照 |

`CartItem` 結構不變 — item 已經帶完整 `product` 與 `purchaseOptionId`，足以查出方案圖。

**訂單快照**：結帳送出時，`items[].image` 改用方案圖，寫入 `orderItems.productImage`。後台訂單讀的是這個欄位，因此後台訂單會自動顯示方案圖，方便出貨核對。

**已知邊界**：server 的 `toClientProduct` 會濾掉 `active === false` 的方案。若購物車裡的方案事後被停用，`getPurchaseOptionImage` 查不到就 fallback 商品主圖。可接受 — 已下單的訂單存的是當時的快照，不受影響。

## 後台（`client/src/pages/AdminProducts.tsx`）

`FormState.purchaseOptions` 的元素新增 `image: string`（表單內用空字串表示未設定，送出時轉為 `undefined`）。

`toFormPurchaseOptions` 需帶入既有的 `image`。

**每個方案卡片新增圖片區**

- 縮圖預覽（有圖時顯示，附「移除」按鈕）
- 「上傳圖片」按鈕 → 複用 `compressImage`
- 「或貼上圖片網址」輸入框 → 複用 `normalizeImageUrl`

**檔案輸入**：所有方案共用一個隱藏的 `<input type="file">`，用 `pendingOptionIndex` state 記住目標方案的索引。上傳完成後寫回該方案並清空索引。

**驗證**：沿用商品相簿既有的 10MB 單檔上限與錯誤提示。

## 測試

**E2E**（`tests/e2e/admin-products-write.spec.ts`）

- 建立含方案的商品，替其中一個方案設定圖片網址，儲存後重新開啟編輯視窗，驗證該方案的圖片仍在

**商品頁行為**

- 選擇有圖的方案 → 主圖變成方案圖
- 點相簿縮圖 → 主圖切回該縮圖
- 選擇沒設圖的方案 → 主圖為相簿第一張

## 風險

- **JSON 欄位大小**：多個方案各帶一張 data URL，`purchaseOptions` JSON 可能達到 1MB 以上。MySQL JSON 欄位上限遠高於此，但需留意 `max_allowed_packet`。若實務上遇到問題，改用圖片網址即可迴避。
- **既有商品相容性**：既有的方案沒有 `image` key，讀取時為 `undefined`，全部走 fallback 路徑，行為與現在完全相同。
