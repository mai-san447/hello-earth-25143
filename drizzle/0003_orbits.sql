-- 人の番号（25143-0007）の表。みんなの星（0002）より先に、番号だけを本番で使うために分けた。
-- 0002 と同じ定義で、何度流しても壊れないように IF NOT EXISTS を付ける。
CREATE TABLE IF NOT EXISTS `orbits` (
	`id` text PRIMARY KEY NOT NULL,
	`number` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `orbits_number_unique` ON `orbits` (`number`);
