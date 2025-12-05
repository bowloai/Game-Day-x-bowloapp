import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const games = pgTable("games", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  opponent: text("opponent").notNull(),
  venue: text("venue").notNull(),
  surface: text("surface").notNull(),
  rink: text("rink").notNull(),
  type: text("type").notNull(),
  totalEnds: integer("total_ends").notNull(),
  position: text("position").notNull(),
  status: text("status").notNull().default("IN_PROGRESS"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const ends = pgTable("ends", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: varchar("game_id").notNull().references(() => games.id, { onDelete: 'cascade' }),
  endNumber: integer("end_number").notNull(),
  jackEffective: boolean("jack_effective"),
  length: integer("length").notNull(),
  scoreFor: integer("score_for").notNull().default(0),
  scoreAgainst: integer("score_against").notNull().default(0),
  isDead: boolean("is_dead").notNull().default(false),
  isCompleted: boolean("is_completed").notNull().default(false),
});

export const bowls = pgTable("bowls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  endId: varchar("end_id").notNull().references(() => ends.id, { onDelete: 'cascade' }),
  bowlNumber: integer("bowl_number").notNull(),
  hand: text("hand").notNull(),
  result: text("result").notNull(),
});

// Insert schemas
export const insertGameSchema = createInsertSchema(games).omit({
  id: true,
  createdAt: true,
});

export const insertEndSchema = createInsertSchema(ends).omit({
  id: true,
});

export const insertBowlSchema = createInsertSchema(bowls).omit({
  id: true,
});

// Update schemas
export const updateGameSchema = insertGameSchema.partial();
export const updateEndSchema = insertEndSchema.partial();

// Types
export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = typeof games.$inferSelect;
export type InsertEnd = z.infer<typeof insertEndSchema>;
export type End = typeof ends.$inferSelect;
export type InsertBowl = z.infer<typeof insertBowlSchema>;
export type Bowl = typeof bowls.$inferSelect;
