/**
 * Colour maths for the per-shop palettes: sRGB <-> HSL, WCAG contrast, and the
 * curated grounds a photo can snap to.
 *
 * Pure functions, no I/O and no randomness, so the same photo gives the same
 * palette on every machine. scripts/extract-palettes.ts reads the photos and
 * writes the answers to src/data/palettes.json; the build only ever reads that
 * file, so a page never depends on an image being decoded at build time.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}
export interface Hsl {
  /** 0-360 */
  h: number;
  /** 0-1 */
  s: number;
  /** 0-1 */
  l: number;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function hexToRgb(hex: string): Rgb {
  const h = hex.replace('#', '');
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}

export const rgbToHex = ({ r, g, b }: Rgb): string =>
  `#${[r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('')}`;

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
  else if (max === gn) h = ((bn - rn) / d + 2) * 60;
  else h = ((rn - gn) / d + 4) * 60;
  return { h, s, l };
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const hn = ((h % 360) + 360) % 360;
  if (s === 0) return { r: l * 255, g: l * 255, b: l * 255 };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t: number) => {
    let tn = t;
    if (tn < 0) tn += 1;
    if (tn > 1) tn -= 1;
    if (tn < 1 / 6) return p + (q - p) * 6 * tn;
    if (tn < 1 / 2) return q;
    if (tn < 2 / 3) return p + (q - p) * (2 / 3 - tn) * 6;
    return p;
  };
  const hk = hn / 360;
  return { r: channel(hk + 1 / 3) * 255, g: channel(hk) * 255, b: channel(hk - 1 / 3) * 255 };
}

export const hslToHex = (hsl: Hsl): string => rgbToHex(hslToRgb(hsl));

/** WCAG 2.1 relative luminance. */
export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const lin = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

/** WCAG 2.1 contrast ratio, 1 to 21. */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** The smallest circular distance between two hues, in degrees (0-180). */
export function hueDistance(a: number, b: number): number {
  const d = Math.abs((((a - b) % 360) + 360) % 360);
  return d > 180 ? 360 - d : d;
}

/**
 * The five curated grounds. A photo never picks its own background: it picks
 * one of these, so every page still belongs to the same family of looks and a
 * muddy photo cannot produce a muddy page.
 *
 * `hue` is the ground's own hue, used to snap a photo to the nearest family.
 * Midnight is the neutral fallback and is matched on lightness, not hue.
 */
export interface Ground {
  id: GroundId;
  scheme: 'dark' | 'light';
  /** Null for the neutral fallback, which no photo snaps to by hue. */
  hue: number | null;
  ink: string;
  ink2: string;
  ink3: string;
  /** Body type. */
  cream: string;
  /** Quiet type. */
  cream2: string;
  /** Used when the photo yields no usable accent. */
  fallbackAccent: string;
  /** Candidates for type sitting on an accent ground; the better-contrasting one wins. */
  onAccentCandidates: [string, string];
}

export const GROUND_IDS = ['midnight', 'ivory', 'forest', 'oxblood', 'steel'] as const;
export type GroundId = (typeof GROUND_IDS)[number];

export const GROUNDS: Record<GroundId, Ground> = {
  midnight: {
    id: 'midnight',
    scheme: 'dark',
    hue: null,
    ink: '#0e0c0a',
    ink2: '#15120f',
    ink3: '#1f1a15',
    cream: '#f4eee4',
    cream2: '#b9b0a2',
    fallbackAccent: '#f2a93b',
    onAccentCandidates: ['#0e0c0a', '#f4eee4'],
  },
  ivory: {
    id: 'ivory',
    scheme: 'light',
    hue: 40,
    ink: '#f7f4ee',
    ink2: '#efeae0',
    ink3: '#e4ded1',
    cream: '#14110c',
    cream2: '#6b6355',
    fallbackAccent: '#14110c',
    onAccentCandidates: ['#f7f4ee', '#14110c'],
  },
  forest: {
    id: 'forest',
    scheme: 'dark',
    hue: 155,
    ink: '#0d2a1f',
    ink2: '#123528',
    ink3: '#1a4433',
    cream: '#f2f0e6',
    cream2: '#a7bcaf',
    fallbackAccent: '#e07a5f',
    onAccentCandidates: ['#0d2a1f', '#f2f0e6'],
  },
  oxblood: {
    id: 'oxblood',
    scheme: 'dark',
    hue: 12,
    ink: '#481c15',
    ink2: '#56231a',
    ink3: '#672c21',
    cream: '#f8ead9',
    cream2: '#ccab92',
    fallbackAccent: '#d6884d',
    onAccentCandidates: ['#2e1210', '#f8ead9'],
  },
  steel: {
    id: 'steel',
    scheme: 'light',
    hue: 210,
    ink: '#f4f6f8',
    ink2: '#e9edf2',
    ink3: '#dce3ea',
    cream: '#10161d',
    cream2: '#5b6775',
    fallbackAccent: '#0a53e0',
    onAccentCandidates: ['#ffffff', '#10161d'],
  },
};

