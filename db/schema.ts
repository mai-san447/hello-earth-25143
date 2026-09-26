import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const wishes = sqliteTable("wishes", {
  userId: text("user_id").notNull(),
  id: text("id").notNull(),
  text: text("text").notNull(),
  status: text("status").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, table => [primaryKey({columns:[table.userId,table.id]})]);
