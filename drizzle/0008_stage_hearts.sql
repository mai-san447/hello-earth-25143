-- みんなの空（2026-10-12）：「やってみることにした」星と、ハート。
-- doing_at：受け取って、みんなの空に出すことを選んだ時刻（明るい星）
-- hearts：届いたハートの数（星の持ち主にだけ返す）
ALTER TABLE public_stars ADD COLUMN doing_at INTEGER;
ALTER TABLE public_stars ADD COLUMN hearts INTEGER NOT NULL DEFAULT 0;
-- 同じ端末から同じ星へ1日1回を数えるためだけの表。key は「日付・端末・星」のハッシュで、だれが送ったかは残らない。3日で消す
CREATE TABLE IF NOT EXISTS star_hearts (
  key TEXT PRIMARY KEY NOT NULL,
  star_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS star_hearts_created ON star_hearts(created_at);