/**
 * A photo only chooses its own ground when it has a clear opinion. Measured
 * over all 1107 listings: barbershop interiors are overwhelmingly dark and
 * warm, so snapping every photo to its nearest ground put 61% of shops on
 * Midnight and left Forest and Steel with 19 each — less variety than no
 * photo analysis at all. These thresholds keep the snap for the third of
 * shops whose photo genuinely says something, and spread the rest.
 */
/** A photo needs at least this much median saturation before its hue is allowed to pick a ground. */
export const STRONG_SATURATION = 0.18;
/** And its hue has to be this close to a coloured ground's. */
export const HUE_SNAP_WITHIN = 35;
/** A photo brighter than this takes a light ground even without a strong hue. */
export const BRIGHT_ABOVE = 0.6;
/** A photo darker than this takes the darkest ground. */
export const DARK_BELOW = 0.28;

/** The three grounds a hue can snap to. Midnight and Ivory are the neutrals. */
const COLOURED: [GroundId, number][] = [
  ['oxblood', 12],
  ['forest', 155],
  ['steel', 210],
];

export interface GroundChoice {
  ground: GroundId;
  /** True when the photo itself chose; false when it had nothing to say and the slug spread it. */
  fromPhoto: boolean;
  reason: string;
}

/**
 * Which ground a shop gets. The photo decides when it is strongly coloured,
 * clearly bright or clearly dark; otherwise the slug spreads it evenly across
 * the five, so a town full of dim warm interiors does not become a town full of
 * identical pages. `spread` is an integer derived from the slug by the caller.
 */
export function snapGround(photo: { hue: number | null; saturation: number; lightness: number } | null, spread: number): GroundChoice {
  if (photo && photo.hue !== null) {
    if (photo.saturation >= STRONG_SATURATION) {
      let best: { id: GroundId; d: number } | null = null;
      for (const [id, hue] of COLOURED) {
        const d = hueDistance(photo.hue, hue);
        if (!best || d < best.d) best = { id, d };
      }
      if (best && best.d <= HUE_SNAP_WITHIN) {
        return { ground: best.id, fromPhoto: true, reason: `photo is strongly ${Math.round(photo.hue)}° (saturation ${photo.saturation.toFixed(2)}), within ${HUE_SNAP_WITHIN}° of ${best.id}` };
      }
    }
    if (photo.lightness > BRIGHT_ABOVE) {
      const warm = photo.hue < 90 || photo.hue > 300;
      return { ground: warm ? 'ivory' : 'steel', fromPhoto: true, reason: `bright photo (lightness ${photo.lightness.toFixed(2)}), ${warm ? 'warm' : 'cool'} at ${Math.round(photo.hue)}°` };
    }
    if (photo.lightness < DARK_BELOW) {
      return { ground: 'midnight', fromPhoto: true, reason: `dark photo (lightness ${photo.lightness.toFixed(2)})` };
    }
  }
  const ground = GROUND_IDS[((spread % GROUND_IDS.length) + GROUND_IDS.length) % GROUND_IDS.length]!;
  return { ground, fromPhoto: false, reason: photo && photo.hue !== null ? 'photo has no clear colour of its own; ground spread by slug' : 'no photo colour; ground spread by slug' };
}

export interface Palette {
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
  /** Lowest contrast ratio among every pair the stylesheet actually uses. */
  minContrast: number;
  /** Set when the photo's own accent could not be made readable and the ground's default was used. */
  accentFallback: boolean;
  notes: string[];
}

