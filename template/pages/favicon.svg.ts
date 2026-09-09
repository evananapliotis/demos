import type { APIRoute } from 'astro';
import { site } from '@/lib/client';

export const GET: APIRoute = () => {
  const letter = site.name.trim()[0]?.toUpperCase() ?? 'B';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#0b0a08"/><text x="32" y="45" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="40" font-weight="700" fill="#d3a94c">${letter}</text></svg>`;
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
};
