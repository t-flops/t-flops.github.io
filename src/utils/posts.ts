import { getCollection, type CollectionEntry } from 'astro:content';
import { LAYER_SLUGS } from '../content.config';

export type Post = CollectionEntry<'posts'>;
export type LayerSlug = (typeof LAYER_SLUGS)[number];

/** The stack layers, in top-to-bottom order, with their display copy + short code. */
export const LAYERS: {
  slug: LayerSlug;
  name: string;
  code: string;
  desc: string;
}[] = [
  { slug: 'serving', code: 'SRV', name: 'Serving', desc: 'The request path — batching, decoding, the KV cache.' },
  { slug: 'scaling', code: 'SCL', name: 'Scaling', desc: 'Autoscaling, cold starts, load, and capacity.' },
  { slug: 'observability', code: 'OBS', name: 'Observability', desc: 'Latency tails, metrics, and the 3am incident.' },
  { slug: 'hardware', code: 'HW', name: 'Hardware', desc: 'GPUs, memory, power, cooling — the metal.' },
];

export interface LayerGroup {
  slug: LayerSlug;
  name: string;
  code: string;
  desc: string;
  posts: Post[];
}

export interface TagGroup {
  /** original label as written in frontmatter */
  label: string;
  /** url-safe slug */
  slug: string;
  posts: Post[];
}

/** Turn a free-form tag into a url-safe slug. */
export function slugifyTag(tag: string): string {
  return tag
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Metadata for one layer by slug. */
export function layerMeta(slug: LayerSlug) {
  return LAYERS.find((l) => l.slug === slug)!;
}

const byNewest = (a: Post, b: Post) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf();

/** All non-draft posts, newest first. */
export async function getPublishedPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  return posts.sort(byNewest);
}

/** Every post including drafts, newest first. */
export async function getAllPosts(): Promise<Post[]> {
  const posts = await getCollection('posts');
  return posts.sort(byNewest);
}

/** Posts grouped by layer, in stack order. Includes drafts so the home can
 *  show "coming soon" and counts can reflect what's planned. */
export async function getLayerGroups(includeDrafts = true): Promise<LayerGroup[]> {
  const posts = includeDrafts ? await getAllPosts() : await getPublishedPosts();
  return LAYERS.map((l) => ({
    ...l,
    posts: posts.filter((p) => p.data.layer === l.slug),
  }));
}

/** One layer plus its published posts. */
export async function getLayer(slug: LayerSlug): Promise<LayerGroup> {
  const meta = layerMeta(slug);
  const posts = (await getPublishedPosts()).filter((p) => p.data.layer === slug);
  return { ...meta, posts };
}

/** Up to `n` other published posts in the same layer, newest first. */
export async function getLayerSiblings(id: string, layer: LayerSlug, n = 3): Promise<Post[]> {
  const posts = (await getPublishedPosts()).filter((p) => p.data.layer === layer && p.id !== id);
  return posts.slice(0, n);
}

/** Every tag, each with its published posts, sorted by popularity then name. */
export async function getAllTags(): Promise<TagGroup[]> {
  const posts = await getPublishedPosts();
  const map = new Map<string, TagGroup>();
  for (const p of posts) {
    for (const raw of p.data.tags) {
      const slug = slugifyTag(raw);
      if (!slug) continue;
      if (!map.has(slug)) map.set(slug, { label: raw, slug, posts: [] });
      map.get(slug)!.posts.push(p);
    }
  }
  return [...map.values()].sort(
    (a, b) => b.posts.length - a.posts.length || a.label.localeCompare(b.label)
  );
}
