import { Router } from "express";
import { searchEvidence } from "../services/vectorStore.js";
import { answerDecisionQuestion } from "../services/llmService.js";
import { getAnalysis } from "../services/analysisPipeline.js";

const router = Router();

// POST /api/chat/:analysisId  { question: "Why was Redis introduced?" }
router.post("/:analysisId", async (req, res) => {
  const { analysisId } = req.params;
  const { question } = req.body;
  if (!question) return res.status(400).json({ error: "question is required" });

  const analysis = await getAnalysis(analysisId);
  if (!analysis) return res.status(404).json({ error: "Analysis not found" });
  if (analysis.status !== "ready") {
    return res.status(409).json({ error: `Analysis is still ${analysis.status} — try again shortly` });
  }

  const evidence = await searchEvidence(analysisId, question, 6);
  const result = await answerDecisionQuestion(question, evidence);

  res.json({
    question,
    answer: result.answer,
    confidence: result.confidence,
    evidence: evidence.map((e) => ({
      sourceType: e.sourceType,
      sourceRef: e.sourceRef,
      date: e.date,
      score: Number(e.score?.toFixed(3)),
      url: e.url,
      snippet: e.text.slice(0, 200),
    })),
  });
});

export default router;
