CREATE TABLE `orderBalancePayments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`merchantTradeNo` varchar(32) NOT NULL,
	`amount` int NOT NULL,
	`paymentStatus` enum('pending','paid','failed','cancelled') NOT NULL DEFAULT 'pending',
	`tradeNo` varchar(64),
	`ecpayNotifyData` json,
	`paidAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orderBalancePayments_id` PRIMARY KEY(`id`),
	CONSTRAINT `orderBalancePayments_orderId_unique` UNIQUE(`orderId`),
	CONSTRAINT `orderBalancePayments_merchantTradeNo_unique` UNIQUE(`merchantTradeNo`)
);
--> statement-breakpoint
ALTER TABLE `orders` MODIFY COLUMN `paymentMethod` enum('credit','atm','paypal') NOT NULL DEFAULT 'credit';--> statement-breakpoint
ALTER TABLE `orders` MODIFY COLUMN `orderStatus` enum('pending_payment','deposit_paid','paid','processing','shipped','arrived','completed','cancelled') NOT NULL DEFAULT 'pending_payment';--> statement-breakpoint
ALTER TABLE `orders` ADD `userId` int;--> statement-breakpoint
ALTER TABLE `orders` ADD `deliveryRegion` varchar(16) DEFAULT 'domestic' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `isCustomOrder` boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `order_balance_payments_merchant_trade_no_idx` ON `orderBalancePayments` (`merchantTradeNo`);--> statement-breakpoint
CREATE INDEX `order_items_order_id_idx` ON `orderItems` (`orderId`);--> statement-breakpoint
CREATE INDEX `orders_created_at_idx` ON `orders` (`createdAt`);--> statement-breakpoint
CREATE INDEX `orders_order_status_created_at_idx` ON `orders` (`orderStatus`,`createdAt`);--> statement-breakpoint
CREATE INDEX `orders_payment_status_created_at_idx` ON `orders` (`paymentStatus`,`createdAt`);--> statement-breakpoint
CREATE INDEX `orders_paid_at_idx` ON `orders` (`paidAt`);