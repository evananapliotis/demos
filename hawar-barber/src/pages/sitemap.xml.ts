import type { APIRoute } from 'astro';
import { site } from '@config';
const base = site.url.replace(/\/$/, '');
const urls = ['/', ...(site.booking.enabled ? ['/book'] : [])];
export const GET: APIRoute = () =>
  new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${base}${u === '/' ? '/' : u}</loc></url>`).join('\n')}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
