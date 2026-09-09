import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { site } from '@/lib/client';

export const GET: APIRoute = async () => {
  const letter = site.name.trim()[0]?.toUpperCase() ?? 'B';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><rect width="180" height="180" fill="#0b0a08"/><text x="90" y="126" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="112" font-weight="700" fill="#d3a94c">${letter}</text></svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};
