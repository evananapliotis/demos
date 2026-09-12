/**
 * HTTP Basic auth for /admin. Any username; the password is the ADMIN_PASSWORD secret.
 * Wrong guesses are counted per connection in D1: after 10 in 15 minutes the door stays shut for a while.
 */
import type { Env } from './db';
import { ensureSchema, allowAuthAttempt, clearAuthAttempts, ipKey } from './db';

const MAX_FAILURES = 10;
const WINDOW_MINUTES = 15;

function safeEqual(a: string, b: string) {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return diff === 0;
}

/** Browsers send Basic credentials as UTF-8; atob gives one char per byte, so decode the bytes properly. */
function decodeBasic(encoded: string): string | null {
  try {
    const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

const NO_STORE = {
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
};
const TEXT = { ...NO_STORE, 'Content-Type': 'text/plain; charset=utf-8' };

/** Returns a Response to send instead of the page when access is denied, or null when the request is allowed. */
export async function requireAdmin(request: Request, env: Env): Promise<Response | null> {
  if (!env.ADMIN_PASSWORD) {
    return new Response('Admin is switched off: set the ADMIN_PASSWORD secret on the Cloudflare Pages project.', { status: 503, headers: TEXT });
  }
  const ip = ipKey(request.headers.get('cf-connecting-ip') ?? '');
  const header = request.headers.get('authorization') ?? '';
  // Every request that presents credentials counts as an attempt, atomically, before we look at the password.
  if (header && env.DB && ip) {
    try {
      await ensureSchema(env.DB);
      if (!(await allowAuthAttempt(env.DB, ip, MAX_FAILURES, WINDOW_MINUTES))) {
        return new Response('Too many sign-in attempts. Try again in 15 minutes.', { status: 429, headers: { ...TEXT, 'Retry-After': String(WINDOW_MINUTES * 60) } });
      }
    } catch (e) {
      console.error('auth lockout check failed', e); // D1 trouble degrades to the plain password check
    }
  }
  const [scheme, encoded] = header.split(' ');
  let ok = false;
  if (scheme === 'Basic' && encoded) {
    const decoded = decodeBasic(encoded);
    if (decoded !== null) ok = safeEqual(decoded.slice(decoded.indexOf(':') + 1), env.ADMIN_PASSWORD);
  }
  if (ok) {
    if (env.DB && ip) await clearAuthAttempts(env.DB, ip).catch(() => {});
    return null;
  }
  return new Response('Sign in to see booking requests.', {
    status: 401,
    headers: { ...TEXT, 'WWW-Authenticate': 'Basic realm="Booking requests", charset="UTF-8"' },
  });
}

export const noStoreHeaders = NO_STORE;
