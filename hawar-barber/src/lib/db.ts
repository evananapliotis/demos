/** Cloudflare D1 access. Every write that occupies time goes through one atomic batch, so overlaps are impossible. */
import type { D1Database } from '@cloudflare/workers-types';
import type { Occupied } from './booking';
export type { D1Database };

export interface Env {
  /** D1 binding named DB (wrangler.toml). */
  DB: D1Database;
  /** Secrets (wrangler secret put …; .dev.vars locally). */
  ADMIN_PASSWORD?: string;
  SESSION_SECRET?: string;
  RESEND_API_KEY?: string;
  /** Where new-booking emails go. */
  SHOP_EMAIL?: string;
  /** Sender, e.g. "HAWAR BARBER <bookings@hawarbarbers.co.uk>" once the domain is verified in Resend. */
  MAIL_FROM?: string;
}

export interface BookingRow {
  id: string; token: string; chair: number; service_id: string; service_name: string; minutes: number;
  start_utc: string; end_utc: string; local_date: string; local_time: string;
  name: string; phone: string; email: string | null; status: 'confirmed' | 'cancelled';
  created_at: string; cancelled_at: string | null; cancelled_by: string | null; ip_key: string;
}
export interface BlockRow {
  id: string; start_utc: string; end_utc: string; local_date: string; local_from: string; local_to: string; note: string; created_at: string;
}
export type NewBooking = Omit<BookingRow, 'status' | 'created_at' | 'cancelled_at' | 'cancelled_by'>;
export type NewBlock = Omit<BlockRow, 'created_at'>;

const nowIso = () => new Date().toISOString();
const isConflict = (e: unknown) => /UNIQUE|PRIMARY KEY|constraint/i.test(String((e as Error)?.message ?? e));

/** Occupied cells per chair in [fromCell, toCell). */
export async function occupied(db: D1Database, fromCell: number, toCell: number): Promise<Occupied> {
  const r = await db.prepare('SELECT chair, cell_start FROM cells WHERE cell_start >= ? AND cell_start < ?').bind(fromCell, toCell).all<{ chair: number; cell_start: number }>();
  const occ: Occupied = new Map();
  for (const row of r.results ?? []) {
    if (!occ.has(row.chair)) occ.set(row.chair, new Set());
    occ.get(row.chair)!.add(row.cell_start);
  }
  return occ;
}

/** Inserts the booking and all of its cells atomically. 'taken' when any cell is already occupied. */
export async function insertBooking(db: D1Database, b: NewBooking, cells: number[]): Promise<'ok' | 'taken'> {
  const stmts = [
    db
      .prepare(
        `INSERT INTO bookings (id, token, chair, service_id, service_name, minutes, start_utc, end_utc, local_date, local_time, name, phone, email, status, created_at, ip_key)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?)`,
      )
      .bind(b.id, b.token, b.chair, b.service_id, b.service_name, b.minutes, b.start_utc, b.end_utc, b.local_date, b.local_time, b.name, b.phone, b.email, nowIso(), b.ip_key),
    ...cells.map((c) => db.prepare('INSERT INTO cells (chair, cell_start, booking_id) VALUES (?, ?, ?)').bind(b.chair, c, b.id)),
  ];
  try {
    await db.batch(stmts);
    return 'ok';
  } catch (e) {
    if (isConflict(e)) return 'taken';
    throw e;
  }
}

export async function bookingByToken(db: D1Database, token: string): Promise<BookingRow | null> {
  return (await db.prepare('SELECT * FROM bookings WHERE token = ?').bind(token).first<BookingRow>()) ?? null;
}
export async function bookingById(db: D1Database, id: string): Promise<BookingRow | null> {
  return (await db.prepare('SELECT * FROM bookings WHERE id = ?').bind(id).first<BookingRow>()) ?? null;
}

/** Marks a confirmed booking cancelled and frees its cells. False when it was not confirmed (already cancelled or unknown). */
export async function cancelBooking(db: D1Database, id: string, by: 'customer' | 'admin'): Promise<boolean> {
  const r = await db.batch([
    db.prepare(`UPDATE bookings SET status = 'cancelled', cancelled_at = ?, cancelled_by = ? WHERE id = ? AND status = 'confirmed'`).bind(nowIso(), by, id),
    db.prepare('DELETE FROM cells WHERE booking_id = ?').bind(id),
  ]);
  return (r[0]?.meta?.changes ?? 0) > 0;
}

export async function bookingsOn(db: D1Database, dates: string[]): Promise<BookingRow[]> {
  if (!dates.length) return [];
  const r = await db
    .prepare(`SELECT * FROM bookings WHERE status = 'confirmed' AND local_date IN (${dates.map(() => '?').join(',')}) ORDER BY start_utc, chair`)
    .bind(...dates)
    .all<BookingRow>();
  return r.results ?? [];
}

