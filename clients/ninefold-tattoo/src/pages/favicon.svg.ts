import type { APIRoute } from 'astro';
import { markSvg } from '../lib/favicon';
export const GET: APIRoute = () => new Response(markSvg(64), { headers: { 'Content-Type': 'image/svg+xml' } });
