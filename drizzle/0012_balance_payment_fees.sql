ALTER TABLE `orderBalancePayments` ADD `shippingFee` int NOT NULL DEFAULT 0;
ALTER TABLE `orderBalancePayments` ADD `paymentFee` int NOT NULL DEFAULT 0;
ALTER TABLE `orderBalancePayments` ADD `totalAmount` int NOT NULL DEFAULT 0;
UPDATE `orderBalancePayments` SET `totalAmount` = `amount` WHERE `totalAmount` = 0;
