import simpleGit from "simple-git";
import fs from "fs/promises";
import os from "os";
import path from "path";

const MAX_COMMITS = Number(process.env.MAX_COMMITS_TO_ANALYZE || 500);

/**
 * Clones a repo into a temp dir (shallow-ish: last MAX_COMMITS commits is
 * usually enough signal for the metrics we compute, and keeps analysis fast
 * for large repos). Caller is responsible for cleanup via cleanupClone().
 */
export async function cloneRepo(cloneUrl) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "repomind-"));
  const git = simpleGit();
  await git.clone(cloneUrl, tmpDir, ["--no-single-branch"]);
  return tmpDir;
}

export async function cleanupClone(dir) {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    /* best-effort cleanup */
  }
}

/**
 * Walks `git log --numstat` and returns:
 *  - commits: [{ hash, author, email, date, subject }]
 *  - fileStats: Map<path, { commitCount, lastModified, coChangedWith: Map<path, count> }>
 *  - contributorStats: Map<email, { name, commitCount, linesChanged, firstDate, lastDate }>
 */
export async function analyzeHistory(repoDir) {
  const git = simpleGit(repoDir);

  const raw = await git.raw([
    "log",
    `--max-count=${MAX_COMMITS}`,
    "--pretty=format:COMMIT|%H|%an|%ae|%ad|%s",
    "--date=iso-strict",
    "--numstat",
  ]);

  const lines = raw.split("\n");
  const commits = [];
  const fileStats = new Map();
  const contributorStats = new Map();

  let current = null;
  let filesInCurrentCommit = [];

  const flushCommit = () => {
    if (!current) return;
    commits.push(current);

    // record co-change edges between every pair of files touched together
    for (let i = 0; i < filesInCurrentCommit.length; i++) {
      const fa = filesInCurrentCommit[i];
      const statA = fileStats.get(fa) || newFileEntry();
      statA.commitCount += 1;
      statA.lastModified = current.date;
      for (let j = 0; j < filesInCurrentCommit.length; j++) {
        if (i === j) continue;
        const fb = filesInCurrentCommit[j];
        statA.coChangedWith.set(fb, (statA.coChangedWith.get(fb) || 0) + 1);
      }
      fileStats.set(fa, statA);
    }

    filesInCurrentCommit = [];
  };

  for (const line of lines) {
    if (line.startsWith("COMMIT|")) {
      flushCommit();
      const [, hash, author, email, date, ...subjectParts] = line.split("|");
      current = { hash, author, email, date, subject: subjectParts.join("|") };

      const c = contributorStats.get(email) || {
        name: author,
        commitCount: 0,
        linesChanged: 0,
        firstDate: date,
        lastDate: date,
      };
      c.commitCount += 1;
      if (date < c.firstDate) c.firstDate = date;
      if (date > c.lastDate) c.lastDate = date;
      contributorStats.set(email, c);
    } else if (line.trim() && current) {
      // numstat line: "<added>\t<deleted>\t<path>"
      const parts = line.split("\t");
      if (parts.length === 3) {
        const [added, deleted, filePath] = parts;
        const addedNum = added === "-" ? 0 : Number(added); // "-" = binary file
        const deletedNum = deleted === "-" ? 0 : Number(deleted);
        const c = contributorStats.get(current.email);
        if (c) c.linesChanged += addedNum + deletedNum;
        filesInCurrentCommit.push(filePath);
      }
    }
  }
  flushCommit();

  return { commits, fileStats, contributorStats };
}

function newFileEntry() {
  return { commitCount: 0, lastModified: null, coChangedWith: new Map() };
}

/**
 * Lists current tracked files so we can cross-reference "last modified"
 * against files that still exist (vs. ones deleted long ago).
 */
export async function listTrackedFiles(repoDir) {
  const git = simpleGit(repoDir);
  const raw = await git.raw(["ls-files"]);
  return raw.split("\n").filter(Boolean);
}
