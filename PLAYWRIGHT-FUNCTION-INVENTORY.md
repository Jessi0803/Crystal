# 椛 Crystal 電商網站 — Playwright 功能測試清單

> 用途：Playwright E2E 規劃、手動驗收、回歸測試盤點  
> 專案：`crystal-aura`  
> 參考環境：本機 `pnpm dev`、測試站或正式站

一條 = 一個可測場景，每條寫完整、不依其他編號引用。有寫「資料庫驗證」的項目，測完畫面後請到 MySQL / Table Editor / 後台列表對照資料是否正確寫入。

---

## 功能測試清單

### 全站導覽與靜態內容

| # | 測試場景 | 通過標準（畫面） | 資料庫驗證 |
|---|----------|------------------|------------|
| 1 | 主要網址直接開啟 | `/`、`/products`、`/custom`、`/knowledge`、`/shopping-guide`、`/contact`、`/about`、`/crystal-workshop` 不白屏、不 404，頁首與頁尾正常 | 無 |
| 2 | 導覽列與頁尾連結 | 桌機與手機版導覽可前往商品、客製化、知識、購物說明、聯絡與會員入口；外部 LINE / Instagram 連結可開新分頁 | 無 |
| 3 | 首頁商品與分類入口 | 首頁精選商品可進詳情；愛情桃花、財運事業、能量防護、療癒分類入口會帶到對應商品列表 query | 無 |
| 4 | 手機版基本可用性 | 375px 寬度下導覽、商品卡、購物袋、結帳表單、AI 客服視窗不互相遮擋，主要按鈕可點擊 | 無 |
| 5 | 404 頁面 | 開啟不存在路徑時顯示 NotFound，不白屏 | 無 |

### 商品瀏覽與購物袋

| # | 測試場景 | 通過標準（畫面） | 資料庫驗證 |
|---|----------|------------------|------------|
| 6 | 商品列表讀取 | 商品列表顯示資料庫上架商品與靜態備援商品；測試商品與客製化商品不混入一般列表 | `products.active = true` 的一般商品會出現在列表；`category = test` 不顯示 |
| 7 | 分類篩選 | 點選每月限量、愛情桃花、財運事業、能量防護、療癒、項鍊、吊飾、能量香水、其他後，只顯示符合分類商品；清除篩選回全部 | `products.categories` / `category` 與前台分類一致 |
| 8 | 商品排序 | 銷售量、價格低到高、價格高到低、最新商品排序結果正確；URL query 更新後重新整理仍維持排序 | 銷售量排序可對照 `orderItems` 聚合；價格與 `products.price` 一致 |
| 9 | 商品詳情基本資訊 | 商品詳情顯示圖片、名稱、副標、分類、標籤、價格、原價折扣、功效說明、商品內容與相關商品 | `products` 對應欄位與畫面一致 |
| 10 | 可調整手鍊商品 | 可選手圍、扣件類型、鬆緊度；龍蝦扣或磁扣加價 NT$200，價格即時更新；扣件示意圖正常顯示 | 無 |
| 11 | 商品加入購物袋 | 點「加入購物袋」後抽屜打開；商品名稱、數量、單價、手圍、扣件、鬆緊度正確 | 無（購物袋為 React 記憶體狀態，重整會清空） |
| 12 | 購物袋修改 | 購物袋可增加數量、減少數量、移除商品、繼續購物、前往結帳；小計與數量正確 | 無 |
| 13 | 兩條手鍊免運提示 | 購物袋只有 1 條手鍊時顯示「還差 1 條」提示；2 條以上進結帳時國內運費為 0 | 無 |
| 14 | 庫存顯示與預購 | 有庫存顯示現貨出貨說明；庫存 0 且允許預購時可加入購物袋並顯示預購說明 | `productInventory.stock`、`allowPreorder`、`preorderNote` |
| 15 | 每月限量售完 | 每月限量商品庫存不足時詳情頁顯示售完，加入購物袋按鈕 disabled，送單 API 也拒絕 | `products.isMonthlyLimited = true` 且 `productInventory.stock` 不足 |

### 測驗與知識內容

| # | 測試場景 | 通過標準（畫面） | 資料庫驗證 |
|---|----------|------------------|------------|
| 16 | 水晶測驗完整流程 | `/quiz` 可開始測驗、逐題選答案、返回上一題、看到推薦商品；推薦商品可看詳情或加入購物袋 | 無 |
| 17 | 水晶知識分類 | `/knowledge` 可依分類篩選文章；可展開 / 收合知識內容；CTA 可前往測驗或開啟 AI 客服 | 無 |
| 18 | 購物說明錨點 | `/shopping-guide` 的分段錨點可跳到付款、配送、退換貨等內容；聯絡按鈕可到 `/contact` | 無 |

### 客製化表單與訂金

