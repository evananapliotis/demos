/** /example/og.jpg: the link-preview image for the fictional shop page. */
import type { APIRoute } from 'astro';
import { mockSite } from '../../lib/home.ts';
import { renderOg } from '../../lib/og.ts';

export const GET: APIRoute = async () => new Response(new Uint8Array(await renderOg(mockSite)), { headers: { 'Content-Type': 'image/jpeg' } });
