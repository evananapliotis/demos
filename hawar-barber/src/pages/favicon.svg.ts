import type { APIRoute } from 'astro';
import { iconSvg } from '@/lib/icon';
export const GET: APIRoute = () => new Response(iconSvg({ size: 64, radius: 14 }), { headers: { 'Content-Type': 'image/svg+xml' } });
