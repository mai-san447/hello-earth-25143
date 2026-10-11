import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const wishes = sqliteTable("wishes", {
  userId: text("user_id").notNull(),
  id: text("id").notNull(),
  text: text("text").notNull(),
  status: text("status").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, table => [primaryKey({columns:[table.userId,table.id]})]);

// 応援の信号。願いの持ち主の端末が作った軌道ID（ランダムなUUID）に、届いた時刻だけを記録する。
// 名前・言葉・IPアドレスなど、送った人が分かる情報は持たない。
export const signals = sqliteTable("signals", {
  id: text("id").primaryKey(),
  orbitId: text("orbit_id").notNull(),
  createdAt: integer("created_at").notNull(),
}, table => [index("signals_orbit_created").on(table.orbitId, table.createdAt)]);

// みんなの星（#22）。はじめて言葉を公開した軌道（端末）にだけ、枝番（25143-0001 の連番）を発行する。
// 名前・IPアドレスなど、持ち主が分かる情報は持たない。
export const orbits = sqliteTable("orbits", {
  id: text("id").primaryKey(),
  number: integer("number").notNull().unique(),
  createdAt: integer("created_at").notNull(),
});

// 公開された言葉。kind は wish（願い・30日）か fulfilled（叶ったよ・24時間）。
// status は visible（表示中）／held（保留・人が確認）／hidden（非表示）。
export const publicStars = sqliteTable("public_stars", {
  id: text("id").primaryKey(),
  orbitId: text("orbit_id").notNull(),
  kind: text("kind").notNull(),
  text: text("text").notNull(),
  status: text("status").notNull(),
  reports: integer("reports").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
}, table => [
  index("public_stars_status_expires").on(table.status, table.expiresAt),
  // 1日の上限を数えるときに使う
  index("public_stars_orbit_created").on(table.orbitId, table.createdAt),
]);

// 通報。同じ端末（軌道ID）から同じ星への通報は1回だけ数える
export const starReports = sqliteTable("star_reports", {
  starId: text("star_id").notNull(),
  reporterOrbitId: text("reporter_orbit_id").notNull(),
  createdAt: integer("created_at").notNull(),
}, table => [primaryKey({columns:[table.starId,table.reporterOrbitId]})]);

// 願いの絵（AI）を使った記録。1日の回数の上限のためだけに使う。願いの言葉・絵は保存しない
export const artUses = sqliteTable("art_uses", {
  orbitId: text("orbit_id").notNull(),
  createdAt: integer("created_at").notNull(),
}, table => [
  index("art_uses_orbit_created").on(table.orbitId, table.createdAt),
  index("art_uses_created").on(table.createdAt),
]);
