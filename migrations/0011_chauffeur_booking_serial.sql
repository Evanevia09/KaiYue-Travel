-- One durable chauffeur booking serial per D1. Additive only.
-- New chauffeur rows store KY##### in bookings.reference and the integer in lifecycle_serial.
-- Legacy KY-xxxxxxxx rows are never rewritten and keep a NULL serial.
-- Do not seed last_issued from the count of legacy rows. Do not reuse rate_limits.

CREATE TABLE chauffeur_booking_serial (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_issued INTEGER NOT NULL CHECK (last_issued >= 0)
);

INSERT INTO chauffeur_booking_serial (id, last_issued) VALUES (1, 0);

ALTER TABLE bookings ADD COLUMN lifecycle_serial INTEGER;
ALTER TABLE bookings ADD COLUMN confirm_mail_state TEXT;
ALTER TABLE bookings ADD COLUMN cancel_mail_state TEXT;

CREATE UNIQUE INDEX idx_bookings_lifecycle_serial
  ON bookings (lifecycle_serial)
  WHERE lifecycle_serial IS NOT NULL;
