CREATE TABLE `changes` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`record_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `submission_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `candidates` ADD `education` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `drives` ADD `reporting_time` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `drives` ADD `deadline` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `drives` ADD `help_contact` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `drives` ADD `instructions` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `jobs` ADD `education_rules` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `registrations` ADD `request_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `registrations_request_id_unique` ON `registrations` (`request_id`);