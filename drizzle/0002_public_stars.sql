CREATE TABLE IF NOT EXISTS `orbits` (
	`id` text PRIMARY KEY NOT NULL,
	`number` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `orbits_number_unique` ON `orbits` (`number`);--> statement-breakpoint
CREATE TABLE `public_stars` (
	`id` text PRIMARY KEY NOT NULL,
	`orbit_id` text NOT NULL,
	`kind` text NOT NULL,
	`text` text NOT NULL,
	`status` text NOT NULL,
	`reports` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `public_stars_status_expires` ON `public_stars` (`status`,`expires_at`);--> statement-breakpoint
CREATE INDEX `public_stars_orbit_created` ON `public_stars` (`orbit_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `star_reports` (
	`star_id` text NOT NULL,
	`reporter_orbit_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`star_id`, `reporter_orbit_id`)
);