| # | 測試場景 | 通過標準（畫面） | 資料庫驗證 |
|---|----------|------------------|------------|
| 19 | 客製化方案入口 | `/custom` 顯示一般客製、塔羅、水晶脈輪、生命靈數方案；各方案 CTA 進入對應表單 | 無 |
| 20 | 一般客製化表單 | `/custom/form` 可逐步填功效、手圍、鬆緊、金銀飾、銀管/珠框、扣件、吊飾、顏色、特殊需求、IG；送出後加入訂金商品並導向 `/checkout` | 結帳成功後 `orders.isCustomOrder = true`，`orders.customerNote` 包含表單內容 |
| 21 | 塔羅客製化表單 | `/custom/form-b` 可選塔羅主題並填入該主題所需欄位；不同主題顯示不同題組；送出後訂金金額與方案一致 | 結帳成功後 `orders.customerNote` 包含塔羅主題與手鍊需求 |
| 22 | 脈輪客製化表單 | `/custom/form-c` 必填姓名、生日與手圍；送出後導向結帳並帶入脈輪訂金商品 | 結帳成功後 `orders.customerNote` 包含姓名、生日、手圍 |
| 23 | 生命靈數客製化表單 | `/custom/form-d` 必填姓名、生日與手圍；送出後導向結帳並帶入生命靈數訂金商品 | 結帳成功後 `orders.customerNote` 包含姓名、生日、手圍 |
| 24 | 客製化表單必填驗證 | 未填必要欄位時不能前進或不能送出；錯誤提示清楚；返回上一步資料保留 | 無 |
| 25 | 客製化訂金結帳 | 客製化訂金結帳只要求購買人資訊與付款方式，不顯示一般配送地區與配送方式；ATM 成功後顯示轉帳資訊 | `orders.isCustomOrder = true`、`orderItems.productId` 為客製化訂金商品、`orders.orderStatus` 為訂金相關狀態 |

### 結帳、付款與訂單結果

| # | 測試場景 | 通過標準（畫面） | 資料庫驗證 |
|---|----------|------------------|------------|
| 26 | 空購物袋進結帳 | 直接開 `/checkout` 時顯示「購物車是空的」並可回商品列表 | 無 |
| 27 | 國內宅配信用卡結帳 | 有商品時可填姓名、Email、09 手機、郵遞區號、縣市、區域、地址；選信用卡後送出會產生綠界付款表單並跳轉 | `orders` 新增；`paymentMethod = credit`、`shippingMethod = home`、`deliveryRegion = domestic`；`orderItems` 正確 |
| 28 | 國內宅配轉帳結帳 | 選轉帳後送出導到 `/order/:merchantTradeNo`；畫面顯示銀行、戶名、帳號、金額與末五碼輸入 | `orders.paymentMethod = atm`、`paymentStatus = transfer_pending`、`orderStatus = pending_payment` |
| 29 | 國內 7-11 取貨結帳 | 選 7-11 取貨時未選門市不可送出；模擬 `CVS_STORE_SELECTED` postMessage 後顯示門市資訊並可送出 | `orders.shippingMethod = cvs_711`、`cvsStoreId`、`cvsStoreName`、`cvsType` 正確 |
| 30 | 海外 PayPal 結帳 | 切海外後只顯示國際宅配與 PayPal；國家限馬來西亞、香港、新加坡、美國、英國、澳洲；送出後前往 PayPal approval URL | `orders.deliveryRegion = overseas`、`paymentMethod = paypal`、地址格式寫入 `shippingAddress` |
| 31 | 海外地址驗證 | 美國州別與 ZIP、澳洲州別與郵遞區號、英國郵遞區號、新加坡/馬來西亞郵遞區號格式驗證正確；香港郵遞區號可空白 | 無 |
| 32 | 結帳費用計算 | 宅配 NT$100、7-11 NT$60、兩條手鍊國內免運、海外依國家運費、信用卡手續費項目與總計正確 | `orderItems` 包含 shipping/payment fee 項目；`orders.totalAmount` 等於畫面總計 |
| 33 | ATM 末五碼送出 | 訂單結果頁輸入非 5 碼數字會阻擋；輸入 5 碼後顯示已收到末五碼 | `orders.transferLastFive` 更新 |
| 34 | PayPal 返回成功 | `/order/:merchantTradeNo?paypal_return=1&token=...` 會呼叫 capture，成功後移除 query 並顯示付款完成 | `orders.paymentStatus = paid`、`paidAt` 有值、`inventoryDeducted = true` |
| 35 | PayPal 取消返回 | `/order/:merchantTradeNo?paypal_cancel=1` 顯示取消提示並移除 query；訂單仍為待付款 | `orders.paymentStatus` 不變 |
| 36 | 訂單結果狀態 | 待付款、轉帳待確認、已付款、已付訂金、已出貨、已到店、已完成、已取消、付款失敗都顯示正確標題、圖示與明細 | `orders.paymentStatus`、`orders.orderStatus` |

### 庫存與訂單狀態

| # | 測試場景 | 通過標準（畫面） | 資料庫驗證 |
|---|----------|------------------|------------|
| 37 | 付款才扣庫存 | 建立信用卡待付款或 ATM 轉帳待確認訂單後，商品庫存不立即扣；後台確認收款或金流付款成功後扣庫存 | `productInventory.stock` 在 `orders.inventoryDeducted = true` 後減少 |
| 38 | 取消訂單恢復庫存 | 已扣庫存的訂單改為取消後，前台商品可購數量回升 | `orders.orderStatus = cancelled` 後 `productInventory.stock` 加回且 `inventoryDeducted = false` |
| 39 | 預購訂單標記 | 庫存不足但允許預購的商品可下單；訂單與明細顯示預購 | `orders.isPreorder = true`、`orderItems.isPreorder = true` |
| 40 | 每月限量庫存防超賣 | 每月限量商品數量不足時，結帳 API 回錯誤並顯示售完或不可預購訊息 | `products.isMonthlyLimited = true` 時不可低於可用庫存送單 |