export async function activeBookingsForPhone(db: D1Database, phone: string): Promise<number> {
  const r = await db.prepare(`SELECT COUNT(*) AS n FROM bookings WHERE phone = ? AND status = 'confirmed' AND end_utc > ?`).bind(phone, nowIso()).first<{ n: number }>();
  return r?.n ?? 0;
}

/** Confirmed bookings overlapping [fromCell, toCell), for telling the admin what a block-out would collide with. */
export async function bookingsOverlapping(db: D1Database, fromCell: number, toCell: number): Promise<BookingRow[]> {
  const r = await db
    .prepare(`SELECT DISTINCT b.* FROM bookings b JOIN cells c ON c.booking_id = b.id WHERE c.cell_start >= ? AND c.cell_start < ? AND b.status = 'confirmed' ORDER BY b.start_utc`)
    .bind(fromCell, toCell)
    .all<BookingRow>();
  return r.results ?? [];
}

/** Inserts a block-out and its cells on every chair, atomically. 'taken' when anything already occupies that time. */
export async function insertBlock(db: D1Database, b: NewBlock, cellsByChair: Map<number, number[]>): Promise<'ok' | 'taken'> {
  const stmts = [
    db.prepare('INSERT INTO blocks (id, start_utc, end_utc, local_date, local_from, local_to, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(b.id, b.start_utc, b.end_utc, b.local_date, b.local_from, b.local_to, b.note, nowIso()),
  ];
  for (const [chair, cells] of cellsByChair) for (const c of cells) stmts.push(db.prepare('INSERT INTO cells (chair, cell_start, block_id) VALUES (?, ?, ?)').bind(chair, c, b.id));
  try {
    await db.batch(stmts);
    return 'ok';
  } catch (e) {
    if (isConflict(e)) return 'taken';
    throw e;
  }
}
export async function deleteBlock(db: D1Database, id: string): Promise<boolean> {
  const r = await db.batch([db.prepare('DELETE FROM cells WHERE block_id = ?').bind(id), db.prepare('DELETE FROM blocks WHERE id = ?').bind(id)]);
  return (r[1]?.meta?.changes ?? 0) > 0;
}
export async function blocksOn(db: D1Database, dates: string[]): Promise<BlockRow[]> {
  if (!dates.length) return [];
  const r = await db.prepare(`SELECT * FROM blocks WHERE local_date IN (${dates.map(() => '?').join(',')}) ORDER BY start_utc`).bind(...dates).all<BlockRow>();
  return r.results ?? [];
}

/** Nightly: drop bookings, blocks and cells older than the retention period, and stale throttle rows. */
export async function purge(db: D1Database, retentionDays: number): Promise<void> {
  const cutoff = new Date(Date.now() - retentionDays * 86400_000);
  const cutoffIso = cutoff.toISOString();
  const cutoffCell = Math.floor(cutoff.getTime() / 60000);
  await db.batch([
    db.prepare('DELETE FROM cells WHERE cell_start < ?').bind(cutoffCell),
    db.prepare('DELETE FROM bookings WHERE end_utc < ?').bind(cutoffIso),
    db.prepare('DELETE FROM blocks WHERE end_utc < ?').bind(cutoffIso),
    db.prepare('DELETE FROM throttle WHERE ts < ?').bind(new Date(Date.now() - 86400_000).toISOString()),
  ]);
}

/** Rate-limit key: whole IPv4 address, /64 for IPv6 (one home connection). */
export function ipKey(ip: string): string {
  const s = ip.trim().toLowerCase();
  if (!s) return 'unknown';
  if (!s.includes(':')) return s;
  const [l, r = ''] = s.split('::');
  const left = l ? l.split(':') : [];
  const right = r ? r.split(':') : [];
  const groups = s.includes('::') ? [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill('0'), ...right] : left;
  return `${groups.slice(0, 4).map((h) => (parseInt(h || '0', 16) || 0).toString(16)).join(':')}::/64`;
}

/**
 * Counts one attempt under `key` and says whether it is still allowed: a single INSERT … SELECT,
 * so a burst of parallel requests cannot all slip under the cap.
 */
export async function allowAttempt(db: D1Database, key: string, max: number, windowMinutes: number): Promise<boolean> {
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
  const r = await db
    .prepare('INSERT INTO throttle (key, ts) SELECT ?, ? WHERE (SELECT COUNT(*) FROM throttle WHERE key = ? AND ts > ?) < ?')
    .bind(key, nowIso(), key, since, max)
    .run();
  return (r.meta?.changes ?? 0) > 0;
}
export async function clearAttempts(db: D1Database, key: string): Promise<void> {
  await db.prepare('DELETE FROM throttle WHERE key = ?').bind(key).run();
}
