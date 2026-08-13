import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";

import { connectDB, dbIsConnected } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import repoRoutes from "./routes/repoRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import { isGeminiConfigured } from "./services/embeddingService.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*" }));
app.use(express.json({ limit: "2mb" }));

// Analysis kicks off clones + external API calls, so keep it rate-limited.
const analysisLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
app.use("/api/repos", analysisLimiter);

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    db: dbIsConnected() ? "connected" : "in-memory (no MONGODB_URI set)",
    genai: isGeminiConfigured() ? "gemini" : "offline (local embeddings + extractive answers)",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/repos", repoRoutes);
app.use("/api/chat", chatRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`RepoMind API listening on port ${PORT}`);
    console.log(`GenAI mode: ${isGeminiConfigured() ? "Gemini" : "offline fallback"}`);
  });
}

start();
