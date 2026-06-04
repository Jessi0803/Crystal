CREATE TABLE `chatbotKnowledge` (
  `id` varchar(128) NOT NULL,
  `sourceType` varchar(32) NOT NULL,
  `sourceId` varchar(64) NOT NULL,
  `question` text NOT NULL,
  `answer` text NOT NULL,
  `embedText` text NOT NULL,
  `keywords` json,
  `category` varchar(64) NOT NULL,
  `relatedProductIds` json,
  `vector` json,
  `active` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `chatbotKnowledge_id` PRIMARY KEY(`id`)
);

CREATE INDEX `chatbot_knowledge_source_idx` ON `chatbotKnowledge` (`sourceType`, `sourceId`);
CREATE INDEX `chatbot_knowledge_active_idx` ON `chatbotKnowledge` (`active`);
