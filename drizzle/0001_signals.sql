CREATE TABLE `signals` (
	`id` text PRIMARY KEY NOT NULL,
	`orbit_id` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `signals_orbit_created` ON `signals` (`orbit_id`,`created_at`);