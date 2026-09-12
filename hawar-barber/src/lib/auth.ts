/** HTTP Basic auth for /admin. Any username; the password is the ADMIN_PASSWORD secret. */
import type { Env } from './db';

function safeEqual(a: string, b: string) {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return diff === 0;
}

const NO_STORE = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' };

/** Returns a Response to send instead of the page when access is denied, or null when the request is allowed. */
export function requireAdmin(request: Request, env: Env): Response | null {
  if (!env.ADMIN_PASSWORD) {
    return new Response('Admin is switched off: set the ADMIN_PASSWORD secret on the Cloudflare Pages project.', { status: 503, headers: { ...NO_STORE, 'Content-Type': 'text/plain; charset=utf-8' } });
  }
  const header = request.headers.get('authorization') ?? '';
  const [scheme, encoded] = header.split(' ');
  let ok = false;
  if (scheme === 'Basic' && encoded) {
    try {
      const decoded = atob(encoded);
      const pass = decoded.slice(decoded.indexOf(':') + 1);
      ok = safeEqual(pass, env.ADMIN_PASSWORD);
    } catch {
      ok = false;
    }
  }
  if (ok) return null;
  return new Response('Sign in to see booking requests.', {
    status: 401,
    headers: { ...NO_STORE, 'WWW-Authenticate': 'Basic realm="Booking requests", charset="UTF-8"', 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

export const noStoreHeaders = NO_STORE;
