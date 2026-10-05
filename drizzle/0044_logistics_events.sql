-- 物流事件歷史：每筆綠界物流回呼各存一列，用來在會員中心顯示物流時間軸。
-- 只新增資料表，不修改既有 orders / orderItems / logisticsOrders；可重複執行。
-- 舊訂單沒有事件紀錄時，前台會退回使用 logisticsOrders 原本的狀態與時間欄位。
-- 部署順序：先在正式資料庫套用這支 SQL，再部署 application。
CREATE TABLE IF NOT EXISTS `logisticsEvents` (
  `id` int AUTO_INCREMENT NOT NULL,
  `logisticsOrderId` int NOT NULL,
  `orderId` int NOT NULL,
  `eventKey` varchar(64) NOT NULL,
  `eventKind` enum('status','record_only','synthetic') NOT NULL,
  `normalizedStatus` enum('created','in_transit','arrived','picked_up','returned','failed'),
  `rawCode` varchar(20),
  `message` varchar(255),
  `occurredAt` timestamp NOT NULL,
  `receivedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `rawData` json,
  CONSTRAINT `logisticsEvents_id` PRIMARY KEY(`id`),
  CONSTRAINT `logisticsEvents_eventKey_unique` UNIQUE(`eventKey`),
  INDEX `logistics_events_logistics_occurred_idx` (`logisticsOrderId`, `occurredAt`),
  INDEX `logistics_events_order_occurred_idx` (`orderId`, `occurredAt`)
);
