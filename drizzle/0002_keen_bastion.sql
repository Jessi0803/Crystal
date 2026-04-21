CREATE TABLE `inventoryLocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` varchar(64) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`sessionToken` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`orderId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inventoryLocks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `logisticsOrders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`logisticsMerchantTradeNo` varchar(32) NOT NULL,
	`allPayLogisticsId` varchar(64),
	`logisticsType` enum('CVS','HOME') NOT NULL,
	`logisticsSubType` varchar(20),
	`logisticsStatus` enum('created','in_transit','arrived','picked_up','returned','failed') NOT NULL DEFAULT 'created',
	`cvsPaymentNo` varchar(64),
	`cvsValidationNo` varchar(64),
	`bookingNote` varchar(64),
	`ecpayLogisticsData` json,
	`arrivedAt` timestamp,
	`pickedUpAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `logisticsOrders_id` PRIMARY KEY(`id`),
	CONSTRAINT `logisticsOrders_orderId_unique` UNIQUE(`orderId`),
	CONSTRAINT `logisticsOrders_logisticsMerchantTradeNo_unique` UNIQUE(`logisticsMerchantTradeNo`)
);
--> statement-breakpoint
CREATE TABLE `productInventory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` varchar(64) NOT NULL,
	`productName` varchar(200) NOT NULL,
	`stock` int NOT NULL DEFAULT -1,
	`allowPreorder` boolean NOT NULL DEFAULT false,
	`preorderNote` varchar(200),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `productInventory_id` PRIMARY KEY(`id`),
	CONSTRAINT `productInventory_productId_unique` UNIQUE(`productId`)
);
--> statement-breakpoint
ALTER TABLE `orders` MODIFY COLUMN `paymentStatus` enum('pending','paid','transfer_pending','confirmed','failed','cancelled') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `orders` MODIFY COLUMN `paymentMethod` enum('credit','atm') NOT NULL DEFAULT 'credit';--> statement-breakpoint
ALTER TABLE `orderItems` ADD `isPreorder` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `shippingMethod` enum('cvs_711','cvs_family','home') DEFAULT 'home' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `orderStatus` enum('pending_payment','paid','processing','shipped','arrived','completed','cancelled') DEFAULT 'pending_payment' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `isPreorder` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `transferLastFive` varchar(5);--> statement-breakpoint
ALTER TABLE `orders` ADD `adminNote` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `confirmedAt` timestamp;