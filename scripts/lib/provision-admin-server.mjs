/**
 * Loopback Better Auth hash + SQL HTTP helper. Bind 127.0.0.1 only.
 * Host/Origin checks, CSRF cookie+field, CSP/frame denial, body-size limit.
 * Does not log request bodies, passwords, hashes, or SQL.
 */
import { randomBytes } from "node:crypto";
import http from "node:http";
import { buildAdminCredentialSql } from "./admin-seed-sql.mjs";
import { MIN_PASSWORD } from "./provision-admin-from-env.mjs";

export { MIN_PASSWORD };
export const MAX_BODY_BYTES = 8192;
export const CSRF_COOKIE = "kaiyue_provision_csrf";

export function loopbackAddress(address) {
  return address === "127.0.0.1" || address === "::1" || address === ":ffff:127.0.0.1";
}

export function allowedHosts(port) {
  return new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
}

export function allowedOrigins(port) {
  return new Set([`http://127.0.0.1:${port}`, `http://localhost:${port}`]);
}

export function securityHeaders(extra = {}) {
  return {
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "no-referrer",
    "content-security-policy":
      "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
    ...extra,
  };
}

export function parseCookie(header, name) {
  if (!header) return "";
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    if (trimmed.slice(0, eq) === name) return decodeURIComponent(trimmed.slice(eq + 1));
  }
  return "";
}

export function parseForm(raw) {
  const params = new URLSearchParams(raw);
  return {
    email: (params.get("email") ?? "").trim().toLowerCase(),
    name: (params.get("name") ?? "").trim() || "Temporary staff operator",
    password: params.get("password") ?? "",
    csrf: params.get("csrf") ?? "",
  };
}

export function pageHtml(csrf, minPassword = MIN_PASSWORD) {
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
    <label for="password">Password (vault fill, ≥${minPassword})</label>
    <input id="password" name="password" type="password" required minlength="${minPassword}" autocomplete="current-password"/>
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

export function createProvisionServer({
  hashPassword,
  port = 8789,
  host = "127.0.0.1",
  minPassword = MIN_PASSWORD,
}) {
  if (host !== "127.0.0.1") {
    throw new Error("Provision server must bind 127.0.0.1.");
  }
  const requiredLength =
    Number.isInteger(minPassword) && minPassword > 0 ? minPassword : MIN_PASSWORD;
  const server = http.createServer(async (request, response) => {
    const remote = request.socket.remoteAddress ?? "";
    if (!loopbackAddress(remote)) {
      send(response, 403, { "content-type": "text/plain; charset=utf-8" }, "Loopback only.");
      return;
    }
    const address = server.address();
    const boundPort = typeof address === "object" && address ? address.port : port;
    const hostHeader = (request.headers.host ?? "").toLowerCase();
    if (!allowedHosts(boundPort).has(hostHeader)) {
      send(response, 403, { "content-type": "text/plain; charset=utf-8" }, "Invalid Host.");
      return;
    }
    const url = new URL(request.url ?? "/", `http://127.0.0.1:${boundPort}`);
    if (request.method === "GET" && url.pathname === "/") {
      const csrf = randomBytes(32).toString("hex");
      send(
        response,
        200,
        {
          "content-type": "text/html; charset=utf-8",
          "set-cookie": `${CSRF_COOKIE}=${encodeURIComponent(csrf)}; Path=/; HttpOnly; SameSite=Strict`,
        },
        pageHtml(csrf, requiredLength),
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
          send(
            response,
            413,
            { "content-type": "text/plain; charset=utf-8" },
            "Payload too large.",
          );
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
      if (!form.email || form.password.length < requiredLength) {
        send(
          response,
          400,
          { "content-type": "text/plain; charset=utf-8" },
          `Need an email and a password of at least ${requiredLength} characters.`,
        );
        return;
      }
      try {
        const hash = await hashPassword(form.password);
        const sql = buildAdminCredentialSql({
          email: form.email,
          name: form.name,
          passwordHash: hash,
          now: new Date().toISOString(),
          userId: crypto.randomUUID(),
          accountId: crypto.randomUUID(),
        });
        send(
          response,
          200,
          {
            "content-type": "text/plain; charset=utf-8",
            "content-disposition": 'attachment; filename="seed-admin.sql"',
          },
          sql,
        );
      } catch {
        send(response, 500, { "content-type": "text/plain; charset=utf-8" }, "Hash failed.");
      }
      return;
    }
    send(response, 404, { "content-type": "text/plain; charset=utf-8" }, "Not found.");
  });
  return server;
}

export function listenProvisionServer(server, { port = 8789, host = "127.0.0.1" } = {}) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      const address = server.address();
      const boundPort = typeof address === "object" && address ? address.port : port;
      resolve({ host, port: boundPort });
    });
  });
}
