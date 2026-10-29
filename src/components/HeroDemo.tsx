import { useEffect, useState } from 'react';
import ContinuousBatching from './ContinuousBatching';
import KVCache from './anim/KVCache';
import LatencyTail from './anim/LatencyTail';
import Autoscale from './anim/Autoscale';

/**
 * The hero gallery: shows one inference animation at random per visit, with a
 * shuffle to roll another. Each animation manages its own clock and pauses
 * when scrolled off-screen.
 */
const ANIMS = [
  {
    key: 'batching',
    Component: ContinuousBatching,
    caption:
      'Continuous batching: a finished slot is refilled from the queue at once — toggle Static to watch stragglers waste the GPU.',
  },
  {
    key: 'kvcache',
    Component: KVCache,
    caption:
      'The KV cache fills one block per token, then evicts the oldest at capacity — this is what really caps your batch size.',
  },
  {
    key: 'latency',
    Component: LatencyTail,
    caption:
      'Most requests are fast; a few land in the long tail. The p99 is a different population from the median.',
  },
  {
    key: 'autoscale',
    Component: Autoscale,
    caption:
      'Load rises and falls and replicas scale to meet it — but each new GPU warms up on a cold-start delay before it serves.',
  },
];

export default function HeroDemo() {
  // SSR + first client render use index 0 (no hydration mismatch); a random
  // one is chosen once mounted, so each visit differs.
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(Math.floor(Math.random() * ANIMS.length));
  }, []);

  // nudge the sketch-frame border to re-measure after a swap
  useEffect(() => {
    const t = setTimeout(() => window.dispatchEvent(new Event('resize')), 60);
    return () => clearTimeout(t);
  }, [idx]);

  const anim = ANIMS[idx];
  const Comp = anim.Component;

  function shuffle() {
    if (ANIMS.length < 2) return;
    setIdx((i) => {
      let n = i;
      while (n === i) n = Math.floor(Math.random() * ANIMS.length);
      return n;
    });
  }

  return (
    <figure className="figure hero-demo" data-sketch-frame>
      <Comp key={anim.key} />
      <figcaption className="figcap">
        {anim.caption}{' '}
        <button type="button" className="shuffle-link" onClick={shuffle} aria-label="Show another animation">
          ↻ another
        </button>
      </figcaption>
    </figure>
  );
}
