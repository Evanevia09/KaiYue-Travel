import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPlatformProxy } from "wrangler";
import {
  PRODUCTION_ADMIN_HOST,
  STAGING_ADMIN_HOST,
} from "../../apps/web/src/lib/server/admin-gate.ts";
import {
  ADMIN_PASSWORD_MIN_LENGTH,
  ADMIN_STAGING_TEST_PASSWORD_FLOOR,
  adminPasswordMinLength,
  createAdminSessionAuth,
} from "../../apps/web/src/lib/server/admin-session.ts";
import { requireAdmin } from "../../apps/web/src/lib/server/auth.ts";
import type { AppEnv } from "../../apps/web/src/lib/server/env.ts";
import {
  approveMcpAction,
  authenticateMcp,
  consumeMcpApproval,
  issueMcpToken,
  readMcpApproval,
} from "../../apps/web/src/lib/server/mcp-access.ts";
import { handleApi } from "../../apps/web/src/lib/server/router.ts";
import { createTestEnv } from "../helpers/memory-d1.ts";

const stagingOrigin = `https://${STAGING_ADMIN_HOST}`;
const productionOrigin = `https://${PRODUCTION_ADMIN_HOST}`;
const apexOrigin = "https://kaiyuemacau.com";
const wwwOrigin = "https://www.kaiyuemacau.com";
const stagingEmail = "staging-admin-min-test@example.invalid";
const productionEmail = "production-admin-min-test@example.invalid";
const length6 = "aaaaaa";
const length5 = "aaaaa";
const length6Next = "bbbbbb";
const secret = "test-only-isolated-d1-secret-0123456789abcdef";

let platform: Awaited<ReturnType<typeof getPlatformProxy>>;
let env: AppEnv;

function cookieJar(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((part) => part.split(";")[0] ?? "")
    .filter((part) => part.includes("="))
    .join("; ");
}

function jsonHeaders(origin: string, cookie?: string): HeadersInit {
  return {
    "content-type": "application/json",
    origin,
    ...(cookie ? { cookie } : {}),
  };
}

async function signUp(
  target: AppEnv,
  origin: string,
  email: string,
  password: string,
): Promise<Response> {
  const setupAuth = createAdminSessionAuth(target, true, new Request(`${origin}/api/auth/ok`));
  return setupAuth.handler(
    new Request(`${origin}/api/auth/sign-up/email`, {
      method: "POST",
      headers: jsonHeaders(origin),
      body: JSON.stringify({ name: "Synthetic Test Operator", email, password }),
    }),
  );
}

async function signIn(
  target: AppEnv,
  origin: string,
  email: string,
  password: string,
): Promise<{ status: number; cookie: string }> {
  const auth = createAdminSessionAuth(target, false, new Request(`${origin}/api/auth/ok`));
  const login = await auth.handler(
    new Request(`${origin}/api/auth/sign-in/email`, {
      method: "POST",
      headers: jsonHeaders(origin),
      body: JSON.stringify({ email, password }),
    }),
  );
  return { status: login.status, cookie: cookieJar(login) };
}

describe("admin password minimum by host role", () => {
  const stagingRequest = new Request(`${stagingOrigin}/login`);
  const productionRequest = new Request(`${productionOrigin}/login`);
  const apexRequest = new Request(`${apexOrigin}/login`);
  const wwwRequest = new Request(`${wwwOrigin}/login`);
  const productionWithVar = createTestEnv({
    ENVIRONMENT: "production",
    ADMIN_STAGING_TEST_PASSWORD_MIN: "6",
  });
  const stagingWithVar = createTestEnv({
    ENVIRONMENT: "production",
    ADMIN_STAGING_TEST_PASSWORD_MIN: "6",
  });
  const stagingWithoutVar = createTestEnv({ ENVIRONMENT: "production" });

  it("hardcodes production at 12 and ignores ENVIRONMENT plus a mistaken staging var", () => {
    expect(ADMIN_PASSWORD_MIN_LENGTH).toBe(12);
    expect(ADMIN_STAGING_TEST_PASSWORD_FLOOR).toBe(6);
    expect(length6).toHaveLength(6);
    expect(length5).toHaveLength(5);
    expect(adminPasswordMinLength(productionWithVar, productionRequest)).toBe(12);
    expect(adminPasswordMinLength(productionWithVar, apexRequest)).toBe(12);
    expect(adminPasswordMinLength(productionWithVar, wwwRequest)).toBe(12);
    expect(
      adminPasswordMinLength(
        productionWithVar,
        new Request("https://kaiyue-travel-staging.kai-yue.workers.dev/login"),
      ),
    ).toBe(12);
    expect(adminPasswordMinLength(stagingWithVar)).toBe(12);
  });

  it("allows length 6 only on staging-admin when the staging-only var is set", () => {
    expect(adminPasswordMinLength(stagingWithVar, stagingRequest)).toBe(6);
    expect(adminPasswordMinLength(stagingWithoutVar, stagingRequest)).toBe(12);
    expect(
      adminPasswordMinLength(
        createTestEnv({
          ENVIRONMENT: "production",
          ADMIN_STAGING_TEST_PASSWORD_MIN: "1",
        }),
        stagingRequest,
      ),
    ).toBe(12);
  });
});

