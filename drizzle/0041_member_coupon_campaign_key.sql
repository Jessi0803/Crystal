-- 週期性優惠券防重複鍵；既有優惠券 campaignKey 為 NULL，不改變現有使用狀態。
ALTER TABLE `memberCoupons`
  ADD COLUMN `campaignKey` varchar(64) NULL AFTER `source`;

CREATE UNIQUE INDEX `member_coupons_campaign_user_unique`
  ON `memberCoupons` (`source`, `campaignKey`, `userId`);
