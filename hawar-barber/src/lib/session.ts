/** Admin sign-in: a password (ADMIN_PASSWORD secret) and a signed, expiring cookie (SESSION_SECRET secret). */
import type { Env } from './db';

export const COOKIE = 'hb_admin';
export const SESSION_HOURS = 12;

const enc = new TextEncoder();
const b64url = (bytes: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(message)));
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  const ea = enc.encode(a);
  const eb = enc.encode(b);
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return diff === 0;
}

/** A fresh session value: "<expiry unix seconds>.<signature>". */
export async function issueSession(secret: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_HOURS * 3600;
  return `${exp}.${await hmac(secret, `admin:${exp}`)}`;
}
export async function verifySession(secret: string, value: string | null): Promise<boolean> {
  if (!value) return false;
  const [expStr, sig] = value.split('.');
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || !sig || exp < Date.now() / 1000) return false;
  return safeEqual(sig, await hmac(secret, `admin:${exp}`));
}

export function readCookie(request: Request, name: string): string | null {
  const raw = request.headers.get('cookie') ?? '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}
export const setSessionCookie = (value: string) => `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_HOURS * 3600}`;
export const clearSessionCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

/** True when the request carries a valid admin session. */
export async function isAdmin(request: Request, env: Env): Promise<boolean> {
  if (!env.SESSION_SECRET) return false;
  return verifySession(env.SESSION_SECRET, readCookie(request, COOKIE));
}

/** Form posts must come from this site: Origin (or Referer) has to match. */
export function sameOrigin(request: Request): boolean {
  const origin = new URL(request.url).origin;
  const o = request.headers.get('origin');
  if (o) return o === origin;
  const r = request.headers.get('referer');
  if (r) {
    try {
      return new URL(r).origin === origin;
    } catch {
      return false;
    }
  }
  return false;
}
