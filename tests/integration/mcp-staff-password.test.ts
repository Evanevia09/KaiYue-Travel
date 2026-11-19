import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPlatformProxy } from "wrangler";
import {
  PRODUCTION_ADMIN_HOST,
  STAGING_ADMIN_HOST,
  STAGING_MARKETING_HOST,
} from "../../apps/web/src/lib/server/admin-gate.ts";
import { createAdminSessionAuth } from "../../apps/web/src/lib/server/admin-session.ts";
import type { AppEnv } from "../../apps/web/src/lib/server/env.ts";
import {
  authenticateMcp,
  handleMcpSession,
  issueMcpTokenFromCredentials,
} from "../../apps/web/src/lib/server/mcp-access.ts";

const stagingOrigin = `https://${STAGING_ADMIN_HOST}`;
const productionOrigin = `https://${PRODUCTION_ADMIN_HOST}`;
const marketingOrigin = `https://${STAGING_MARKETING_HOST}`;
const apexOrigin = "https://kaiyuemacau.com";
const staffEmail = "mcp-staff-password@example.invalid";
const superEmail = "mcp-super-password@example.invalid";
const disabledEmail = "mcp-disabled-password@example.invalid";
const unprovisionedEmail = "mcp-unprovisioned-password@example.invalid";
const password = "aaaaaa";
const secret = "test-only-isolated-d1-secret-0123456789abcdef";

let platform: Awaited<ReturnType<typeof getPlatformProxy>>;
let env: AppEnv;
let staffId = "";
let superId = "";

function execMigration(target: AppEnv, name: string) {
  const sql = readFileSync(
    fileURLToPath(new URL(`../../migrations/${name}`, import.meta.url)),
    "utf8",
  )
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  return target.DB.exec(sql);
}

async function signUp(email: string): Promise<string> {
  const setupAuth = createAdminSessionAuth(env, true, new Request(`${stagingOrigin}/api/auth/ok`));
  const created = await setupAuth.handler(
    new Request(`${stagingOrigin}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: stagingOrigin },
      body: JSON.stringify({ name: "MCP Password Test", email, password }),
    }),
  );
  expect(created.status).toBe(200);
  const row = await env.DB.prepare('SELECT id FROM "user" WHERE email = ?')
    .bind(email)
    .first<{ id: string }>();
  expect(row?.id).toBeTruthy();
  return row!.id;
}

async function provision(userId: string, role: "staff" | "super_admin", enabled = 1) {
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO admin_operator (user_id, role, enabled, created_at, updated_at, updated_by)
     VALUES (?, ?, ?, ?, ?, 'test')`,
  )
    .bind(userId, role, enabled, now, now)
    .run();
}

function credentialRequest(
  email: string,
  secretValue: string,
  host = stagingOrigin,
  extra: { origin?: string; query?: string } = {},
) {
  const url = `${host}/api/v1/admin/mcp-session${extra.query ?? ""}`;
  const headers = new Headers({ "content-type": "application/json" });
  if (extra.origin) headers.set("origin", extra.origin);
  return new Request(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password: secretValue }),
  });
}

