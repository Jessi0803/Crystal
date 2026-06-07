CREATE TABLE IF NOT EXISTS `siteSettings` (
  `key` varchar(64) NOT NULL,
  `value` text NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`)
);
