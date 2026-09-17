-- 會員專屬優惠券 + LINE 官方好友綁定禮
-- 只新增資料表，不修改既有資料表或資料；可重複執行。
CREATE TABLE IF NOT EXISTS `couponTemplates` (
  `id` int AUTO_INCREMENT NOT NULL,
  `name` varchar(100) NOT NULL,
  `discountAmount` int NOT NULL,
  `minOrderAmount` int NOT NULL DEFAULT 0,
  `validityType` enum('days_after_issue','fixed_date') NOT NULL DEFAULT 'days_after_issue',
  `validDays` int,
  `fixedExpiresAt` timestamp NULL,
  `maxPerUser` int NOT NULL DEFAULT 1,
  `isActive` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `couponTemplates_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `memberCoupons` (
  `id` int AUTO_INCREMENT NOT NULL,
  `couponTemplateId` int NOT NULL,
  `userId` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `discountAmount` int NOT NULL,
  `minOrderAmount` int NOT NULL DEFAULT 0,
  `issuedAt` timestamp NOT NULL DEFAULT (now()),
  `expiresAt` timestamp NOT NULL,
  `status` enum('available','reserved','used') NOT NULL DEFAULT 'available',
  `orderId` int,
  `reservedAt` timestamp NULL,
  `usedAt` timestamp NULL,
  `source` varchar(32) NOT NULL,
  `issuedByUserId` int,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `memberCoupons_id` PRIMARY KEY(`id`),
  KEY `member_coupons_user_status_idx` (`userId`, `status`),
  KEY `member_coupons_template_idx` (`couponTemplateId`),
  KEY `member_coupons_order_idx` (`orderId`)
);

CREATE TABLE IF NOT EXISTS `lineFriendRewards` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `lineUserId` varchar(64) NOT NULL,
  `couponTemplateId` int NOT NULL,
  `memberCouponId` int,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `lineFriendRewards_id` PRIMARY KEY(`id`),
  CONSTRAINT `lineFriendRewards_userId_unique` UNIQUE(`userId`),
  CONSTRAINT `lineFriendRewards_lineUserId_unique` UNIQUE(`lineUserId`)
);
