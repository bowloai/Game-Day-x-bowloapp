import { db } from "./db";
import { games, ends, bowls, users, auditLogs, sessions, type Game, type InsertGame, type End, type InsertEnd, type Bowl, type InsertBowl, type User, type UpsertUser, type AuditLog, type InsertAuditLog } from "@shared/schema";
import { eq, desc, ilike, or, sql, inArray, gte } from "drizzle-orm";

function calculateBowlDistances(gridRow: number | null | undefined, gridCol: number | null | undefined) {
  if (gridRow == null || gridCol == null) {
    return {
      weightDistanceFeet: null,
      lineDistanceFeet: null,
      totalDistanceFeet: null,
      locationSource: null,
    };
  }
  const weightDistance = Math.abs(gridRow - 4);
  const lineDistance = Math.abs(gridCol - 4);
  const totalDistance = Math.sqrt(Math.pow(gridRow - 4, 2) + Math.pow(gridCol - 4, 2));
  return {
    weightDistanceFeet: weightDistance,
    lineDistanceFeet: lineDistance,
    totalDistanceFeet: totalDistance,
    locationSource: 'exact' as const,
  };
}

export type GameWithEndsAndBowls = Game & {
  ends: (End & { bowls: Bowl[] })[];
};

export type AdminUserWithStats = User & {
  gameCount: number;
  bowlCount: number;
  lastGameAt: Date | null;
};

