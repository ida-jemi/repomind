export default function BiographyPanel({ biography, repoFullName }) {
  const paragraphs = (biography || "").split(/\n\s*\n/).filter(Boolean);

  return (
    <div className="border border-site-line rounded-md bg-site-surface p-6">
      <p className="text-[11px] uppercase tracking-[0.15em] text-site-amber font-mono mb-2">Repo biography</p>
      <h3 className="font-display text-2xl mb-4">{repoFullName}</h3>
      <div className="space-y-3">
        {paragraphs.length ? (
          paragraphs.map((p, i) => (
            <p key={i} className="text-sm text-site-bone/90 leading-relaxed font-body">
              {p}
            </p>
          ))
        ) : (
          <p className="text-sm text-site-muted">Biography not generated yet.</p>
        )}
      </div>
    </div>
  );
}
