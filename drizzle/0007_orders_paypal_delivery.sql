ALTER TABLE `orders` MODIFY COLUMN `paymentMethod` ENUM('credit','atm','paypal') NOT NULL DEFAULT 'credit';
ALTER TABLE `orders` ADD `deliveryRegion` varchar(16) NOT NULL DEFAULT 'domestic';
