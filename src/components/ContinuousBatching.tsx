import { useEffect, useRef, useState } from 'react';
import rough from 'roughjs';

/**
 * t-flops' signature island: continuous batching on a GPU.
 *
 * Four slots run requests that each generate a random number of tokens.
 * In STATIC batching a finished slot sits idle until the whole batch drains,
 * so stragglers waste the GPU. In CONTINUOUS batching a finished slot is
 * refilled from the queue immediately. Watch the utilization number move.
 *
 * Drop <ContinuousBatching client:visible /> into any post.
 */

const SLOTS = 4;
const VB_W = 600;
const VB_H = 320;
const TICK_MS = 650;

type Req = { id: number; len: number; done: number };
type Mode = 'continuous' | 'static';

export default function ContinuousBatching() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const slots = useRef<(Req | null)[]>([]);
  const queue = useRef<Req[]>([]);
  const nextId = useRef(1);
  const served = useRef(0);
  const busy = useRef(0);
  const total = useRef(0);

  const [mode, setMode] = useState<Mode>('continuous');
  const [running, setRunning] = useState(true);
  const [visible, setVisible] = useState(true);
  const [readout, setReadout] = useState({ util: 100, served: 0, queued: 0 });

  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function mkReq(): Req {
    return { id: nextId.current++, len: 3 + Math.floor(Math.random() * 6), done: 0 };
  }
  function topUp() {
    while (queue.current.length < 6) queue.current.push(mkReq());
  }
  function seed() {
    slots.current = Array.from({ length: SLOTS }, () => null);
    queue.current = [];
    nextId.current = 1;
    served.current = 0;
    busy.current = 0;
    total.current = 0;
    topUp();
    for (let i = 0; i < SLOTS; i++) slots.current[i] = queue.current.shift()!;
    topUp();
  }

  function sync() {
    setReadout({
      util: total.current ? Math.round((busy.current / total.current) * 100) : 100,
      served: served.current,
      queued: queue.current.length,
    });
  }

  function step() {
    const s = slots.current;
    let useful = 0;
    for (const r of s) if (r && r.done < r.len) useful++;
    total.current += SLOTS;
    busy.current += useful;
    for (const r of s) if (r && r.done < r.len) r.done++;

    if (mode === 'continuous') {
      for (let i = 0; i < SLOTS; i++) {
        const r = s[i];
        if (r && r.done >= r.len) {
          served.current++;
          s[i] = null;
        }
      }
      for (let i = 0; i < SLOTS; i++) {
        if (!s[i] && queue.current.length) s[i] = queue.current.shift()!;
      }
    } else {
      const active = s.some((r) => r && r.done < r.len);
      if (!active) {
        for (let i = 0; i < SLOTS; i++) {
          if (s[i]) {
            served.current++;
            s[i] = null;
          }
        }
        for (let i = 0; i < SLOTS; i++) {
          if (queue.current.length) s[i] = queue.current.shift()!;
        }
      }
    }
    topUp();
    sync();
    draw();
  }

  function draw() {
    const svg = svgRef.current;
    if (!svg) return;
    const css = (n: string, f: string) =>
      getComputedStyle(document.documentElement).getPropertyValue(n).trim() || f;
    const ink = css('--ink', '#0b2545');
    const inkSoft = css('--ink-soft', '#5b7493');
    const panel = css('--panel', '#ffffff');
    const accent = css('--accent', '#1664c0');
    const accent2 = css('--accent2', '#0b8aa8');
    const hot = css('--hot', '#e07b2e');
    const line2 = css('--line2', '#b7cfea');

    svg.innerHTML = '';
    const rc = rough.svg(svg);
    const text = (
      x: number,
      y: number,
      str: string,
      fill: string,
      size = 13,
      anchor: 'start' | 'middle' | 'end' = 'start',
      mono = true
    ) => {
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', String(x));
      t.setAttribute('y', String(y));
      t.setAttribute('fill', fill);
      t.setAttribute('font-size', String(size));
      t.setAttribute('text-anchor', anchor);
      t.setAttribute(
        'font-family',
        mono ? "'IBM Plex Mono', monospace" : "'Gloria Hallelujah', cursive"
      );
      t.textContent = str;
      svg.appendChild(t);
    };

    // GPU frame
    text(24, 26, 'GPU · 4 slots', inkSoft, 12, 'start');
    svg.appendChild(rc.rectangle(20, 36, 400, 258, { stroke: ink, strokeWidth: 2, roughness: 1.3 }));

    // slots
    for (let i = 0; i < SLOTS; i++) {
      const y = 54 + i * 60;
      const x = 40;
      const w = 360;
      const h = 46;
      svg.appendChild(rc.rectangle(x, y, w, h, { stroke: line2, strokeWidth: 1.4, roughness: 1.2 }));
      const r = slots.current[i];
      if (r) {
        const frac = Math.min(1, r.done / r.len);
        const finished = r.done >= r.len;
        const fill = finished ? hot : accent;
        // labels sit on the panel, never on the fill, so they stay legible
        // at any progress and in either theme
        text(x + 14, y + 23, `req #${r.id}`, ink, 13, 'start');
        text(
          x + w - 14,
          y + 23,
          finished ? 'done · idle' : `${Math.min(r.done, r.len)}/${r.len} tok`,
          finished ? hot : inkSoft,
          12,
          'end'
        );
        // progress bar along the bottom of the slot: track + fill
        const track = w - 28;
        svg.appendChild(
          rc.rectangle(x + 14, y + h - 14, track, 7, {
            stroke: line2,
            strokeWidth: 0.8,
            roughness: 0.7,
          })
        );
        const fw = Math.max(0, track * frac);
        if (fw > 1.5) {
          svg.appendChild(
            rc.rectangle(x + 14, y + h - 14, fw, 7, {
              fill,
              fillStyle: 'solid',
              stroke: fill,
              strokeWidth: 0.6,
              roughness: 0.7,
            })
          );
        }
      } else {
        text(x + w / 2, y + 27, 'empty', inkSoft, 12, 'middle');
      }
    }

    // queue
    text(505, 26, 'queue →', inkSoft, 12, 'middle');
    const shown = Math.min(4, queue.current.length);
    for (let j = 0; j < shown; j++) {
      const y = 54 + j * 44;
      svg.appendChild(
        rc.rectangle(440, y, 130, 32, { stroke: accent2, strokeWidth: 1.3, roughness: 1.1 })
      );
      const q = queue.current[j];
      text(505, y + 21, `#${q.id} · ${q.len}t`, accent2, 12, 'middle');
    }
    if (queue.current.length > 4) {
      text(505, 54 + 4 * 44 + 16, `+${queue.current.length - 4} waiting`, inkSoft, 11, 'middle');
    }
  }

  // mount
  useEffect(() => {
    seed();
    sync();
    draw();
    const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    const onTheme = () => draw();
    mq?.addEventListener('change', onTheme);
    window.addEventListener('t-flops:themechange', onTheme);
    return () => {
      mq?.removeEventListener('change', onTheme);
      window.removeEventListener('t-flops:themechange', onTheme);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // reset accounting when the mode changes, so utilization reflects the new mode
  useEffect(() => {
    busy.current = 0;
    total.current = 0;
    sync();
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // auto-pause when the diagram is scrolled off-screen
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => setVisible(e.isIntersecting)),
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // the clock — runs only while playing, visible, and motion is allowed
  useEffect(() => {
    if (!running || reduce || !visible) return;
    const t = setInterval(step, TICK_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, mode, reduce, visible]);

  return (
    <div className="cb" ref={rootRef}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="A GPU with four slots running requests, refilled from a queue, showing batching utilization."
      />
      <div className="cb-bar">
        <div className="cb-read">
          <span>
            utilization <b>{readout.util}%</b>
          </span>
          <span>served {readout.served}</span>
          <span>queued {readout.queued}</span>
        </div>
        <div className="cb-controls">
          <button
            className="sketch-btn"
            aria-pressed={mode === 'continuous'}
            onClick={() => setMode((m) => (m === 'continuous' ? 'static' : 'continuous'))}
          >
            {mode === 'continuous' ? 'Continuous' : 'Static'}
          </button>
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
              seed();
              sync();
              draw();
            }}
          >
            Reset
          </button>
        </div>
      </div>
      <style>{`
        .cb svg { width: 100%; height: auto; display: block; }
        .cb-bar {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; flex-wrap: wrap; margin-top: 10px;
        }
        .cb-read {
          display: flex; gap: 14px; flex-wrap: wrap;
          font-family: var(--font-mono); font-size: .8rem; color: var(--ink-soft);
        }
        .cb-read b { color: var(--accent); font-size: 1rem; }
        .cb-controls { display: flex; gap: 8px; flex-wrap: wrap; }
        .cb-controls .sketch-btn { font-size: .86rem; padding: 3px 13px; }
      `}</style>
    </div>
  );
}