### 會員、驗證信與會員中心

| # | 測試場景 | 通過標準（畫面） | 資料庫驗證 |
|---|----------|------------------|------------|
| 41 | Email 註冊 | `/register` 填姓名、Email、密碼、確認密碼；成功後導向會員中心並提示驗證信已寄出或暫時無法寄出 | `users` 新增：`email`、`name`、`passwordHash`、`loginMethod = email`、`verifyToken` |
| 42 | 註冊表單驗證 | 空姓名、Email 格式錯、密碼少於 8 碼、確認密碼不一致時阻擋送出並顯示錯誤 | 無新增資料 |
| 43 | Email 登入 | `/login` 使用正確帳密可登入；一般會員導向 `/products`，管理員導向 `/admin/orders` | `users.lastSignedIn` 可更新；session cookie 存在 |
| 44 | 登入錯誤 | 錯誤 Email 或密碼顯示「Email 或密碼錯誤」；未填欄位顯示前端驗證 | 無 |
| 45 | LINE 登入入口 | 登入與註冊頁點 LINE 按鈕會前往 `/api/trpc/line-oauth-start`，`returnTo` 合法時保留 | 無或依 LINE OAuth 測試環境建立 / 綁定 `users` |
| 46 | LINE 登入歡迎彈窗 | 帶 `?line_welcome=1` 進站時顯示 LINE 登入成功彈窗；加入官方 LINE 與稍後再說可關閉；URL query 被清除 | 無 |
| 47 | Email 驗證連結 | `/verify-email?token=有效token` 顯示驗證成功；無 token 或錯誤 token 顯示失敗 | `users.emailVerified = true`、驗證 token 清除 |
| 48 | 重新寄送驗證信 | 未驗證 Email 會員在會員中心可重新發送驗證信；已驗證會員不顯示或回已驗證 | `users.verifyToken`、`verifyTokenExpiresAt` 更新 |
| 49 | 忘記密碼 | `/forgot-password` 輸入 Email 後顯示已發送重設連結；不存在帳號也顯示相同成功文案 | 存在帳號時 `users.resetToken`、`resetTokenExpiresAt` 更新 |
| 50 | 重設密碼 | `/reset-password?token=有效token` 可設定新密碼；少於 8 碼或確認不一致會阻擋；成功後可用新密碼登入 | `users.passwordHash` 更新，`resetToken` 清除 |
| 51 | 會員中心訂單 | 登入後 `/member` 可看到自己的訂單，展開後有商品明細、付款狀態、配送方式、門市/取件碼 | `orders.userId` 或 `buyerEmail` 與會員一致 |
| 52 | 會員資料更新 | 會員中心帳號設定可修改姓名；Email 欄位不可修改 | `users.name` 更新 |
| 53 | 登出 | 會員中心點登出後回首頁；重新進 `/member` 會被導到登入頁 | session cookie 清除 |

### AI 客服

| # | 測試場景 | 通過標準（畫面） | 資料庫驗證 |
|---|----------|------------------|------------|
| 54 | AI 客服開關 | 全站非後台頁面右下角顯示椛小助；可開啟、關閉、聚焦輸入框；手機版不遮住主要操作 | 無 |
| 55 | 快捷問題 | 點熱門問題後使用者訊息送出，快捷問題隱藏，顯示思考中與 AI 回覆 | `chatbotLogs` 新增一筆，含 `customerQuestion`、`botReply`、`pagePath` |
| 56 | 自由輸入問答 | 輸入問題送出後顯示回答；若回覆含 URL 可點擊；若有推薦商品顯示商品卡並可點到商品詳情 | `chatbotLogs.relatedProducts`、`retrievedQuestions` 視回覆內容寫入 |
| 57 | AI 失敗狀態 | 模擬 chatbot API 失敗時，畫面顯示「暫時無法回覆」並引導官方 LINE | 可無新增或新增錯誤回覆紀錄，依實作結果確認 |

### 後台權限與訂單管理

