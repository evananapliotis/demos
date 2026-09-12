import type { APIRoute } from 'astro';
import { site } from '@config';
export const GET: APIRoute = () =>
  new Response(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /cancel/\n\nSitemap: ${site.url.replace(/\/$/, '')}/sitemap.xml\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
