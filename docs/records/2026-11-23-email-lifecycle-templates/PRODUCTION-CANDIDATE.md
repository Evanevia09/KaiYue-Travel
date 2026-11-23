# Minimal production candidate from official-staging `ef70396`

**Status:** plan / overlay diff only. **Not** applied. **Not** uploaded. **Not** a `main` merge. **Not** a production D1 write.  
**Base:** live `official-staging` `ef703969381894597f0ed5db3d8023232253862c` (PR #64 squash of reviewed `3823d48`).  
**Do not** blind-merge PR #61 (`f774f69` prod-mail umbrella). Preserve prod MCP off and other holds (#51–#53, CodeMode #63).

## What production is now (must stay until an authorized promote)

Live Worker `kaiyue-travel` `5eebf7b6` @100% / `main` `ff119f2c`. Overlay `deploy/production/wrangler.jsonc`:

- D1 `06cf879d-8fea-4088-8881-7d382e1b8c11`, R2 `kaiyue-offers-production` — **keep these IDs**
- No `EMAIL` binding
- `NOTIFICATIONS_ENABLED=false`
- No `NOTIFY_*`
- `WHATSAPP_NUMBER=+85328338882`
- No `ADMIN_EMAILS` / no `daniel@` in overlay JSON (tests forbid it)
- No `MCP_STAGING_DIRECT_WRITES`
- Production D1 schema `0001`–`0010` only

## Intended delta (operator, after parent staging browser QA)

Copy **git tree** from `ef70396` (KY##### persist, lifecycle mail claim, WeChat JPEG `apps/web/public/images/wechat-qr.jpg` SHA-256 `3877f629…`). Do not copy staging overlay, staging D1 contents, or staging serial counter.

### 1. Schema `0011` on production PIN `06cf879d` (preserve resource IDs)

Apply `migrations/0011_chauffeur_booking_serial.sql` to production D1 **`06cf879d-8fea-4088-8881-7d382e1b8c11`** only, before activating a Worker that allocates `KY#####`.

- Additive: creates `chauffeur_booking_serial` with `last_issued=0`, nullable lifecycle columns.
- **Do not** copy staging `last_issued` or staging booking rows.
- **Do not** reuse `rate_limits`.
- **Do not** rewrite legacy `KY-xxxxxxxx` rows.
- CD does not apply migrations; this is an explicit operator D1 step with a SELECT-only readback (`0001`–`0011`, `last_issued=0`) before Worker traffic.

### 2. Overlay — EMAIL + sender; Daniel is **not** a mail dest

Keep `deploy/production/wrangler.jsonc` name / account / D1 / R2 / `keep_vars: false` / Worker-first assets.

Add:

```jsonc
"send_email": [
  {
    "name": "EMAIL",
    "allowed_sender_addresses": ["bookings@notify.kaiyuemacau.com"]
    // Do NOT copy staging dest lock scalingsmb@gmail.com.
    // Do NOT set allowed_destination_addresses to daniel@kaiyuemacau.com.
    // Production dest is an OPEN owner decision; leave unrestricted or set
    // the owner-chosen production inbox explicitly at promote time.
  }
]
```

Vars to add or change (proposed):

| Var | From (live overlay) | To (candidate) |
| --- | --- | --- |
| `WHATSAPP_NUMBER` | `+85328338882` | `+85363128081` |
| `NOTIFICATIONS_ENABLED` | `false` | stay `false` until dest is written; then `true` |
| `NOTIFY_FROM_EMAIL` | absent | `bookings@notify.kaiyuemacau.com` |
| `NOTIFY_FROM_NAME` | absent | `Kai Yue Travel` |
| `NOTIFY_STAFF_TO` | absent | **OPEN** — owner production inbox. Not `daniel@kaiyuemacau.com` unless the owner explicitly names that address as a **mail dest** (today it is admission only). Not the staging lock. |
| `NOTIFY_ALLOWED_RECIPIENTS` | absent | same as chosen dest, if a lock is required |
| `MCP_STAGING_DIRECT_WRITES` | absent | **keep absent** |
| `ADMIN_EMAILS` / `daniel@` | absent | **keep absent** from overlay JSON |

Office telephone `+85328338882` in site copy is separate from enquiry WhatsApp.

Exact proposed overlay file (still unused by any workflow): `wrangler.production-lifecycle-candidate.jsonc` in this folder. `NOTIFICATIONS_ENABLED` remains `"false"` and `NOTIFY_STAFF_TO` is omitted until dest is decided, so a mistaken upload cannot mail.

### 3. WeChat JPEG

Already in the `ef70396` tree: `apps/web/public/images/wechat-qr.jpg`. Promoting that tree is enough. Do not invent a WeChat ID.

### 4. Holds to preserve

- Production MCP remains off (no staging MCP flag, no production plugin writes).
- Do not merge PR #61 as the promote vehicle.
- Do not merge held #51–#53 or CodeMode #63 into production.
- Tourist-board / MGTO 15 Nov widget verification: preserve; do not re-ask as a new product question.
- Quote widget SKIPPED; never call `KY-PYPM8Y3E`.

### 5. Promote sequence (parent / owner; not this writer)

1. Parent staging browser QA + actual send on staging dest `scalingsmb@gmail.com`.
2. Owner names production `NOTIFY_STAFF_TO` (Daniel policy: admission ≠ dest).
3. Apply `0011` to `06cf879d`; SELECT-only confirm `last_issued=0`.
4. Build with `PUBLIC_SITE_URL=https://kaiyuemacau.com`.
5. Upload + activate `kaiyue-travel` using the filled production overlay (same D1/R2 IDs).
6. Read-back: version @100%, `EMAIL` + sender, dest as decided, WA `+85363128081`, mail flag, D1 `0011` still `last_issued=0`.
7. Owner: **one** live booking from https://kaiyuemacau.com/ (t338u). Not from this VM.

No production deploy, `main` merge, or production D1 write is authorized in this closeout PR.
