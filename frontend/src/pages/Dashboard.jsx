import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";

const statusColor = {
  ready: "text-site-teal border-site-teal/30",
  failed: "text-site-rust border-site-rust/30",
  cloning: "text-site-amber border-site-amber/30",
  analyzing: "text-site-amber border-site-amber/30",
  embedding: "text-site-amber border-site-amber/30",
  pending: "text-site-muted border-site-line",
};

export default function Dashboard() {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .listAnalyses()
      .then((res) => setAnalyses(res.analyses))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl mb-1">Dig sites</h1>
          <p className="text-sm text-site-muted">Repositories you've excavated.</p>
        </div>
        <Link
          to="/new"
          className="px-4 py-2 rounded bg-site-amber text-site-bg text-sm font-semibold hover:bg-site-amber/90 transition-colors"
        >
          New excavation
        </Link>
      </div>

      {loading && <p className="text-sm text-site-muted font-mono">loading…</p>}
      {error && <p className="text-sm text-site-rust">{error}</p>}

      {!loading && analyses.length === 0 && (
        <div className="border border-dashed border-site-line rounded-md p-10 text-center">
          <p className="text-site-muted text-sm mb-3">No excavations yet.</p>
          <Link to="/new" className="text-site-amber text-sm hover:underline">
            Start your first analysis →
          </Link>
        </div>
      )}

      <div className="grid gap-3">
        {analyses.map((a) => (
          <Link
            key={a._id}
            to={`/analysis/${a._id}`}
            className="flex items-center justify-between border border-site-line rounded-md bg-site-surface px-5 py-4 hover:border-site-amber/40 transition-colors"
          >
            <div>
              <p className="font-mono text-sm text-site-bone">{a.repoFullName || a.repoUrl}</p>
              <p className="text-xs text-site-muted mt-0.5">
                {a.stats?.totalCommits ? `${a.stats.totalCommits} commits analyzed` : "awaiting analysis"}
              </p>
            </div>
            <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded border ${statusColor[a.status] || statusColor.pending}`}>
              {a.status}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
