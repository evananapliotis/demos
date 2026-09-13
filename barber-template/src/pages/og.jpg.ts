/** /og.jpg: the front page's link-preview image, rendered at build time. */
import type { APIRoute } from 'astro';
import { renderHomeOg } from '../lib/og.ts';

export const GET: APIRoute = async () => new Response(new Uint8Array(await renderHomeOg()), { headers: { 'Content-Type': 'image/jpeg' } });
