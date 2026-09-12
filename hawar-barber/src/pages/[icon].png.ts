import type { APIRoute, GetStaticPaths } from 'astro';
import sharp from 'sharp';
import { iconSvg } from '@/lib/icon';

/** Home-screen icons referenced by manifest.webmanifest. */
const ICONS: Record<string, { size: number; inset?: number }> = {
  'icon-192': { size: 192 },
  'icon-512': { size: 512 },
  'icon-maskable-512': { size: 512, inset: 0.2 },
};
export const getStaticPaths: GetStaticPaths = () => Object.keys(ICONS).map((icon) => ({ params: { icon } }));
export const GET: APIRoute = async ({ params }) => {
  const png = await sharp(Buffer.from(iconSvg(ICONS[params.icon!]))).png().toBuffer();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
