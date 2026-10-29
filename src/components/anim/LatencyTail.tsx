import { useRef, useState } from 'react';
import rough from 'roughjs';
import { addText, colors, useRoughAnim } from './shared';

/**
 * A live latency histogram: most requests are fast, a few land in a long
 * slow tail. p50 and p99 are marked to show they're different populations.
 */

const VB_W = 600;
const VB_H = 340;
const BUCKETS = 16;
const BW_MS = 50; // 0..800ms
const WINDOW = 1500;

function sampleLatency(): number {
  const tri = (Math.random() + Math.random() + Math.random()) / 3; // ~centered
  let v = 25 + tri * 120;
  if (Math.random() < 0.08) v += 180 + Math.random() * 420; // the tail
  return v;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const i = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[i];
}

export default function LatencyTail() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const samples = useRef<number[]>([]);
  const [read, setRead] = useState({ n: 0, p50: 0, p99: 0 });

  function draw() {
    const svg = svgRef.current;
    if (!svg) return;
    const c = colors();
    svg.innerHTML = '';
    const rc = rough.svg(svg);
    const arr = samples.current;

    const counts = new Array(BUCKETS).fill(0);
    for (const v of arr) counts[Math.min(BUCKETS - 1, Math.floor(v / BW_MS))]++;
    const maxc = Math.max(1, ...counts);

    const gx = 44;
    const gy = 58;
    const gw = 512;
    const gh = 198;

    addText(svg, 24, 26, 'request latency · live histogram', c.inkSoft, 12);
    svg.appendChild(rc.line(gx, gy + gh, gx + gw, gy + gh, { stroke: c.line2, strokeWidth: 1 }));

    const bwid = gw / BUCKETS;
    for (let b = 0; b < BUCKETS; b++) {
      const h = (counts[b] / maxc) * gh;
      if (h < 1) continue;
      svg.appendChild(
        rc.rectangle(gx + b * bwid + 3, gy + gh - h, bwid - 6, h, {
          fill: c.accent,
          fillStyle: 'solid',
          stroke: c.accent,
          strokeWidth: 0.6,
          roughness: 0.8,
        })
      );
    }
    for (let b = 0; b <= BUCKETS; b += 4) {
      addText(svg, gx + b * bwid, gy + gh + 16, String(b * BW_MS), c.inkSoft, 10, 'middle');
    }
    addText(svg, gx + gw + 14, gy + gh + 16, 'ms', c.inkSoft, 10, 'middle');

    const sorted = [...arr].sort((a, b) => a - b);
    const mark = (val: number, label: string, col: string) => {
      const x = gx + Math.min(gw, (val / (BUCKETS * BW_MS)) * gw);
      svg.appendChild(
        rc.line(x, gy - 6, x, gy + gh, { stroke: col, strokeWidth: 1.4, strokeLineDash: [5, 5] })
      );
      addText(svg, x, gy - 10, label, col, 11, 'middle');
    };
    if (arr.length) {
      mark(percentile(sorted, 50), `p50 ${Math.round(percentile(sorted, 50))}`, c.accent2);
      mark(percentile(sorted, 99), `p99 ${Math.round(percentile(sorted, 99))}`, c.hot);
    }
  }

  function step() {
    const arr = samples.current;
    for (let k = 0; k < 7; k++) arr.push(sampleLatency());
    if (arr.length > WINDOW) arr.splice(0, arr.length - WINDOW);
    const sorted = [...arr].sort((a, b) => a - b);
    setRead({
      n: arr.length,
      p50: Math.round(percentile(sorted, 50)),
      p99: Math.round(percentile(sorted, 99)),
    });
    draw();
  }

  const { running, setRunning, reduce } = useRoughAnim({ rootRef, draw, step, intervalMs: 500 });

  return (
    <div className="cb" ref={rootRef}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="A live latency histogram with most requests fast and a long slow tail; p50 and p99 marked."
      />
      <div className="cb-bar">
        <div className="cb-read">
          <span>
            samples <b>{read.n}</b>
          </span>
          <span>p50 {read.p50}ms</span>
          <span>p99 {read.p99}ms</span>
        </div>
        <div className="cb-controls">
          {!reduce && (
            <button className="sketch-btn" onClick={() => setRunning((r) => !r)}>
              {running ? 'Pause' : 'Play'}
            </button>
          )}
          <button className="sketch-btn" onClick={step}>
            Step
          </button>
          <button
            className="sketch-btn"
            onClick={() => {
              samples.current = [];
              setRead({ n: 0, p50: 0, p99: 0 });
              draw();
            }}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
