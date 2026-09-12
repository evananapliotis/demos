-- HAWAR BARBER bookings. Times: *_utc are ISO instants; local_* are Europe/London wall-clock as shown to people.
CREATE TABLE bookings (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,            -- unguessable, used by the customer's cancel link
  chair INTEGER NOT NULL,
  service_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  minutes INTEGER NOT NULL,
  start_utc TEXT NOT NULL,
  end_utc TEXT NOT NULL,
  local_date TEXT NOT NULL,              -- YYYY-MM-DD
  local_time TEXT NOT NULL,              -- HH:MM
  name TEXT NOT NULL,
  phone TEXT NOT NULL,                   -- +44…
  email TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed',   -- confirmed | cancelled
  created_at TEXT NOT NULL,
  cancelled_at TEXT,
  cancelled_by TEXT,                     -- customer | admin
  ip_key TEXT NOT NULL DEFAULT ''
);
CREATE INDEX bookings_date ON bookings(local_date, status, start_utc);
CREATE INDEX bookings_phone ON bookings(phone, status, end_utc);
CREATE INDEX bookings_end ON bookings(end_utc);

-- Time the shop has blocked out (lunch, an appointment, a closed afternoon). Applies to every chair.
CREATE TABLE blocks (
  id TEXT PRIMARY KEY,
  start_utc TEXT NOT NULL,
  end_utc TEXT NOT NULL,
  local_date TEXT NOT NULL,
  local_from TEXT NOT NULL,
  local_to TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX blocks_date ON blocks(local_date, start_utc);
CREATE INDEX blocks_end ON blocks(end_utc);

-- One row per chair per occupied 5-minute cell. The primary key is the double-booking guard:
-- a booking or block inserts all of its cells in one atomic batch, so any overlap fails the whole write.
CREATE TABLE cells (
  chair INTEGER NOT NULL,
  cell_start INTEGER NOT NULL,           -- minutes since the Unix epoch, UTC
  booking_id TEXT REFERENCES bookings(id) ON DELETE CASCADE,
  block_id TEXT REFERENCES blocks(id) ON DELETE CASCADE,
  PRIMARY KEY (chair, cell_start)
) WITHOUT ROWID;
CREATE INDEX cells_booking ON cells(booking_id);
CREATE INDEX cells_block ON cells(block_id);

-- Attempt counters for rate limits (booking posts, admin sign-in).
CREATE TABLE throttle (key TEXT NOT NULL, ts TEXT NOT NULL);
CREATE INDEX throttle_key_ts ON throttle(key, ts);