describe("staging MCP staff email/password exchange", () => {
  beforeAll(async () => {
    platform = await getPlatformProxy({
      configPath: fileURLToPath(new URL("../../apps/web/wrangler.jsonc", import.meta.url)),
      persist: false,
    });
    env = {
      ...(platform.env as AppEnv),
      ENVIRONMENT: "production",
      PUBLIC_SITE_URL: "https://staging.kaiyuemacau.com",
      BETTER_AUTH_SECRET: secret,
      ADMIN_EMAILS: `${staffEmail},${superEmail},${disabledEmail},${unprovisionedEmail}`,
      ADMIN_PRIMARY_EMAIL: superEmail,
      DEV_ADMIN_BYPASS: "false",
      ADMIN_STAGING_TEST_PASSWORD_MIN: "6",
    };
    await execMigration(env, "0004_admin_auth.sql");
    await execMigration(env, "0009_admin_operator.sql");
    await execMigration(env, "0010_admin_operator_last_super.sql");
    staffId = await signUp(staffEmail);
    superId = await signUp(superEmail);
    const disabledId = await signUp(disabledEmail);
    await signUp(unprovisionedEmail);
    await provision(staffId, "staff");
    await provision(superId, "super_admin");
    await provision(disabledId, "staff", 0);
  }, 30_000);

  afterAll(async () => {
    await platform?.dispose();
  });

  it("issues an MCP token from staff email and password without a browser Origin", async () => {
    const token = await issueMcpTokenFromCredentials(credentialRequest(staffEmail, password), env);
    const session = await authenticateMcp(
      new Request(`${stagingOrigin}/api/v1/admin/mcp`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
      }),
      env,
    );
    expect(session.actor).toBe(staffId);
    expect(session.cookie).toContain("__Secure-better-auth.session_token=");
  }, 30_000);

  it("keeps super_admin permissions on the signed-in account", async () => {
    const token = await issueMcpTokenFromCredentials(credentialRequest(superEmail, password), env);
    const session = await authenticateMcp(
      new Request(`${stagingOrigin}/api/v1/admin/mcp`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
      }),
      env,
    );
    expect(session.actor).toBe(superId);
  }, 30_000);

  it("accepts an agent Origin and returns a 30-minute token", async () => {
    const response = await handleMcpSession(
      credentialRequest(staffEmail, password, stagingOrigin, {
        origin: "https://www.cursor.com",
      }),
      env,
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { token?: string; expiresIn?: number };
    expect(body.expiresIn).toBe(1800);
    expect(body.token).toMatch(/^[\w-]+\.[\w-]+$/);
    const session = await authenticateMcp(
      new Request(`${stagingOrigin}/api/v1/admin/mcp`, {
        method: "POST",
        headers: { authorization: `Bearer ${body.token}` },
      }),
      env,
    );
    expect(session.actor).toBe(staffId);
  }, 30_000);

  it("rejects a bad password", async () => {
    await expect(
      issueMcpTokenFromCredentials(credentialRequest(staffEmail, "wrong-password"), env),
    ).rejects.toMatchObject({ status: 401, code: "UNAUTHORIZED" });
  }, 30_000);

  it("fails closed for a disabled account", async () => {
    await expect(
      issueMcpTokenFromCredentials(credentialRequest(disabledEmail, password), env),
    ).rejects.toMatchObject({ status: 401 });
  }, 30_000);

  it("fails closed for an unprovisioned account", async () => {
    await expect(
      issueMcpTokenFromCredentials(credentialRequest(unprovisionedEmail, password), env),
    ).rejects.toMatchObject({ status: 401 });
  }, 30_000);

  it("rejects credentials in the URL", async () => {
    const response = await handleMcpSession(
      credentialRequest(staffEmail, password, stagingOrigin, {
        query: `?email=${encodeURIComponent(staffEmail)}&password=${encodeURIComponent(password)}`,
      }),
      env,
    );
    expect(response.status).toBe(422);
    const body = (await response.json()) as { error?: { message?: string } };
    expect(body.error?.message).toMatch(/URL/i);
  }, 30_000);

  it("rejects GET on the staging session path after the host gate", async () => {
    const response = await handleMcpSession(
      new Request(`${stagingOrigin}/api/v1/admin/mcp-session`),
      env,
    );
    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("POST");
  });

  it("is unavailable on production and non-staging hosts", async () => {
    const body = JSON.stringify({ email: staffEmail, password });
    const headers = { "content-type": "application/json" };
    const production = await handleMcpSession(
      new Request(`${productionOrigin}/api/v1/admin/mcp-session`, {
        method: "POST",
        headers,
        body,
      }),
      env,
    );
    const marketing = await handleMcpSession(
      new Request(`${marketingOrigin}/api/v1/admin/mcp-session`, {
        method: "POST",
        headers,
        body,
      }),
      env,
    );
    const apex = await handleMcpSession(
      new Request(`${apexOrigin}/api/v1/admin/mcp-session`, {
        method: "POST",
        headers,
        body,
      }),
      env,
    );
    const productionSite = await handleMcpSession(credentialRequest(staffEmail, password), {
      ...env,
      PUBLIC_SITE_URL: "https://kaiyuemacau.com",
    });
    expect(production.status).toBe(404);
    expect(marketing.status).toBe(404);
    expect(apex.status).toBe(404);
    expect(productionSite.status).toBe(404);
  }, 30_000);
});
