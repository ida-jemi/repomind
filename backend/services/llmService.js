import axios from "axios";
import { isGeminiConfigured } from "./embeddingService.js";

const GEMINI_URL = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

async function callGemini(prompt, { temperature = 0.3, maxOutputTokens = 1024 } = {}) {
  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const { data } = await axios.post(
    `${GEMINI_URL(model)}?key=${process.env.GEMINI_API_KEY}`,
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature, maxOutputTokens },
    },
    { timeout: 30000 }
  );
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
}

/**
 * Answers a "decision search" question using retrieved evidence chunks.
 * Always returns a confidence + the evidence it used, so the UI can show
 * "why should I trust this answer" — the core Memory Weaver design goal.
 */
export async function answerDecisionQuestion(question, evidenceChunks) {
  if (evidenceChunks.length === 0) {
    return {
      answer: "I couldn't find any commits, PRs, or issues in this repo that relate to that question.",
      confidence: "low",
      evidenceRefs: [],
    };
  }

  const evidenceBlock = evidenceChunks
    .map(
      (c, i) =>
        `[${i + 1}] (${c.sourceType} ${c.sourceRef}, ${c.date ? new Date(c.date).toISOString().slice(0, 10) : "n/a"}) ${c.text.slice(0, 500)}`
    )
    .join("\n\n");

  const refs = evidenceChunks.map((c) => c.sourceRef).filter(Boolean);

  if (isGeminiConfigured()) {
    try {
      const prompt = `You are RepoMind, an assistant that explains WHY decisions were made in a software project, using only the evidence below (git commits, pull requests, and issues). Cite evidence by its [n] index. If the evidence doesn't clearly answer the question, say so honestly and rate your confidence as "low".

Question: ${question}

Evidence:
${evidenceBlock}

Respond in this exact format:
ANSWER: <your answer in 2-4 sentences, citing [n] where relevant>
CONFIDENCE: <high|medium|low>`;

      const text = await callGemini(prompt);
      const answerMatch = text.match(/ANSWER:\s*([\s\S]*?)(?:\nCONFIDENCE:|$)/i);
      const confMatch = text.match(/CONFIDENCE:\s*(high|medium|low)/i);

      return {
        answer: (answerMatch?.[1] || text).trim(),
        confidence: (confMatch?.[1] || "medium").toLowerCase(),
        evidenceRefs: refs,
      };
    } catch (err) {
      console.warn("[llmService] Gemini call failed, falling back to extractive mode:", err.message);
    }
  }

  // Offline / no-API-key fallback: extractive, not generative. We don't
  // invent a narrative — we surface the most relevant evidence verbatim
  // with a clear "low confidence, extractive" label. This keeps the app
  // honest and fully demoable without a paid key.
  const top = evidenceChunks[0];
  return {
    answer:
      `(Offline mode — no GEMINI_API_KEY set, so this is an extractive match rather than a generated explanation.) ` +
      `The most relevant evidence is a ${top.sourceType} ${top.sourceRef ? `(#${top.sourceRef}) ` : ""}` +
      `from ${top.date ? new Date(top.date).toISOString().slice(0, 10) : "an unknown date"}: "${top.text.slice(0, 220)}${top.text.length > 220 ? "..." : ""}"`,
    confidence: "low",
    evidenceRefs: refs,
  };
}

/**
 * Generates the "Repo Biography" — a narrative document describing how the
 * project evolved. Falls back to a templated structural summary (built from
 * computed stats, not invented) when no API key is set.
 */
export async function generateBiography(context) {
  const { repoFullName, stats, contributors, decisionCards, deadFiles } = context;

  if (isGeminiConfigured()) {
    try {
      const prompt = `Write a short "biography" (5-7 paragraphs) of the software project "${repoFullName}", in the style of a documentary narrator describing how a codebase evolved. Base it ONLY on the facts below — do not invent details not supported by them.

Facts:
- Total commits analyzed: ${stats.totalCommits}
- Contributors: ${stats.totalContributors}
- Active period: ${stats.firstCommitDate} to ${stats.lastCommitDate}
- Top contributors: ${contributors.slice(0, 5).map((c) => `${c.name} (${c.commitCount} commits)`).join(", ")}
- Key decisions inferred from history: ${decisionCards.slice(0, 8).map((d) => d.title).join("; ") || "none clearly identified"}
- Files that appear abandoned/stale: ${deadFiles.slice(0, 8).join(", ") || "none flagged"}

Keep it grounded and factual in tone, not flowery.`;
      const text = await callGemini(prompt, { temperature: 0.5, maxOutputTokens: 1500 });
      if (text.trim()) return text.trim();
    } catch (err) {
      console.warn("[llmService] Gemini biography generation failed, falling back to template:", err.message);
    }
  }

  // Templated fallback biography, built purely from computed stats.
  const topNames = contributors.slice(0, 3).map((c) => c.name).join(", ") || "a small group of contributors";
  return [
    `${repoFullName} has been shaped by ${stats.totalContributors} contributors across ${stats.totalCommits} commits analyzed, spanning from ${stats.firstCommitDate?.slice(0, 10)} to ${stats.lastCommitDate?.slice(0, 10)}.`,
    `The most active contributors over this period were ${topNames}, whose combined commit history accounts for the majority of the project's structural changes.`,
    decisionCards.length
      ? `Notable inflection points detected from the commit and PR history include: ${decisionCards.slice(0, 5).map((d) => d.title).join("; ")}.`
      : `No clearly-labeled architectural inflection points were detected from PR/issue titles in the analyzed window — this often means changes were incremental rather than driven by a few large rewrites.`,
    deadFiles.length
      ? `${deadFiles.length} file(s) appear to have gone stale or were removed, including ${deadFiles.slice(0, 5).join(", ")} — candidates for cleanup or documentation of why they were left behind.`
      : `No significantly stale or abandoned files were detected in the analyzed window.`,
    `(Generated in offline mode — set GEMINI_API_KEY for a richer, narrative-style biography.)`,
  ].join("\n\n");
}

/**
 * Turns PR/issue evidence into "decision cards" — the timeline entries that
 * power the strata visualization. When Gemini is configured we ask it to
 * synthesize a short rationale; otherwise we extract candidates using simple
 * keyword heuristics (migrate, replace, remove, switch, deprecate, etc.) so
 * the timeline still populates in offline mode, clearly marked low-confidence.
 */
const DECISION_KEYWORDS = [
  "migrate", "migration", "replace", "remove", "removed", "switch", "switched",
  "deprecate", "deprecated", "rewrite", "refactor", "drop support", "upgrade",
  "breaking change", "redesign",
];

export async function extractDecisionCandidates(pullRequests, issues) {
  const candidates = [...pullRequests, ...issues].filter((item) => {
    const haystack = `${item.title} ${item.body}`.toLowerCase();
    return DECISION_KEYWORDS.some((kw) => haystack.includes(kw));
  });
  return candidates;
}

export async function synthesizeDecisionCard(item, relatedEvidence) {
  const sourceType = item.number && item.mergedAt !== undefined ? "pull_request" : "issue";

  if (isGeminiConfigured()) {
    try {
      const context = relatedEvidence.map((e) => `- ${e.text.slice(0, 200)}`).join("\n");
      const prompt = `Given this PR/issue title and body, plus related context, write ONE sentence explaining what decision was made and, if evident, why. Be concise and factual — do not speculate beyond the evidence. If no "why" is evident, only state the "what".

Title: ${item.title}
Body: ${(item.body || "").slice(0, 800)}
Related context:
${context || "(none)"}

One-sentence explanation:`;
      const text = await callGemini(prompt, { temperature: 0.2, maxOutputTokens: 200 });
      return {
        title: item.title,
        narrative: text.trim() || item.title,
        confidence: context ? "high" : "medium",
        date: item.mergedAt || item.createdAt,
        evidenceRefs: [String(item.number)],
        tags: [sourceType],
      };
    } catch (err) {
      console.warn("[llmService] Gemini decision synthesis failed, using extractive fallback:", err.message);
    }
  }

  return {
    title: item.title,
    narrative: `(Extractive, offline mode) ${item.title}`,
    confidence: "low",
    date: item.mergedAt || item.createdAt,
    evidenceRefs: [String(item.number)],
    tags: [sourceType],
  };
}
