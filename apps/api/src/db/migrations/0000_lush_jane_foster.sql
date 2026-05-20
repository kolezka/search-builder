CREATE TABLE `app_config` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `folders` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_folders_deleted` ON `folders` (`deleted_at`);--> statement-breakpoint
CREATE TABLE `queries` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`engine` text NOT NULL,
	`tree` text NOT NULL,
	`folder_id` text,
	`template_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`last_opened_at` integer,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_queries_folder` ON `queries` (`folder_id`);--> statement-breakpoint
CREATE INDEX `idx_queries_engine` ON `queries` (`engine`);--> statement-breakpoint
CREATE INDEX `idx_queries_deleted` ON `queries` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `idx_queries_last_opened` ON `queries` (`last_opened_at`);--> statement-breakpoint
CREATE TABLE `query_tags` (
	`query_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`query_id`, `tag_id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_expires` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);--> statement-breakpoint
CREATE TABLE `templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`engine` text NOT NULL,
	`tree` text NOT NULL,
	`category` text,
	`created_at` integer NOT NULL
);
