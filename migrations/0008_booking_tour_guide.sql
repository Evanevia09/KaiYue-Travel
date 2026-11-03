-- Optional professional Macau tour guide preference on half-day / full-day packages.
-- Additive only. Shared D1 must not be rebuilt.

ALTER TABLE bookings ADD COLUMN tour_guide_requested INTEGER;
