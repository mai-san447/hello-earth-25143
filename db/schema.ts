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
