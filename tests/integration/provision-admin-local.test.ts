import http from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  CSRF_COOKIE,
  MAX_BODY_BYTES,
  createProvisionServer,
  listenProvisionServer,
} from "../../scripts/lib/provision-admin-server.mjs";

const email = "operator@example.invalid";
const password = "local-only-test-password-2026";
const betterAuthCrypto = pathToFileURL(
  join(
    dirname(fileURLToPath(import.meta.url)),
    "../../apps/web/node_modules/better-auth/dist/crypto/index.mjs",
  ),
).href;

const logs: string[] = [];
const originalWrite = process.stdout.write.bind(process.stdout);
const originalError = process.stderr.write.bind(process.stderr);

function capture(chunk: unknown) {
  logs.push(String(chunk));
  return true;
}

let server: ReturnType<typeof createProvisionServer> | undefined;
let port = 0;
let verifyPassword: (args: { hash: string; password: string }) => Promise<boolean>;

function rawRequest({
  method = "GET",
  path = "/",
  headers = {},
  body,
}: {
  method?: string;
  path?: string;
  headers?: Record<string, string>;
  body?: string;
}) {
  return new Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }>(
    (resolve, reject) => {
      const request = http.request(
        { hostname: "127.0.0.1", port, method, path, headers },
        (response) => {
          const chunks: Buffer[] = [];
          response.on("data", (chunk) => chunks.push(chunk));
          response.on("end", () =>
            resolve({
              status: response.statusCode ?? 0,
              headers: response.headers,
              body: Buffer.concat(chunks).toString("utf8"),
            }),
          );
        },
      );
      request.on("error", reject);
      if (body) request.write(body);
      request.end();
    },
  );
}

async function start() {
  const crypto = await import(betterAuthCrypto);
  verifyPassword = crypto.verifyPassword;
  server = createProvisionServer({ hashPassword: crypto.hashPassword, port: 0, host: "127.0.0.1" });
  const listening = await listenProvisionServer(server, { port: 0, host: "127.0.0.1" });
  port = listening.port;
}

afterEach(async () => {
  await new Promise<void>((resolve, reject) => {
    if (!server) {
      resolve();
      return;
    }
    server.close((error) => (error ? reject(error) : resolve()));
  });
  server = undefined;
});

async function getForm() {
  const response = await rawRequest({
    headers: { host: `127.0.0.1:${port}` },
  });
  const csrf = response.body.match(/name="csrf" value="([0-9a-f]+)"/)?.[1] ?? "";
  const setCookie = response.headers["set-cookie"] ?? [];
  const cookie = setCookie.find((value) => value.startsWith(`${CSRF_COOKIE}=`));
  const cookieHeader = cookie?.split(";")[0] ?? "";
  return { response, csrf, cookieHeader };
}

describe("loopback provision server", () => {
  it("refuses to bind anything other than 127.0.0.1", async () => {
    const crypto = await import(betterAuthCrypto);
    expect(() =>
      createProvisionServer({ hashPassword: crypto.hashPassword, port: 0, host: "0.0.0.0" }),
    ).toThrow(/127\.0\.0\.1/);
  });

  it("rejects wrong Host, Origin, cross-site POST, and oversize bodies", async () => {
    await start();
    const { csrf, cookieHeader, response } = await getForm();
    expect(response.status).toBe(200);
    expect(response.headers["content-security-policy"]).toMatch(/frame-ancestors 'none'/);
    expect(response.headers["x-frame-options"]).toBe("DENY");
    expect(csrf).toMatch(/^[0-9a-f]{64}$/);

    const wrongHost = await rawRequest({
      headers: { host: "evil.example" },
    });
    expect(wrongHost.status).toBe(403);
    expect(wrongHost.body).toMatch(/Invalid Host/);

    const body = new URLSearchParams({
      email,
      password,
      csrf,
      name: "Op",
    }).toString();

    const wrongOrigin = await rawRequest({
      method: "POST",
      path: "/sql",
      headers: {
        host: `127.0.0.1:${port}`,
        origin: "https://evil.example",
        cookie: cookieHeader,
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
    });
    expect(wrongOrigin.status).toBe(403);
    expect(wrongOrigin.body).toMatch(/Invalid Origin/);

    const crossSite = await rawRequest({
      method: "POST",
      path: "/sql",
      headers: {
        host: `127.0.0.1:${port}`,
        origin: "https://attacker.example",
        cookie: cookieHeader,
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
    });
    expect(crossSite.status).toBe(403);

    const oversize = await rawRequest({
      method: "POST",
      path: "/sql",
      headers: {
        host: `127.0.0.1:${port}`,
        origin: `http://127.0.0.1:${port}`,
        cookie: cookieHeader,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: `${body}&pad=${"x".repeat(MAX_BODY_BYTES)}`,
    });
    expect(oversize.status).toBe(413);
  });

  it("hashes a vault-fill POST with Better Auth scrypt and does not log the password", async () => {
    logs.length = 0;
    process.stdout.write = ((chunk: unknown, ...rest: unknown[]) => {
      capture(chunk);
      return originalWrite(chunk as never, ...(rest as never[]));
    }) as typeof process.stdout.write;
    process.stderr.write = ((chunk: unknown, ...rest: unknown[]) => {
      capture(chunk);
      return originalError(chunk as never, ...(rest as never[]));
    }) as typeof process.stderr.write;
    try {
      await start();
      const { csrf, cookieHeader, response } = await getForm();
      expect(response.body).not.toMatch(/https?:\/\//);
      const posted = await rawRequest({
        method: "POST",
        path: "/sql",
        headers: {
          host: `127.0.0.1:${port}`,
          origin: `http://127.0.0.1:${port}`,
          cookie: cookieHeader,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ email, password, csrf, name: "Op" }).toString(),
      });
      expect(posted.status).toBe(200);
      expect(posted.body).toContain(email);
      expect(posted.body).not.toContain(password);
      expect(posted.body).toMatch(/WHERE NOT EXISTS \(SELECT 1 FROM "user"/);
      const hash = posted.body.match(/'([0-9a-f]+:[0-9a-f]+)'/)?.[1];
      expect(hash).toBeTruthy();
      expect(await verifyPassword({ hash: hash!, password })).toBe(true);
      expect(logs.join("")).not.toContain(password);
    } finally {
      process.stdout.write = originalWrite;
      process.stderr.write = originalError;
    }
  });
});
