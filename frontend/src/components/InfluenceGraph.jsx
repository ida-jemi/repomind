import { useEffect, useRef } from "react";
import * as d3 from "d3";

/**
 * Force-directed graph of contributors, sized and colored by the influence
 * score computed in influenceScorer.js (not decoration — the radius and
 * position genuinely encode the data).
 */
export default function InfluenceGraph({ contributors = [], height = 380 }) {
  const svgRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !wrapRef.current) return;
    const width = wrapRef.current.clientWidth || 700;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    if (contributors.length === 0) {
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "#93897A")
        .attr("font-family", "IBM Plex Mono, monospace")
        .attr("font-size", 13)
        .text("No contributor data yet.");
      return;
    }

    const radius = d3.scaleSqrt().domain([0, 100]).range([10, 46]);
    const color = d3.scaleLinear().domain([0, 100]).range(["#3A332C", "#C88A3D"]);

    const nodes = contributors.map((c) => ({ ...c }));

    const simulation = d3
      .forceSimulation(nodes)
      .force("charge", d3.forceManyBody().strength(8))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collide",
        d3.forceCollide((d) => radius(d.influenceScore) + 4)
      )
      .stop();

    for (let i = 0; i < 200; i++) simulation.tick();

    const g = svg.attr("width", width).attr("height", height).append("g");

    const node = g
      .selectAll("g.node")
      .data(nodes)
      .join("g")
      .attr("class", "node")
      .attr("transform", (d) => `translate(${d.x},${d.y})`);

    node
      .append("circle")
      .attr("r", (d) => radius(d.influenceScore))
      .attr("fill", (d) => color(d.influenceScore))
      .attr("fill-opacity", 0.85)
      .attr("stroke", "#EDE6D9")
      .attr("stroke-opacity", 0.15);

    node
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", 4)
      .attr("font-family", "IBM Plex Mono, monospace")
      .attr("font-size", (d) => Math.max(9, Math.min(13, radius(d.influenceScore) / 2.6)))
      .attr("fill", "#14120F")
      .attr("font-weight", 600)
      .text((d) => initials(d.name));

    node.append("title").text((d) => `${d.name} — influence ${d.influenceScore}, ${d.commitCount} commits`);
  }, [contributors, height]);

  return (
    <div ref={wrapRef} className="w-full">
      <svg ref={svgRef} className="w-full" />
    </div>
  );
}

function initials(name = "") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
