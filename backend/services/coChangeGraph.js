/**
 * Turns the raw per-file co-change map from gitAnalyzer into a ranked list
 * with a "gravity" score (sum of co-change edge weights — files that
 * habitually move together in the same commits have high gravity, which is
 * a good proxy for "structurally central to the architecture").
 */
export function buildFileGraph(fileStats, trackedFiles, { staleDays = 270 } = {}) {
  const trackedSet = new Set(trackedFiles);
  const now = Date.now();

  const nodes = [...fileStats.entries()].map(([filePath, stat]) => {
    const gravity = [...stat.coChangedWith.values()].reduce((a, b) => a + b, 0);
    const daysSinceModified = stat.lastModified
      ? (now - new Date(stat.lastModified).getTime()) / (1000 * 60 * 60 * 24)
      : Infinity;

    let status = "active";
    if (!trackedSet.has(filePath)) {
      status = "dead"; // deleted from the working tree but present in history
    } else if (daysSinceModified > staleDays) {
      status = "stale"; // still present, but untouched for a long stretch
    }

    return {
      path: filePath,
      commitCount: stat.commitCount,
      lastModified: stat.lastModified,
      coChangeWeight: gravity,
      status,
    };
  });

  nodes.sort((a, b) => b.coChangeWeight - a.coChangeWeight);
  return nodes;
}

/**
 * "Forgotten modules": files still tracked in the repo, touched early on by
 * commits, but with no activity in a very long time relative to the rest of
 * the codebase. This is a heuristic proxy for abandonment, not true static
 * dead-code analysis (which would require a per-language import graph) —
 * documented here and in the README so it's not oversold as more than it is.
 */
export function findForgottenModules(fileGraph, limit = 15) {
  return fileGraph
    .filter((f) => f.status === "stale" || f.status === "dead")
    .sort((a, b) => new Date(a.lastModified || 0) - new Date(b.lastModified || 0))
    .slice(0, limit);
}

export function topInfluentialFiles(fileGraph, limit = 15) {
  return fileGraph.filter((f) => f.status === "active").slice(0, limit);
}
