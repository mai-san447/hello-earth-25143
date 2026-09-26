CREATE TABLE `wishes` (
	`user_id` text NOT NULL,
	`id` text NOT NULL,
	`text` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `id`)
);
