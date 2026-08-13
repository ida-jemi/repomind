import {
  parseRepoUrl,
  getRepoMetadata,
  getPullRequests,
  getIssues,
  getReadme,
} from "./githubService.js";
import { cloneRepo, cleanupClone, analyzeHistory, listTrackedFiles } from "./gitAnalyzer.js";
import { computeInfluenceScores } from "./influenceScorer.js";
import { buildFileGraph, findForgottenModules } from "./coChangeGraph.js";
import { addEvidenceBatch, clearEvidence } from "./vectorStore.js";
import { extractDecisionCandidates, synthesizeDecisionCard, generateBiography } from "./llmService.js";
import RepoAnalysis from "../models/RepoAnalysis.js";
import { dbIsConnected } from "../config/db.js";

// In-memory analyses store, used when MongoDB isn't configured, keyed by a
// generated string id so the API shape stays identical either way.
const memoryAnalyses = new Map();
let memoryIdCounter = 1;

async function saveAnalysis(doc) {
  if (dbIsConnected()) {
    return RepoAnalysis.create(doc);
  }
  const id = `mem_${memoryIdCounter++}`;
  const record = { _id: id, ...doc, createdAt: new Date(), updatedAt: new Date() };
  memoryAnalyses.set(id, record);
  return record;
}

async function updateAnalysis(id, patch) {
  if (dbIsConnected()) {
    return RepoAnalysis.findByIdAndUpdate(id, patch, { new: true });
  }
  const record = memoryAnalyses.get(id.toString());
  if (!record) return null;
  Object.assign(record, patch, { updatedAt: new Date() });
  return record;
}

export async function getAnalysis(id) {
  if (dbIsConnected()) return RepoAnalysis.findById(id);
  return memoryAnalyses.get(id.toString()) || null;
}

export async function listAnalyses(userId) {
  if (dbIsConnected()) {
    return RepoAnalysis.find({ owner: userId }).sort({ createdAt: -1 });
  }
  return [...memoryAnalyses.values()]
    .filter((a) => !userId || String(a.owner) === String(userId))
    .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Runs the full pipeline. This is intentionally synchronous/awaited from the
 * route for simplicity — for large repos in production you'd move this to a
 * background job queue (BullMQ, etc.) and poll `status`. The `status` field
 * on the record is already designed for that.
 */
export async function runAnalysis(repoUrl, userId) {
  const { owner, repo } = parseRepoUrl(repoUrl);

  let record = await saveAnalysis({
    owner: userId || undefined,
    repoUrl,
    repoFullName: `${owner}/${repo}`,
    status: "cloning",
  });
  const analysisId = record._id;

  let cloneDir;
  try {
    // Clone URL can always be constructed directly — don't make the whole
    // pipeline depend on the GitHub API metadata call succeeding (it's
    // rate-limited to 60/hr without a token, and shouldn't be a hard
    // dependency for something as basic as "clone this repo").
    cloneDir = await cloneRepo(`https://github.com/${owner}/${repo}.git`);
    const meta = await getRepoMetadata(owner, repo).catch((err) => {
      console.warn(`[analysisPipeline] metadata fetch failed, continuing with defaults: ${err.message}`);
      return { language: null, topics: [], createdAt: null };
    });

    record = await updateAnalysis(analysisId, { status: "analyzing" });

    const [{ commits, fileStats, contributorStats }, trackedFiles, pullRequests, issues, readme] =
      await Promise.all([
        analyzeHistory(cloneDir),
        listTrackedFiles(cloneDir),
        getPullRequests(owner, repo).catch(() => []),
        getIssues(owner, repo).catch(() => []),
        getReadme(owner, repo).catch(() => ""),
      ]);

    const contributors = computeInfluenceScores(contributorStats);
    const fileGraph = buildFileGraph(fileStats, trackedFiles);
    const forgotten = findForgottenModules(fileGraph);

    const stats = {
      totalCommits: commits.length,
      totalContributors: contributors.length,
      firstCommitDate: commits.length ? commits[commits.length - 1].date : null,
      lastCommitDate: commits.length ? commits[0].date : null,
      totalFiles: trackedFiles.length,
    };

    // --- RAG indexing: embed commits, PR bodies, issue threads, README ---
    record = await updateAnalysis(analysisId, { status: "embedding" });
    await clearEvidence(analysisId);

    const evidenceChunks = [
      ...commits
        .filter((c) => c.subject && c.subject.length > 10)
        .map((c) => ({
          sourceType: "commit",
          sourceRef: c.hash.slice(0, 7),
          author: c.author,
          date: c.date,
          text: c.subject,
        })),
      ...pullRequests.map((pr) => ({
        sourceType: "pull_request",
        sourceRef: String(pr.number),
        author: pr.author,
        date: pr.mergedAt || pr.createdAt,
        text: `${pr.title}\n${pr.body}`.slice(0, 2000),
        url: pr.url,
      })),
      ...issues.map((issue) => ({
        sourceType: "issue",
        sourceRef: String(issue.number),
        author: issue.author,
        date: issue.createdAt,
        text: `${issue.title}\n${issue.body}`.slice(0, 2000),
        url: issue.url,
      })),
      ...(readme
        ? [{ sourceType: "readme", sourceRef: "README", author: null, date: meta.createdAt, text: readme.slice(0, 4000) }]
        : []),
    ];

    const embeddingMode = await addEvidenceBatch(analysisId, evidenceChunks);

    // --- Decision cards: extract candidates, synthesize narratives ---
    const candidates = await extractDecisionCandidates(pullRequests, issues);
    const decisionCards = [];
    for (const item of candidates.slice(0, 20)) {
      const card = await synthesizeDecisionCard(item, []);
      decisionCards.push(card);
    }
    decisionCards.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    const deadFiles = forgotten.map((f) => f.path);

    // --- Repo biography ---
    const biography = await generateBiography({
      repoFullName: `${owner}/${repo}`,
      stats,
      contributors,
      decisionCards,
      deadFiles,
    });

    const techStack = [meta.language, ...(meta.topics || [])].filter(Boolean);

    record = await updateAnalysis(analysisId, {
      status: "ready",
      stats,
      contributors,
      fileGraph,
      deadFiles,
      decisionCards,
      biography,
      techStack,
      embeddingMode,
    });

    return record;
  } catch (err) {
    await updateAnalysis(analysisId, { status: "failed", error: err.message });
    throw err;
  } finally {
    if (cloneDir) await cleanupClone(cloneDir);
  }
}
