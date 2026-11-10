Kai Yue local admin hash (no repository checkout)

Git SHA: fce3a665b83f35e6153a5f3bb2659df669fa613c
Hasher: better-auth@1.7.5 → @better-auth/utils password.node.mjs
Algorithm: node:crypto scrypt N=16384 r=16 p=1 dkLen=64 (same workerd export)
No secrets, no sample passwords, no network.

Requires Node 22+. Bind is 127.0.0.1 only.

  unzip kaiyue-provision-admin-local.zip
  node provision-admin.mjs
  open http://127.0.0.1:8789/

Fill email + password from the vault browser extension. SQL downloads.
Do not paste the password into chat or logs. Stop with Ctrl+C.
Do not use this to open public signup or development on a live host.
