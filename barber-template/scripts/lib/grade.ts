/**
 * The grade. One pipeline, tuned once, applied to every photo on the site so
 * that pictures from many photographers read as a single shoot.
 *
 * Steps, in the order they are applied:
 *   1. Auto-rotate from EXIF, crop to the slot's aspect at the target width.
 *   2. Desaturate by 15%.
 *   3. Per-channel linear adjust: lifts blacks to a warm near-black and pulls
 *      the gain below 1 so whites go cream instead of clipping. This is the
 *      amber cast.
 *   4. Multiply a radial vignette over the frame.
 *
 * sharp applies operations in a fixed internal order regardless of call
 * order (composite runs before linear), so the pipeline is staged through
 * raw buffers to make the order above the real one.
 */
import sharp, { type Sharp } from 'sharp';
import type { Focal } from '../../src/config/images.ts';

export const LOOK = {
  /** 1 = untouched. 0.85 removes 15% of the colour. */
  saturation: 0.85,
  /** Per-channel multiplier (r, g, b). Below 1 keeps highlights off the ceiling. */
  gain: [0.94, 0.93, 0.9] as const,
  /** Per-channel offset in 0-255 (r, g, b). Pure black becomes this warm dark. */
  lift: [18, 15, 11] as const,
  vignette: {
    /** 0 = none, 1 = corners fully black. */
    strength: 0.32,
    /** Fraction of the radius left untouched in the middle. */
    inner: 0.55,
    /** Gradient radius relative to the frame. 0.78 reaches the corners. */
    radius: 0.78,
  },
} as const;

export interface Frame {
  width: number;
  height: number;
  focal: Focal;
}

export interface GradeOptions {
  /** false = geometry only, no grade. Used for placeholder "before" images. */
  graded?: boolean;
}

function vignetteSvg(width: number, height: number): string {
  const { strength, inner, radius } = LOOK.vignette;
  const edge = Math.round(255 * (1 - strength));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <radialGradient id="v" cx="50%" cy="50%" r="${(radius * 100).toFixed(1)}%">
      <stop offset="${(inner * 100).toFixed(1)}%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="rgb(${edge},${edge},${edge})"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#v)"/>
</svg>`;
}

/**
 * Returns a sharp instance holding the finished, uncompressed frame. The caller
 * picks the encoder; clone() it to try several qualities.
 */
export async function grade(source: string | Buffer, frame: Frame, { graded = true }: GradeOptions = {}): Promise<Sharp> {
  const { width, height, focal } = frame;

  let stage = sharp(source, { failOn: 'none', limitInputPixels: false })
    .rotate()
    .resize(width, height, { fit: 'cover', position: focal })
    .toColourspace('srgb')
    .removeAlpha();

  if (graded) {
    stage = stage.modulate({ saturation: LOOK.saturation }).linear([...LOOK.gain], [...LOOK.lift]);
  }

  const colour = await stage.raw().toBuffer({ resolveWithObject: true });
  const rawInput = { raw: { width: colour.info.width, height: colour.info.height, channels: colour.info.channels } };

  if (!graded) return sharp(colour.data, rawInput);

  const vignetted = await sharp(colour.data, rawInput)
    .composite([{ input: Buffer.from(vignetteSvg(width, height)), blend: 'multiply' }])
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return sharp(vignetted.data, { raw: { width: vignetted.info.width, height: vignetted.info.height, channels: vignetted.info.channels } });
}
