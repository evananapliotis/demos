/**
 * The palette a page renders in, looked up by slug.
 *
 * The work of looking at the photo happens once, offline, in
 * scripts/extract-palettes.ts; this module only reads the committed answers in
 * src/data/palettes.json and joins them to the curated ground they snapped to.
 * A build therefore decodes no images and cannot produce a different palette
 * from one run to the next.
 *
 * A slug with no entry falls back to the neutral ground, so adding a listing
 * without re-running the extractor renders a correct page rather than failing.
 */
import raw from '../data/palettes.json';
import { buildPalette, contrastAudit, GROUNDS, type GroundId } from './palette.ts';

interface Entry {
  photo: string | null;
  photoHue: number | null;
  photoSaturation: number;
  photoLightness: number;
  accentHue: number | null;
  ground: string;
  groundFromPhoto: boolean;
  groundReason: string;
  accent: string;
  accentHover: string;
  onAccent: string;
  minContrast: number;
  accentFallback: boolean;
  notes: string[];
}

const file = raw as unknown as { version: number; flagged: string[]; shops: Record<string, Entry> };

export interface ShopPalette {
  ground: GroundId;
  scheme: 'dark' | 'light';
  ink: string;
  ink2: string;
  ink3: string;
  cream: string;
  cream2: string;
  accent: string;
  accentHover: string;
  onAccent: string;
  /** Lowest contrast ratio among every pair the stylesheet puts together. */
  minContrast: number;
  /** The accent came from the ground, not the photo. */
  accentFallback: boolean;
  /** The photo chose the ground, rather than the slug spreading it. */
  groundFromPhoto: boolean;
  /** Why this ground, in one line, for anyone auditing a page. */
  groundReason: string;
  /** The photo's own colour, for the same reason. */
  photo: { hue: number | null; saturation: number; lightness: number; accentHue: number | null };
  /** Ready to drop into a style attribute on <html>. */
  cssVars: string;
}

const NEUTRAL: ShopPalette = resolve('midnight', {
  accent: GROUNDS.midnight.fallbackAccent,
  accentHover: buildPalette('midnight', null).accentHover,
  onAccent: buildPalette('midnight', null).onAccent,
  minContrast: buildPalette('midnight', null).minContrast,
  accentFallback: true,
  groundFromPhoto: false,
  groundReason: 'no palette recorded for this slug',
  photo: { hue: null, saturation: 0, lightness: 0, accentHue: null },
});

function resolve(
  groundId: GroundId,
  rest: Pick<ShopPalette, 'accent' | 'accentHover' | 'onAccent' | 'minContrast' | 'accentFallback' | 'groundFromPhoto' | 'groundReason' | 'photo'>,
): ShopPalette {
  const g = GROUNDS[groundId];
  const cssVars = [
    `--color-ink:${g.ink}`,
    `--color-ink-2:${g.ink2}`,
    `--color-ink-3:${g.ink3}`,
    `--color-cream:${g.cream}`,
    `--color-cream-2:${g.cream2}`,
    `--color-amber:${rest.accent}`,
    `--color-amber-2:${rest.accentHover}`,
    `--color-onaccent:${rest.onAccent}`,
  ].join(';');
  return { ground: groundId, scheme: g.scheme, ink: g.ink, ink2: g.ink2, ink3: g.ink3, cream: g.cream, cream2: g.cream2, cssVars, ...rest };
}

/** This shop's palette. Pure function of committed data. */
export function paletteFor(slug: string): ShopPalette {
  const e = file.shops[slug];
  if (!e) return NEUTRAL;
  const ground = (GROUNDS[e.ground as GroundId] ? e.ground : 'midnight') as GroundId;
  return resolve(ground, {
    accent: e.accent,
    accentHover: e.accentHover,
    onAccent: e.onAccent,
    minContrast: e.minContrast,
    accentFallback: e.accentFallback,
    groundFromPhoto: e.groundFromPhoto,
    groundReason: e.groundReason,
    photo: { hue: e.photoHue, saturation: e.photoSaturation, lightness: e.photoLightness, accentHue: e.accentHue },
  });
}

/** Slugs whose palette fell back rather than coming from their photo. */
export const flaggedSlugs: string[] = file.flagged ?? [];

/**
 * Re-checks every stored palette against WCAG AA. The extractor already refuses
 * to write a failing palette; this is the build-time gate that catches a
 * hand-edited or stale palettes.json before it reaches a page.
 */
export function auditPalettes(): { slug: string; pair: string; ratio: number; needs: number }[] {
  const bad: { slug: string; pair: string; ratio: number; needs: number }[] = [];
  for (const [slug, e] of Object.entries(file.shops)) {
    const g = GROUNDS[(GROUNDS[e.ground as GroundId] ? e.ground : 'midnight') as GroundId];
    for (const a of contrastAudit({
      ground: g.id,
      scheme: g.scheme,
      ink: g.ink,
      ink2: g.ink2,
      ink3: g.ink3,
      cream: g.cream,
      cream2: g.cream2,
      accent: e.accent,
      accentHover: e.accentHover,
      onAccent: e.onAccent,
    })) {
      if (a.ratio < a.needs) bad.push({ slug, pair: a.pair, ratio: a.ratio, needs: a.needs });
    }
  }
  return bad;
}
