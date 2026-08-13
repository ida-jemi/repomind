import axios from "axios";

const GITHUB_API = "https://api.github.com";

function client() {
  const headers = { Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return axios.create({ baseURL: GITHUB_API, headers, timeout: 15000 });
}

// Parses "https://github.com/owner/repo(.git)" into { owner, repo }
export function parseRepoUrl(repoUrl) {
  const cleaned = repoUrl.trim().replace(/\.git$/, "").replace(/\/$/, "");
  const match = cleaned.match(/github\.com[/:]([^/]+)\/([^/]+)/i);
  if (!match) {
    const looksLikeProfileOnly = /github\.com[/:][^/]+\/?$/i.test(cleaned);
    if (looksLikeProfileOnly) {
      throw new Error(
        "That looks like a GitHub profile URL, not a repository. Use the URL of a specific repo, e.g. https://github.com/owner/repo-name"
      );
    }
    throw new Error(
      "Could not find a GitHub owner/repo in that URL. Expected a format like https://github.com/owner/repo-name"
    );
  }
  return { owner: match[1], repo: match[2] };
}

export async function getRepoMetadata(owner, repo) {
  const { data } = await client().get(`/repos/${owner}/${repo}`);
  return {
    fullName: data.full_name,
    description: data.description,
    stars: data.stargazers_count,
    language: data.language,
    createdAt: data.created_at,
    defaultBranch: data.default_branch,
    cloneUrl: data.clone_url,
    topics: data.topics || [],
  };
}

// Pulls recent pull requests (merged + open), capped, newest first.
export async function getPullRequests(owner, repo, limit = 100) {
  const perPage = Math.min(limit, 100);
  const { data } = await client().get(`/repos/${owner}/${repo}/pulls`, {
    params: { state: "all", per_page: perPage, sort: "created", direction: "desc" },
  });
  return data.map((pr) => ({
    number: pr.number,
    title: pr.title,
    body: pr.body || "",
    author: pr.user?.login,
    createdAt: pr.created_at,
    mergedAt: pr.merged_at,
    url: pr.html_url,
  }));
}

// Pulls recent issues (GitHub's issues endpoint also includes PRs, so we
// filter those out to keep this to "true" issues/discussions).
export async function getIssues(owner, repo, limit = 100) {
  const perPage = Math.min(limit, 100);
  const { data } = await client().get(`/repos/${owner}/${repo}/issues`, {
    params: { state: "all", per_page: perPage, sort: "created", direction: "desc" },
  });
  return data
    .filter((issue) => !issue.pull_request)
    .map((issue) => ({
      number: issue.number,
      title: issue.title,
      body: issue.body || "",
      author: issue.user?.login,
      createdAt: issue.created_at,
      closedAt: issue.closed_at,
      url: issue.html_url,
    }));
}

export async function getReadme(owner, repo) {
  try {
    const { data } = await client().get(`/repos/${owner}/${repo}/readme`, {
      headers: { Accept: "application/vnd.github.raw+json" },
    });
    return typeof data === "string" ? data : "";
  } catch {
    return "";
  }
}
