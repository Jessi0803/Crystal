-- 手動 migration；部署前套用。本程式不在 runtime 執行 DDL。
CREATE TABLE `promotions` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `name` varchar(100) NOT NULL,
  `threshold` int NOT NULL,
  `discountAmount` int NOT NULL,
  `maxDiscount` int NULL,
  `startsAt` timestamp NOT NULL,
  `endsAt` timestamp NOT NULL,
  `isActive` boolean NOT NULL DEFAULT false,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
ALTER TABLE `orders` ADD COLUMN `promotion` json NULL;
ALTER TABLE `orders` ADD COLUMN `customQuote` json NULL;