| # | 測試場景 | 通過標準（畫面） | 資料庫驗證 |
|---|----------|------------------|------------|
| 58 | 後台未登入導向 | 未登入直接開 `/admin/orders`、`/admin/products`、`/admin/revenue`、`/admin/chatbot` 會導向登入 | 無 |
| 59 | 非管理員後台權限 | 一般會員開後台頁顯示「無存取權限」並可返回首頁 | `users.role = user` |
| 60 | 管理員訂單列表 | 管理員可進 `/admin/orders`；統計卡、狀態分頁、每頁筆數、分頁、重新整理正常 | `orders` 聚合結果與統計一致 |
| 61 | 訂單明細展開 | 後台展開訂單顯示購買人、Email、手機、配送、商品明細、客製化諮詢內容、物流與尾款資訊 | `orders`、`orderItems`、`logisticsOrders`、`orderBalancePayments` |
| 62 | 後台確認轉帳收款 | 轉帳待確認訂單點「確認收款」後變已付款；庫存扣減；前台訂單結果與會員中心同步 | `orders.paymentStatus = confirmed`、`orderStatus = paid`、`confirmedAt` 有值、`inventoryDeducted = true` |
| 63 | 後台更新訂單狀態 | 可將訂單改為備貨中、已出貨、已到店、已取貨、未取貨、取消；列表與詳情同步 | `orders.orderStatus` 更新；取消時庫存依規則恢復 |
| 64 | 建立物流訂單 | 已付款 / 備貨中且尚無物流的訂單可建立綠界物流；成功後顯示物流編號、取件碼或託運單列印連結 | `logisticsOrders` 新增，`orders.orderStatus` 可能更新為 `shipped` |
| 65 | 客製化尾款連結 | 已付訂金客製化訂單可輸入尾款金額產生尾款連結；成功後複製連結並顯示尾款資訊 | `orderBalancePayments` 新增或更新 |
| 66 | 後台確認尾款轉帳 | 尾款轉帳待確認時可點確認收到尾款；尾款狀態變已付款，原訂單狀態更新 | `orderBalancePayments.paymentStatus = paid`；`orders.paymentStatus/orderStatus` 對應更新 |

### 後台商品與庫存

| # | 測試場景 | 通過標準（畫面） | 資料庫驗證 |
|---|----------|------------------|------------|
| 67 | 後台商品列表 | `/admin/products` 顯示商品圖、名稱、分類、價格、庫存、上架狀態、精選、月限；可搜尋商品 | `products`、`productInventory` |
| 68 | 新增商品 | 可填圖片、名稱、分類、價格、標籤、初始庫存、功效、商品內容並新增；新增後列表出現，前台上架商品可見 | `products` 新增；`productInventory` 依初始庫存新增 |
| 69 | 編輯商品 | 可修改名稱、分類、價格、價格區間、圖片、功效、商品內容、精選、每月限量、上架狀態；儲存後前台同步 | `products` 對應欄位更新 |
| 70 | 圖片上傳與預覽 | 選擇圖片後前端壓縮並預覽；貼圖片 URL 也可預覽；大於 10MB 顯示錯誤 | 若走 storage upload，確認儲存 URL；目前表單可直接存 data URL / URL |
| 71 | 上架 / 下架 | 點上架或下架後列表狀態改變；下架商品前台列表與詳情不可見 | `products.active` 更新 |
| 72 | 預約上架 | 設定未來時間時商品顯示預約；時間到後 public list 觸發自動上架並清除排程 | `products.active = false`、`scheduledPublishAt`；到期後 `active = true`、`scheduledPublishAt = null` |
| 73 | 刪除商品 | 刪除前跳確認；確認後商品從後台與前台消失，庫存設定同步刪除 | `products` 刪除，`productInventory` 對應刪除 |
| 74 | 行內庫存更新 | 後台商品列表直接編輯庫存；輸入 -1 代表無限，0 以上為實際庫存；負於 -1 阻擋 | `productInventory.stock` 更新 |

### 後台營收與 AI 紀錄

| # | 測試場景 | 通過標準（畫面） | 資料庫驗證 |
|---|----------|------------------|------------|
| 75 | 營收報表權限與載入 | 管理員可開 `/admin/revenue`，一般會員無權限；總訂單、本月訂單、本月營收、累計營收正常顯示 | `orders` 中已付款 / 已確認訂單聚合 |
| 76 | 月營收區間 | 可切近 3、6、12 個月；長條圖、月份明細、平均客單顯示正確 | `orders.paidAt/confirmedAt` 與月聚合一致 |
| 77 | 熱銷商品排行 | 熱銷商品排行顯示商品名稱、銷量、營收或空狀態 | `orderItems` 聚合 |
| 78 | AI 客服紀錄列表 | `/admin/chatbot` 顯示問答總數、月份分組、來源頁面、推薦商品；可展開完整問題與回答 | `chatbotLogs` |
| 79 | AI 客服紀錄搜尋 | 搜尋顧客問題、AI 回答、會員姓名或 Email 後結果正確；清除後回全部；分頁可用 | `chatbotLogs.customerQuestion`、`botReply`、`customerName`、`customerEmail` |

---

## 資料庫寫入總覽（速查）

