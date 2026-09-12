globalThis.process ??= {}; globalThis.process.env ??= {};
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
  `CREATE INDEX IF NOT EXISTS bookings_ip_created ON bookings(ip, created_at)`
];
const ready = /* @__PURE__ */ new WeakSet();
async function ensureSchema(db) {
  if (ready.has(db)) return;
  await db.batch(SCHEMA.map((sql) => db.prepare(sql)));
  ready.add(db);
}
async function insertBooking(db, row) {
  const created = (/* @__PURE__ */ new Date()).toISOString();
  await db.prepare("INSERT INTO bookings (id, created_at, name, phone, day, time, service, notes, status, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(row.id, created, row.name, row.phone, row.day, row.time, row.service, row.notes, "pending", row.ip).run();
  return created;
}
async function countRecent(db, ip, minutes) {
  if (!ip) return 0;
  const since = new Date(Date.now() - minutes * 6e4).toISOString();
  const r = await db.prepare("SELECT COUNT(*) AS n FROM bookings WHERE ip = ? AND created_at > ?").bind(ip, since).first();
  return r?.n ?? 0;
}
async function listBookings(db, limit = 300) {
  const r = await db.prepare(
    `SELECT id, created_at, name, phone, day, time, service, notes, status, ip FROM bookings
       ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'confirmed' THEN 1 WHEN 'declined' THEN 2 ELSE 3 END, day, time
       LIMIT ?`
  ).bind(limit).all();
  return r.results ?? [];
}
async function setStatus(db, id, status) {
  const r = await db.prepare("UPDATE bookings SET status = ? WHERE id = ?").bind(status, id).run();
  return (r.meta?.changes ?? 0) > 0;
}

export { countRecent as c, ensureSchema as e, insertBooking as i, listBookings as l, setStatus as s };
