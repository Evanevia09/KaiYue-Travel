-- Additive primary-operator role for the verified production admin.
-- Live D1 06cf879d (kaiyue-travel-production) at 2026-11-15 14:18 had 17 tables
-- and user columns id, name, email, emailVerified, image, createdAt, updatedAt.
-- There was no role column and no role table. Do not pretend the column exists
-- until this migration is applied. This writer does not apply it.
-- Default is staff. Parent stamps exactly one verified primary email after CREATE.
-- Backward compatible: application code treats a missing column as env-only
-- ADMIN_PRIMARY_EMAIL matching, and never honors a persisted primary unless the
-- Worker env names that same email.

ALTER TABLE "user" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'staff';
