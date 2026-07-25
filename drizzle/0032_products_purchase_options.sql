ALTER TABLE `products` ADD `purchaseOptions` json DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `orderItems` ADD `purchaseOptionId` varchar(64);
