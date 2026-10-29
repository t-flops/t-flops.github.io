# t-flops

A hand-drawn blog about **AI inference, MLOps, and infrastructure** — serving, batching,
GPUs, autoscaling, latency tails — rebuilt from sketches and small animations.

Third sibling to [The Overfit](../the-overfit.github.io) (ML explainers) and
[Write-Ahead](../write-ahead.github.io) (database internals): same philosophy (Astro + React islands +
[rough.js](https://roughjs.com) hand-drawn diagrams, "theme + custom components"), its own
identity — an **engineer's blueprint**: cyan line on drafting paper (light) / navy
blueprint (dark), a major+minor drafting grid, Gloria Hallelujah + IBM Plex Mono, and a
schematic chip-die logo.

## Stack

- **Astro 5** — static, zero JS by default; React islands for the interactive diagrams.
- **rough.js** — the sketchy, hand-drawn diagrams.
- **react-rough-notation** — self-drawing inline annotations.
- Content lives in `src/content/posts/*.mdx`, filed by `layer` (the stack layer it digs
  into) and sorted newest-first.

## Structure — posts by stack layer

Every post belongs to one of four layers of the inference stack, set in frontmatter:

| code | layer         | what lives here                                  |
|------|---------------|--------------------------------------------------|
| SRV  | serving       | the request path — batching, decoding, KV cache  |
| SCL  | scaling       | autoscaling, cold starts, load, capacity         |
| OBS  | observability | latency tails, metrics, incidents                |
| HW   | hardware      | GPUs, memory, power, cooling                      |

The home page shows the stack + the latest feed; `/layers/<slug>` is one layer; `/tags/<slug>`
is finer-grained topics. Edit the `LAYERS` list in `src/utils/posts.ts` to change them.

## The reusable kit

- `src/styles/global.css` — all identity tokens (palette, fonts, grid). Change these and the
  whole site follows.
- `src/components/Logo.astro` + `public/favicon.svg` — the schematic chip-die mark.
- `src/components/ContinuousBatching.tsx` — signature island: static vs continuous batching
  on a GPU, with a live utilization readout.
- `src/components/Annotate.tsx` — self-drawing inline marks (`<Annotate type="circle">`).
- `src/components/Figure.astro`, `MarginNote.astro` — sketch-bordered figure / aside.
  (Borders are drawn client-side by the `[data-sketch-frame]` script in `BaseLayout.astro`.)

## Writing a post

Add `src/content/posts/<slug>.mdx` with frontmatter: `title`, `description`, `pubDate`,
`layer` (`serving` | `scaling` | `observability` | `hardware`), `tags`, optional
`draft: true` (shows a "soon" count on the home page, no published page). Import any
component and drop it in.

## Commands

```sh
npm install
npm run dev      # local dev server
npm run build    # static build → dist/
npm run preview  # preview the build
```

Requires Node 18+ (developed on Node 26).
