CREATE TABLE `user_activity` (
	`user_key` text PRIMARY KEY NOT NULL,
	`first_seen_at` text NOT NULL,
	`last_seen_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `user_activity_last_seen_idx` ON `user_activity` (`last_seen_at`);--> statement-breakpoint
CREATE TABLE `user_daily_activity` (
	`user_key` text NOT NULL,
	`activity_date` text NOT NULL,
	`first_seen_at` text NOT NULL,
	PRIMARY KEY(`user_key`, `activity_date`)
);
--> statement-breakpoint
CREATE INDEX `user_daily_activity_date_idx` ON `user_daily_activity` (`activity_date`);