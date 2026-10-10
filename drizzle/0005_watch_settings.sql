CREATE TABLE watch_settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
-- 見守る準備ができてから、人が再開する。
INSERT INTO watch_settings (key, value, updated_at) VALUES ('paused', '1', unixepoch() * 1000);
