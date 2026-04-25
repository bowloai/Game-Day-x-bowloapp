import type { Express } from "express";
import { db } from "./db";
import { users, games, ends, bowls } from "@shared/schema";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function registerMigrationRoute(app: Express) {
  app.post("/api/migrate-data", async (req, res) => {
    try {
      const existingGames = await db.select().from(games).limit(1);
      if (existingGames.length > 0) {
        return res.status(403).json({ message: "Migration already complete — data exists" });
      }

      const dataPath = join(__dirname, "migration-data.json");
      const data = JSON.parse(readFileSync(dataPath, "utf-8"));

      await db.transaction(async (tx) => {
        for (const u of data.users) {
          await tx.insert(users).values({
            id: u.id,
            email: u.email,
            password: u.password,
            firstName: u.firstName,
            lastName: u.lastName,
            club: u.club,
            isAdmin: u.isAdmin,
            isSuspended: u.isSuspended,
          });
        }

        for (const g of data.games) {
          await tx.insert(games).values({
            id: g.id,
            userId: g.userId,
            opponent: g.opponent,
            venue: g.venue,
            surface: g.surface,
            rink: g.rink,
            type: g.type,
            totalEnds: g.totalEnds,
            position: g.position,
            status: g.status,
            greenSpeed: g.greenSpeed,
            greenComparable: g.greenComparable,
            mentalFeeling: g.mentalFeeling,
            performanceRating: g.performanceRating,
            notes: g.notes,
            gameFormat: g.gameFormat,
            pairsType: g.pairsType,
            bowlsPerEnd: g.bowlsPerEnd ?? 2,
            gameEndType: g.gameEndType ?? "ends",
            targetScore: g.targetScore,
            ourMat: g.ourMat ?? true,
          });
        }

        for (const e of data.ends) {
          await tx.insert(ends).values({
            id: e.id,
            gameId: e.gameId,
            endNumber: e.endNumber,
            jackEffective: e.jackEffective,
            length: e.length,
            scoreFor: e.scoreFor ?? 0,
            scoreAgainst: e.scoreAgainst ?? 0,
            isDead: e.isDead ?? false,
            isCompleted: e.isCompleted ?? false,
          });
        }

        for (const b of data.bowls) {
          await tx.insert(bowls).values({
            id: b.id,
            endId: b.endId,
            bowlNumber: b.bowlNumber,
            hand: b.hand,
            result: b.result,
            gridRow: b.gridRow,
            gridCol: b.gridCol,
            weightDistanceFeet: b.weightDistanceFeet,
            lineDistanceFeet: b.lineDistanceFeet,
            totalDistanceFeet: b.totalDistanceFeet,
            locationSource: b.locationSource,
          });
        }
      });

      res.json({
        message: "Migration complete",
        users: data.users.length,
        games: data.games.length,
        ends: data.ends.length,
        bowls: data.bowls.length,
      });
    } catch (error: any) {
      console.error("Migration error:", error);
      res.status(500).json({ message: "Migration failed", error: error.message });
    }
  });
}
