-- HISTORICAL UNSAFE fixture copied from frozen 1e62ce9 provision SQL.
-- DO NOT APPLY to any remote D1. Tests execute it on a local synthetic
-- SQLite database to show sequential auto-commit: the staff INSERT is an
-- independent statement, so a later CHECK failure still leaves staff rows
-- when the owner email does not match.

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
