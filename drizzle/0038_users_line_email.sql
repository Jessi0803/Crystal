-- 記錄 LINE Login 提供的信箱（僅供後台參考，不參與登入與訂單比對）
-- 只新增可為 NULL 的欄位，不影響既有資料；可重複執行。
-- ⚠️ 必須在部署使用此欄位的程式「之前」套用，否則讀取 users 的查詢會失敗。
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `lineEmail` varchar(320) NULL AFTER `loginMethod`;
