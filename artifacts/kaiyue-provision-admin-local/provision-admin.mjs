// Kai Yue local provisioner. Better Auth 1.7.5 node scrypt. No secrets.

// node_modules/.pnpm/@better-auth+utils@0.4.2/node_modules/@better-auth/utils/dist/password.node.mjs
import { randomBytes, scrypt } from "node:crypto";
var config = {
  N: 16384,
  r: 16,
  p: 1,
  dkLen: 64
};
function generateKey(password, salt) {
  return new Promise((resolve, reject) => {
    scrypt(
      password.normalize("NFKC"),
      salt,
      config.dkLen,
      {
        N: config.N,
        r: config.r,
        p: config.p,
        maxmem: 128 * config.N * config.r * 2
      },
      (err, key) => {
        if (err)
          reject(err);
        else
          resolve(key);
      }
    );
  });
}
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await generateKey(password, salt);
  return `${salt}:${key.toString("hex")}`;
}

// node_modules/.pnpm/better-auth@1.7.5_react-dom@19.3.0_react@19.3.0__react@19.3.0_vitest@3.2.7_@types+node@_bba388395da60206e269ea0f34243af6/node_modules/better-auth/dist/crypto/password.mjs
var hashPassword$1 = hashPassword;

// scripts/lib/provision-admin-server.mjs
import { randomBytes as randomBytes2 } from "node:crypto";
import http from "node:http";

// scripts/lib/admin-seed-sql.mjs
function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}
function buildAdminCredentialSql({ email, name, passwordHash, now, userId, accountId }) {
  const emailSql = sqlString(email);
  const nameSql = sqlString(name);
  const hashSql = sqlString(passwordHash);
  const nowSql = sqlString(now);
  const userIdSql = sqlString(userId);
  const accountIdSql = sqlString(accountId);
  return `-- Temporary allowlisted operator. Remove after Cloudflare Access is live.
-- Idempotent on email: a second apply updates the credential hash and does not
-- insert a second user.
INSERT INTO "user" ("id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt")
SELECT ${userIdSql}, ${nameSql}, ${emailSql}, 1, NULL, ${nowSql}, ${nowSql}
WHERE NOT EXISTS (SELECT 1 FROM "user" WHERE "email" = ${emailSql});

UPDATE "user"
SET "name" = ${nameSql}, "updatedAt" = ${nowSql}
WHERE "email" = ${emailSql};

UPDATE "account"
SET "password" = ${hashSql}, "updatedAt" = ${nowSql}
WHERE "providerId" = 'credential'
  AND "userId" = (SELECT "id" FROM "user" WHERE "email" = ${emailSql});

INSERT INTO "account" (
  "id", "accountId", "providerId", "userId", "accessToken", "refreshToken", "idToken",
  "accessTokenExpiresAt", "refreshTokenExpiresAt", "scope", "password", "createdAt", "updatedAt"
)
SELECT
  ${accountIdSql},
  (SELECT "id" FROM "user" WHERE "email" = ${emailSql}),
  'credential',
  (SELECT "id" FROM "user" WHERE "email" = ${emailSql}),
  NULL, NULL, NULL, NULL, NULL, NULL,
  ${hashSql},
  ${nowSql},
  ${nowSql}
WHERE NOT EXISTS (
  SELECT 1 FROM "account"
  WHERE "providerId" = 'credential'
    AND "userId" = (SELECT "id" FROM "user" WHERE "email" = ${emailSql})
);
`;
}