/** Every foreground/background pair the stylesheet actually puts together, with the ratio each needs. */
export function contrastAudit(p: Omit<Palette, 'minContrast' | 'notes' | 'accentFallback'>): { pair: string; ratio: number; needs: number }[] {
  return [
    { pair: 'body type on the ground', ratio: contrast(p.cream, p.ink), needs: 4.5 },
    { pair: 'body type on the raised ground', ratio: contrast(p.cream, p.ink2), needs: 4.5 },
    { pair: 'quiet type on the ground', ratio: contrast(p.cream2, p.ink), needs: 4.5 },
    { pair: 'quiet type on the raised ground', ratio: contrast(p.cream2, p.ink2), needs: 4.5 },
    // Eyebrows and inline links are small text and sit on both grounds.
    { pair: 'accent on the ground', ratio: contrast(p.accent, p.ink), needs: 4.5 },
    { pair: 'accent on the raised ground', ratio: contrast(p.accent, p.ink2), needs: 4.5 },
    { pair: 'accent hover on the ground', ratio: contrast(p.accentHover, p.ink), needs: 4.5 },
    { pair: 'type on an accent ground', ratio: contrast(p.onAccent, p.accent), needs: 4.5 },
  ];
}

/** The AA floor every pair has to clear. */
export const AA = 4.5;

/**
 * An accent in the photo's own hue, pushed to a lightness that reads on this
 * ground. The hue is the shop's; saturation and lightness are ours, because a
 * photo's own saturation and lightness are almost never readable as type.
 *
 * Returns null when no lightness in range clears AA on every pair, which is the
 * signal to fall back to the ground's own accent and flag the shop.
 */
export function deriveAccent(ground: Ground, hue: number, photoSaturation: number): { accent: string; accentHover: string; onAccent: string } | null {
  const dark = ground.scheme === 'dark';
  // A photo's saturation only nudges the accent's; the readable band is narrow.
  const saturation = clamp(0.42 + photoSaturation * 0.45, dark ? 0.45 : 0.5, dark ? 0.85 : 0.92);
  // Accents read light on a dark ground and dark on a light one.
  const target = dark ? 0.62 : 0.4;
  const candidates: number[] = [];
  for (let step = 0; step <= 60; step++) {
    const up = target + step * 0.01;
    const down = target - step * 0.01;
    if (up <= 0.92) candidates.push(up);
    if (step > 0 && down >= 0.14) candidates.push(down);
  }
  for (const l of candidates) {
    const accent = hslToHex({ h: hue, s: saturation, l });
    // The hover state moves away from the ground, so it can only gain contrast.
    const accentHover = hslToHex({ h: hue, s: saturation, l: clamp(dark ? l + 0.09 : l - 0.09, 0.08, 0.96) });
    const onAccent = ground.onAccentCandidates.reduce((best, c) => (contrast(c, accent) > contrast(best, accent) ? c : best));
    const audit = contrastAudit({
      ground: ground.id,
      scheme: ground.scheme,
      ink: ground.ink,
      ink2: ground.ink2,
      ink3: ground.ink3,
      cream: ground.cream,
      cream2: ground.cream2,
      accent,
      accentHover,
      onAccent,
    });
    if (audit.every((a) => a.ratio >= a.needs)) return { accent, accentHover, onAccent };
  }
  return null;
}

/** The finished palette for a ground and a photo hue, falling back to the ground's own accent when the photo's cannot be made readable. */
export function buildPalette(groundId: GroundId, photo: { hue: number; saturation: number } | null): Palette {
  const ground = GROUNDS[groundId];
  const notes: string[] = [];
  let derived = photo ? deriveAccent(ground, photo.hue, photo.saturation) : null;
  let accentFallback = false;
  if (!derived) {
    accentFallback = true;
    notes.push(photo ? `no readable accent at hue ${Math.round(photo.hue)}°; used the ground's own accent` : "no photo colour; used the ground's own accent");
    const accent = ground.fallbackAccent;
    const { h, s, l } = rgbToHsl(hexToRgb(accent));
    const accentHover = hslToHex({ h, s, l: clamp(ground.scheme === 'dark' ? l + 0.09 : l - 0.09, 0.08, 0.96) });
    const onAccent = ground.onAccentCandidates.reduce((best, c) => (contrast(c, accent) > contrast(best, accent) ? c : best));
    derived = { accent, accentHover, onAccent };
  }
  const base = {
    ground: groundId,
    scheme: ground.scheme,
    ink: ground.ink,
    ink2: ground.ink2,
    ink3: ground.ink3,
    cream: ground.cream,
    cream2: ground.cream2,
    ...derived,
  };
  const audit = contrastAudit(base);
  return { ...base, minContrast: Math.min(...audit.map((a) => a.ratio)), accentFallback, notes };
}
