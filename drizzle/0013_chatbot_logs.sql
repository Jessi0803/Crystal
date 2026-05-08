CREATE TABLE `chatbotLogs` (
  `id` int AUTO_INCREMENT NOT NULL,
  `sessionId` varchar(64) NOT NULL,
  `userId` int,
  `customerName` varchar(100),
  `customerEmail` varchar(320),
  `customerQuestion` text NOT NULL,
  `botReply` text NOT NULL,
  `relatedProducts` json,
  `retrievedQuestions` json,
  `pagePath` varchar(255),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `chatbotLogs_id` PRIMARY KEY(`id`)
);

CREATE INDEX `chatbot_logs_created_at_idx` ON `chatbotLogs` (`createdAt`);
CREATE INDEX `chatbot_logs_session_created_at_idx` ON `chatbotLogs` (`sessionId`, `createdAt`);
CREATE INDEX `chatbot_logs_user_created_at_idx` ON `chatbotLogs` (`userId`, `createdAt`);
