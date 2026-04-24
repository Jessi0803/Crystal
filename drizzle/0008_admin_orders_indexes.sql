CREATE INDEX `orders_created_at_idx` ON `orders` (`createdAt`);
CREATE INDEX `orders_order_status_created_at_idx` ON `orders` (`orderStatus`,`createdAt`);
CREATE INDEX `orders_payment_status_created_at_idx` ON `orders` (`paymentStatus`,`createdAt`);
CREATE INDEX `orders_paid_at_idx` ON `orders` (`paidAt`);
CREATE INDEX `order_items_order_id_idx` ON `orderItems` (`orderId`);
