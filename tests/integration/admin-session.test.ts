import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPlatformProxy } from "wrangler";
import { createAdminSessionAuth } from "../../apps/web/src/lib/server/admin-session.ts";
import { requireAdmin } from "../../apps/web/src/lib/server/auth.ts";
import type { AppEnv } from "../../apps/web/src/lib/server/env.ts";

const site = "http://localhost:4321";
const email = "local-auth-test@example.invalid";
const password = "local-only-test-password-2026";
let platform: Awaited<ReturnType<typeof getPlatformProxy>>;
let env: AppEnv;

beforeAll(async () => {
  platform = await getPlatformProxy({
    configPath: fileURLToPath(new URL("../../apps/web/wrangler.jsonc", import.meta.url)),
    persist: false,
  });
  env = {
    ...(platform.env as AppEnv),
    ENVIRONMENT: "development",
    PUBLIC_SITE_URL: site,
    BETTER_AUTH_SECRET: "test-only-isolated-d1-secret-0123456789abcdef",
    ADMIN_EMAILS: email,
    DEV_ADMIN_BYPASS: "false",
    TEMP_ADMIN_EXPIRES_AT: new Date(Date.now() + 60_000).toISOString(),
  };
  const migration = readFileSync(
    fileURLToPath(new URL("../../migrations/0004_admin_auth.sql", import.meta.url)),
    "utf8",
  )
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  await env.DB.exec(migration);
}, 30_000);

afterAll(async () => {
  await platform?.dispose();
});

describe("admin session on local D1", () => {
  it("rejects anonymous requests, then accepts a signed-in allowlisted account", async () => {
    await expect(requireAdmin(new Request(`${site}/admin`), env)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });

    const setupAuth = createAdminSessionAuth(env, true);
    const signup = await setupAuth.handler(
      new Request(`${site}/api/auth/sign-up/email`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: site },
        body: JSON.stringify({ name: "Local Test Operator", email, password }),
      }),
    );
    expect(signup.status).toBe(200);

    const auth = createAdminSessionAuth(env);
    const login = await auth.handler(
      new Request(`${site}/api/auth/sign-in/email`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: site },
        body: JSON.stringify({ email, password }),
      }),
    );
    expect(login.status).toBe(200);
    const cookie = login.headers.get("set-cookie")?.split(";")[0];
    expect(cookie).toContain("better-auth.session_token=");
    const identity = await requireAdmin(
      new Request(`${site}/admin`, { headers: { cookie: cookie! } }),
      env,
    );
    expect(identity.email).toBe(email);

    await expect(
      requireAdmin(new Request(`${site}/admin`, { headers: { cookie: cookie! } }), {
        ...env,
        ADMIN_EMAILS: "someone-else@example.invalid",
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      requireAdmin(new Request(`${site}/admin`, { headers: { cookie: cookie! } }), {
        ...env,
        TEMP_ADMIN_EXPIRES_AT: "2020-01-01T00:00:00.000Z",
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  }, 30_000);
});
