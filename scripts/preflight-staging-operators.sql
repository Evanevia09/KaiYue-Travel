-- SELECT-only preflight for official UAT D1 043cd0ff-a1e6-4b5e-98c1-968c286e0c70.
-- No DML. Abort provision unless this id still maps to scalingsmb@gmail.com.
-- Do NOT run against production D1 06cf879d-8fea-4088-8881-7d382e1b8c11,
-- trial D1 06aa844b-da6b-4c37-896c-fd13dd265fe6, or obsolete D1 069aa442.

SELECT u."id" AS user_id, lower(u."email") AS email
FROM "user" AS u
WHERE u."id" = 'f0af3b28-7b2c-47d5-b619-9239a29c41f9';
