import { useRef, useState } from 'react';
import rough from 'roughjs';
import { addText, colors, useRoughAnim } from './shared';

/**
 * KV cache filling one block per generated token, then evicting the oldest
 * once it hits capacity — the memory wall that caps your batch size.
 */

const VB_W = 600;
const VB_H = 340;
const COLS = 10;
const ROWS = 4;
const CAP = COLS * ROWS; // 40 blocks

export default function KVCache() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const tokens = useRef(0);
  const [read, setRead] = useState({ tokens: 0, blocks: 0, vram: 0 });

  function draw() {
    const svg = svgRef.current;
    if (!svg) return;
    const c = colors();
    svg.innerHTML = '';
    const rc = rough.svg(svg);

    const filled = Math.min(tokens.current, CAP);
    const atCap = tokens.current >= CAP;
    const head = tokens.current > 0 ? (tokens.current - 1) % CAP : -1;

    addText(svg, 24, 26, 'KV cache · one request', c.inkSoft, 12);

    const gx = 40;
    const gy = 48;
    const cell = 40;
    const gap = 8;
    for (let i = 0; i < CAP; i++) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = gx + col * (cell + gap);
      const y = gy + row * (cell + gap);
      const isFilled = atCap || i < filled;
      const nextEvict = atCap && i === (head + 1) % CAP;
      if (isFilled) {
        const fill = i === head ? c.accent : nextEvict ? c.hot : c.accent2;
        svg.appendChild(
          rc.rectangle(x, y, cell, cell, {
            fill,
            fillStyle: 'solid',
            stroke: fill,
            strokeWidth: 1,
            roughness: 1,
          })
        );
      } else {
        svg.appendChild(rc.rectangle(x, y, cell, cell, { stroke: c.line2, strokeWidth: 1, roughness: 1.3 }));
      }
    }

    // VRAM bar
    const bw = COLS * (cell + gap) - gap;
    const by = gy + ROWS * (cell + gap) + 14;
    const used = filled / CAP;
    addText(svg, gx, by - 6, 'VRAM', c.inkSoft, 11);
    svg.appendChild(rc.rectangle(gx, by, bw, 18, { stroke: c.line2, strokeWidth: 1, roughness: 0.8 }));
    const fw = Math.max(0, bw * used);
    const barColor = used > 0.85 ? c.hot : c.accent2;
    if (fw > 1) {
      svg.appendChild(
        rc.rectangle(gx, by, fw, 18, {
          fill: barColor,
          fillStyle: 'solid',
          stroke: barColor,
          strokeWidth: 0.6,
          roughness: 0.7,
        })
      );
    }
    addText(
      svg,
      gx + bw,
      by - 6,
      atCap ? 'at capacity · evicting oldest' : `${Math.round(used * 100)}%`,
      atCap ? c.hot : c.inkSoft,
      11,
      'end'
    );
  }

  function step() {
    tokens.current += 1;
    const filled = Math.min(tokens.current, CAP);
    setRead({ tokens: tokens.current, blocks: filled, vram: Math.round((filled / CAP) * 100) });
    draw();
  }

  const { running, setRunning, reduce } = useRoughAnim({ rootRef, draw, step, intervalMs: 600 });

  return (
    <div className="cb" ref={rootRef}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="A KV cache filling with one block per token, then evicting the oldest block at capacity."
      />
      <div className="cb-bar">
        <div className="cb-read">
          <span>
            tokens <b>{read.tokens}</b>
          </span>
          <span>
            blocks {read.blocks}/{CAP}
          </span>
          <span>VRAM {read.vram}%</span>
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
              tokens.current = 0;
              setRead({ tokens: 0, blocks: 0, vram: 0 });
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
