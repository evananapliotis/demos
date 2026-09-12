globalThis.process ??= {}; globalThis.process.env ??= {};
import { i as ipKey, e as ensureSchema, c as countAuthFailures, r as recordAuthFailure } from './db_VqQ1ezT4.mjs';

const MAX_FAILURES = 10;
const WINDOW_MINUTES = 15;
function safeEqual(a, b) {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return diff === 0;
}
function decodeBasic(encoded) {
  try {
    const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}
const NO_STORE = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy": "frame-ancestors 'none'",
  "X-Content-Type-Options": "nosniff"
};
const TEXT = { ...NO_STORE, "Content-Type": "text/plain; charset=utf-8" };
async function requireAdmin(request, env) {
  if (!env.ADMIN_PASSWORD) {
    return new Response("Admin is switched off: set the ADMIN_PASSWORD secret on the Cloudflare Pages project.", { status: 503, headers: TEXT });
  }
  const ip = ipKey(request.headers.get("cf-connecting-ip") ?? "");
  if (env.DB && ip) {
    await ensureSchema(env.DB);
    if (await countAuthFailures(env.DB, ip, WINDOW_MINUTES) >= MAX_FAILURES) {
      return new Response("Too many sign-in attempts. Try again in 15 minutes.", { status: 429, headers: { ...TEXT, "Retry-After": String(WINDOW_MINUTES * 60) } });
    }
  }
  const header = request.headers.get("authorization") ?? "";
  const [scheme, encoded] = header.split(" ");
  let ok = false;
  if (scheme === "Basic" && encoded) {
    const decoded = decodeBasic(encoded);
    if (decoded !== null) ok = safeEqual(decoded.slice(decoded.indexOf(":") + 1), env.ADMIN_PASSWORD);
  }
  if (ok) return null;
  if (header && env.DB && ip) await recordAuthFailure(env.DB, ip);
  return new Response("Sign in to see booking requests.", {
    status: 401,
    headers: { ...TEXT, "WWW-Authenticate": 'Basic realm="Booking requests", charset="UTF-8"' }
  });
}
const noStoreHeaders = NO_STORE;

export { noStoreHeaders as n, requireAdmin as r };
