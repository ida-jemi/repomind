import axios from "axios";

const GEMINI_EMBED_URL = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent`;

const LOCAL_DIM = 256;
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "to", "of",
  "in", "on", "for", "with", "this", "that", "it", "as", "at", "by", "from",
]);

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

/** Simple deterministic hash -> [0, LOCAL_DIM) bucket, for the hashing trick. */
function bucketFor(token) {
  let h = 0;
  for (let i = 0; i < token.length; i++) {
    h = (h * 31 + token.charCodeAt(i)) >>> 0;
  }
  return h % LOCAL_DIM;
}

function tokenize(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

/** Local, no-API-key fallback: hashed bag-of-words, L2-normalized. */
function localEmbedding(text) {
  const vec = new Array(LOCAL_DIM).fill(0);
  const tokens = tokenize(text);
  for (const t of tokens) {
    vec[bucketFor(t)] += 1;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

async function geminiEmbedding(text) {
  const model = process.env.GEMINI_EMBEDDING_MODEL || "text-embedding-004";
  const { data } = await axios.post(
    `${GEMINI_EMBED_URL(model)}?key=${process.env.GEMINI_API_KEY}`,
    { content: { parts: [{ text: text.slice(0, 8000) }] } },
    { timeout: 15000 }
  );
  return data.embedding.values;
}

/**
 * Returns { vector, mode } where mode is "gemini" or "local-tfidf" so callers
 * (and the UI) can be transparent about which pipeline produced a given
 * answer — an evidence-cited answer should say how it found its evidence.
 */
export async function embedText(text) {
  if (isGeminiConfigured()) {
    try {
      const vector = await geminiEmbedding(text);
      return { vector, mode: "gemini" };
    } catch (err) {
      console.warn("[embeddingService] Gemini embedding failed, falling back to local:", err.message);
    }
  }
  return { vector: localEmbedding(text), mode: "local-tfidf" };
}

export function cosineSimilarity(a, b) {
  const len = Math.min(a.length, b.length);
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
