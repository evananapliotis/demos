/**
 * /og.jpg: the front page's link-preview image, rendered at build time. It
 * follows whatever the front page is — the client's shop on a CLIENT_SLUG
 * build, the MyBarberSite offer otherwise.
 */
import type { APIRoute } from 'astro';
import { derive } from '../lib/demo.ts';
import { renderHomeOg, renderOg } from '../lib/og.ts';
import { clientShop } from '../lib/shops.ts';

export const GET: APIRoute = async () =>
  new Response(new Uint8Array(clientShop ? await renderOg(derive(clientShop)) : await renderHomeOg()), { headers: { 'Content-Type': 'image/jpeg' } });