// scripts/lib/provision-admin-server.mjs
var MIN_PASSWORD = 16;
var MAX_BODY_BYTES = 8192;
var CSRF_COOKIE = "kaiyue_provision_csrf";
function loopbackAddress(address) {
  return address === "127.0.0.1" || address === "::1" || address === ":ffff:127.0.0.1";
}
function allowedHosts(port2) {
  return /* @__PURE__ */ new Set([`127.0.0.1:${port2}`, `localhost:${port2}`]);
}
function allowedOrigins(port2) {
  return /* @__PURE__ */ new Set([`http://127.0.0.1:${port2}`, `http://localhost:${port2}`]);
}
function securityHeaders(extra = {}) {
  return {
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "no-referrer",
    "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
    ...extra
  };
}
function parseCookie(header, name) {
  if (!header) return "";
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    if (trimmed.slice(0, eq) === name) return decodeURIComponent(trimmed.slice(eq + 1));
  }
  return "";
}
function parseForm(raw) {
  const params = new URLSearchParams(raw);
  return {
    email: (params.get("email") ?? "").trim().toLowerCase(),
    name: (params.get("name") ?? "").trim() || "Temporary staff operator",
    password: params.get("password") ?? "",
    csrf: params.get("csrf") ?? ""
  };
}
function pageHtml(csrf) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta name="robots" content="noindex,nofollow"/>
  <title>Local admin hash</title>
  <style>
    body { font: 16px/1.4 system-ui, sans-serif; max-width: 40rem; margin: 2rem auto; padding: 0 1rem; }
    label { display: block; margin: 1rem 0 0.25rem; }
    input { width: 100%; padding: 0.5rem; box-sizing: border-box; }
    button { margin-top: 1rem; padding: 0.5rem 1rem; }
    p { color: #333; }
  </style>
</head>
<body>
  <h1>Local operator SQL</h1>
  <p>Loopback only. Fill email and password from the vault browser extension. This page hashes locally and downloads SQL. It does not upload, log, or email anything.</p>
  <form method="post" action="/sql" autocomplete="on">
    <input type="hidden" name="csrf" value="${csrf}"/>
    <label for="email">Allowlisted email</label>
    <input id="email" name="email" type="email" required autocomplete="username"/>
    <label for="name">Display name</label>
    <input id="name" name="name" type="text" autocomplete="name" value="Temporary staff operator"/>
    <label for="password">Password (vault fill, \u226516)</label>
    <input id="password" name="password" type="password" required minlength="16" autocomplete="current-password"/>
    <button type="submit">Download SQL</button>
  </form>
</body>
</html>
`;
}
async function readLimitedBody(request, maxBytes) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) {
      const error = new Error("payload too large");
      error.code = "PAYLOAD_TOO_LARGE";
      throw error;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}
function send(response, status, headers, body) {
  response.writeHead(status, { ...securityHeaders(), ...headers });
  response.end(body);
}
function createProvisionServer({ hashPassword: hashPassword2, port: port2 = 8789, host = "127.0.0.1" }) {
  if (host !== "127.0.0.1") {
    throw new Error("Provision server must bind 127.0.0.1.");
  }
  const server2 = http.createServer(async (request, response) => {
    const remote = request.socket.remoteAddress ?? "";
    if (!loopbackAddress(remote)) {
      send(response, 403, { "content-type": "text/plain; charset=utf-8" }, "Loopback only.");
      return;
    }
    const address = server2.address();
    const boundPort = typeof address === "object" && address ? address.port : port2;
    const hostHeader = (request.headers.host ?? "").toLowerCase();
    if (!allowedHosts(boundPort).has(hostHeader)) {
      send(response, 403, { "content-type": "text/plain; charset=utf-8" }, "Invalid Host.");
      return;
    }
    const url = new URL(request.url ?? "/", `http://127.0.0.1:${boundPort}`);
    if (request.method === "GET" && url.pathname === "/") {
      const csrf = randomBytes2(32).toString("hex");
      send(
        response,
        200,
        {
          "content-type": "text/html; charset=utf-8",
          "set-cookie": `${CSRF_COOKIE}=${encodeURIComponent(csrf)}; Path=/; HttpOnly; SameSite=Strict`
        },
        pageHtml(csrf)
      );
      return;
    }
    if (request.method === "POST" && url.pathname === "/sql") {
      const origin = request.headers.origin ?? "";
      if (!allowedOrigins(boundPort).has(origin)) {
        send(response, 403, { "content-type": "text/plain; charset=utf-8" }, "Invalid Origin.");
        return;
      }
      let body;
      try {
        body = await readLimitedBody(request, MAX_BODY_BYTES);
      } catch (error) {
        if (error && error.code === "PAYLOAD_TOO_LARGE") {
          send(response, 413, { "content-type": "text/plain; charset=utf-8" }, "Payload too large.");
          request.destroy();
          return;
        }
        send(response, 400, { "content-type": "text/plain; charset=utf-8" }, "Invalid body.");
        return;
      }
      const form = parseForm(body);
      const cookieCsrf = parseCookie(request.headers.cookie, CSRF_COOKIE);
      if (!form.csrf || !cookieCsrf || form.csrf !== cookieCsrf) {
        send(response, 403, { "content-type": "text/plain; charset=utf-8" }, "Invalid CSRF token.");
        return;
      }
      if (!form.email || form.password.length < MIN_PASSWORD) {
        send(
          response,
          400,
          { "content-type": "text/plain; charset=utf-8" },
          "Need an email and a password of at least 16 characters."
        );
        return;
      }
      try {
        const hash = await hashPassword2(form.password);
        const sql = buildAdminCredentialSql({
          email: form.email,
          name: form.name,
          passwordHash: hash,
          now: (/* @__PURE__ */ new Date()).toISOString(),
          userId: crypto.randomUUID(),
          accountId: crypto.randomUUID()
        });
        send(
          response,
          200,
          {
            "content-type": "text/plain; charset=utf-8",
            "content-disposition": 'attachment; filename="seed-admin.sql"'
          },
          sql
        );
      } catch {
        send(response, 500, { "content-type": "text/plain; charset=utf-8" }, "Hash failed.");
      }
      return;
    }
    send(response, 404, { "content-type": "text/plain; charset=utf-8" }, "Not found.");
  });
  return server2;
}
function listenProvisionServer(server2, { port: port2 = 8789, host = "127.0.0.1" } = {}) {
  return new Promise((resolve, reject) => {
    server2.once("error", reject);
    server2.listen(port2, host, () => {
      const address = server2.address();
      const boundPort = typeof address === "object" && address ? address.port : port2;
      resolve({ host, port: boundPort });
    });
  });
}

// scripts/provision-admin-local.mjs
var HOST = "127.0.0.1";
var PORT = Number(process.env.ADMIN_PROVISION_PORT || 8789);
var server = createProvisionServer({ hashPassword: hashPassword$1, port: PORT, host: HOST });
var { port } = await listenProvisionServer(server, { port: PORT, host: HOST });
process.stdout.write(
  `Loopback admin hash form: http://${HOST}:${port}/
Fill from the vault browser extension. SQL downloads; nothing is logged.
Stop with Ctrl+C.
`
);
