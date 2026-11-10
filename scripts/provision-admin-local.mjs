/**
 * Loopback-only Better Auth hash + SQL helper. Compatible with vault browser
 * credential fill. Does not log the password, hash, or SQL. Does not generate
 * a password. Does not call Cloudflare. hashPassword does not use
 * BETTER_AUTH_SECRET.
 *
 *   node scripts/provision-admin-local.mjs
 *   open http://127.0.0.1:8789/
 */
import http from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildAdminCredentialSql } from "./lib/admin-seed-sql.mjs";

const betterAuthCrypto = pathToFileURL(
  join(
    dirname(fileURLToPath(import.meta.url)),
    "../apps/web/node_modules/better-auth/dist/crypto/index.mjs",
  ),
).href;
const { hashPassword } = await import(betterAuthCrypto);

const HOST = "127.0.0.1";
const PORT = Number(process.env.ADMIN_PROVISION_PORT || 8789);
const MIN_PASSWORD = 16;

const PAGE = `<!doctype html>
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
    <label for="email">Allowlisted email</label>
    <input id="email" name="email" type="email" required autocomplete="username"/>
    <label for="name">Display name</label>
    <input id="name" name="name" type="text" autocomplete="name" value="Temporary staff operator"/>
    <label for="password">Password (vault fill, ≥16)</label>
    <input id="password" name="password" type="password" required minlength="16" autocomplete="current-password"/>
    <button type="submit">Download SQL</button>
  </form>
</body>
</html>
`;

function loopbackAddress(address) {
  return address === "127.0.0.1" || address === "::1" || address === ":ffff:127.0.0.1";
}

function parseForm(raw) {
  const params = new URLSearchParams(raw);
  return {
    email: (params.get("email") ?? "").trim().toLowerCase(),
    name: (params.get("name") ?? "").trim() || "Temporary staff operator",
    password: params.get("password") ?? "",
  };
}

const server = http.createServer(async (request, response) => {
  const remote = request.socket.remoteAddress ?? "";
  if (!loopbackAddress(remote)) {
    response.writeHead(403, {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    });
    response.end("Loopback only.");
    return;
  }
  const url = new URL(request.url ?? "/", `http://${HOST}:${PORT}`);
  if (request.method === "GET" && url.pathname === "/") {
    response.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    });
    response.end(PAGE);
    return;
  }
  if (request.method === "POST" && url.pathname === "/sql") {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString("utf8");
    const { email, name, password } = parseForm(body);
    if (!email || password.length < MIN_PASSWORD) {
      response.writeHead(400, {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      });
      response.end("Need an email and a password of at least 16 characters.");
      return;
    }
    try {
      const hash = await hashPassword(password);
      const sql = buildAdminCredentialSql({
        email,
        name,
        passwordHash: hash,
        now: new Date().toISOString(),
        userId: crypto.randomUUID(),
        accountId: crypto.randomUUID(),
      });
      response.writeHead(200, {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
        "content-disposition": 'attachment; filename="seed-admin.sql"',
      });
      response.end(sql);
    } catch {
      response.writeHead(500, {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      });
      response.end("Hash failed.");
    }
    return;
  }
  response.writeHead(404, {
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end("Not found.");
});

server.listen(PORT, HOST, () => {
  process.stdout.write(
    `Loopback admin hash form: http://${HOST}:${PORT}/\nFill from the vault browser extension. SQL downloads; nothing is logged.\nStop with Ctrl+C.\n`,
  );
});
