/**
 * Image slot manifest.
 *
 * Developer-owned. Defines every image the site can render: how to search for
 * it on Pexels, how to crop it, which widths to emit and the byte budget each
 * output file must stay under. Barber-editable text (alt text, captions) lives
 * in site.ts and references slots by id.
 *
 * Both the scripts (fetch, grade, check) and the <Pic> component import this
 * file, so it is the single source of truth for image geometry.
 */

export const FORMATS = ['avif', 'webp'] as const;
export type Format = (typeof FORMATS)[number];

export type Orientation = 'landscape' | 'portrait' | 'square';

/** Crop focus values accepted by sharp's `position` option. */
export const FOCAL_POSITIONS = [
  'attention',
  'entropy',
  'centre',
  'top',
  'bottom',
  'left',
  'right',
  'left top',
  'right top',
  'left bottom',
  'right bottom',
] as const;
export type Focal = (typeof FOCAL_POSITIONS)[number];

export interface SearchedSlot {
  kind: 'searched';
  id: string;
  /** Pexels search query used by scripts/fetch-images.ts. */
  query: string;
  orientation: Orientation;
  /** Crop aspect ratio as [width, height]. */
  aspect: readonly [number, number];
  /** Output widths in CSS pixels, ascending. */
  widths: readonly number[];
  /** Maximum size in KB for every output file of this slot (each width, each format). */
  budgetKB: number;
  /** Default `sizes` attribute emitted by <Pic>. */
  sizes: string;
  /** Default crop focus. A per-photo override can be set in image-picks.json. */
  focal: Focal;
  /** Before/after pairs share a group id and carry a role. */
  group?: string;
  role?: 'before' | 'after';
}

export interface DerivedSlot {
  kind: 'derived';
  id: string;
  /** Slot whose picked photo is the source. */
  from: string;
  width: number;
  height: number;
  format: 'jpeg';
  budgetKB: number;
}

export type Slot = SearchedSlot | DerivedSlot;

const DEFAULT_BUDGET_KB = 120;

const SIZES = {
  full: '100vw',
  half: '(min-width: 768px) 50vw, 100vw',
  card: '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw',
  gallery: '(min-width: 1024px) 33vw, 50vw',
} as const;

function searched(
  id: string,
  query: string,
  orientation: Orientation,
  aspect: readonly [number, number],
  widths: readonly number[],
  sizes: string,
  extra: Partial<Pick<SearchedSlot, 'budgetKB' | 'focal' | 'group' | 'role'>> = {},
): SearchedSlot {
  return {
    kind: 'searched',
    id,
    query,
    orientation,
    aspect,
    widths,
    sizes,
    budgetKB: extra.budgetKB ?? DEFAULT_BUDGET_KB,
    focal: extra.focal ?? 'attention',
    ...(extra.group ? { group: extra.group, role: extra.role } : {}),
  };
}

function pair(n: number, beforeQuery: string, afterQuery: string): SearchedSlot[] {
  const group = `before-after-${n}`;
  return [
    searched(`${group}-before`, beforeQuery, 'portrait', [4, 5], [480, 960], SIZES.card, { group, role: 'before' }),
    searched(`${group}-after`, afterQuery, 'portrait', [4, 5], [480, 960], SIZES.card, { group, role: 'after' }),
  ];
}

