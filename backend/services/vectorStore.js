import mongoose from "mongoose";
import EvidenceChunk from "../models/EvidenceChunk.js";
import { embedText, cosineSimilarity } from "./embeddingService.js";
import { dbIsConnected } from "../config/db.js";

// In-memory fallback so the app still works end-to-end when no MongoDB URI
// is configured (e.g. a quick local demo). Keyed by analysisId string.
const memoryStore = new Map();

export async function addEvidence(analysisId, chunk) {
  const { vector, mode } = await embedText(chunk.text);
  const record = { ...chunk, analysisId, embedding: vector };

  if (dbIsConnected()) {
    await EvidenceChunk.create(record);
  } else {
    const key = analysisId.toString();
    const list = memoryStore.get(key) || [];
    list.push(record);
    memoryStore.set(key, list);
  }
  return mode;
}

export async function addEvidenceBatch(analysisId, chunks, { concurrency = 5 } = {}) {
  let mode = "local-tfidf";
  for (let i = 0; i < chunks.length; i += concurrency) {
    const batch = chunks.slice(i, i + concurrency);
    const modes = await Promise.all(batch.map((c) => addEvidence(analysisId, c)));
    if (modes.includes("gemini")) mode = "gemini";
  }
  return mode;
}

export async function searchEvidence(analysisId, queryText, topK = 6) {
  const { vector: queryVector } = await embedText(queryText);

  let candidates;
  if (dbIsConnected()) {
    candidates = await EvidenceChunk.find({ analysisId }).lean();
  } else {
    candidates = memoryStore.get(analysisId.toString()) || [];
  }

  const scored = candidates
    .map((c) => ({ ...c, score: cosineSimilarity(queryVector, c.embedding) }))
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, topK);
}

export async function clearEvidence(analysisId) {
  if (dbIsConnected()) {
    await EvidenceChunk.deleteMany({ analysisId });
  } else {
    memoryStore.delete(analysisId.toString());
  }
}
