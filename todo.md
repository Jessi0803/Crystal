# 椛 ˙Crystal 電商網站 TODO

## 已完成功能

- [x] 首頁 Landing Page（Hero、功效分類、熱門商品、信任區塊、能量測驗入口、知識小教室）
- [x] 商品列表頁（含分類篩選）
- [x] 商品詳情頁（故事型文案、功效說明、CTA）
- [x] 能量測驗頁（3題互動測驗 + 水晶推薦）
- [x] 水晶知識小教室頁
- [x] 購物車（側邊欄滑出）
- [x] 結帳頁 /checkout（填寫姓名/Email/手機/地址/付款方式）
- [x] 訂單結果頁 /order/:id（輪詢訂單狀態）
- [x] 品牌故事頁、聯絡我們頁、購物說明頁
- [x] 品牌名稱全站更新為「椛 ˙Crystal」
- [x] 導覽列整合（左側：最新商品・商品分類▾・購物說明▾・品牌故事・聯絡我們；Logo 置中；右側：能量測驗・水晶知識）
- [x] 頁尾簡化（品牌名稱、理念文字、IG/LINE 圖示、版權列）
- [x] 字體對齊 vacanza.com.tw（Noto Sans TC + Helvetica Neue，標題 Noto Serif TC）
- [x] Logo 字體精緻化（「椛」Noto Serif TC weight 300 +「Crystal」Cormorant Garamond italic）
- [x] 綠界 ECPay 沙盒金流後端建置
- [x] CheckMacValue 簽章邏輯修正（移除 double-encode、補充 URL encode 字元替換規則）
- [x] **修正 CheckMacValue Error（10200073）：改用正確的沙盒測試憑證（MerchantID: 3002607）**

## 待完成功能

- [x] 訂單管理後台 /admin/orders（含統計卡片、狀態篩選、展開詳情、admin 權限保護）
- [ ] 付款成功 Email 確認信（Resend/SendGrid）
- [x] 正式上線前替換為正式商店憑證（商店代號 3096116）
- [x] 加入 1 元測試商品（id: test-1-dollar）供測試金流物流流程
- [x] 修復超商選店地圖：改為真實開啟綠界選店視窗（postMessage 機制）
- [x] 移除沙盒測試提示，修正超商描述為「先付款再取貨」
- [x] 水晶 AI Chatbot：知識庫（模擬資料）+ RAG 架構 + 後端 procedure
- [x] 水晶 AI Chatbot：前端懸浮視窗（右下角 Icon + 對話介面 + 熱門問題）
- [x] 水晶 AI Chatbot：整合到全站 Layout
- [ ] 更新社群連結（IG、LINE）為真實帳號
- [x] 客製化方案頁面 /custom（四方案卡片 + LINE 客服 CTA，取代能量測驗）
- [x] Navbar 商品分類下拉加入「客製化方案」，首頁「做能量測驗」改為「客製化方案」

## 完整電商後台系統

- [x] 設置環境變數（綠界沙盒金流/物流憑證）
- [x] 資料庫 Schema：orders、inventory_locks、logistics_orders、payment_records 表
- [x] 庫存鎖定機制（10分鐘保留 + 定時解鎖 cron）
- [x] 預購模式（庫存為0時允許預購）
- [x] 綠界金流整合：刷卡/Apple Pay Webhook 處理
- [x] 銀行轉帳流程：顯示帳號 + 客人輸入末五碼 + 後台確認收款
- [x] 前端結帳流程：超商選店地圖（綠界 CVS 地圖）、宅配填址、付款方式選擇
- [x] 管理後台升級：訂單列表篩選（已付款/待確認/待出貨/已出貨/已完成）
- [x] 管理後台：確認銀行轉帳收款按鈕
- [x] 管理後台：建立物流訂單按鈕（超商交貨便/宅配託運單）
- [x] 綠界物流 API：超商交貨便產單（取得條碼）
- [x] 綠界物流 API：宅配託運單產出
- [x] 訂單自動結案（客人領貨後標記已完成）
- [x] 營收報表頁面（月營收趨勢、熱銷商品排行）

## 宅配託運單 PDF 列印

- [x] ecpayLogistics.ts 補上宅配託運單 PDF 產生 API（綠界 PrintTradeDoc）
- [x] 管理後台宅配訂單加入「列印託運單」按鈕，直接開啟 PDF

## Email 會員系統

- [x] 資料庫 schema 加入 passwordHash、resetToken、resetTokenExpiresAt 欄位
- [x] db.ts 加入 getUserByEmail、createEmailUser、setResetToken、getUserByResetToken、updatePasswordAndClearToken
- [x] orderDb.ts 加入 getOrdersByEmail（依 email 查詢訂單）
- [x] server/routers/member.ts：register、login、forgotPassword、resetPassword、updateProfile、myOrders
- [x] 前端 /login 登入頁
- [x] 前端 /register 註冊頁
- [x] 前端 /forgot-password 忘記密碼頁
- [x] 前端 /member 會員中心（訂單查詢 + 帳號設定）
- [x] Navbar 會員 icon 整合（已登入顯示綠點 + 連到會員中心，未登入連到登入頁）
- [x] Mobile menu 加入登入/會員中心/登出連結

## Resend Email 發信串接

- [x] 設定 RESEND_API_KEY 環境變數
- [x] 建立 server/email.ts 發信 helper（Resend SDK）
- [x] 忘記密碼信模板（含重設連結）
- [x] 訂單確認信模板（含商品明細、金額、取貨資訊）
- [x] 整合 forgotPassword procedure 寄出重設信
- ~~整合訂單建立流程寄出確認信~~（已移除，依需求不發送）
- [x] 建立 /reset-password 頁面（用戶點擊信中連結後設定新密碼）

## Email 驗證功能（寬鬆策略）

- [x] Schema 加入 emailVerified、verifyToken、verifyTokenExpiresAt 欄位
- [x] db:push 更新資料庫
- [x] email.ts 加入 sendVerificationEmail helper 與 HTML 模板
- [x] member router 加入 verifyEmail procedure（驗證 token）
- [x] member router 加入 resendVerification procedure（重新發送驗證信）
- [x] register 後自動非同步發送驗證信
- [x] 建立 /verify-email 頁面（點擊信中連結後驗證帳號）
- [x] 會員中心顯示驗證狀態提示（未驗證時顯示橙色提示 + 重新發送按鈕）

## 宅配地址欄位改善

- [x] 結帳頁宅配地址拆分為：郵遞區號 + 縣市 + 鄉鎮區 + 詳細地址（門牌號）
- [x] 更新驗證邏輯：四個欄位都必填
- [x] 組合地址傳給後端（縣市 + 鄉鎮區 + 詳細地址）
- [x] 建立物流訂單時傳入 receiverZipCode 欄位
