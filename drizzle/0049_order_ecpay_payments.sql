CREATE TABLE `orderECPayPayments` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `orderId` int NOT NULL,
  `merchantTradeNo` varchar(32) NOT NULL UNIQUE,
  `totalAmount` int NOT NULL,
  `status` enum('pending','failed','paid','duplicate_paid','review_paid') NOT NULL DEFAULT 'pending',
  `tradeNo` varchar(64) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `order_ecpay_payments_order_id_idx` (`orderId`)
);
