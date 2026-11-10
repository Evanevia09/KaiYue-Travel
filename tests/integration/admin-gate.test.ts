import { describe, expect, it } from "vitest";
import {
  ACCESS_ADMIN_HOST,
  PRODUCTION_HOSTS,
  STAGING_HOSTS,
  assertLiveAdminSurface,
  isPreviewRuntime,
  isProtectedAdminPath,
  passwordAdminAllowed,
  temporaryPasswordConfigured,
} from "../../apps/web/src/lib/server/admin-gate.ts";
import { handleApi } from "../../apps/web/src/lib/server/router.ts";
import { createTestEnv } from "../helpers/memory-d1.ts";

const PRODUCTION_PATHS = [
  "/admin",
  "/admin/offers",
  "/login",
  "/setup-admin",
  "/api/v1/admin/bookings",
  "/api/admin/offers",
  "/api/auth/ok",
  "/api/auth/sign-in/email",
];

const futureExpiry = "2099-01-01T00:00:00.000Z";
const pastExpiry = "2020-01-01T00:00:00.000Z";
const stagingOrigin = `https://${STAGING_HOSTS[0]}`;
const productionOrigin = "https://kaiyuemacau.com";
const wwwOrigin = "https://www.kaiyuemacau.com";
const legacyOrigin = "https://kaiyue-travel.scalingsmb.workers.dev";
const accessOrigin = `https://${ACCESS_ADMIN_HOST}`;

function tempPreviewEnv() {
  return createTestEnv({
    ENVIRONMENT: "preview",
    DEV_ADMIN_BYPASS: "false",
    ADMIN_EMAILS: "operator@example.invalid",
    TEMP_ADMIN_EXPIRES_AT: futureExpiry,
    BETTER_AUTH_SECRET: "test-only-isolated-d1-secret-0123456789abcdef",
    PUBLIC_SITE_URL: stagingOrigin,
  });
}

describe("production admin gate", () => {
  it("does not treat the staging workers.dev host as a production public host", () => {
    expect(PRODUCTION_HOSTS).not.toContain(STAGING_HOSTS[0]);
    expect(PRODUCTION_HOSTS).toContain("kaiyuemacau.com");
    expect(PRODUCTION_HOSTS).toContain("www.kaiyuemacau.com");
  });

  it("forbids every listed admin surface on production public hosts without temp password vars", async () => {
    const env = createTestEnv({ ENVIRONMENT: "production", DEV_ADMIN_BYPASS: "false" });
    for (const origin of [productionOrigin, wwwOrigin, legacyOrigin]) {
      for (const pathname of PRODUCTION_PATHS) {
        expect(isProtectedAdminPath(pathname)).toBe(true);
        const request = new Request(`${origin}${pathname}`);
        expect(() => assertLiveAdminSurface(env, pathname, request)).toThrow(
          /Admin access is not configured/,
        );
      }
    }

    for (const pathname of ["/api/v1/admin/bookings", "/api/admin/offers"]) {
      const response = await handleApi(new Request(`${productionOrigin}${pathname}`), env);
      expect(response.status, pathname).toBe(403);
    }
  });

  it("does not treat ENVIRONMENT=preview, development, or DEV_ADMIN_BYPASS as a production shortcut", async () => {
    const previewLabel = createTestEnv({
      ENVIRONMENT: "preview",
      DEV_ADMIN_BYPASS: "false",
    });
    const developmentLabel = createTestEnv({
      ENVIRONMENT: "development",
      DEV_ADMIN_BYPASS: "true",
    });
    const bypass = createTestEnv({
      ENVIRONMENT: "production",
      DEV_ADMIN_BYPASS: "true",
    });
    const request = new Request(`${productionOrigin}/login`);
    expect(isPreviewRuntime(previewLabel, request)).toBe(false);
    expect(() => assertLiveAdminSurface(previewLabel, "/login", request)).toThrow(
      /Admin access is not configured/,
    );
    expect(() => assertLiveAdminSurface(developmentLabel, "/login", request)).toThrow(
      /Admin access is not configured/,
    );
    expect(() => assertLiveAdminSurface(bypass, "/login", request)).toThrow(
      /Admin access is not configured/,
    );
    const bypassedApi = await handleApi(
      new Request(`${productionOrigin}/api/v1/admin/summary`),
      bypass,
    );
    expect(bypassedApi.status).toBe(403);
    const developmentApi = await handleApi(
      new Request(`${productionOrigin}/api/v1/admin/summary`),
      developmentLabel,
    );
    expect(developmentApi.status).toBe(403);
  });

  it("does not treat an unknown workers.dev host as preview when ENVIRONMENT=production", () => {
    const env = createTestEnv({
      ENVIRONMENT: "production",
      DEV_ADMIN_BYPASS: "false",
      ADMIN_EMAILS: "operator@example.invalid",
      TEMP_ADMIN_EXPIRES_AT: futureExpiry,
    });
    const request = new Request("https://kaiyue-travel.kai-yue.workers.dev/login");
    expect(isPreviewRuntime(env, request)).toBe(false);
    expect(passwordAdminAllowed(env, request)).toBe(false);
    expect(() => assertLiveAdminSurface(env, "/login", request)).toThrow(
      /Admin access is not configured/,
    );
  });

  it("keeps the Access hostname password-closed even when temp vars are set", () => {
    const env = tempPreviewEnv();
    const login = new Request(`${accessOrigin}/login`);
    const admin = new Request(`${accessOrigin}/admin`);
    expect(passwordAdminAllowed(env, login)).toBe(false);
    expect(() => assertLiveAdminSurface(env, "/login", login)).toThrow(
      /Admin access is not configured/,
    );
    expect(() => assertLiveAdminSurface(env, "/admin", admin)).toThrow(
      /Admin access is not configured/,
    );
  });
});

