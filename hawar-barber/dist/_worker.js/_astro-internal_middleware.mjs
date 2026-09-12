globalThis.process ??= {}; globalThis.process.env ??= {};
import { e as defineMiddleware, s as sequence } from './chunks/render-context_DyRPtzpJ.mjs';
import './chunks/astro-designed-error-pages_CMUbXwvU.mjs';
import './chunks/astro/server_BPPHHGCN.mjs';

const onRequest$2 = defineMiddleware(async (ctx, next) => {
  const res = await next();
  if (ctx.isPrerendered) return res;
  const sensitive = ctx.url.pathname.startsWith("/admin") || ctx.url.pathname.startsWith("/api/");
  const set = (h) => {
    h.set("X-Content-Type-Options", "nosniff");
    h.set("Referrer-Policy", "strict-origin-when-cross-origin");
    if (!h.has("X-Frame-Options")) h.set("X-Frame-Options", sensitive ? "DENY" : "SAMEORIGIN");
    if (sensitive && !h.has("Cache-Control")) h.set("Cache-Control", "no-store");
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

const onRequest$1 = (context, next) => {
  if (context.isPrerendered) {
    context.locals.runtime ??= {
      env: process.env
    };
  }
  return next();
};

const onRequest = sequence(
	onRequest$1,
	onRequest$2
	
);

export { onRequest };
