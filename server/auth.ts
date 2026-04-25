import bcrypt from "bcrypt";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { users, games, ends, bowls } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

export function setupAuth(app: Express) {
  const sessionTtl = 365 * 24 * 60 * 60 * 1000; // 1 year
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  app.set("trust proxy", 1);
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "bowlo-session-secret-change-me",
      store: sessionStore,
      resave: true,
      rolling: true,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: sessionTtl,
      },
    })
  );

  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase().trim()));

      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      if (user.isSuspended) {
        return res.status(403).json({ message: "Account is suspended" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      req.session.userId = user.id;
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/reset-all", async (req, res) => {
    const { token } = req.body;
    if (token !== "BOWLO-RESET-2026") {
      return res.status(403).json({ message: "Invalid token" });
    }
    try {
      await db.delete(users);
      res.json({ message: "All data cleared" });
    } catch (error) {
      res.status(500).json({ message: "Reset failed" });
    }
  });

  app.get("/api/check-setup", async (req, res) => {
    const existingUsers = await db.select().from(users).limit(1);
    res.json({ needsSetup: existingUsers.length === 0 });
  });

  app.post("/api/setup", async (req, res) => {
    try {
      const existingUsers = await db.select().from(users).limit(1);
      if (existingUsers.length > 0) {
        return res.status(403).json({ message: "Setup already complete" });
      }
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      const hashedPassword = await bcrypt.hash(password, 12);

      // Check for migration data to carry over existing game history
      // In production the file is copied to dist/, in dev it lives in server/
      const migrationPath = existsSync(join(process.cwd(), "dist", "migration-data.json"))
        ? join(process.cwd(), "dist", "migration-data.json")
        : join(process.cwd(), "server", "migration-data.json");
      const hasMigration = existsSync(migrationPath);
      let migrationUser: { id: string; firstName?: string; lastName?: string; club?: string } | null = null;

      if (hasMigration) {
        const migrationData = JSON.parse(readFileSync(migrationPath, "utf-8"));
        migrationUser = migrationData.users?.[0];

        await db.transaction(async (tx) => {
          // Insert the original user record (preserving ID so game foreign keys work)
          if (migrationUser) {
            await tx.insert(users).values({
              id: migrationUser.id,
              email: email.toLowerCase().trim(),
              password: hashedPassword,
              firstName: migrationUser.firstName,
              lastName: migrationUser.lastName,
              club: migrationUser.club,
              isAdmin: true,
              isSuspended: false,
            });
          }

          for (const g of migrationData.games ?? []) {
            await tx.insert(games).values({
              id: g.id, userId: g.userId, opponent: g.opponent, venue: g.venue,
              surface: g.surface, rink: g.rink, type: g.type, totalEnds: g.totalEnds,
              position: g.position, status: g.status, greenSpeed: g.greenSpeed,
              greenComparable: g.greenComparable, mentalFeeling: g.mentalFeeling,
              performanceRating: g.performanceRating, notes: g.notes,
              gameFormat: g.gameFormat ?? "fours", pairsType: g.pairsType,
              bowlsPerEnd: g.bowlsPerEnd ?? 2, gameEndType: g.gameEndType ?? "ends",
              targetScore: g.targetScore, ourMat: g.ourMat ?? true,
            });
          }

          for (const e of migrationData.ends ?? []) {
            await tx.insert(ends).values({
              id: e.id, gameId: e.gameId, endNumber: e.endNumber,
              jackEffective: e.jackEffective, length: e.length,
              scoreFor: e.scoreFor ?? 0, scoreAgainst: e.scoreAgainst ?? 0,
              isDead: e.isDead ?? false, isCompleted: e.isCompleted ?? false,
            });
          }

          for (const b of migrationData.bowls ?? []) {
            await tx.insert(bowls).values({
              id: b.id, endId: b.endId, bowlNumber: b.bowlNumber,
              hand: b.hand, result: b.result, gridRow: b.gridRow, gridCol: b.gridCol,
              weightDistanceFeet: b.weightDistanceFeet, lineDistanceFeet: b.lineDistanceFeet,
              totalDistanceFeet: b.totalDistanceFeet, locationSource: b.locationSource,
            });
          }
        });

        const [createdUser] = await db.select().from(users).where(eq(users.id, migrationUser!.id));
        req.session.userId = createdUser.id;
        const { password: _, ...userWithoutPassword } = createdUser;
        return res.json({ ...userWithoutPassword, migrated: true, games: migrationData.games?.length ?? 0 });
      }

      // No migration data — create fresh account
      const [user] = await db.insert(users).values({
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        isAdmin: true,
      }).returning();
      req.session.userId = user.id;
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Setup error:", error);
      res.status(500).json({ message: "Setup failed" });
    }
  });

  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email, newPassword, confirmPassword } = req.body;
      if (!email || !newPassword || !confirmPassword) {
        return res.status(400).json({ message: "All fields are required" });
      }
      if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase().trim()));

      if (!user) {
        return res.status(404).json({ message: "No account found with that email address" });
      }

      if (user.isSuspended) {
        return res.status(403).json({ message: "Account is suspended" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await db
        .update(users)
        .set({ password: hashedPassword, updatedAt: new Date() })
        .where(eq(users.id, user.id));

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Password reset failed" });
    }
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out" });
    });
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};
