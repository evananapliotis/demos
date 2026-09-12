import type { APIRoute } from 'astro';
import { site } from '@config';

/** Lets the site be added to a phone's home screen as an app with the shop's own icon and name. */
export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      name: site.name,
      short_name: site.name,
      description: site.description,
      lang: 'en-GB',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: '#0e0c0a',
      theme_color: '#0e0c0a',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    }),
    { headers: { 'Content-Type': 'application/manifest+json' } },
  );
