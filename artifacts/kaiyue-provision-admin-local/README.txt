Kai Yue local admin hash (no repository checkout)

Git SHA: 6b62da09fba7de4e88d418750fde22a71a915a20
Hasher: better-auth@1.7.5 → @better-auth/utils password.node.mjs
Algorithm: node:crypto scrypt N=16384 r=16 p=1 dkLen=64 (same workerd export)
No secrets, no sample passwords, no network.

Requires Node 22+. Default bind is 127.0.0.1 only.

  unzip kaiyue-provision-admin-local.zip
  node provision-admin.mjs
  open http://127.0.0.1:8789/

If the browser cannot reach loopback, and ADMIN_SEED_EMAIL plus
ADMIN_SEED_PASSWORD are already in this process environment:

  ADMIN_SEED_EMAIL='…' ADMIN_SEED_PASSWORD='…' node provision-admin.mjs > seed-admin.sql

Default password minimum is 16. Isolated staging UAT six-character
mode (does not change production policy):

  ADMIN_SEED_STAGING_TEST=1 ADMIN_SEED_EMAIL='…' ADMIN_SEED_PASSWORD='…' node provision-admin.mjs > seed-admin.sql

No listener is started in that mode. SQL goes to stdout only.
Do not paste the password into chat or logs. Stop with Ctrl+C.
Do not use this to open public signup or development on a live host.
