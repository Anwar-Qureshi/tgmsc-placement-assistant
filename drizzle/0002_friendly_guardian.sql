ALTER TABLE `candidates` ADD `phone_key` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `candidates_phone_key_idx` ON `candidates` (`phone_key`);--> statement-breakpoint
CREATE INDEX `registrations_drive_status_time_idx` ON `registrations` (`drive_id`,`status`,`created_at`);