| 使用者操作 | 主要資料表 | 應出現的資料 |
|------------|------------|--------------|
| Email 註冊 | `users` | `email`、`name`、`passwordHash`、`loginMethod = email`、`verifyToken`、`emailVerified = false` |
| Email 驗證 | `users` | `emailVerified = true`，驗證 token 清除或失效 |
| 忘記密碼 | `users` | `resetToken`、`resetTokenExpiresAt` |
| 重設密碼 | `users` | `passwordHash` 更新，`resetToken` 清除 |
| 商品加入購物袋 | 無 | 前端記憶體狀態，不寫資料庫 |
| 一般商品下單 | `orders` + `orderItems` | 訂單主檔、購買人、配送、付款、金額、商品明細 |
| 客製化表單下訂金 | `orders` + `orderItems` | `isCustomOrder = true`、訂金商品、`customerNote` 包含表單內容 |
| 轉帳末五碼 | `orders` 或 `orderBalancePayments` | `transferLastFive` 更新 |
| 確認收款 / 付款成功 | `orders` + `productInventory` | `paymentStatus` 變 `confirmed` / `paid`，`paidAt/confirmedAt`，庫存扣減 |
| 取消已扣庫存訂單 | `orders` + `productInventory` | `orderStatus = cancelled`，庫存恢復 |
| 建立物流 | `logisticsOrders` + `orders` | 物流編號、狀態、CVS 取件碼或宅配託運資訊 |
| 建立客製化尾款 | `orderBalancePayments` | 尾款編號、金額、付款狀態、運費、手續費 |
| 商品新增 / 編輯 | `products` | 商品內容、分類、價格、狀態、排程上架 |
| 庫存更新 | `productInventory` | `stock`、`allowPreorder`、`preorderNote` |
| AI 客服問答 | `chatbotLogs` | 問題、回答、推薦商品、命中知識、來源頁面、會員資訊 |

---

## Playwright 自動化覆蓋建議

### 建議測試檔拆分

| 測試檔 | 建議範圍 | 對應功能 |
|--------|----------|----------|
| `tests/e2e/navigation.spec.ts` | 全站主要路由、導覽、靜態頁、手機版 smoke | 1-5 |
| `tests/e2e/products-cart.spec.ts` | 商品列表、分類排序、詳情、購物袋、庫存/售完狀態 | 6-15 |
| `tests/e2e/quiz-knowledge.spec.ts` | 測驗、知識分類、購物說明錨點 | 16-18 |
| `tests/e2e/custom-forms.spec.ts` | 四種客製化表單、必填驗證、導入訂金結帳 | 19-25 |
| `tests/e2e/checkout.spec.ts` | 國內宅配、7-11 postMessage、海外 PayPal、費用計算、空購物袋 | 26-32 |
| `tests/e2e/order-result.spec.ts` | ATM 末五碼、PayPal return/cancel、訂單狀態顯示 | 33-36 |
| `tests/e2e/auth-member.spec.ts` | 註冊、登入、驗證信頁、忘記密碼、重設密碼、會員中心、登出 | 41-53 |
| `tests/e2e/chatbot.spec.ts` | 前台 AI 客服開關、快捷問題、輸入、失敗狀態 | 54-57 |
| `tests/e2e/admin-orders.spec.ts` | 後台權限、訂單列表、確認收款、更新狀態、物流、尾款 | 58-66 |
| `tests/e2e/admin-products.spec.ts` | 商品新增、編輯、上下架、排程、刪除、庫存 | 67-74 |
| `tests/e2e/admin-revenue-chatbot.spec.ts` | 營收報表、熱銷排行、AI 紀錄列表、搜尋、分頁 | 75-79 |

### Mock / Integration 分層

| 層級 | 目的 | 建議做法 |
|------|------|----------|
| Mock E2E | 快速驗 UI 與流程，不依賴外部金流、物流、LLM、Email | Playwright route 攔截 `/api/trpc/*`、金流表單、PayPal approval URL、LINE OAuth |
| DB Integration E2E | 驗真實資料庫寫入、庫存扣減、訂單狀態與後台 | 使用測試資料庫或 staging DB，每次測試建立唯一 email / 商品 / 訂單並清理 |
| External Sandbox | 驗綠界、PayPal、LINE、Email 服務串接 | 綠界只以 `pnpm test:e2e:ecpay-sandbox` 跑 stage；Resend 只以 `pnpm test:e2e:resend` 寄往 `@resend.dev` 測試收件地址 |
| Visual Smoke | 防白屏、遮擋、RWD 版面回歸 | 桌機 1440x900、平板 768x1024、手機 375x812 截圖比對 |

### 目前自動化狀態

