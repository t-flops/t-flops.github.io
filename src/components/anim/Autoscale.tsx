import { useRef, useState } from 'react';
import rough from 'roughjs';
import { addText, colors, useRoughAnim } from './shared';

/**
 * Load rises and falls; replicas scale to meet it, but each new GPU warms up
 * on a cold-start delay before it can serve — so capacity lags the spike.
 */

const VB_W = 600;
const VB_H = 340;
const CAP_PER = 20; // rps one replica serves
const MAX_REP = 8;
const WARM_TICKS = 2;

type Rep = { state: 'warming' | 'active'; ttl: number };

export default function Autoscale() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const phase = useRef(0);
  const reps = useRef<Rep[]>([
    { state: 'active', ttl: 0 },
    { state: 'active', ttl: 0 },
  ]);
  const hist = useRef<number[]>([]);
  const [read, setRead] = useState({ rps: 0, reps: 2, warming: 0 });

  const loadAt = (p: number) => Math.max(8, 70 + 55 * Math.sin(p / 6) + 18 * Math.sin(p / 2.3));

  function draw() {
    const svg = svgRef.current;
    if (!svg) return;
    const c = colors();
    svg.innerHTML = '';
    const rc = rough.svg(svg);

    const cur = loadAt(phase.current);
    const active = reps.current.filter((r) => r.state === 'active').length;
    const capacity = active * CAP_PER;
    const overloaded = cur > capacity;

    const gx = 44;
    const gy = 46;
    const gw = 512;
    const gh = 118;
    const maxY = 190;

    addText(svg, 24, 26, 'load vs capacity', c.inkSoft, 12);

    const h = hist.current;
    if (h.length > 1) {
      const pts = h.map(
        (v, i) =>
          `${(gx + (i / (h.length - 1)) * gw).toFixed(1)} ${(gy + gh - (v / maxY) * gh).toFixed(1)}`
      );
      svg.appendChild(rc.path('M' + pts.join(' L'), { stroke: c.accent, strokeWidth: 2, roughness: 1 }));
    }

    const capY = gy + gh - (capacity / maxY) * gh;
    svg.appendChild(
      rc.line(gx, capY, gx + gw, capY, { stroke: c.accent2, strokeWidth: 1.6, strokeLineDash: [6, 5] })
    );
    addText(svg, gx + gw, capY - 6, `cap ${capacity}`, c.accent2, 10, 'end');
    addText(svg, gx, gy - 4, `${Math.round(cur)} rps`, overloaded ? c.hot : c.ink, 12, 'start');

    // replicas
    const ry = gy + gh + 42;
    const bw = 54;
    const bh = 42;
    const gap = 10;
    addText(svg, gx, ry - 12, 'replicas', c.inkSoft, 11);
    reps.current.forEach((r, i) => {
      const x = gx + i * (bw + gap);
      if (r.state === 'active') {
        svg.appendChild(
          rc.rectangle(x, ry, bw, bh, {
            fill: c.accent2,
            fillStyle: 'solid',
            stroke: c.accent2,
            strokeWidth: 0.8,
            roughness: 1,
          })
        );
        addText(svg, x + bw / 2, ry + bh / 2 + 4, 'GPU', c.panel, 11, 'middle');
      } else {
        svg.appendChild(
          rc.rectangle(x, ry, bw, bh, { stroke: c.hot, strokeWidth: 1.6, roughness: 1.2, strokeLineDash: [4, 3] })
        );
        addText(svg, x + bw / 2, ry + bh / 2 + 4, 'warm', c.hot, 10, 'middle');
      }
    });
    addText(
      svg,
      gx,
      ry + bh + 20,
      overloaded ? 'queue building — load over capacity' : 'load within capacity',
      overloaded ? c.hot : c.inkSoft,
      11
    );
  }

  function step() {
    phase.current += 1;
    const cur = loadAt(phase.current);
    hist.current.push(cur);
    if (hist.current.length > 60) hist.current.shift();

    reps.current.forEach((r) => {
      if (r.state === 'warming') {
        r.ttl -= 1;
        if (r.ttl <= 0) r.state = 'active';
      }
    });

    const desired = Math.max(1, Math.min(MAX_REP, Math.ceil(cur / CAP_PER)));
    const count = reps.current.length;
    if (desired > count) {
      reps.current.push({ state: 'warming', ttl: WARM_TICKS });
    } else if (desired < count) {
      const idx = reps.current.findIndex((r) => r.state === 'warming');
      reps.current.splice(idx >= 0 ? idx : reps.current.length - 1, 1);
    }

    const active = reps.current.filter((r) => r.state === 'active').length;
    const warming = reps.current.filter((r) => r.state === 'warming').length;
    setRead({ rps: Math.round(cur), reps: active, warming });
    draw();
  }

  const { running, setRunning, reduce } = useRoughAnim({ rootRef, draw, step, intervalMs: 650 });

  return (
    <div className="cb" ref={rootRef}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Incoming load rising and falling against GPU replica capacity, with replicas warming up on a cold-start delay."
      />
      <div className="cb-bar">
        <div className="cb-read">
          <span>
            load <b>{read.rps}</b> rps
          </span>
          <span>replicas {read.reps}</span>
          <span>{read.warming ? `${read.warming} warming` : 'steady'}</span>
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
              phase.current = 0;
              hist.current = [];
              reps.current = [
                { state: 'active', ttl: 0 },
                { state: 'active', ttl: 0 },
              ];
              setRead({ rps: 0, reps: 2, warming: 0 });
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
