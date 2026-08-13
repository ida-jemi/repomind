import { useState } from "react";
import { useNavigate } from "react-router-dom";
import StrataTimeline from "../components/StrataTimeline.jsx";

const DEMO_CARDS = [
  { date: "2021-02-14", title: "Initial architecture: monolith on Express", confidence: "high", evidenceRefs: ["a1b2c3d"] },
  { date: "2022-06-03", title: "Migrated auth from Firebase to JWT — pricing exceeded budget", confidence: "high", evidenceRefs: ["#142", "#98"] },
  { date: "2023-01-19", title: "Introduced Redis for session caching under load", confidence: "medium", evidenceRefs: ["#211"] },
  { date: "2023-11-08", title: "Deprecated the legacy /v1 REST endpoints", confidence: "high", evidenceRefs: ["#340"] },
  { date: "2024-09-22", title: "Payments module abandoned after provider switch", confidence: "low", evidenceRefs: ["e5f6a7b"] },
];

export default function Landing() {
  const [repoUrl, setRepoUrl] = useState("");
  const navigate = useNavigate();

  function handleSubmit(e) {
    e.preventDefault();
    navigate("/new", { state: { repoUrl } });
  }

  return (
    <div className="max-w-6xl mx-auto px-6">
      <section className="pt-16 pb-10 grid lg:grid-cols-[1.1fr,1fr] gap-12 items-center">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-site-amber font-mono mb-4">
            AI software archaeologist
          </p>
          <h1 className="font-display text-5xl leading-[1.05] mb-5">
            Every codebase has a <em className="text-site-amber not-italic">buried history.</em>
            <br />
            RepoMind digs it up.
          </h1>
          <p className="text-site-muted text-lg leading-relaxed mb-8 max-w-xl">
            Point it at any GitHub repo. It reconstructs how the architecture evolved, who shaped it,
            which modules were forgotten — and answers <span className="text-site-bone">why</span> decisions
            were made, citing the exact commits, PRs, and issues as evidence.
          </p>
          <form onSubmit={handleSubmit} className="flex gap-2 max-w-lg">
            <input
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              className="flex-1 bg-site-surface border border-site-line rounded px-4 py-3 text-sm text-site-bone placeholder:text-site-muted/60 focus:border-site-amber/50 outline-none font-mono"
            />
            <button
              type="submit"
              className="px-5 py-3 rounded bg-site-amber text-site-bg text-sm font-semibold hover:bg-site-amber/90 transition-colors whitespace-nowrap"
            >
              Start dig
            </button>
          </form>
          <p className="text-xs text-site-muted mt-3 font-mono">Works fully offline too — no API key required for a first look.</p>
        </div>

        <div className="border border-site-line rounded-md bg-site-surface overflow-hidden">
          <div className="px-4 py-2.5 border-b border-site-line flex items-center justify-between">
            <span className="text-xs font-mono text-site-muted">excavation cross-section — example</span>
            <span className="text-xs font-mono text-site-teal">● demo data</span>
          </div>
          <StrataTimeline decisionCards={DEMO_CARDS} height={340} />
        </div>
      </section>

      <section className="grid sm:grid-cols-3 gap-6 py-16 border-t border-site-line">
        <Feature
          eyebrow="Decision search"
          title="Not code search. Decision search."
          body="Ask why a dependency exists or why a module was removed. Answers are grounded in retrieved commits, PRs, and issues via a real RAG pipeline — every claim cites its source."
        />
        <Feature
          eyebrow="Computed, not invented"
          title="Metrics you can defend"
          body="Contributor influence, file gravity, and dead-code candidates come from transparent formulas over real git history — the AI narrates the signal, it doesn't fabricate it."
        />
        <Feature
          eyebrow="Repo biography"
          title="A history, not a dashboard"
          body="Generates a readable narrative of how the project evolved — the kind of document a new hire actually wants to read on day one."
        />
      </section>
    </div>
  );
}

function Feature({ eyebrow, title, body }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.15em] text-site-amber font-mono mb-2">{eyebrow}</p>
      <h3 className="font-display text-xl mb-2">{title}</h3>
      <p className="text-sm text-site-muted leading-relaxed">{body}</p>
    </div>
  );
}
