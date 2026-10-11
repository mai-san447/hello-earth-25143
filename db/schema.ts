import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

// 削除の回数も共有し、Worker が替わっても連打の上限を守る。
export const watchSettings = sqliteTable("watch_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const wishes = sqliteTable("wishes", {
  userId: text("user_id").notNull(),
  id: text("id").notNull(),
  text: text("text").notNull(),
  status: text("status").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, table => [primaryKey({columns:[table.userId,table.id]})]);

// みんなの星（#22）。はじめて言葉を公開した軌道（端末）にだけ、枝番（25143-0001 の連番）を発行する。
// 名前・IPアドレスなど、持ち主が分かる情報は持たない。
export const orbits = sqliteTable("orbits", {
  id: text("id").primaryKey(),
  number: integer("number").notNull().unique(),
  createdAt: integer("created_at").notNull(),
});

// 翌年の帰還まで星を残すため、願いは400日、帰還後は30日表示する。
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
  returnedAt: integer("returned_at"),
}, table => [
  index("public_stars_status_expires").on(table.status, table.expiresAt),
  // 1日の上限を数えるときに使う
  index("public_stars_orbit_created").on(table.orbitId, table.createdAt),
  index("public_stars_kind_created").on(table.kind, table.createdAt),
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
