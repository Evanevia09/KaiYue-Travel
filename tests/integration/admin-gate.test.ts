import { describe, expect, it } from "vitest";
import {
  ACCESS_ADMIN_HOST,
  assertLiveAdminSurface,
  passwordAdminAllowed,
  isProtectedAdminPath,
} from "../../apps/web/src/lib/server/admin-gate.ts";
import { requireSameOrigin } from "../../apps/web/src/lib/server/auth.ts";
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

describe("production admin gate", () => {
  it("forbids every listed admin surface on kaiyue-travel.scalingsmb.workers.dev", async () => {
    const env = createTestEnv({ ENVIRONMENT: "production", DEV_ADMIN_BYPASS: "false" });
    for (const pathname of PRODUCTION_PATHS) {
      expect(isProtectedAdminPath(pathname)).toBe(true);
      const request = new Request(`https://kaiyue-travel.scalingsmb.workers.dev${pathname}`);
      expect(() => assertLiveAdminSurface(env, pathname, request)).toThrow(
        /Admin access is not configured/,
      );
    }

    for (const pathname of ["/api/v1/admin/bookings", "/api/admin/offers"]) {
      const response = await handleApi(
        new Request(`https://kaiyue-travel.scalingsmb.workers.dev${pathname}`),
        env,
      );
      expect(response.status, pathname).toBe(403);
    }
  });
});

describe("dedicated Access admin hostname", () => {
  const origin = `https://${ACCESS_ADMIN_HOST}`;
  const access = {
    ENVIRONMENT: "production",
    ACCESS_TEAM_DOMAIN: "team.cloudflareaccess.com",
    ACCESS_AUD: "admin-audience",
  };

  it("requires Access configuration and disables password routes", () => {
    const path = "/admin/offers";
    const request = new Request(origin + path);
    expect(() => assertLiveAdminSurface(createTestEnv(), path, request)).toThrow();
    const env = createTestEnv({ ...access, ENVIRONMENT: "development", DEV_ADMIN_BYPASS: "true" });
    expect(() => assertLiveAdminSurface(env, path, request)).not.toThrow();
    expect(passwordAdminAllowed(env, request)).toBe(false);
    for (const passwordPath of ["/login", "/setup-admin", "/api/auth/sign-in/email"]) {
      expect(() =>
        assertLiveAdminSurface(env, passwordPath, new Request(origin + passwordPath)),
      ).toThrow();
    }
  });

  it("rejects missing and invalid tokens, including with the local bypass flag", async () => {
    const env = createTestEnv({ ...access, ENVIRONMENT: "development", DEV_ADMIN_BYPASS: "true" });
    const url = origin + "/api/v1/admin/bookings";
    expect((await handleApi(new Request(url), env)).status).toBe(403);
    const request = new Request(url, { headers: { "cf-access-jwt-assertion": "invalid" } });
    expect((await handleApi(request, env)).status).toBe(401);
  });

  it("limits dedicated admin mutations to the admin origin", () => {
    const publicOrigin = "https://kaiyuemacau.com";
    const env = createTestEnv({ ...access, PUBLIC_SITE_URL: publicOrigin });
    const url = origin + "/api/v1/admin/bookings";
    const mutation = (origin: string) => new Request(url, { method: "POST", headers: { origin } });
    expect(() => requireSameOrigin(mutation(origin), env)).not.toThrow();
    expect(() => requireSameOrigin(mutation(publicOrigin), env)).toThrow();
  });
});
