import { Router } from "express";
import { optionalAuth } from "../middleware/auth.js";
import { runAnalysis, getAnalysis, listAnalyses } from "../services/analysisPipeline.js";

const router = Router();

// Kicks off a full analysis. For a production deployment this should enqueue
// a background job and return immediately with status "pending" — here we
// await it directly to keep the reference implementation simple; the
// `status` field is already shaped for polling if you wire up a queue later.
router.post("/", optionalAuth, async (req, res) => {
  const { repoUrl } = req.body;
  if (!repoUrl) return res.status(400).json({ error: "repoUrl is required" });

  try {
    const analysis = await runAnalysis(repoUrl, req.userId);
    res.status(201).json({ analysis });
  } catch (err) {
    res.status(422).json({ error: err.message });
  }
});

router.get("/", optionalAuth, async (req, res) => {
  const analyses = await listAnalyses(req.userId);
  res.json({ analyses });
});

router.get("/:id", async (req, res) => {
  const analysis = await getAnalysis(req.params.id);
  if (!analysis) return res.status(404).json({ error: "Analysis not found" });
  res.json({ analysis });
});

export default router;