describe("temporary password admin", () => {
  it("requires an allowlist and a future expiry outside local development", () => {
    expect(
      temporaryPasswordConfigured({
        ADMIN_EMAILS: "operator@example.invalid",
        TEMP_ADMIN_EXPIRES_AT: futureExpiry,
      }),
    ).toBe(true);
    expect(
      temporaryPasswordConfigured({
        ADMIN_EMAILS: "operator@example.invalid",
        TEMP_ADMIN_EXPIRES_AT: pastExpiry,
      }),
    ).toBe(false);
    expect(
      temporaryPasswordConfigured({
        ADMIN_EMAILS: "",
        TEMP_ADMIN_EXPIRES_AT: futureExpiry,
      }),
    ).toBe(false);
    expect(
      temporaryPasswordConfigured({
        ADMIN_EMAILS: "operator@example.invalid",
        TEMP_ADMIN_EXPIRES_AT: "not-a-date",
      }),
    ).toBe(false);
  });

  it("allows the staging host when preview env, allowlist, and future expiry are set", () => {
    const env = tempPreviewEnv();
    const login = new Request(`${stagingOrigin}/login`);
    const setup = new Request(`${stagingOrigin}/setup-admin`);
    const admin = new Request(`${stagingOrigin}/admin`);
    expect(isPreviewRuntime(env, login)).toBe(true);
    expect(passwordAdminAllowed(env, login)).toBe(true);
    expect(() => assertLiveAdminSurface(env, "/login", login)).not.toThrow();
    expect(() => assertLiveAdminSurface(env, "/setup-admin", setup)).toThrow(
      /Operator setup is disabled/,
    );
    expect(() => assertLiveAdminSurface(env, "/admin", admin)).not.toThrow();
  });

  it("closes staging login after expiry or without an allowlist", () => {
    const expired = createTestEnv({
      ENVIRONMENT: "preview",
      DEV_ADMIN_BYPASS: "false",
      ADMIN_EMAILS: "operator@example.invalid",
      TEMP_ADMIN_EXPIRES_AT: pastExpiry,
    });
    const noAllowlist = createTestEnv({
      ENVIRONMENT: "preview",
      DEV_ADMIN_BYPASS: "false",
      TEMP_ADMIN_EXPIRES_AT: futureExpiry,
    });
    const request = new Request(`${stagingOrigin}/login`);
    expect(() => assertLiveAdminSurface(expired, "/login", request)).toThrow(
      /Admin access is not configured/,
    );
    expect(() => assertLiveAdminSurface(noAllowlist, "/login", request)).toThrow(
      /Admin access is not configured/,
    );
  });

  it("returns 403 from admin APIs on staging when temp password is not configured", async () => {
    const env = createTestEnv({ ENVIRONMENT: "preview", DEV_ADMIN_BYPASS: "false" });
    const response = await handleApi(new Request(`${stagingOrigin}/api/v1/admin/summary`), env);
    expect(response.status).toBe(403);
  });

  it("prepares production public hosts for temp password only when Access is unset", () => {
    const ready = createTestEnv({
      ENVIRONMENT: "production",
      DEV_ADMIN_BYPASS: "false",
      ADMIN_EMAILS: "operator@example.invalid",
      TEMP_ADMIN_EXPIRES_AT: futureExpiry,
      BETTER_AUTH_SECRET: "test-only-isolated-d1-secret-0123456789abcdef",
      PUBLIC_SITE_URL: productionOrigin,
    });
    const withAccess = {
      ...ready,
      ACCESS_TEAM_DOMAIN: "kaiyue.cloudflareaccess.com",
      ACCESS_AUD: "audience-test",
    };
    const login = new Request(`${productionOrigin}/login`);
    expect(passwordAdminAllowed(ready, login)).toBe(true);
    expect(() => assertLiveAdminSurface(ready, "/login", login)).not.toThrow();
    expect(() => assertLiveAdminSurface(ready, "/setup-admin", login)).toThrow(
      /Operator setup is disabled/,
    );
    expect(passwordAdminAllowed(withAccess, login)).toBe(false);
    expect(() => assertLiveAdminSurface(withAccess, "/login", login)).toThrow(
      /Admin access is not configured/,
    );
  });
});
