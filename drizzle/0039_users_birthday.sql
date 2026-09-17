-- 會員生日（年份選填）；未來生日禮優惠券由管理員依生日月份手動發放
-- 只新增可為 NULL 的欄位，不影響既有資料；可重複執行。
-- ⚠️ 必須在部署使用這些欄位的程式「之前」套用，否則讀取 users 的查詢會失敗。
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `birthYear` smallint NULL AFTER `lineEmail`;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `birthMonth` tinyint NULL AFTER `birthYear`;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `birthDay` tinyint NULL AFTER `birthMonth`;