- 已加入 `@playwright/test`、`playwright.config.ts`、`tests/e2e` 與 `pnpm test:e2e`。
- 已加入測試資料庫工具：`db:test:check`、`db:test:migrate`、`db:test:push`、`db:test:reset`、`db:test:seed`。
- Playwright global setup 會先執行 `e2e:safety:check` 再執行 `db:test:seed`。資料庫 helper 會同時驗證測試資料庫名稱、已確認的 TiDB project ID 與寫入允許旗標；僅資料庫名稱叫 `test` 不足以通過。
- Playwright 啟動網站伺服器時會將 `DATABASE_URL` 明確固定為 `.env.test.local` 中的值，不會採用終端機或正式環境中已存在的連線字串。
- 綠界測試固定設定 `ECPAY_SANDBOX=true` 與 `ECPAY_LOGISTICS_SANDBOX=true`，信用卡導向 `payment-stage.ecpay.com.tw`，物流導向 `logistics-stage.ecpay.com.tw`；不測正式端點。
- 日常 `pnpm test:e2e` 不建立外部綠界 sandbox 交易；要驗綠界 stage 串接時執行 `pnpm test:e2e:ecpay-sandbox`。
- 日常 `pnpm test:e2e` 啟動的伺服器會清空 `RESEND_API_KEY`，不會寄出外部 Email；要測 Resend 時僅執行 `pnpm test:e2e:resend`，且測試固定寄往 Resend 測試地址。
- 第一批完成時的完整 suite 基準覆蓋桌機 Chromium 與 mobile Chrome：日常回歸 `pnpm test:e2e` 結果為 `74 passed, 6 skipped`（當時略過外部綠界 sandbox 案例）；綠界 stage 整合結果為 `6 passed`。
- 2026-05-26 第一批最近變更回歸：手圍、客製價格、首頁輪播、手機後台編輯／排程、預購與月限售完案例於桌機及手機執行結果為 `45 passed, 1 skipped`；略過項目為桌機專案中的手機專屬案例，手機專案已通過。
- 2026-05-26 第二批後台／外部服務回歸：訂單出貨至未取貨、營收取消排除、Chatbot 推薦卡與失敗提示於桌機及手機執行結果為 `18 passed`；Chatbot 測試使用 route mock，不送真實 AI 請求。
- 2026-05-26 第二批中，商品圖片超過 10MB 阻擋、圖片預覽/新增/刪除、預約商品到期自動上架，以及 PayPal return capture 成功畫面均已在桌機及手機通過；PayPal 案使用 route mock，不送 PayPal 交易。
- 2026-05-26 綠界 Sandbox 補測：付款 stage 導向、選店 stage、超商物流均通過；宅配物流首次以虛構地址遭黑貓 Sandbox 拒絕，改用可識別地址後單獨重跑通過。只建立 Sandbox 物流資料與測試 TiDB 訂單。
- 2026-05-26 第三批 UI 回歸：LINE 登入入口/歡迎彈窗、知識分類與購物說明互動、付款失敗結果頁、後台 AI 紀錄分頁/推薦資料於桌機及手機執行結果為 `14 passed, 2 skipped`；LINE 與 AI 紀錄均使用 route mock，不呼叫外部服務。
- 2026-05-28 第一批重要補測：後台 ATM 測試訂單可從待確認一路切到備貨中、已出貨、已到店、已取貨、已完成，且前台訂單結果頁會優先顯示物流/履約狀態，不再只顯示「付款成功！」；桌機與手機合計 `6 passed`。
- 2026-05-28 第一批重要補測：客製訂金 ATM 訂單會顯示「等待轉帳確認」，後台確認訂金後前台會顯示「訂金付款成功」，再產生尾款連結、送出尾款 ATM 後五碼、後台確認尾款；桌機與手機均通過。
- 2026-05-28 第一批重要補測：新增真實 Chatbot 回答回歸測試，但預設跳過；只有同時設定 `RUN_CHATBOT_REAL_E2E=true` 與 `E2E_ALLOW_REAL_CHATBOT=true` 才會載入 `.env` 的 Gemini key 並實際測「尾款何時付、綠幽靈是否有貨、醫療保證、投資預測」四類問題。一般 `pnpm test:e2e` 不呼叫 Gemini。
- 2026-05-28 第二批重要補測：後台商品新增後前台列表與詳情頁可見、下架/刪除後前台列表消失且詳情頁顯示找不到、排程到期後自動上架；會員中心會同步後台確認收款、備貨中、已取消；綠界物流 sandbox notify 可把訂單同步到已到店與已取貨。目標批次結果為 `21 passed, 1 skipped`，skipped 為桌機專案略過手機專屬後台操作案例。
- 2026-05-28 第三批重要補測：綠界物流 sandbox 退件 callback 會同步為未取貨，前台訂單結果與會員中心同步；取消已扣庫存訂單會回補庫存並清除扣庫存旗標，避免重複取消造成庫存重複加回；Chatbot 對無現貨、無資料、醫療保證、投資預測問題不顯示商品推薦卡。目標批次結果為 `30 passed, 2 skipped`，skipped 為預設關閉的真實 Gemini Chatbot 測試。
- 2026-05-29 第四批重要補測：結帳直接打 API 的空購物車與售完月限商品會被拒絕且不建立訂單，ATM 結帳連點只建立一張訂單；綠界付款 notify 的錯誤 CheckMacValue 不會改訂單或扣庫存，重複正確 notify 不會重複扣庫存，PayPal capture 失敗不會標已付款；未登入與一般會員直接打後台 tRPC API 會被擋。目標批次結果為 `20 passed`。

### 執行前安全設定

`.env.test.local` 必須只指向已確認的測試 TiDB project，並設定以下非機密安全標記：

```dotenv
NODE_ENV=test
PAYPAL_SANDBOX=1
ECPAY_SANDBOX=true
ECPAY_LOGISTICS_SANDBOX=true
E2E_TEST_DATABASE_NAME=test
E2E_TIDB_PROJECT_ID=<測試 TiDB project ID>
E2E_ALLOW_TEST_DB_WRITES=true
```

