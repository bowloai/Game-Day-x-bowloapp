import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertGameSchema, insertEndSchema, insertBowlSchema, updateGameSchema, updateEndSchema, updateUserSchema } from "@shared/schema";
import { fromError } from "zod-validation-error";
import { setupAuth, isAuthenticated } from "./auth";
import type { User } from "@shared/schema";

function stripPassword(user: User): Omit<User, 'password'> {
  const { password: _, ...rest } = user;
  return rest;
}

const isAdmin: RequestHandler = async (req: any, res, next) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const user = await storage.getUser(userId);
    if (!user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: "Failed to verify admin status" });
  }
};

// Build ID generated once at server startup — changes on every new deployment
const SERVER_BUILD_ID = Date.now().toString();

export function registerRoutes(
  httpServer: Server,
  app: Express
): Server {
  
  setupAuth(app);

  // Version endpoint — unauthenticated so the client can poll before login too
  app.get("/api/version", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({ buildId: SERVER_BUILD_ID });
  });

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(stripPassword(user));
    } catch (error: any) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.patch('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const updates = updateUserSchema.parse(req.body);
      const user = await storage.updateUser(userId, updates);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(stripPassword(user));
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: fromError(error).toString() });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/auth/data", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      await storage.deleteAllUserGameData(userId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== ADMIN ROUTES ====================
  
  // Get all users (admin only)
  app.get("/api/admin/users", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const query = req.query.q as string;
      const users = query 
        ? await storage.searchUsers(query)
        : await storage.getAllUsers();
      res.json(users.map(stripPassword));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get user details with stats (admin only)
  app.get("/api/admin/users/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const stats = await storage.getUserStats(req.params.id);
      res.json({ ...stripPassword(user), stats });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Suspend user (admin only)
  app.post("/api/admin/users/:id/suspend", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const adminId = req.session.userId;
      const targetId = req.params.id;
      
      // Prevent self-suspension
      if (adminId === targetId) {
        return res.status(400).json({ error: "Cannot suspend yourself" });
      }

      const user = await storage.suspendUser(targetId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Log the action
      await storage.createAuditLog({
        adminId,
        action: "SUSPEND_USER",
        targetUserId: targetId,
        details: `Suspended user ${user.email}`,
      });

      res.json(stripPassword(user));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Activate user (admin only)
  app.post("/api/admin/users/:id/activate", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const adminId = req.session.userId;
      const targetId = req.params.id;

      const user = await storage.activateUser(targetId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Log the action
      await storage.createAuditLog({
        adminId,
        action: "ACTIVATE_USER",
        targetUserId: targetId,
        details: `Activated user ${user.email}`,
      });

      res.json(stripPassword(user));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete user and all their data (admin only)
  app.delete("/api/admin/users/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const adminId = req.session.userId;
      const targetId = req.params.id;

      // Prevent self-deletion
      if (adminId === targetId) {
        return res.status(400).json({ error: "Cannot delete yourself" });
      }

      const user = await storage.getUser(targetId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Log before deletion
      await storage.createAuditLog({
        adminId,
        action: "DELETE_USER",
        targetUserId: targetId,
        details: `Deleted user ${user.email} and all associated data`,
      });

      await storage.deleteUserAndData(targetId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get audit logs (admin only)
  app.get("/api/admin/audit-logs", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await storage.getAuditLogs(limit);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== GAMES ROUTES ====================

  app.post("/api/games", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const game = insertGameSchema.parse({ ...req.body, userId });
      const newGame = await storage.createGame(game);
      res.json(newGame);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: fromError(error).toString() });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/games", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const games = await storage.getGamesByUser(userId);
      res.json(games);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all games with ends and bowls for analysis (optimized) - must come before :id routes
  app.get("/api/games/full", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const games = await storage.getGamesFullByUser(userId);
      res.json(games);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/games/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const game = await storage.getGame(req.params.id);
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }
      if (game.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      res.json(game);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/games/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const game = await storage.getGame(req.params.id);
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }
      if (game.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const updates = updateGameSchema.parse(req.body);
      const updated = await storage.updateGame(req.params.id, updates);
      res.json(updated);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: fromError(error).toString() });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/games/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const game = await storage.getGame(req.params.id);
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }
      if (game.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      await storage.deleteGame(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Ends
  app.post("/api/ends", isAuthenticated, async (req, res) => {
    try {
      const end = insertEndSchema.parse(req.body);
      const newEnd = await storage.createEnd(end);
      res.json(newEnd);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: fromError(error).toString() });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/games/:gameId/ends", isAuthenticated, async (req, res) => {
    try {
      const ends = await storage.getEndsByGame(req.params.gameId);
      res.json(ends);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/ends/:id", isAuthenticated, async (req, res) => {
    try {
      const updates = updateEndSchema.parse(req.body);
      const end = await storage.updateEnd(req.params.id, updates);
      if (!end) {
        return res.status(404).json({ error: "End not found" });
      }
      res.json(end);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: fromError(error).toString() });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Bowls
  app.post("/api/bowls", isAuthenticated, async (req, res) => {
    try {
      const bowl = insertBowlSchema.parse(req.body);
      const newBowl = await storage.createBowl(bowl);
      res.json(newBowl);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: fromError(error).toString() });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/ends/:endId/bowls", isAuthenticated, async (req, res) => {
    try {
      const bowls = await storage.getBowlsByEnd(req.params.endId);
      res.json(bowls);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/bowls/:id", isAuthenticated, async (req, res) => {
    try {
      const updates = insertBowlSchema.partial().parse(req.body);
      const bowl = await storage.updateBowl(req.params.id, updates);
      if (!bowl) {
        return res.status(404).json({ error: "Bowl not found" });
      }
      res.json(bowl);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: fromError(error).toString() });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Composite endpoint: Get game with all ends and bowls (optimized single query)
  app.get("/api/games/:id/full", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const game = await storage.getGameFull(req.params.id);
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }
      if (game.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      res.json(game);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
