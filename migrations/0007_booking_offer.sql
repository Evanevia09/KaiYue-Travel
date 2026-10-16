-- Record which published special offer a booking enquiry is for.
-- Additive only. Live D1 069aa442 is shared; do not rebuild bookings.

ALTER TABLE bookings ADD COLUMN offer_id TEXT;
ALTER TABLE bookings ADD COLUMN offer_title TEXT;

CREATE INDEX IF NOT EXISTS idx_bookings_offer_id ON bookings (offer_id);
