CREATE TABLE `orderItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`productId` varchar(64) NOT NULL,
	`productName` varchar(200) NOT NULL,
	`productImage` text,
	`quantity` int NOT NULL,
	`unitPrice` int NOT NULL,
	`subtotal` int NOT NULL,
	CONSTRAINT `orderItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`merchantTradeNo` varchar(32) NOT NULL,
	`tradeNo` varchar(64),
	`paymentStatus` enum('pending','paid','failed','cancelled') NOT NULL DEFAULT 'pending',
	`paymentMethod` enum('credit','cvs') NOT NULL DEFAULT 'credit',
	`totalAmount` int NOT NULL,
	`buyerName` varchar(64) NOT NULL,
	`buyerEmail` varchar(320) NOT NULL,
	`buyerPhone` varchar(20) NOT NULL,
	`cvsStoreId` varchar(20),
	`cvsStoreName` varchar(100),
	`cvsType` varchar(20),
	`shippingAddress` text,
	`ecpayNotifyData` json,
	`paidAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_merchantTradeNo_unique` UNIQUE(`merchantTradeNo`)
);
