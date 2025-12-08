import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertGameSchema, insertEndSchema, insertBowlSchema, updateGameSchema, updateEndSchema, updateUserSchema } from "@shared/schema";
import { fromError } from "zod-validation-error";
import { setupAuth, isAuthenticated } from "./replitAuth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error: any) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Update user profile
  app.patch('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const updates = updateUserSchema.parse(req.body);
      const user = await storage.updateUser(userId, updates);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: fromError(error).toString() });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Games - protected routes
  app.post("/api/games", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const games = await storage.getGamesByUser(userId);
      res.json(games);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/games/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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

  // Composite endpoint: Get game with all ends and bowls
  app.get("/api/games/:id/full", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const game = await storage.getGame(req.params.id);
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }
      if (game.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const gameEnds = await storage.getEndsByGame(req.params.id);
      const endsWithBowls = await Promise.all(
        gameEnds.map(async (end) => {
          const endBowls = await storage.getBowlsByEnd(end.id);
          return { ...end, bowls: endBowls };
        })
      );

      res.json({ ...game, ends: endsWithBowls });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
