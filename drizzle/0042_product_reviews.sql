-- 商品顧客回饋（第一階段：後台人工建立）
-- 只新增資料表，不修改既有資料表或資料；可重複執行。
-- 部署順序：先在正式資料庫套用這支 SQL，再部署 application。
CREATE TABLE IF NOT EXISTS `productReviews` (
  `id` int AUTO_INCREMENT NOT NULL,
  `productId` varchar(64) NOT NULL,
  `productName` varchar(200) NOT NULL,
  `source` enum('admin','customer') NOT NULL DEFAULT 'admin',
  `userId` int,
  `orderItemId` int,
  `displayName` varchar(50) NOT NULL,
  `rating` tinyint NOT NULL,
  `content` text NOT NULL,
  `images` json DEFAULT NULL,
  `status` enum('pending','published','hidden') NOT NULL DEFAULT 'published',
  `isFeatured` boolean NOT NULL DEFAULT false,
  `sortOrder` int NOT NULL DEFAULT 0,
  `publishedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `productReviews_id` PRIMARY KEY(`id`),
  KEY `product_reviews_product_status_idx` (`productId`, `status`),
  KEY `product_reviews_featured_idx` (`isFeatured`, `status`),
  KEY `product_reviews_order_item_idx` (`orderItemId`)
);
