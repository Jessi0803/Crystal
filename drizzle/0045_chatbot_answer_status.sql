-- AI 客服回答品質分類。欄位保持 nullable，既有紀錄顯示為「未分類」，不回填猜測結果。
-- 新對話會保存命中知識與分數、是否使用備援，以及可供管理員篩選的判定狀態。
ALTER TABLE `chatbotLogs`
  ADD COLUMN `retrievedKnowledge` json,
  ADD COLUMN `answerStatus` enum('complete','low_confidence','knowledge_gap','handoff'),
  ADD COLUMN `answerStatusReason` varchar(255),
  ADD COLUMN `topKnowledgeScore` decimal(5,4),
  ADD COLUMN `usedFallback` boolean;

CREATE INDEX `chatbot_logs_answer_status_created_at_idx`
  ON `chatbotLogs` (`answerStatus`, `createdAt`);
