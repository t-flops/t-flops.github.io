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
    /** social-share image: a path like /og/kv-cache-vram.png (in public/) or a
     *  full URL. Omit to fall back to the site-wide /og-default.png card.
     *  For best results make it 1200×630. */
    ogImage: z.string().optional(),
  }),
});

export const collections = { posts };
