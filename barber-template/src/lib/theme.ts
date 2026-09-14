/**
 * Five looks for the /[slug] pages, so two shops in the same town do not hand
 * a prospect the same website twice.
 *
 * A theme is picked from the shop's slug and nothing else: the same slug gives
 * the same theme on every build, on every machine, for ever. Live links must
 * not change appearance between visits.
 *
 * What a theme carries here is structure — hero treatment, section order,
 * service styling, which chrome renders. The palette and the faces live in
 * src/styles/demo.css under `html[data-theme="…"]`, as custom properties the
 * shared markup reads through the same token names. No component knows which
 * theme it is rendering; it asks `site.theme` only for layout choices.
 */

export const THEME_IDS = ['midnight', 'ivory', 'forest', 'tan', 'steel'] as const;
export type ThemeId = (typeof THEME_IDS)[number];

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

export interface Theme {
  id: ThemeId;
  hero: HeroVariant;
  services: ServiceStyle;
  /** Render order. The section numerals follow it, so 01 is always the first numbered section. */
  order: SectionId[];
  /** The scrolling strip of listing facts under the hero. */
  ticker: boolean;
  /** The outsized numerals behind the section headings. */
  numerals: boolean;
  /**
   * How wide the theme's display face sets, and how big the shop name is
   * allowed to get. `width` is the average character width in em at the
   * theme's display weight and case; `budgetPx` is the width the name has to
   * fill on a desktop, which is the whole page on a full-bleed hero and one
   * column on a split one. Together they keep every name on the line it was
   * broken onto, in every face.
   */
  display: { width: number; maxVw: number; maxRem: number; budgetPx: number };
  /** Matches the palette in demo.css, for the browser chrome and form controls. */
  scheme: 'dark' | 'light';
  /** `theme-color`: the page ground. */
  themeColor: string;
  /**
   * The share image (src/lib/og.ts): its palette, the face it sets the name in
   * (only the four faces in src/og/fonts are available to librsvg), whether
   * that name is set in caps, how wide the face sets, and whether the second
   * line is italic.
   */
  og: { ground: string; text: string; muted: string; accent: string; display: string; upper: boolean; width: number; italicAccent?: boolean };
}

export const THEMES: readonly Theme[] = [
  {
    id: 'midnight',
    hero: 'full-bleed',
    services: 'list',
    order: ['prices', 'gallery', 'reviews', 'about', 'find-us'],
    ticker: true,
    numerals: true,
    display: { width: 0.44, maxVw: 26, maxRem: 12.5, budgetPx: 1100 },
    scheme: 'dark',
    themeColor: '#0e0c0a',
    og: { ground: '#0e0c0a', text: '#f4eee4', muted: '#d9d4cb', accent: '#f2a93b', display: 'Big Shoulders Display', upper: true, width: 0.46 },
  },
  {
    id: 'ivory',
    hero: 'editorial',
    services: 'list',
    order: ['about', 'gallery', 'prices', 'reviews', 'find-us'],
    ticker: false,
    numerals: false,
    display: { width: 0.44, maxVw: 22, maxRem: 10.5, budgetPx: 640 },
    scheme: 'light',
    themeColor: '#f7f4ee',
    og: { ground: '#17140f', text: '#f7f4ee', muted: '#c8c1b4', accent: '#f7f4ee', display: 'Instrument Serif', upper: false, width: 0.47, italicAccent: true },
  },
  {
    id: 'forest',
    hero: 'type-led',
    services: 'cards',
    order: ['prices', 'about', 'gallery', 'reviews', 'find-us'],
    ticker: true,
    numerals: false,
    display: { width: 0.56, maxVw: 18, maxRem: 7.5, budgetPx: 1040 },
    scheme: 'dark',
    themeColor: '#0d2a1f',
    og: { ground: '#0d2a1f', text: '#f2f0e6', muted: '#a7bcaf', accent: '#e07a5f', display: 'Instrument Sans', upper: false, width: 0.56 },
  },
  {
    id: 'tan',
    hero: 'plaque',
    services: 'cards',
    order: ['gallery', 'prices', 'reviews', 'about', 'find-us'],
    ticker: true,
    numerals: true,
    display: { width: 0.7, maxVw: 16, maxRem: 8.5, budgetPx: 900 },
    scheme: 'dark',
    themeColor: '#42251a',
    og: { ground: '#42251a', text: '#f7ead7', muted: '#c9ab8c', accent: '#d39b3e', display: 'Big Shoulders Display', upper: true, width: 0.46 },
  },
  {
    id: 'steel',
    hero: 'split',
    services: 'cards',
    order: ['gallery', 'about', 'prices', 'reviews', 'find-us'],
    ticker: true,
    numerals: true,
    display: { width: 0.53, maxVw: 18, maxRem: 8, budgetPx: 570 },
    scheme: 'light',
    themeColor: '#f4f6f8',
    og: { ground: '#10161d', text: '#f4f6f8', muted: '#9aa6b3', accent: '#4d8dff', display: 'Instrument Sans', upper: true, width: 0.62 },
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

/** The theme this shop keeps. Pure function of the slug. */
export function themeFor(slug: string): Theme {
  return THEMES[hash(slug) % THEMES.length]!;
}

/**
 * One item from a pool, fixed by the slug. `key` separates one pool from the
 * next, so a shop does not draw the same index for every line of copy (and two
 * shops that share a theme still read differently).
 */
export function pick<T>(pool: readonly T[], slug: string, key: string): T {
  return pool[hash(`${slug}:${key}`) % pool.length]!;
}
