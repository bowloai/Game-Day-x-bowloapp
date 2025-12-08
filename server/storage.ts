import { db } from "./db";
import { games, ends, bowls, users, auditLogs, type Game, type InsertGame, type End, type InsertEnd, type Bowl, type InsertBowl, type User, type UpsertUser, type AuditLog, type InsertAuditLog } from "@shared/schema";
import { eq, desc, ilike, or, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<UpsertUser>): Promise<User | undefined>;
  
  // Admin operations
  getAllUsers(): Promise<User[]>;
  searchUsers(query: string): Promise<User[]>;
  suspendUser(id: string): Promise<User | undefined>;
  activateUser(id: string): Promise<User | undefined>;
  deleteUserAndData(id: string): Promise<void>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(limit?: number): Promise<AuditLog[]>;
  getUserStats(userId: string): Promise<{ gameCount: number; bowlCount: number }>;
  
  // Games
  createGame(game: InsertGame): Promise<Game>;
  getGame(id: string): Promise<Game | undefined>;
  getGames(): Promise<Game[]>;
  getGamesByUser(userId: string): Promise<Game[]>;
  updateGame(id: string, updates: Partial<InsertGame>): Promise<Game | undefined>;
  deleteGame(id: string): Promise<void>;
  
  // Ends
  createEnd(end: InsertEnd): Promise<End>;
  getEnd(id: string): Promise<End | undefined>;
  getEndsByGame(gameId: string): Promise<End[]>;
  updateEnd(id: string, updates: Partial<InsertEnd>): Promise<End | undefined>;
  
  // Bowls
  createBowl(bowl: InsertBowl): Promise<Bowl>;
  getBowl(id: string): Promise<Bowl | undefined>;
  getBowlsByEnd(endId: string): Promise<Bowl[]>;
  updateBowl(id: string, updates: Partial<InsertBowl>): Promise<Bowl | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<UpsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  // Admin operations
  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async searchUsers(query: string): Promise<User[]> {
    const searchPattern = `%${query}%`;
    return db.select().from(users).where(
      or(
        ilike(users.email, searchPattern),
        ilike(users.firstName, searchPattern),
        ilike(users.lastName, searchPattern),
        ilike(users.club, searchPattern)
      )
    ).orderBy(desc(users.createdAt));
  }

  async suspendUser(id: string): Promise<User | undefined> {
    const [updated] = await db.update(users)
      .set({ isSuspended: true, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async activateUser(id: string): Promise<User | undefined> {
    const [updated] = await db.update(users)
      .set({ isSuspended: false, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async deleteUserAndData(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await db.insert(auditLogs).values(log).returning();
    return newLog;
  }

  async getAuditLogs(limit: number = 100): Promise<AuditLog[]> {
    return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
  }

  async getUserStats(userId: string): Promise<{ gameCount: number; bowlCount: number }> {
    const userGames = await db.select().from(games).where(eq(games.userId, userId));
    const gameIds = userGames.map(g => g.id);
    
    let bowlCount = 0;
    for (const gameId of gameIds) {
      const gameEnds = await db.select().from(ends).where(eq(ends.gameId, gameId));
      for (const end of gameEnds) {
        const endBowls = await db.select().from(bowls).where(eq(bowls.endId, end.id));
        bowlCount += endBowls.length;
      }
    }
    
    return { gameCount: userGames.length, bowlCount };
  }

  // Games
  async createGame(game: InsertGame): Promise<Game> {
    const [newGame] = await db.insert(games).values(game).returning();
    return newGame;
  }

  async getGame(id: string): Promise<Game | undefined> {
    const [game] = await db.select().from(games).where(eq(games.id, id));
    return game;
  }

  async getGames(): Promise<Game[]> {
    return db.select().from(games).orderBy(desc(games.createdAt));
  }

  async getGamesByUser(userId: string): Promise<Game[]> {
    return db.select().from(games).where(eq(games.userId, userId)).orderBy(desc(games.createdAt));
  }

  async updateGame(id: string, updates: Partial<InsertGame>): Promise<Game | undefined> {
    const [updated] = await db.update(games)
      .set(updates)
      .where(eq(games.id, id))
      .returning();
    return updated;
  }

  async deleteGame(id: string): Promise<void> {
    await db.delete(games).where(eq(games.id, id));
  }

  // Ends
  async createEnd(end: InsertEnd): Promise<End> {
    const [newEnd] = await db.insert(ends).values(end).returning();
    return newEnd;
  }

  async getEnd(id: string): Promise<End | undefined> {
    const [end] = await db.select().from(ends).where(eq(ends.id, id));
    return end;
  }

  async getEndsByGame(gameId: string): Promise<End[]> {
    return db.select().from(ends).where(eq(ends.gameId, gameId));
  }

  async updateEnd(id: string, updates: Partial<InsertEnd>): Promise<End | undefined> {
    const [updated] = await db.update(ends)
      .set(updates)
      .where(eq(ends.id, id))
      .returning();
    return updated;
  }

  // Bowls
  async createBowl(bowl: InsertBowl): Promise<Bowl> {
    const [newBowl] = await db.insert(bowls).values(bowl).returning();
    return newBowl;
  }

  async getBowl(id: string): Promise<Bowl | undefined> {
    const [bowl] = await db.select().from(bowls).where(eq(bowls.id, id));
    return bowl;
  }

  async getBowlsByEnd(endId: string): Promise<Bowl[]> {
    return db.select().from(bowls).where(eq(bowls.endId, endId));
  }

  async updateBowl(id: string, updates: Partial<InsertBowl>): Promise<Bowl | undefined> {
    const [updated] = await db.update(bowls)
      .set(updates)
      .where(eq(bowls.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
