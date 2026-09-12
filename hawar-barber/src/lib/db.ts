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
  const [head] = s.split('::');
  const hextets = head.split(':').filter(Boolean);
  while (hextets.length < 4) hextets.push('0');
  return `${hextets.slice(0, 4).join(':')}::/64`;
}

const ready = new WeakSet<D1Database>();
export async function ensureSchema(db: D1Database) {
  if (ready.has(db)) return;
  await db.batch(SCHEMA.map((sql) => db.prepare(sql)));
  ready.add(db);
}

export const LIMITS = { perIp: 5, perIpMinutes: 15, global: 40, globalMinutes: 60 };

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

/** Failed admin sign-ins from one connection in the last N minutes. */
export async function countAuthFailures(db: D1Database, ip: string, minutes: number): Promise<number> {
  if (!ip) return 0;
  const since = new Date(Date.now() - minutes * 60_000).toISOString();
  const r = await db.prepare('SELECT COUNT(*) AS n FROM auth_failures WHERE ip = ? AND ts > ?').bind(ip, since).first<{ n: number }>();
  return r?.n ?? 0;
}
export async function recordAuthFailure(db: D1Database, ip: string) {
  if (!ip) return;
  const now = new Date();
  await db.batch([
    db.prepare('INSERT INTO auth_failures (ip, ts) VALUES (?, ?)').bind(ip, now.toISOString()),
    db.prepare('DELETE FROM auth_failures WHERE ts < ?').bind(new Date(now.getTime() - 24 * 3600_000).toISOString()),
  ]);
}

export async function listBookings(db: D1Database, limit = 300): Promise<BookingRow[]> {
  const r = await db
    .prepare(
      `SELECT id, created_at, name, phone, day, time, service, notes, status, ip FROM bookings
       ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'confirmed' THEN 1 WHEN 'declined' THEN 2 ELSE 3 END, day, time
       LIMIT ?`,
    )
    .bind(limit)
    .all<BookingRow>();
  return r.results ?? [];
}

export async function setStatus(db: D1Database, id: string, status: Status) {
  const r = await db.prepare('UPDATE bookings SET status = ? WHERE id = ?').bind(status, id).run();
  return (r.meta?.changes ?? 0) > 0;
}
