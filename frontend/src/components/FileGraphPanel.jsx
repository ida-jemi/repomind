const statusColor = {
  active: "text-site-teal border-site-teal/30",
  stale: "text-site-amber border-site-amber/30",
  dead: "text-site-rust border-site-rust/30",
};

export default function FileGraphPanel({ fileGraph = [] }) {
  const active = fileGraph.filter((f) => f.status === "active").slice(0, 8);
  const forgotten = fileGraph.filter((f) => f.status !== "active").slice(0, 8);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="border border-site-line rounded-md bg-site-surface p-4">
        <p className="text-[11px] uppercase tracking-[0.15em] text-site-teal font-mono mb-3">
          Structurally central files
        </p>
        <ul className="space-y-2">
          {active.length === 0 && <li className="text-sm text-site-muted">None detected.</li>}
          {active.map((f) => (
            <li key={f.path} className="flex items-center justify-between text-sm gap-3">
              <span className="font-mono text-site-bone truncate">{f.path}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${statusColor[f.status]}`}>
                gravity {f.coChangeWeight}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="border border-site-line rounded-md bg-site-surface p-4">
        <p className="text-[11px] uppercase tracking-[0.15em] text-site-rust font-mono mb-3">
          Forgotten modules
        </p>
        <ul className="space-y-2">
          {forgotten.length === 0 && <li className="text-sm text-site-muted">None detected in this window.</li>}
          {forgotten.map((f) => (
            <li key={f.path} className="flex items-center justify-between text-sm gap-3">
              <span className="font-mono text-site-bone truncate">{f.path}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${statusColor[f.status]}`}>
                {f.status}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
