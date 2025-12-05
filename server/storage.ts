import { db } from "./db";
import { games, ends, bowls, type Game, type InsertGame, type End, type InsertEnd, type Bowl, type InsertBowl } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // Games
  createGame(game: InsertGame): Promise<Game>;
  getGame(id: string): Promise<Game | undefined>;
  getGames(): Promise<Game[]>;
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