export const slots: readonly Slot[] = [
  // Hero. Two slots for art direction: landscape from 768px up, portrait below.
  searched('hero', 'barber cutting hair dark barbershop', 'landscape', [16, 9], [640, 1024, 1600], SIZES.full, { budgetKB: 150 }),
  searched('hero-portrait', 'barber client haircut close up', 'portrait', [4, 5], [480, 800], SIZES.full),

  // Interior shot used in the hours section.
  searched('about-shop', 'barbershop interior leather chairs', 'landscape', [3, 2], [640, 1024], SIZES.half),

  // Services, one per card.
  searched('service-classic-cut', 'barber scissors haircut men', 'landscape', [4, 3], [480, 800], SIZES.card),
  searched('service-skin-fade', 'barber clippers fade haircut', 'landscape', [4, 3], [480, 800], SIZES.card),
  searched('service-beard', 'barber beard trim', 'landscape', [4, 3], [480, 800], SIZES.card),
  searched('service-hot-towel-shave', 'hot towel shave straight razor', 'landscape', [4, 3], [480, 800], SIZES.card),
  searched('service-cut-and-beard', 'barber styling hair and beard', 'landscape', [4, 3], [480, 800], SIZES.card),
  searched('service-kids', 'child haircut barber', 'landscape', [4, 3], [480, 800], SIZES.card),

  // Team portraits. Distinct queries so the three faces differ.
  searched('team-1', 'barber portrait apron', 'portrait', [4, 5], [400, 800], SIZES.card),
  searched('team-2', 'female barber portrait', 'portrait', [4, 5], [400, 800], SIZES.card),
  searched('team-3', 'barber smiling arms crossed', 'portrait', [4, 5], [400, 800], SIZES.card),

  // Gallery grid.
  searched('gallery-1', 'fresh fade haircut', 'square', [1, 1], [480, 960], SIZES.gallery),
  searched('gallery-2', 'beard oil barber', 'square', [1, 1], [480, 960], SIZES.gallery),
  searched('gallery-3', 'vintage barber chair', 'square', [1, 1], [480, 960], SIZES.gallery),
  searched('gallery-4', 'straight razor shave', 'square', [1, 1], [480, 960], SIZES.gallery),
  searched('gallery-5', 'hair pomade styling', 'square', [1, 1], [480, 960], SIZES.gallery),
  searched('gallery-6', 'barber shop neon sign', 'square', [1, 1], [480, 960], SIZES.gallery),

  // Before/after slider pairs. Pexels has no matched pairs, so these are
  // placeholders until a client supplies real ones. image-picks.json can point
  // a "before" slot at its "after" photo with an ungraded treatment so the
  // slider demonstrates on a single pick per pair.
  ...pair(1, 'man long messy hair portrait', 'fresh fade haircut man portrait'),
  ...pair(2, 'man overgrown beard portrait', 'groomed beard man portrait'),
  ...pair(3, 'man unkempt hair before haircut', 'sharp haircut man portrait'),

  // Shopfront, used as the contact section image and CTA band.
  searched('contact-exterior', 'barber shop exterior street', 'landscape', [21, 9], [640, 1024, 1600], SIZES.full),

  // Social share image, cut from the hero pick. JPEG because most crawlers
  // still ignore AVIF and WebP. Never loaded by the page itself.
  { kind: 'derived', id: 'og', from: 'hero', width: 1200, height: 630, format: 'jpeg', budgetKB: DEFAULT_BUDGET_KB },
];

export const searchedSlots: readonly SearchedSlot[] = slots.filter((s): s is SearchedSlot => s.kind === 'searched');
export const derivedSlots: readonly DerivedSlot[] = slots.filter((s): s is DerivedSlot => s.kind === 'derived');

export const slotIds = slots.map((s) => s.id) as [string, ...string[]];
export const searchedSlotIds = searchedSlots.map((s) => s.id) as [string, ...string[]];
export const derivedSlotIds = derivedSlots.map((s) => s.id) as [string, ...string[]];

const byId = new Map<string, Slot>(slots.map((s) => [s.id, s]));

export function getSlot(id: string): Slot {
  const slot = byId.get(id);
  if (!slot) throw new Error(`Unknown image slot "${id}". Known slots: ${slotIds.join(', ')}`);
  return slot;
}

export function getSearchedSlot(id: string): SearchedSlot {
  const slot = getSlot(id);
  if (slot.kind !== 'searched') throw new Error(`Slot "${id}" is derived, not searched`);
  return slot;
}

/** Public URL path that graded images are served from. */
export const IMG_PUBLIC_PATH = '/img';

/** File name of one output variant, e.g. hero-1024.avif */
export function outputFile(slotId: string, width: number, format: Format | 'jpeg'): string {
  const ext = format === 'jpeg' ? 'jpg' : format;
  return `${slotId}-${width}.${ext}`;
}

/** File name of a derived output, e.g. og.jpg */
export function derivedFile(slot: DerivedSlot): string {
  return `${slot.id}.jpg`;
}

export function outputHeight(slot: SearchedSlot, width: number): number {
  const [w, h] = slot.aspect;
  return Math.round((width * h) / w);
}

/* ---- Manifest self-checks. Run at import time so a broken manifest fails the build. ---- */

const seen = new Set<string>();
for (const slot of slots) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slot.id)) throw new Error(`Slot id "${slot.id}" must be a lowercase slug`);
  if (seen.has(slot.id)) throw new Error(`Duplicate slot id "${slot.id}"`);
  seen.add(slot.id);
  if (slot.kind === 'searched') {
    if (slot.widths.length === 0) throw new Error(`Slot "${slot.id}" has no widths`);
    for (let i = 1; i < slot.widths.length; i++) {
      if (slot.widths[i]! <= slot.widths[i - 1]!) throw new Error(`Slot "${slot.id}" widths must ascend`);
    }
    if ((slot.group && !slot.role) || (slot.role && !slot.group)) throw new Error(`Slot "${slot.id}" needs both group and role`);
  } else if (!byId.has(slot.from) || byId.get(slot.from)!.kind !== 'searched') {
    throw new Error(`Derived slot "${slot.id}" points at unknown searched slot "${slot.from}"`);
  }
}
for (const slot of searchedSlots) {
  if (!slot.group) continue;
  const partner = searchedSlots.find((s) => s.group === slot.group && s.role !== slot.role);
  if (!partner) throw new Error(`Slot "${slot.id}" has no ${slot.role === 'before' ? 'after' : 'before'} partner in group "${slot.group}"`);
}
