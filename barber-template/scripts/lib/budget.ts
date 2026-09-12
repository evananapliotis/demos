/**
 * Encode an image, measure it, and step the quality down until it fits the
 * byte budget. Guarantees the limit instead of hoping for it.
 */
import type { Sharp } from 'sharp';

export type OutputFormat = 'avif' | 'webp' | 'jpeg';

interface Ladder {
  start: number;
  min: number;
  step: number;
}

const LADDERS: Record<OutputFormat, Ladder> = {
  avif: { start: 60, min: 28, step: 4 },
  webp: { start: 78, min: 45, step: 5 },
  jpeg: { start: 82, min: 55, step: 5 },
};

export interface Encoded {
  buffer: Buffer;
  quality: number;
  bytes: number;
  attempts: number;
}

function encoder(image: Sharp, format: OutputFormat, quality: number): Sharp {
  switch (format) {
    case 'avif':
      return image.avif({ quality, effort: 4, chromaSubsampling: '4:2:0' });
    case 'webp':
      return image.webp({ quality, effort: 5, smartSubsample: true });
    case 'jpeg':
      return image.jpeg({ quality, mozjpeg: true, progressive: true });
  }
}

export async function encodeUnderBudget(image: Sharp, format: OutputFormat, budgetBytes: number, label: string): Promise<Encoded> {
  const ladder = LADDERS[format];
  let attempts = 0;
  let smallest: Encoded | null = null;
  for (let quality = ladder.start; quality >= ladder.min; quality -= ladder.step) {
    attempts++;
    const buffer = await encoder(image.clone(), format, quality).toBuffer();
    const result = { buffer, quality, bytes: buffer.length, attempts };
    if (buffer.length <= budgetBytes) return result;
    if (!smallest || buffer.length < smallest.bytes) smallest = result;
  }
  const kb = (n: number) => (n / 1024).toFixed(1);
  throw new Error(
    `${label}: cannot get under ${kb(budgetBytes)}KB as ${format}. Smallest was ${kb(smallest!.bytes)}KB at quality ${smallest!.quality}. ` +
      'Reduce the slot width in src/config/images.ts or pick a less noisy photo.',
  );
}
