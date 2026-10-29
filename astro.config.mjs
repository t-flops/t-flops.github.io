// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import pagefind from 'astro-pagefind';

// Pagefind indexes the built HTML after every `astro build` and serves the
// prebuilt index during `astro dev`. It must run last so it sees the final
// output of the other integrations.
// https://astro.build/config
export default defineConfig({
  site: 'https://t-flops.github.io',
  integrations: [react(), mdx(), pagefind()],
});