- `pnpm e2e:safety:check` 只檢查設定，不連線或寫入資料庫。
- `pnpm db:test:check` 會連線確認測試資料庫，但只執行讀取查詢。
- `pnpm test:e2e` 會在安全檢查通過後 seed 測試資料庫，因此一定會寫入測試資料庫。
- `pnpm test:e2e:ecpay-sandbox` 可能在綠界 stage 建立 sandbox 交易，不會呼叫正式綠界端點。
- `pnpm test:e2e:resend` 僅在此指令下載入 `.env.resend.local` 的 Resend key 並真正寄送測試信，收件地址固定為 `@resend.dev`。

### 現有測試檔對照

| 測試檔 | 目前覆蓋 |
|--------|----------|
| `tests/e2e/navigation.spec.ts` | 主要路由 smoke、404 |
| `tests/e2e/content-interactions.spec.ts` | 水晶知識分類/展開/測驗 CTA，以及購物說明付款錨點、聯絡與 Chatbot 入口 |
| `tests/e2e/products-cart.spec.ts` | 商品詳情、購物袋、空結帳、庫存/預購/售完狀態 |
| `tests/e2e/products-filtering.spec.ts` | 商品分類、空分類、排序 |
| `tests/e2e/quiz-and-order-pages.spec.ts` | 水晶測驗、找不到訂單、PayPal cancel return |
| `tests/e2e/paypal-return-ui.spec.ts` | mock PayPal return/capture 成功後的訂單已付款畫面與 query 清理 |
| `tests/e2e/order-status-ui.spec.ts` | mock 付款失敗結果頁；已完成、已出貨、已到店、已取貨會優先顯示履約狀態，而不是只顯示付款成功 |
| `tests/e2e/custom-forms.spec.ts` | 客製化入口、一般客製化表單到訂金結帳 |
| `tests/e2e/recent-storefront-regressions.spec.ts` | 客製價格顯示、首頁封面三張輪播、自動切換與商品頁連結 |
| `tests/e2e/checkout-guardrails.spec.ts` | 海外地址驗證不送單、售完月限商品繞過前端仍拒絕、空購物車直接打 API 拒絕、ATM 結帳連點只建立一張訂單 |
| `tests/e2e/checkout-order.spec.ts` | 結帳必填驗證、超商取貨阻擋、ATM 下單、會員中心訂單，以及會員中心同步後台確認收款、備貨中、取消狀態 |
| `tests/e2e/payment-callback-guardrails.spec.ts` | 綠界付款 notify 錯誤簽名不改訂單、重複正確 notify 不重複扣庫存、PayPal capture 失敗不標已付款 |
| `tests/e2e/admin-api-guardrails.spec.ts` | 未登入與一般會員直接呼叫後台訂單、商品、庫存、營收、AI 紀錄 tRPC API 會被拒絕 |
| `tests/e2e/ecpay-logistics-callback.spec.ts` | 綠界物流 sandbox notify 簽名驗證、已到店/已取貨/退件 callback 後同步訂單狀態、前台結果頁與會員中心 |
| `tests/e2e/inventory-order.spec.ts` | 庫存扣減與取消回補、取消後清除扣庫存旗標、預購訂單標示、月限售完與零庫存預購差異 |
| `tests/e2e/balance-payment.spec.ts` | 客製化訂金等待轉帳、訂金確認成功、產生尾款連結、尾款 ATM 末五碼與後台確認尾款 |
| `tests/e2e/ecpay-sandbox.spec.ts` | 綠界信用卡 stage 導轉、物流 stage 選店入口、stage 超商與宅配建立物流訂單 |
| `tests/e2e/account.spec.ts` | 註冊、會員資料更新、忘記密碼中性成功狀態 |
| `tests/e2e/line-login-ui.spec.ts` | mock LINE OAuth 入口導向、合法 returnTo 與登入歡迎彈窗 |
| `tests/e2e/auth-admin.spec.ts` | 會員登入、admin 登入、非 admin 後台阻擋 |
| `tests/e2e/admin-management.spec.ts` | admin 商品搜尋、確認轉帳訂單 |
| `tests/e2e/admin-products-write.spec.ts` | admin 建立商品、行內庫存編輯 |
| `tests/e2e/admin-order-workflow.spec.ts` | 後台 ATM 測試訂單從待確認進到備貨中、已出貨、已到店、已取貨、已完成、未取貨，以及分頁/篩選 |
| `tests/e2e/admin-products-lifecycle.spec.ts` | 商品編輯／上下架／排程／到期自動上架／圖片上傳與大小限制／刪除，並確認前台列表與詳情頁同步顯示/隱藏；包含手機版編輯與預約上架操作 |
| `tests/e2e/admin-reporting.spec.ts` | 營收報表、取消已付款訂單後排除營收、熱銷商品、AI 客服紀錄搜尋/展開、舊 inventory route redirect |
| `tests/e2e/admin-chatbot-pagination-ui.spec.ts` | mock 後台 AI 紀錄分頁、來源頁面、推薦商品與命中知識顯示 |
| `tests/e2e/chatbot-ui.spec.ts` | mock AI 回覆的前台推薦商品跳轉，以及 API 錯誤時 LINE fallback |
| `tests/e2e/chatbot-conversation-admin.spec.ts` | mock 前台 Chatbot 多輪 history、推薦文字與商品卡一致性、空白輸入不送出、超長輸入限制 500 字、無現貨/無資料/醫療/投資問題不顯示商品卡、長 prompt-injection 類輸入無商品卡、後台 AI 紀錄搜尋/空結果/清除搜尋與展開檢查 |
| `tests/e2e/chatbot-real-answer.spec.ts` | gated 真實 Chatbot 回答回歸；預設跳過，只有開啟 `RUN_CHATBOT_REAL_E2E=true` 與 `E2E_ALLOW_REAL_CHATBOT=true` 才會呼叫 Gemini |

