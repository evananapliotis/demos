import type { APIRoute } from 'astro';
import { client } from '../lib/client';
import { faviconSvg } from '../lib/favicon';

export const GET: APIRoute = () =>
  new Response(faviconSvg(client.name, client.accent), { headers: { 'Content-Type': 'image/svg+xml' } });
