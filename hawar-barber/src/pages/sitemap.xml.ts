import type { APIRoute } from 'astro';
import { bookHref } from '@/lib/site';
export const GET: APIRoute = ({ site }) => {
  const urls = [`${site}`, ...(bookHref === '/book' ? [`${site}book`] : [])];
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${u}</loc></url>`).join('')}</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml' } },
  );
};
