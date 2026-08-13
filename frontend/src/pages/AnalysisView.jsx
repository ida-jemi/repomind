import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client.js";
import StrataTimeline from "../components/StrataTimeline.jsx";
import InfluenceGraph from "../components/InfluenceGraph.jsx";
import DecisionChat from "../components/DecisionChat.jsx";
import BiographyPanel from "../components/BiographyPanel.jsx";
import FileGraphPanel from "../components/FileGraphPanel.jsx";

const TABS = ["Timeline", "Influence", "Files", "Decision search", "Biography"];

export default function AnalysisView() {
  const { id } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [tab, setTab] = useState("Timeline");
  const [error, setError] = useState("");

  useEffect(() => {
    let poll;
    async function load() {
      try {
        const res = await api.getAnalysis(id);
        setAnalysis(res.analysis);
        if (!["ready", "failed"].includes(res.analysis.status)) {
          poll = setTimeout(load, 3000);
        }
      } catch (err) {
        setError(err.message);
      }
    }
    load();
    return () => clearTimeout(poll);
  }, [id]);

  if (error) return <div className="max-w-5xl mx-auto px-6 py-16 text-site-rust text-sm">{error}</div>;
  if (!analysis) return <div className="max-w-5xl mx-auto px-6 py-16 text-site-muted text-sm font-mono">loading…</div>;

  if (!["ready", "failed"].includes(analysis.status)) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <p className="font-mono text-site-amber animate-pulse text-sm mb-2">{analysis.status}…</p>
        <p className="text-site-muted text-sm">{analysis.repoFullName || analysis.repoUrl}</p>
      </div>
    );
  }

  if (analysis.status === "failed") {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <p className="text-site-rust text-sm mb-2">Excavation failed</p>
        <p className="text-site-muted text-sm font-mono">{analysis.error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <header className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.2em] text-site-amber font-mono mb-2">
          {analysis.embeddingMode === "gemini" ? "gemini-powered" : "offline mode — local embeddings"}
        </p>
        <h1 className="font-display text-3xl mb-2">{analysis.repoFullName}</h1>
        <div className="flex flex-wrap gap-4 text-sm text-site-muted">
          <Stat label="commits" value={analysis.stats?.totalCommits} />
          <Stat label="contributors" value={analysis.stats?.totalContributors} />
          <Stat label="files" value={analysis.stats?.totalFiles} />
          <Stat label="decisions found" value={analysis.decisionCards?.length} />
        </div>
      </header>

      <div className="flex gap-1 border-b border-site-line mb-6 overflow-x-auto strata-scroll">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors ${
              tab === t ? "border-site-amber text-site-bone" : "border-transparent text-site-muted hover:text-site-bone"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Timeline" && (
        <div className="border border-site-line rounded-md bg-site-surface overflow-hidden">
          <StrataTimeline decisionCards={analysis.decisionCards} height={Math.max(320, (analysis.decisionCards?.length || 1) * 60)} />
        </div>
      )}

      {tab === "Influence" && (
        <div className="border border-site-line rounded-md bg-site-surface p-4">
          <InfluenceGraph contributors={analysis.contributors} />
        </div>
      )}

      {tab === "Files" && <FileGraphPanel fileGraph={analysis.fileGraph} />}

      {tab === "Decision search" && <DecisionChat analysisId={analysis._id} />}

      {tab === "Biography" && <BiographyPanel biography={analysis.biography} repoFullName={analysis.repoFullName} />}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <span className="font-mono">
      <span className="text-site-bone">{value ?? "—"}</span> <span className="text-site-muted">{label}</span>
    </span>
  );
}
