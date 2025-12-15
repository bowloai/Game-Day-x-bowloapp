import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  club: varchar("club"),
  isAdmin: boolean("is_admin").notNull().default(false),
  isSuspended: boolean("is_suspended").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Audit log for admin actions
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  targetUserId: varchar("target_user_id"),
  details: text("details"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

export const games = pgTable("games", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  opponent: text("opponent").notNull(),
  venue: text("venue").notNull(),
  surface: text("surface").notNull(),
  rink: text("rink").notNull(),
  type: text("type").notNull(),
  totalEnds: integer("total_ends"),
  gameEndType: text("game_end_type").notNull().default("ends"),
  targetScore: integer("target_score"),
  gameFormat: text("game_format").notNull().default("fours"),
  pairsType: text("pairs_type"),
  bowlsPerEnd: integer("bowls_per_end").notNull().default(2),
  position: text("position"),
  status: text("status").notNull().default("IN_PROGRESS"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  greenSpeed: integer("green_speed"),
  greenComparable: text("green_comparable"),
  mentalFeeling: text("mental_feeling"),
  performanceRating: integer("performance_rating"),
  notes: text("notes"),
  ourMat: boolean("our_mat").notNull().default(true),
});

export const ends = pgTable("ends", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: varchar("game_id").notNull().references(() => games.id, { onDelete: 'cascade' }),
  endNumber: integer("end_number").notNull(),
  jackEffective: boolean("jack_effective"),
  length: text("length").notNull(),
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
  gridRow: integer("grid_row"),
  gridCol: integer("grid_col"),
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

// User update schema
export const updateUserSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  club: z.string().optional(),
});

// Types
export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = typeof games.$inferSelect;
export type InsertEnd = z.infer<typeof insertEndSchema>;
export type End = typeof ends.$inferSelect;
export type InsertBowl = z.infer<typeof insertBowlSchema>;
export type Bowl = typeof bowls.$inferSelect;
