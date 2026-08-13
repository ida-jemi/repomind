import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/client.js";

export default function NewAnalysis() {
  const location = useLocation();
  const navigate = useNavigate();
  const [repoUrl, setRepoUrl] = useState(location.state?.repoUrl || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stage, setStage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setStage("Cloning repository…");
    const stages = [
      "Cloning repository…",
      "Parsing commit history…",
      "Computing contributor influence…",
      "Building file co-change graph…",
      "Embedding evidence for decision search…",
      "Synthesizing decision cards…",
      "Writing repo biography…",
    ];
    let i = 0;
    const interval = setInterval(() => {
      i = Math.min(i + 1, stages.length - 1);
      setStage(stages[i]);
    }, 2200);

    try {
      const res = await api.startAnalysis(repoUrl);
      clearInterval(interval);
      navigate(`/analysis/${res.analysis._id}`);
    } catch (err) {
      clearInterval(interval);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <p className="text-[11px] uppercase tracking-[0.2em] text-site-amber font-mono mb-3">New excavation</p>
      <h1 className="font-display text-3xl mb-2">Point RepoMind at a repo</h1>
      <p className="text-sm text-site-muted mb-8">
        Public GitHub repos work best. Larger repos take longer — history parsing is capped at the most
        recent 500 commits by default to keep this fast for a live demo.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          placeholder="https://github.com/owner/repo"
          required
          disabled={loading}
          className="w-full bg-site-surface border border-site-line rounded px-4 py-3 text-sm font-mono text-site-bone placeholder:text-site-muted/60 focus:border-site-amber/50 outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-3 rounded bg-site-amber text-site-bg text-sm font-semibold hover:bg-site-amber/90 transition-colors disabled:opacity-60"
        >
          {loading ? "Digging…" : "Start dig"}
        </button>
      </form>

      {loading && (
        <div className="mt-6 border border-site-line rounded-md bg-site-surface p-4">
          <p className="text-sm font-mono text-site-amber animate-pulse">{stage}</p>
        </div>
      )}

      {error && (
        <div className="mt-6 text-sm text-site-rust border border-site-rust/30 bg-site-rust/10 rounded px-3 py-2">
          {error}
        </div>
      )}
    </div>
  );
}
