ALTER TABLE `orderItems`
  ADD COLUMN `configurationSnapshot` json NULL AFTER `purchaseOptionId`;