### Playwright 技術注意

- 7-11 選店不需要真的打綠界地圖，可在測試中對頁面送 `window.postMessage({ type: "CVS_STORE_SELECTED", storeId, storeName, cvsType })`。
- 信用卡綠界付款可攔截 hidden form submit 或 mock `order.createAndPay` 回傳 `ecpay_credit`，不需要真的進付款頁。
- PayPal 測試可 mock `approvalUrl`；成功返回用 `/order/:merchantTradeNo?paypal_return=1&token=TEST_TOKEN` 搭配 mock capture。
- LINE OAuth 建議只測入口導向與 `line_welcome=1` 歡迎彈窗；完整 OAuth 放 sandbox integration。
- AI 客服日常 E2E 應 mock 回覆；LLM / embedding 真實測試另開 integration。
- 後台測試需要預先建立 admin session，建議用 API login 或測試 fixture，不要每支測試都從 UI 登入。

---

## 網址對照（自動化用）

| 網址 | 頁面 |
|------|------|
| `/` | 首頁 |
| `/products` | 商品列表 |
| `/products/:id` | 商品詳情 |
| `/quiz` | 水晶測驗 |
| `/custom` | 客製化方案 |
| `/custom/form` | 一般客製化表單 |
| `/custom/form-b` | 塔羅客製化表單 |
| `/custom/form-c` | 脈輪客製化表單 |
| `/custom/form-d` | 生命靈數客製化表單 |
| `/knowledge` | 水晶知識 |
| `/shopping-guide` | 購物說明 |
| `/contact` | 聯絡我們 |
| `/about` | 品牌故事 |
| `/crystal-workshop` | 水晶創業 / 體驗課程 |
| `/checkout` | 結帳 |
| `/order/:merchantTradeNo` | 訂單結果 |
| `/balance/:merchantTradeNo` | 客製化尾款付款 |
| `/login` | 登入 |
| `/register` | 註冊 |
| `/forgot-password` | 忘記密碼 |
| `/reset-password?token=...` | 重設密碼 |
| `/verify-email?token=...` | Email 驗證 |
| `/member` | 會員中心 |
| `/admin/orders` | 後台訂單管理 |
| `/admin/products` | 後台商品 / 庫存管理 |
| `/admin/inventory` | 舊庫存入口，會導向 `/admin/products` |
| `/admin/revenue` | 後台營收報表 |
| `/admin/chatbot` | 後台 AI 客服紀錄 |

---

## 測試帳號與資料準備

| 資料 | 用途 |
|------|------|
| 一般會員 | 登入、會員中心、購物、Email 驗證、忘記密碼 |
| 管理員 | 後台訂單、商品、營收、AI 紀錄 |
| 未驗證 Email 會員 | 會員中心重新寄送驗證信 |
| 可收信 Email | 驗證信與重設密碼 integration |
| LINE 測試帳號 | LINE OAuth sandbox |
| 一般商品（有庫存） | 商品瀏覽、購物袋、一般結帳 |
| 一般商品（庫存 0，允許預購） | 預購流程 |
| 每月限量商品（庫存 0） | 售完不可預購 |
| 可調整手圍商品 | 手圍、扣件加價、鬆緊度 |
| 客製化訂金商品四種 | 一般客製、塔羅、脈輪、生命靈數表單 |
| 轉帳待確認訂單 | 後台確認收款、末五碼 |
| 已付訂金客製化訂單 | 產生尾款連結 |
| 已付款未出貨訂單 | 建立物流、更新狀態 |
| AI 客服紀錄 | 後台搜尋、分頁、展開 |

---

## 目前已知限制 / 風險

- 購物袋只存在前端記憶體，重新整理會清空；測試不應期待 localStorage 持久化。
- `/admin/inventory` 目前會導向 `/admin/products`，主要庫存測試應放在商品管理頁。
- Email、LINE、PayPal、綠界金流 / 物流都屬外部服務，日常 Playwright 應以 mock 為主，真實串接放獨立 integration。
- 客製化表單內容透過 `sessionStorage.customConsultationNote` 帶到結帳，測試需在送出表單後同一 browser context 內完成結帳。
- 商品資料來源同時包含資料庫商品與靜態備援資料，E2E fixture 需要明確指定商品 ID，避免 staging 資料變動造成斷言不穩。
- 真實 Chatbot 回答測試預設跳過，避免日常 E2E 誤打 Gemini；需要人工確認測試環境與 key 後，再用雙旗標執行。

---

*QA 功能清單 v1.0 · 以 Playwright E2E 規劃為主，各條自包含，不依編號交叉引用*
