-- 願いの絵（AI）を使った記録。1日の回数の上限のためだけに使う（願いの言葉・絵は保存しない）
CREATE TABLE IF NOT EXISTS `art_uses` (
	`orbit_id` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `art_uses_orbit_created` ON `art_uses` (`orbit_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `art_uses_created` ON `art_uses` (`created_at`);
