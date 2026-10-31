-- 僅新程式建立訂單時明確寫入版本；既有資料維持 NULL，不回填。
ALTER TABLE `orders` ADD COLUMN `promotionFlowVersion` tinyint NULL DEFAULT NULL;