describe("staging-admin Better Auth min 6 vs production-admin min 12", () => {
  beforeAll(async () => {
    platform = await getPlatformProxy({
      configPath: fileURLToPath(new URL("../../apps/web/wrangler.jsonc", import.meta.url)),
      persist: false,
    });
    env = {
      ...(platform.env as AppEnv),
      ENVIRONMENT: "production",
      PUBLIC_SITE_URL: stagingOrigin,
      BETTER_AUTH_SECRET: secret,
      ADMIN_EMAILS: `${stagingEmail},${productionEmail}`,
      ADMIN_PRIMARY_EMAIL: stagingEmail,
      DEV_ADMIN_BYPASS: "false",
      ADMIN_STAGING_TEST_PASSWORD_MIN: "6",
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

  it("accepts length 6 on staging-admin login, create, and password change", async () => {
    expect(length6).toHaveLength(ADMIN_STAGING_TEST_PASSWORD_FLOOR);
    const created = await signUp(env, stagingOrigin, stagingEmail, length6);
    expect(created.status).toBe(200);

    const login = await signIn(env, stagingOrigin, stagingEmail, length6);
    expect(login.status).toBe(200);
    const identity = await requireAdmin(
      new Request(`${stagingOrigin}/admin`, { headers: { cookie: login.cookie } }),
      env,
    );
    expect(identity.email).toBe(stagingEmail);

    const tooShort = await handleApi(
      new Request(`${stagingOrigin}/api/v1/admin/profile/password`, {
        method: "POST",
        headers: jsonHeaders(stagingOrigin, login.cookie),
        body: JSON.stringify({
          currentPassword: length6,
          newPassword: length5,
          confirmPassword: length5,
        }),
      }),
      env,
    );
    expect(tooShort.status).toBe(422);

    const changed = await handleApi(
      new Request(`${stagingOrigin}/api/v1/admin/profile/password`, {
        method: "POST",
        headers: jsonHeaders(stagingOrigin, login.cookie),
        body: JSON.stringify({
          currentPassword: length6,
          newPassword: length6Next,
          confirmPassword: length6Next,
        }),
      }),
      env,
    );
    expect(changed.status).toBe(200);
    expect((await signIn(env, stagingOrigin, stagingEmail, length6Next)).status).toBe(200);
  }, 30_000);

  it("rejects below 12 on production-admin even when the staging var is present", async () => {
    const created = await signUp(env, productionOrigin, productionEmail, length6);
    expect(created.status).not.toBe(200);

    const longEnough = `${length6}${length6}`;
    expect(longEnough).toHaveLength(12);
    const productionCreate = await signUp(env, productionOrigin, productionEmail, longEnough);
    expect(productionCreate.status).toBe(200);
    for (const name of ["0009_admin_operator.sql", "0010_admin_operator_last_super.sql"]) {
      await env.DB.exec(
        readFileSync(fileURLToPath(new URL(`../../migrations/${name}`, import.meta.url)), "utf8")
          .split("\n")
          .filter((line) => !line.trim().startsWith("--"))
          .join("\n"),
      );
    }
    const now = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO admin_operator (user_id, role, enabled, created_at, updated_at, updated_by)
       SELECT id, 'super_admin', 1, ?, ?, 'production-bootstrap' FROM "user" WHERE email = ?`,
    )
      .bind(now, now, productionEmail)
      .run();
    const productionEnv = {
      ...env,
      ADMIN_PRIMARY_EMAIL: productionEmail,
      PUBLIC_SITE_URL: productionOrigin,
    };
    const productionLogin = await signIn(
      productionEnv,
      productionOrigin,
      productionEmail,
      longEnough,
    );
    expect(productionLogin.status).toBe(200);

    const shortChange = await handleApi(
      new Request(`${productionOrigin}/api/v1/admin/profile/password`, {
        method: "POST",
        headers: jsonHeaders(productionOrigin, productionLogin.cookie),
        body: JSON.stringify({
          currentPassword: longEnough,
          newPassword: length6,
          confirmPassword: length6,
        }),
      }),
      productionEnv,
    );
    expect(shortChange.status).toBe(422);
    const body = (await shortChange.json()) as { error?: { message?: string } };
    expect(body.error?.message).toBe("New password must be at least 12 characters.");
  }, 30_000);

  it("binds MCP connections and approvals to the current stage session and consumes approval once", async () => {
    const now = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO admin_operator (user_id, role, enabled, created_at, updated_at, updated_by)
       SELECT id, 'staff', 1, ?, ?, 'test' FROM "user" WHERE email = ?`,
    )
      .bind(now, now, stagingEmail)
      .run();
    const baseMigration = readFileSync(
      fileURLToPath(new URL("../../migrations/0001_init.sql", import.meta.url)),
      "utf8",
    );
    const idempotencyTable = baseMigration.slice(
      baseMigration.indexOf("CREATE TABLE idempotency_keys"),
      baseMigration.indexOf("CREATE TABLE rate_limits"),
    );
    await env.DB.exec(
      idempotencyTable
        .split(";")
        .map((sql) => sql.trim().replace(/\s+/g, " "))
        .filter(Boolean)
        .join(";\n"),
    );
    const target = { ...env, PUBLIC_SITE_URL: "https://staging.kaiyuemacau.com" };
    const login = await signIn(target, stagingOrigin, stagingEmail, length6Next);
    expect(login.status).toBe(200);
    const form = new Request(`${stagingOrigin}/admin/agent-connect`, {
      method: "POST",
      headers: jsonHeaders(stagingOrigin, login.cookie),
    });
    const token = await issueMcpToken(form, target);
    const mcpRequest = (host = stagingOrigin, bearer = token) =>
      new Request(`${host}/api/v1/admin/mcp`, {
        method: "POST",
        headers: { authorization: `Bearer ${bearer}` },
      });
    const session = await authenticateMcp(mcpRequest(), target);
    await expect(authenticateMcp(mcpRequest(productionOrigin), target)).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      authenticateMcp(mcpRequest(stagingOrigin, token + "x"), target),
    ).rejects.toMatchObject({ status: 401 });
    await expect(
      issueMcpToken(
        new Request(form.url, {
          method: "POST",
          headers: jsonHeaders("https://example.invalid", login.cookie),
        }),
        target,
      ),
    ).rejects.toMatchObject({ status: 403 });

    const operation = ["status", "KY-ABCDEFGH", "approved"];
    const approvalUrl = await consumeMcpApproval(
      target,
      session.actor,
      operation,
      "Approve test booking?",
    );
    expect(approvalUrl).toMatch(/agent-review/);
    const ticket = new URL(approvalUrl!).searchParams.get("ticket")!;
    const reviewPage = new Request(approvalUrl!, { headers: { cookie: login.cookie } });
    expect((await readMcpApproval(reviewPage, target, ticket)).message).toBe(
      "Approve test booking?",
    );
    const confirmation = new Request(approvalUrl!, {
      method: "POST",
      headers: jsonHeaders(stagingOrigin, login.cookie),
    });
    await approveMcpAction(confirmation, target, ticket);
    expect(
      await consumeMcpApproval(target, session.actor, operation, "Approve test booking?"),
    ).toBeNull();
    expect(
      await consumeMcpApproval(target, session.actor, operation, "Approve test booking?"),
    ).toMatch(/agent-review/);
    await expect(approveMcpAction(confirmation, target, ticket)).rejects.toMatchObject({
      status: 409,
    });
    await env.DB.prepare("UPDATE admin_operator SET enabled = 0 WHERE user_id = ?")
      .bind(session.actor)
      .run();
    await expect(authenticateMcp(mcpRequest(), target)).rejects.toMatchObject({ status: 401 });
  }, 30_000);
});