export type AdminAnalytics = {
  periodDays: number;
  totals: {
    users: number;
    completedGames: number;
    inProgressGames: number;
    bowls: number;
    activeUsers: number;
  };
  trends: Array<{ date: string; signups: number; games: number }>;
  gameTypes: Array<{ label: string; count: number }>;
  gameFormats: Array<{ label: string; count: number }>;
  playCategories: Array<{ label: string; count: number }>;
};

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<UpsertUser>): Promise<User | undefined>;
  
  // Admin operations
  getAllUsers(): Promise<User[]>;
  searchUsers(query: string): Promise<User[]>;
  suspendUser(id: string): Promise<User | undefined>;
  revokeUserSessions(id: string): Promise<void>;
  activateUser(id: string): Promise<User | undefined>;
  deleteUserAndData(id: string): Promise<void>;
  deleteAllUserGameData(userId: string): Promise<void>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(limit?: number): Promise<AuditLog[]>;
  getUserStats(userId: string): Promise<{ gameCount: number; bowlCount: number }>;
  getUsersWithStats(query?: string): Promise<AdminUserWithStats[]>;
  getAdminAnalytics(periodDays: number): Promise<AdminAnalytics>;
  
  // Games
  createGame(game: InsertGame): Promise<Game>;
  getGame(id: string): Promise<Game | undefined>;
  getGameFull(id: string): Promise<GameWithEndsAndBowls | undefined>;
  getGames(): Promise<Game[]>;
  getGamesByUser(userId: string): Promise<Game[]>;
  getGamesFullByUser(userId: string): Promise<GameWithEndsAndBowls[]>;
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

  async revokeUserSessions(id: string): Promise<void> {
    await db.delete(sessions).where(sql`${sessions.sess}->>'userId' = ${id}`);
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

  async deleteAllUserGameData(userId: string): Promise<void> {
    // Delete all games for a user (ends and bowls will cascade)
    await db.delete(games).where(eq(games.userId, userId));
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await db.insert(auditLogs).values(log).returning();
    return newLog;
  }

  async getAuditLogs(limit: number = 100): Promise<AuditLog[]> {
    return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
  }

  async getUserStats(userId: string): Promise<{ gameCount: number; bowlCount: number }> {
    const result = await db
      .select({
        gameCount: sql<number>`count(distinct ${games.id})::int`,
        bowlCount: sql<number>`count(${bowls.id})::int`,
      })
      .from(games)
      .leftJoin(ends, eq(ends.gameId, games.id))
      .leftJoin(bowls, eq(bowls.endId, ends.id))
      .where(eq(games.userId, userId));
    
    return { 
      gameCount: result[0]?.gameCount ?? 0, 
      bowlCount: result[0]?.bowlCount ?? 0 
    };
  }

  async getUsersWithStats(query?: string): Promise<AdminUserWithStats[]> {
    const searchPattern = query ? `%${query}%` : undefined;
    const rows = await db
      .select({
        user: users,
        gameCount: sql<number>`count(distinct ${games.id})::int`,
        bowlCount: sql<number>`count(distinct ${bowls.id})::int`,
        lastGameAt: sql<Date | null>`max(${games.createdAt})`,
      })
      .from(users)
      .leftJoin(games, eq(games.userId, users.id))
      .leftJoin(ends, eq(ends.gameId, games.id))
      .leftJoin(bowls, eq(bowls.endId, ends.id))
      .where(searchPattern ? or(
        ilike(users.email, searchPattern),
        ilike(users.firstName, searchPattern),
        ilike(users.lastName, searchPattern),
        ilike(users.club, searchPattern),
      ) : undefined)
      .groupBy(users.id)
      .orderBy(desc(users.createdAt));

    return rows.map(({ user, gameCount, bowlCount, lastGameAt }) => ({
      ...user,
      gameCount,
      bowlCount,
      lastGameAt,
    }));
  }

  async getAdminAnalytics(periodDays: number): Promise<AdminAnalytics> {
    const cutoff = new Date();
    cutoff.setUTCHours(0, 0, 0, 0);
    cutoff.setUTCDate(cutoff.getUTCDate() - periodDays + 1);

    const [userTotals, gameTotals, bowlTotals, activeTotals, signupRows, gameRows, typeRows, formatRows, categoryRows] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(users),
      db.select({
        completed: sql<number>`count(*) filter (where ${games.status} = 'COMPLETED')::int`,
        inProgress: sql<number>`count(*) filter (where ${games.status} = 'IN_PROGRESS')::int`,
      }).from(games),
      db.select({ count: sql<number>`count(*)::int` }).from(bowls),
      db.select({ count: sql<number>`count(distinct ${games.userId})::int` })
        .from(games)
        .where(gte(games.createdAt, cutoff)),
      db.select({
        date: sql<string>`to_char(date_trunc('day', ${users.createdAt}), 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      }).from(users).where(gte(users.createdAt, cutoff)).groupBy(sql`date_trunc('day', ${users.createdAt})`),
      db.select({
        date: sql<string>`to_char(date_trunc('day', ${games.createdAt}), 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      }).from(games).where(gte(games.createdAt, cutoff)).groupBy(sql`date_trunc('day', ${games.createdAt})`),
      db.select({
        label: sql<string>`lower(coalesce(${games.type}, 'unknown'))`,
        count: sql<number>`count(*)::int`,
      }).from(games).groupBy(sql`lower(coalesce(${games.type}, 'unknown'))`).orderBy(desc(sql`count(*)`)),
      db.select({
        label: sql<string>`lower(coalesce(${games.gameFormat}, 'unknown'))`,
        count: sql<number>`count(*)::int`,
      }).from(games).groupBy(sql`lower(coalesce(${games.gameFormat}, 'unknown'))`).orderBy(desc(sql`count(*)`)),
      db.select({
        label: sql<string>`case when lower(coalesce(${games.type}, '')) = 'practice' or lower(coalesce(${games.category}, '')) = 'practice' then 'Practice' else 'Competitive' end`,
        count: sql<number>`count(*)::int`,
      }).from(games).groupBy(sql`case when lower(coalesce(${games.type}, '')) = 'practice' or lower(coalesce(${games.category}, '')) = 'practice' then 'Practice' else 'Competitive' end`),
    ]);

    const signups = new Map(signupRows.map(row => [row.date, row.count]));
    const gamesByDay = new Map(gameRows.map(row => [row.date, row.count]));
    const trends = Array.from({ length: periodDays }, (_, index) => {
      const date = new Date(cutoff);
      date.setUTCDate(cutoff.getUTCDate() + index);
      const key = date.toISOString().slice(0, 10);
      return { date: key, signups: signups.get(key) ?? 0, games: gamesByDay.get(key) ?? 0 };
    });

    return {
      periodDays,
      totals: {
        users: userTotals[0]?.count ?? 0,
        completedGames: gameTotals[0]?.completed ?? 0,
        inProgressGames: gameTotals[0]?.inProgress ?? 0,
        bowls: bowlTotals[0]?.count ?? 0,
        activeUsers: activeTotals[0]?.count ?? 0,
      },
      trends,
      gameTypes: typeRows.map(row => ({ label: row.label || "Unknown", count: row.count })),
      gameFormats: formatRows.map(row => ({ label: row.label || "Unknown", count: row.count })),
      playCategories: categoryRows.map(row => ({ label: row.label, count: row.count })),
    };
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

  async getGameFull(id: string): Promise<GameWithEndsAndBowls | undefined> {
    const [game] = await db.select().from(games).where(eq(games.id, id));
    if (!game) return undefined;

    const gameEnds = await db.select().from(ends).where(eq(ends.gameId, id));
    if (gameEnds.length === 0) {
      return { ...game, ends: [] };
    }

    const endIds = gameEnds.map(e => e.id);
    const allBowls = await db.select().from(bowls).where(inArray(bowls.endId, endIds));

    const bowlsByEndId = new Map<string, Bowl[]>();
    for (const bowl of allBowls) {
      if (!bowlsByEndId.has(bowl.endId)) {
        bowlsByEndId.set(bowl.endId, []);
      }
      bowlsByEndId.get(bowl.endId)!.push(bowl);
    }

    const endsWithBowls = gameEnds.map(end => ({
      ...end,
      bowls: bowlsByEndId.get(end.id) ?? [],
    }));

    return { ...game, ends: endsWithBowls };
  }

  async getGames(): Promise<Game[]> {
    return db.select().from(games).orderBy(desc(games.createdAt));
  }

  async getGamesByUser(userId: string): Promise<Game[]> {
    return db.select().from(games).where(eq(games.userId, userId)).orderBy(desc(games.createdAt));
  }

  async getGamesFullByUser(userId: string): Promise<GameWithEndsAndBowls[]> {
    const userGames = await db.select().from(games).where(eq(games.userId, userId)).orderBy(desc(games.createdAt));
    if (userGames.length === 0) {
      return [];
    }

    const gameIds = userGames.map(g => g.id);
    const allEnds = await db.select().from(ends).where(inArray(ends.gameId, gameIds));
    
    if (allEnds.length === 0) {
      return userGames.map(game => ({ ...game, ends: [] }));
    }

    const endIds = allEnds.map(e => e.id);
    const allBowls = await db.select().from(bowls).where(inArray(bowls.endId, endIds));

    const bowlsByEndId = new Map<string, Bowl[]>();
    for (const bowl of allBowls) {
      if (!bowlsByEndId.has(bowl.endId)) {
        bowlsByEndId.set(bowl.endId, []);
      }
      bowlsByEndId.get(bowl.endId)!.push(bowl);
    }

    const endsByGameId = new Map<string, (End & { bowls: Bowl[] })[]>();
    for (const end of allEnds) {
      if (!endsByGameId.has(end.gameId)) {
        endsByGameId.set(end.gameId, []);
      }
      endsByGameId.get(end.gameId)!.push({
        ...end,
        bowls: bowlsByEndId.get(end.id) ?? [],
      });
    }

    return userGames.map(game => ({
      ...game,
      ends: endsByGameId.get(game.id) ?? [],
    }));
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
    const distances = calculateBowlDistances(bowl.gridRow, bowl.gridCol);
    const [newBowl] = await db.insert(bowls).values({
      ...bowl,
      ...distances,
    }).returning();
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
    let finalUpdates: any = { ...updates };
    if (updates.gridRow !== undefined || updates.gridCol !== undefined) {
      const existing = await this.getBowl(id);
      const newGridRow = updates.gridRow ?? existing?.gridRow;
      const newGridCol = updates.gridCol ?? existing?.gridCol;
      const distances = calculateBowlDistances(newGridRow, newGridCol);
      finalUpdates = { ...finalUpdates, ...distances };
    }
    const [updated] = await db.update(bowls)
      .set(finalUpdates)
      .where(eq(bowls.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
