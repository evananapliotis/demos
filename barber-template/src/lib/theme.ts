/**
 * Five layouts for the /[slug] pages, so two shops in the same town do not hand
 * a prospect the same website twice.
 *
 * A page's identity has two independent halves:
 *
 *   layout  — hero treatment, section order, service styling, faces, metrics.
 *             Chosen from the slug, here. Five of them.
 *   palette — grounds, type colours and accent. Derived from the shop's OWN
 *             primary photo (src/lib/palette.ts, baked into
 *             src/data/palettes.json) and written onto the page as custom
 *             properties.
 *
 * They are independent on purpose: five layouts against a ground the photo
 * chose and an accent taken from the photo itself gives far more variety than
 * five fixed pairings, and it ties each page to its own shop. Both halves are
 * pure functions of committed data, so the same shop renders identically on
 * every build — a prospect's live link never changes appearance.
 *
 * The faces and metrics live in src/styles/demo.css under `html[data-layout]`;
 * no component knows which layout it is rendering, it asks `site.layout` only
 * for structural choices.
 */

export const LAYOUT_IDS = ['condensed', 'editorial', 'grotesk', 'slab', 'technical'] as const;
export type LayoutId = (typeof LAYOUT_IDS)[number];

/** How the first screen is built. */
export type HeroVariant =
  /** Photo behind the type, full height. */
  | 'full-bleed'
  /** Type left, a tall photo right, wide margins. */
  | 'editorial'
  /** Type alone, then a wide photo band under it. */
  | 'type-led'
  /** Photo behind a centred, ruled plaque. */
  | 'plaque'
  /** Type one half, photo the other, edge to edge. */
  | 'split';

export type ServiceStyle = 'list' | 'cards';

/** The sections a shop page can order. `reviews` renders its own block; the rest are numbered. */
export type SectionId = 'prices' | 'gallery' | 'reviews' | 'about' | 'find-us';

export interface Layout {
  id: LayoutId;
  hero: HeroVariant;
  services: ServiceStyle;
  /** Render order. The section numerals follow it, so 01 is always the first numbered section. */
  order: SectionId[];
  /** The scrolling strip of listing facts under the hero. */
  ticker: boolean;
  /** The outsized numerals behind the section headings. */
  numerals: boolean;
  /**
   * How wide the layout's display face sets, and how big the shop name is
   * allowed to get. `width` is the average character width in em at the
   * layout's display weight and case; `budgetPx` is the width the name has to
   * fill on a desktop, which is the whole page on a full-bleed hero and one
   * column on a split one. Together they keep every name on the line it was
   * broken onto, in every face.
   */
  display: { width: number; maxVw: number; maxRem: number; budgetPx: number };
  /**
   * How the share image sets the name: which of the four faces in src/og/fonts
   * librsvg can reach, whether it is set in caps, how wide that face sets, and
   * whether the second line is italic. The share image's colours come from the
   * shop's palette, not from here.
   */
  og: { display: string; upper: boolean; width: number; italicAccent?: boolean };
}

export const LAYOUTS: readonly Layout[] = [
  {
    id: 'condensed',
    hero: 'full-bleed',
    services: 'list',
    order: ['prices', 'gallery', 'reviews', 'about', 'find-us'],
    ticker: true,
    numerals: true,
    display: { width: 0.44, maxVw: 26, maxRem: 12.5, budgetPx: 1100 },
    og: { display: 'Big Shoulders Display', upper: true, width: 0.46 },
  },
  {
    id: 'editorial',
    hero: 'editorial',
    services: 'list',
    order: ['about', 'gallery', 'prices', 'reviews', 'find-us'],
    ticker: false,
    numerals: false,
    display: { width: 0.44, maxVw: 22, maxRem: 10.5, budgetPx: 640 },
    og: { display: 'Instrument Serif', upper: false, width: 0.47, italicAccent: true },
  },
  {
    id: 'grotesk',
    hero: 'type-led',
    services: 'cards',
    order: ['prices', 'about', 'gallery', 'reviews', 'find-us'],
    ticker: true,
    numerals: false,
    display: { width: 0.56, maxVw: 18, maxRem: 7.5, budgetPx: 1040 },
    og: { display: 'Instrument Sans', upper: false, width: 0.56 },
  },
  {
    id: 'slab',
    hero: 'plaque',
    services: 'cards',
    order: ['gallery', 'prices', 'reviews', 'about', 'find-us'],
    ticker: true,
    numerals: true,
    display: { width: 0.7, maxVw: 16, maxRem: 8.5, budgetPx: 900 },
    og: { display: 'Big Shoulders Display', upper: true, width: 0.46 },
  },
  {
    id: 'technical',
    hero: 'split',
    services: 'cards',
    order: ['gallery', 'about', 'prices', 'reviews', 'find-us'],
    ticker: true,
    numerals: true,
    display: { width: 0.53, maxVw: 18, maxRem: 8, budgetPx: 570 },
    og: { display: 'Instrument Sans', upper: true, width: 0.62 },
  },
];

/**
 * FNV-1a, 32 bits. Chosen because it is four lines and has no dependencies:
 * the same slug gives the same number in every build, on every machine, in
 * every Node version, which is the whole point.
 */
export function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** The layout this shop keeps. Pure function of the slug. */
export function layoutFor(slug: string): Layout {
  return LAYOUTS[hash(slug) % LAYOUTS.length]!;
}

/**
 * One item from a pool, fixed by the slug. `key` separates one pool from the
 * next, so a shop does not draw the same index for every line of copy (and two
 * shops that share a theme still read differently).
 */
export function pick<T>(pool: readonly T[], slug: string, key: string): T {
  return pool[hash(`${slug}:${key}`) % pool.length]!;
}
