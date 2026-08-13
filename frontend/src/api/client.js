const BASE = "/api";

function authHeaders() {
  const token = localStorage.getItem("repomind_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  health: () => request("/health"),
  signup: (body) => request("/auth/signup", { method: "POST", body: JSON.stringify(body) }),
  login: (body) => request("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  me: () => request("/auth/me"),

  listAnalyses: () => request("/repos"),
  startAnalysis: (repoUrl) => request("/repos", { method: "POST", body: JSON.stringify({ repoUrl }) }),
  getAnalysis: (id) => request(`/repos/${id}`),

  askQuestion: (analysisId, question) =>
    request(`/chat/${analysisId}`, { method: "POST", body: JSON.stringify({ question }) }),
};
