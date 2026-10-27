import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/** The four layers of the inference stack a post can live in. */
export const LAYER_SLUGS = ['serving', 'scaling', 'observability', 'hardware'] as const;

const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    /** which layer of the stack this post digs into */
    layer: z.enum(LAYER_SLUGS),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts };
