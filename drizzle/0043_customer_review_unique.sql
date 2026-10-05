-- 顧客評價防重複：同一個 orderItemId 只能有一則評價。
-- MySQL／TiDB 的 UNIQUE 允許多筆 NULL，後台建立的回饋（orderItemId 為 NULL）不受影響。
-- 套用前請先確認沒有重複值：
--   SELECT orderItemId, COUNT(*) FROM `productReviews`
--   WHERE orderItemId IS NOT NULL GROUP BY orderItemId HAVING COUNT(*) > 1;
ALTER TABLE `productReviews` DROP INDEX `product_reviews_order_item_idx`;
ALTER TABLE `productReviews` ADD UNIQUE KEY `product_reviews_order_item_unique` (`orderItemId`);
