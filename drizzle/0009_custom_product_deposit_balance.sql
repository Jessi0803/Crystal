ALTER TABLE `orders` MODIFY COLUMN `orderStatus` enum('pending_payment','deposit_paid','paid','processing','shipped','arrived','completed','cancelled') NOT NULL DEFAULT 'pending_payment';
ALTER TABLE `orders` ADD `isCustomOrder` boolean NOT NULL DEFAULT false;

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
CREATE INDEX `order_balance_payments_merchant_trade_no_idx` ON `orderBalancePayments` (`merchantTradeNo`);
