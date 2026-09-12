/** Cloudflare D1 access for booking requests. The table is created on first use, so no manual migration. */
import type { BookingValues, Status } from './booking';

export interface Env {
  /** D1 binding named DB (Pages → Settings → Bindings). Without it, /book falls back to text/call. */
  DB?: D1Database;
  /** Password for /admin (any username). Unset = admin page disabled. */
  ADMIN_PASSWORD?: string;
  /** Optional: email each request via Resend. */
  RESEND_API_KEY?: string;
  BOOKINGS_EMAIL?: string;
  BOOKINGS_FROM?: string;
}

export interface BookingRow extends BookingValues {
  id: string;
  created_at: string;
  status: Status;
  ip: string;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    day TEXT NOT NULL,
    time TEXT NOT NULL,
    service TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    ip TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE INDEX IF NOT EXISTS bookings_status_day ON bookings(status, day, time)`,
  `CREATE INDEX IF NOT EXISTS bookings_ip_created ON bookings(ip, created_at)`,
  `CREATE INDEX IF NOT EXISTS bookings_created ON bookings(created_at)`,
  `CREATE TABLE IF NOT EXISTS auth_failures (ip TEXT NOT NULL, ts TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS auth_failures_ip_ts ON auth_failures(ip, ts)`,
];

/** Rate-limit key: whole IPv4 address, /64 for IPv6 (one home connection), so rotating the low bits does not help. */
export function ipKey(ip: string): string {
  const s = ip.trim().toLowerCase();
  if (!s) return '';
  if (!s.includes(':')) return s;
  const [l, r = ''] = s.split('::');
  const left = l ? l.split(':') : [];
  const right = r ? r.split(':') : [];
  const groups = s.includes('::') ? [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill('0'), ...right] : left;
  return `${groups.slice(0, 4).map((h) => (parseInt(h || '0', 16) || 0).toString(16)).join(':')}::/64`;
}

/**
 * Insert a request unless the caller (per /64 or IPv4) or the whole site has hit its brake.
 * One statement, so concurrent requests cannot all slip under the count. Returns false when refused.
 */
export async function insertBookingLimited(db: D1Database, row: Omit<BookingRow, 'created_at' | 'status'>): Promise<boolean> {
  const created = new Date().toISOString();
  const ipSince = new Date(Date.now() - LIMITS.perIpMinutes * 60_000).toISOString();
  const globalSince = new Date(Date.now() - LIMITS.globalMinutes * 60_000).toISOString();
  const r = await db
    .prepare(
      `INSERT INTO bookings (id, created_at, name, phone, day, time, service, notes, status, ip)
       SELECT ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?
       WHERE (SELECT COUNT(*) FROM bookings WHERE ip = ? AND created_at > ?) < ?
         AND (SELECT COUNT(*) FROM bookings WHERE created_at > ?) < ?`,
    )
    .bind(row.id, created, row.name, row.phone, row.day, row.time, row.service, row.notes, row.ip, row.ip, ipSince, LIMITS.perIp, globalSince, LIMITS.global)
    .run();
  return (r.meta?.changes ?? 0) > 0;
}

/**
 * Count one sign-in attempt and say whether the connection is still allowed: a single INSERT…SELECT,
 * so a burst of parallel guesses cannot all slip under the cap. Returns false when locked out.
 */
export async function allowAuthAttempt(db: D1Database, ip: string, max: number, minutes: number): Promise<boolean> {
  if (!ip) return true;
  const now = new Date();
  const since = new Date(now.getTime() - minutes * 60_000).toISOString();
  const r = await db
    .prepare('INSERT INTO auth_failures (ip, ts) SELECT ?, ? WHERE (SELECT COUNT(*) FROM auth_failures WHERE ip = ? AND ts > ?) < ?')
    .bind(ip, now.toISOString(), ip, since, max)
    .run();
  return (r.meta?.changes ?? 0) > 0;
}
/** A correct password clears the connection's attempts (and prunes old rows while we are here). */
export async function clearAuthAttempts(db: D1Database, ip: string) {
  const dayAgo = new Date(Date.now() - 24 * 3600_000).toISOString();
  await db.batch([db.prepare('DELETE FROM auth_failures WHERE ip = ?').bind(ip), db.prepare('DELETE FROM auth_failures WHERE ts < ?').bind(dayAgo)]);
}
