-- STAGING-ONLY operator bootstrap for official UAT D1
--   kaiyue-travel-staging  043cd0ff-a1e6-4b5e-98c1-968c286e0c70
-- Do NOT apply to production D1 06cf879d-8fea-4088-8881-7d382e1b8c11
--   or trial D1 06aa844b-da6b-4c37-896c-fd13dd265fe6
--   or obsolete D1 069aa442-30c9-4454-ab3a-26eb372b3a1f.
-- Executor order is source in scripts/staging-operator-bootstrap-order.json:
--   1. SELECT-only scripts/preflight-staging-identity.sql (no admin_operator)
--   2. SELECT-only scripts/preflight-staging-migrations.sql (sqlite_master)
--   3. wrangler d1 migrations apply: 0009_admin_operator.sql then 0010
--   4. SELECT-only scripts/preflight-staging-operators.sql (supported_prestate)
--   5. this whole file as one wrangler d1 execute --file / one REST sql body
-- Do not run the operator preflight before 0009/0010; that statement reads
-- admin_operator. Do not skip the leading prestate CHECK in this file.
-- This file does not create users, change passwords, send mail, or print secrets.
-- Target: existing user f0af3b28-7b2c-47d5-b619-9239a29c41f9 must be
-- scalingsmb@gmail.com; that account becomes the only enabled super_admin.
-- Every other existing "user" row becomes staff, and only when that owner
-- id+email match.
--
-- Supported prestate (fail-closed otherwise, including owner already present
-- as staff/disabled or an extra super): admin_operator is empty, OR that
-- owner is already the only enabled super_admin. Replay of a complete valid
-- state inserts 0 rows and the trailing CHECK passes. Fresh empty is the
-- intended first apply. This file does not claim a failed CHECK rolls back a
-- prior committed INSERT; the data INSERT itself is gated to 0 rows unless
-- prestate is supported.
--
-- Local sequential-exec evidence only. Do not apply remotely from this increment.

CREATE TABLE IF NOT EXISTS "_staging_operator_bootstrap_prestate" (
  ok INTEGER NOT NULL CHECK (ok = 1)
);
DELETE FROM "_staging_operator_bootstrap_prestate";
INSERT INTO "_staging_operator_bootstrap_prestate" ("ok")
SELECT CASE
  WHEN (SELECT COUNT(*) FROM admin_operator) = 0 THEN 1
  WHEN (
    (
      SELECT COUNT(*) FROM admin_operator AS o
      JOIN "user" AS u ON u."id" = o.user_id
      WHERE o.user_id = 'f0af3b28-7b2c-47d5-b619-9239a29c41f9'
        AND o.role = 'super_admin'
        AND o.enabled = 1
        AND lower(u."email") = 'scalingsmb@gmail.com'
    ) = 1
    AND (
      SELECT COUNT(*) FROM admin_operator
      WHERE role = 'super_admin' AND enabled = 1
    ) = 1
  ) THEN 1
  ELSE 0
END;
DROP TABLE "_staging_operator_bootstrap_prestate";

INSERT INTO admin_operator (user_id, role, enabled, created_at, updated_at, updated_by)
SELECT src.user_id, src.role, 1, datetime('now'), datetime('now'), 'staging-bootstrap'
FROM (
  SELECT owner."id" AS user_id, 'super_admin' AS role
  FROM "user" AS owner
  WHERE owner."id" = 'f0af3b28-7b2c-47d5-b619-9239a29c41f9'
    AND lower(owner."email") = 'scalingsmb@gmail.com'
  UNION ALL
  SELECT u."id", 'staff'
  FROM "user" AS u
  WHERE u."id" != 'f0af3b28-7b2c-47d5-b619-9239a29c41f9'
    AND EXISTS (
      SELECT 1 FROM "user" AS owner
      WHERE owner."id" = 'f0af3b28-7b2c-47d5-b619-9239a29c41f9'
        AND lower(owner."email") = 'scalingsmb@gmail.com'
    )
) AS src
WHERE NOT EXISTS (
  SELECT 1 FROM admin_operator AS o WHERE o.user_id = src.user_id
)
AND (
  (SELECT COUNT(*) FROM admin_operator) = 0
  OR (
    (
      SELECT COUNT(*) FROM admin_operator AS o
      JOIN "user" AS u ON u."id" = o.user_id
      WHERE o.user_id = 'f0af3b28-7b2c-47d5-b619-9239a29c41f9'
        AND o.role = 'super_admin'
        AND o.enabled = 1
        AND lower(u."email") = 'scalingsmb@gmail.com'
    ) = 1
    AND (
      SELECT COUNT(*) FROM admin_operator
      WHERE role = 'super_admin' AND enabled = 1
    ) = 1
  )
);

CREATE TABLE IF NOT EXISTS "_staging_operator_bootstrap_guard" (
  ok INTEGER NOT NULL CHECK (ok = 1)
);
DELETE FROM "_staging_operator_bootstrap_guard";
INSERT INTO "_staging_operator_bootstrap_guard" ("ok")
SELECT CASE
  WHEN (
    (
      SELECT COUNT(*) FROM admin_operator AS o
      JOIN "user" AS u ON u."id" = o.user_id
      WHERE o.user_id = 'f0af3b28-7b2c-47d5-b619-9239a29c41f9'
        AND o.role = 'super_admin'
        AND o.enabled = 1
        AND lower(u."email") = 'scalingsmb@gmail.com'
    ) = 1
    AND (
      SELECT COUNT(*) FROM admin_operator
      WHERE role = 'super_admin' AND enabled = 1
    ) = 1
  ) THEN 1
  ELSE 0
END;
DROP TABLE "_staging_operator_bootstrap_guard";
