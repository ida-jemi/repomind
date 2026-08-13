/**
 * Computes a 0-100 "influence score" per contributor from raw git stats.
 * This is deliberately NOT an LLM call — it's a transparent, reproducible
 * formula so the AI layer (llmService) can *narrate* the result instead of
 * inventing it. Three signals, weighted:
 *   - commitCount   (breadth of involvement)
 *   - linesChanged  (depth of involvement)
 *   - tenure        (days between first and last commit — sustained vs drive-by)
 */
export function computeInfluenceScores(contributorStats) {
  const contributors = [...contributorStats.entries()].map(([email, c]) => {
    const tenureDays = Math.max(
      1,
      (new Date(c.lastDate) - new Date(c.firstDate)) / (1000 * 60 * 60 * 24)
    );
    return { email, ...c, tenureDays };
  });

  if (contributors.length === 0) return [];

  const maxCommits = Math.max(...contributors.map((c) => c.commitCount));
  const maxLines = Math.max(...contributors.map((c) => c.linesChanged), 1);
  const maxTenure = Math.max(...contributors.map((c) => c.tenureDays));

  return contributors
    .map((c) => {
      const commitScore = c.commitCount / maxCommits;
      const linesScore = c.linesChanged / maxLines;
      const tenureScore = c.tenureDays / maxTenure;

      // Weighted blend: breadth matters most, then depth, then sustained presence.
      const raw = commitScore * 0.5 + linesScore * 0.3 + tenureScore * 0.2;

      return {
        name: c.name,
        email: c.email,
        commitCount: c.commitCount,
        linesChanged: c.linesChanged,
        firstCommitDate: c.firstDate,
        lastCommitDate: c.lastDate,
        influenceScore: Math.round(raw * 100),
      };
    })
    .sort((a, b) => b.influenceScore - a.influenceScore);
}
