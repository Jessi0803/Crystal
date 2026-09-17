-- LINE 名稱與大頭貼（僅供後台辨識會員，LINE 登入或綁定時更新）
-- 只新增可為 NULL 的欄位，不影響既有資料；可重複執行。
-- ⚠️ 必須在部署使用這些欄位的程式「之前」套用，否則讀取 users 的查詢會失敗。
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `lineDisplayName` varchar(100) NULL AFTER `lineEmail`;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `linePictureUrl` varchar(1024) NULL AFTER `lineDisplayName`;
