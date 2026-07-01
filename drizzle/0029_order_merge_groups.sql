CREATE TABLE `orderMergeGroups` (
  `id` int AUTO_INCREMENT NOT NULL,
  `mergeCode` varchar(32) NOT NULL,
  `mainOrderId` int NOT NULL,
  `adminNote` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `orderMergeGroups_id` PRIMARY KEY(`id`),
  CONSTRAINT `orderMergeGroups_mergeCode_unique` UNIQUE(`mergeCode`),
  CONSTRAINT `orderMergeGroups_mainOrderId_unique` UNIQUE(`mainOrderId`)
);
--> statement-breakpoint
CREATE INDEX `order_merge_groups_main_order_id_idx` ON `orderMergeGroups` (`mainOrderId`);
--> statement-breakpoint
CREATE TABLE `orderMergeMembers` (
  `id` int AUTO_INCREMENT NOT NULL,
  `groupId` int NOT NULL,
  `orderId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `orderMergeMembers_id` PRIMARY KEY(`id`),
  CONSTRAINT `orderMergeMembers_orderId_unique` UNIQUE(`orderId`)
);
--> statement-breakpoint
CREATE INDEX `order_merge_members_group_id_idx` ON `orderMergeMembers` (`groupId`);
--> statement-breakpoint
CREATE INDEX `order_merge_members_order_id_idx` ON `orderMergeMembers` (`orderId`);
