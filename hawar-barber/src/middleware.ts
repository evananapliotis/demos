/** Security headers for responses the Worker renders (/api/*, /admin). Static pages get theirs from public/_headers. */
import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (ctx, next) => {
  const res = await next();
  if (ctx.isPrerendered) return res;
  const sensitive = ctx.url.pathname.startsWith('/admin') || ctx.url.pathname.startsWith('/api/');
  const set = (h: Headers) => {
    h.set('X-Content-Type-Options', 'nosniff');
    h.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (!h.has('X-Frame-Options')) h.set('X-Frame-Options', sensitive ? 'DENY' : 'SAMEORIGIN');
    if (sensitive && !h.has('Cache-Control')) h.set('Cache-Control', 'no-store');
  };
  try {
    set(res.headers);
    return res;
  } catch {
    const copy = new Response(res.body, res);
    set(copy.headers);
    return copy;
  }
});
