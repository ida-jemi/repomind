import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

/**
 * The signature visual of RepoMind: the repo's decision history rendered as
 * an excavation cross-section. Each decision card is an "artifact" embedded
 * in a sediment layer; deeper = older. Hovering a layer surfaces its
 * narrative, confidence, and evidence — the "decision search" experience
 * made spatial instead of a plain list.
 */
export default function StrataTimeline({ decisionCards = [], height = 320 }) {
  const ref = useRef(null);
  const [active, setActive] = useState(null);
  const [dims, setDims] = useState({ width: 800 });

  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver((entries) => {
      setDims({ width: entries[0].contentRect.width });
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const width = dims.width || 800;
  const cards = [...decisionCards].sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
  const n = Math.max(cards.length, 1);
  const layerHeight = height / n;

  const confidenceColor = { high: "#4FB3A9", medium: "#C88A3D", low: "#93897A" };

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="block">
        {/* soil texture bands */}
        {cards.length === 0 ? (
          <text x={width / 2} y={height / 2} textAnchor="middle" className="fill-site-muted font-mono text-sm">
            No dated decisions detected yet — run an analysis to populate this timeline.
          </text>
        ) : (
          cards.map((card, i) => {
            const y = i * layerHeight;
            const isEven = i % 2 === 0;
            const color = confidenceColor[card.confidence] || confidenceColor.medium;
            return (
              <g
                key={i}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                style={{ cursor: "pointer" }}
              >
                <rect
                  x={0}
                  y={y}
                  width={width}
                  height={layerHeight}
                  fill={isEven ? "#1E1B17" : "#191613"}
                  stroke="#3A332C"
                  strokeWidth={0.5}
                />
                {/* artifact marker */}
                <circle
                  cx={40}
                  cy={y + layerHeight / 2}
                  r={active === i ? 7 : 5}
                  fill={color}
                  className="transition-all"
                />
                <line
                  x1={40}
                  y1={y + layerHeight / 2}
                  x2={70}
                  y2={y + layerHeight / 2}
                  stroke={color}
                  strokeWidth={1}
                  opacity={0.6}
                />
                <text
                  x={80}
                  y={y + layerHeight / 2 - (layerHeight > 40 ? 6 : 0)}
                  className="fill-site-bone font-mono"
                  style={{ fontSize: 12 }}
                >
                  {card.date ? new Date(card.date).toISOString().slice(0, 10) : "undated"}
                </text>
                <text
                  x={80}
                  y={y + layerHeight / 2 + 14}
                  className="fill-site-muted font-body"
                  style={{ fontSize: layerHeight > 40 ? 13 : 11 }}
                >
                  {truncate(card.title, layerHeight > 40 ? 90 : 60)}
                </text>
              </g>
            );
          })
        )}
      </svg>

      {active !== null && cards[active] && (
        <div className="absolute right-2 top-2 max-w-sm bg-site-surface2 border border-site-line rounded-md p-4 shadow-xl">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded"
              style={{
                color: confidenceColor[cards[active].confidence] || confidenceColor.medium,
                border: `1px solid ${confidenceColor[cards[active].confidence] || confidenceColor.medium}55`,
              }}
            >
              {cards[active].confidence || "medium"} confidence
            </span>
          </div>
          <p className="text-sm text-site-bone leading-snug">{cards[active].narrative || cards[active].title}</p>
          {cards[active].evidenceRefs?.length > 0 && (
            <p className="mt-2 text-xs text-site-muted font-mono">
              evidence: {cards[active].evidenceRefs.join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function truncate(s, len) {
  if (!s) return "";
  return s.length > len ? s.slice(0, len - 1) + "…" : s;
}
