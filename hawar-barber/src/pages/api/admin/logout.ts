export const prerender = false;
import type { APIRoute } from 'astro';
import { clearSessionCookie } from '@/lib/session';
export const POST: APIRoute = () => new Response(null, { status: 303, headers: { Location: '/admin', 'Set-Cookie': clearSessionCookie(), 'Cache-Control': 'no-store' } });
