ALTER TABLE `users` ADD `emailVerified` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `verifyToken` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `verifyTokenExpiresAt` timestamp;