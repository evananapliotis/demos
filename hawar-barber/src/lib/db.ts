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
];

const ready = new WeakSet<D1Database>();
export async function ensureSchema(db: D1Database) {
  if (ready.has(db)) return;
  await db.batch(SCHEMA.map((sql) => db.prepare(sql)));
  ready.add(db);
}

export async function insertBooking(db: D1Database, row: Omit<BookingRow, 'created_at' | 'status'>) {
  const created = new Date().toISOString();
  await db
    .prepare('INSERT INTO bookings (id, created_at, name, phone, day, time, service, notes, status, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(row.id, created, row.name, row.phone, row.day, row.time, row.service, row.notes, 'pending', row.ip)
    .run();
  return created;
}

/** Requests from one IP in the last N minutes (simple abuse brake). */
export async function countRecent(db: D1Database, ip: string, minutes: number): Promise<number> {
  if (!ip) return 0;
  const since = new Date(Date.now() - minutes * 60_000).toISOString();
  const r = await db.prepare('SELECT COUNT(*) AS n FROM bookings WHERE ip = ? AND created_at > ?').bind(ip, since).first<{ n: number }>();
  return r?.n ?? 0;
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
