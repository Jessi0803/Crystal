CREATE TABLE IF NOT EXISTS `operationAuditEvents` (
  `id` int AUTO_INCREMENT NOT NULL,
  `source` varchar(32) NOT NULL,
  `category` varchar(32) NOT NULL,
  `action` varchar(96) NOT NULL,
  `outcome` varchar(24) NOT NULL,
  `severity` varchar(16) NOT NULL DEFAULT 'info',
  `orderId` int,
  `merchantTradeNo` varchar(32),
  `actorUserId` int,
  `summary` varchar(255) NOT NULL,
  `details` json,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `operationAuditEvents_id` PRIMARY KEY(`id`),
  INDEX `operation_audit_created_at_idx` (`createdAt`),
  INDEX `operation_audit_order_created_at_idx` (`orderId`, `createdAt`),
  INDEX `operation_audit_merchant_created_at_idx` (`merchantTradeNo`, `createdAt`),
  INDEX `operation_audit_outcome_created_at_idx` (`outcome`, `createdAt`)
);
