-- SELECT-only identity precheck for official UAT D1
--   043cd0ff-a1e6-4b5e-98c1-968c286e0c70
-- Reads only Better Auth "user". Safe before sidecar migrations 0009/0010.
-- Abort unless identity_ok = 1. Do NOT run against production D1
-- 06cf879d-8fea-4088-8881-7d382e1b8c11, trial D1 06aa844b, or obsolete 069aa442.

SELECT
  u."id" AS user_id,
  lower(u."email") AS email,
  CASE
    WHEN u."id" = 'f0af3b28-7b2c-47d5-b619-9239a29c41f9'
      AND lower(u."email") = 'scalingsmb@gmail.com'
    THEN 1
    ELSE 0
  END AS identity_ok
FROM "user" AS u
WHERE u."id" = 'f0af3b28-7b2c-47d5-b619-9239a29c41f9';
