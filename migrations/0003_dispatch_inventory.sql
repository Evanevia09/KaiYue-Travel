-- Staff-managed dispatch inventory. Records are never seeded with real people or cars.

CREATE TABLE drivers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  notes TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_drivers_active_name ON drivers (active, name);

CREATE TABLE vehicles (
  id TEXT PRIMARY KEY,
  plate_number TEXT NOT NULL UNIQUE,
  make_model TEXT NOT NULL,
  passenger_capacity INTEGER NOT NULL CHECK (passenger_capacity BETWEEN 1 AND 14),
  contact_name TEXT,
  contact_phone TEXT,
  notes TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_vehicles_active_plate ON vehicles (active, plate_number);

ALTER TABLE bookings ADD COLUMN driver_id TEXT REFERENCES drivers(id);
ALTER TABLE bookings ADD COLUMN vehicle_id TEXT REFERENCES vehicles(id);

CREATE INDEX idx_bookings_driver_pickup ON bookings (driver_id, pickup_at);
CREATE INDEX idx_bookings_vehicle_pickup ON bookings (vehicle_id, pickup_at);
CREATE INDEX idx_bookings_pickup_id ON bookings (pickup_at, id);

CREATE TABLE inventory_audit_events (
  id TEXT PRIMARY KEY,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('driver', 'vehicle')),
  resource_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  changed_fields TEXT NOT NULL,
  request_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_inventory_audit_resource ON inventory_audit_events (resource_type, resource_id, created_at);
