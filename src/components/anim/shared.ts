import { useEffect, useRef, useState, type RefObject } from 'react';

/** The blueprint palette, resolved from CSS tokens at draw time so the
 *  animations follow the light/dark toggle. */
export type Palette = {
  ink: string;
  inkSoft: string;
  panel: string;
  accent: string;
  accent2: string;
  hot: string;
  line2: string;
};

export function colors(): Palette {
  const css = (n: string, f: string) =>
    getComputedStyle(document.documentElement).getPropertyValue(n).trim() || f;
  return {
    ink: css('--ink', '#0b2545'),
    inkSoft: css('--ink-soft', '#5b7493'),
    panel: css('--panel', '#ffffff'),
    accent: css('--accent', '#1664c0'),
    accent2: css('--accent2', '#0b8aa8'),
    hot: css('--hot', '#e07b2e'),
    line2: css('--line2', '#b7cfea'),
  };
}

/** Append an SVG <text> node with a concrete fill (CSS vars don't resolve in
 *  presentation attributes, so colors are passed already-resolved). */
export function addText(
  svg: SVGSVGElement,
  x: number,
  y: number,
  str: string,
  fill: string,
  size = 13,
  anchor: 'start' | 'middle' | 'end' = 'start',
  mono = true
) {
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
}

export function usePrefersReduced() {
  return (
    typeof window !== 'undefined' &&
    !!window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Shared lifecycle for a rough.js animation island:
 *  - draws once on mount (and nudges the sketch-frame border to re-measure)
 *  - redraws on the light/dark toggle
 *  - auto-pauses the clock when scrolled off-screen
 *  - ticks only while playing, visible, and motion is allowed
 */
export function useRoughAnim(opts: {
  rootRef: RefObject<HTMLElement | null>;
  draw: () => void;
  step: () => void;
  intervalMs?: number;
}) {
  const { rootRef, draw, step, intervalMs = 650 } = opts;
  const [running, setRunning] = useState(true);
  const [visible, setVisible] = useState(true);
  const reduce = usePrefersReduced();
  const drawRef = useRef(draw);
  const stepRef = useRef(step);
  drawRef.current = draw;
  stepRef.current = step;

  useEffect(() => {
    drawRef.current();
    window.dispatchEvent(new Event('resize')); // let the sketch border re-measure
    const onTheme = () => drawRef.current();
    const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    mq?.addEventListener('change', onTheme);
    window.addEventListener('t-flops:themechange', onTheme);
    return () => {
      mq?.removeEventListener('change', onTheme);
      window.removeEventListener('t-flops:themechange', onTheme);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => setVisible(e.isIntersecting)),
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootRef]);

  useEffect(() => {
    if (!running || reduce || !visible) return;
    const t = setInterval(() => stepRef.current(), intervalMs);
    return () => clearInterval(t);
  }, [running, visible, reduce, intervalMs]);

  return { running, setRunning, reduce };
}
