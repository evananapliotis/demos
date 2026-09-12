/**
 * Runs on every request the Worker renders (static pages are served by the assets layer and get public/_headers).
 *  - security headers, no caching on anything personal
 *  - /api/admin/* needs a valid admin session (except sign-in)
 *  - every POST under /api must come from this site (Origin / Referer)
 */
import { defineMiddleware } from 'astro:middleware';
import { isAdmin, sameOrigin } from '@/lib/session';

export const onRequest = defineMiddleware(async (ctx, next) => {
  if (ctx.isPrerendered) return next();
  const { pathname } = ctx.url;
  const env = ctx.locals.runtime?.env;

  if (ctx.request.method === 'POST' && pathname.startsWith('/api/') && !sameOrigin(ctx.request)) {
    return new Response(JSON.stringify({ error: 'bad_origin' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }
  if (pathname.startsWith('/api/admin/') && pathname !== '/api/admin/login') {
    if (!env || !(await isAdmin(ctx.request, env))) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    }
  }

  const res = await next();
  const personal = pathname.startsWith('/admin') || pathname.startsWith('/api/') || pathname.startsWith('/cancel/');
  const apply = (h: Headers) => {
    h.set('X-Content-Type-Options', 'nosniff');
    h.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (!h.has('X-Frame-Options')) h.set('X-Frame-Options', personal ? 'DENY' : 'SAMEORIGIN');
    if (personal) {
      h.set('Cache-Control', 'no-store');
      h.set('X-Robots-Tag', 'noindex, nofollow');
    }
  };
  try {
    apply(res.headers);
    return res;
  } catch {
    const copy = new Response(res.body, res);
    apply(copy.headers);
    return copy;
  }
});
