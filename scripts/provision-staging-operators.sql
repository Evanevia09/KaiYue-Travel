-- STAGING-ONLY operator bootstrap for official UAT D1
--   kaiyue-travel-staging  043cd0ff-a1e6-4b5e-98c1-968c286e0c70
-- Do NOT apply to production D1 06cf879d-8fea-4088-8881-7d382e1b8c11
--   or trial D1 06aa844b-da6b-4c37-896c-fd13dd265fe6
--   or obsolete D1 069aa442-30c9-4454-ab3a-26eb372b3a1f.
-- Apply 0009_admin_operator.sql first. This file does not create users,
-- change passwords, send mail, or print secrets.
-- Target: existing user f0af3b28-7b2c-47d5-b619-9239a29c41f9 must be
-- scalingsmb@gmail.com; that account becomes the only enabled super_admin.
-- Every other existing "user" row becomes staff. Idempotent on those ids.

INSERT INTO admin_operator (user_id, role, enabled, created_at, updated_at, updated_by)
SELECT "id", 'super_admin', 1, datetime('now'), datetime('now'), 'staging-bootstrap'
FROM "user"
WHERE "id" = 'f0af3b28-7b2c-47d5-b619-9239a29c41f9'
  AND lower("email") = 'scalingsmb@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM admin_operator WHERE user_id = 'f0af3b28-7b2c-47d5-b619-9239a29c41f9'
  );

INSERT INTO admin_operator (user_id, role, enabled, created_at, updated_at, updated_by)
SELECT u."id", 'staff', 1, datetime('now'), datetime('now'), 'staging-bootstrap'
FROM "user" AS u
WHERE u."id" != 'f0af3b28-7b2c-47d5-b619-9239a29c41f9'
  AND NOT EXISTS (
    SELECT 1 FROM admin_operator AS o WHERE o.user_id = u."id"
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
