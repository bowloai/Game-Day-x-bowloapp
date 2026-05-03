import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Serve sw.js and manifest.json with no-cache so browsers always pick up new versions
  app.get("/sw.js", (_req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.sendFile(path.resolve(distPath, "sw.js"));
  });

  app.get("/manifest.json", (_req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.sendFile(path.resolve(distPath, "manifest.json"));
  });

  // Hashed assets (JS/CSS chunks) — long cache, they change filename on rebuild
  app.use("/assets", express.static(path.join(distPath, "assets"), {
    maxAge: "1y",
    immutable: true,
  }));

  // Everything else (icons, fonts, etc.) — short cache
  app.use(express.static(distPath, { maxAge: "1d" }));

  // Always serve index.html with no-cache so the latest HTML (with new asset hashes) is loaded
  app.use("*", (_req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
