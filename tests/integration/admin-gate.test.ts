import { describe, expect, it } from "vitest";
import {
  ACCESS_ADMIN_HOST,
  ADMIN_TRIAL_HOST,
  PRODUCTION_ADMIN_HOST,
  PRODUCTION_HOSTS,
  PRODUCTION_MARKETING_HOSTS,
  STAGING_ADMIN_HOST,
  STAGING_MARKETING_HOST,
  HTML_RUN_WORKER_FIRST,
  INSUFFICIENT_HTML_WORKER_FIRST_PATHS,
  PRODUCTION_NOTIFICATION_HOSTS,
  applyHostIsolationHeaders,
  dedicatedAdminCacheHeaders,
  productionNotificationsAllowed,
  stagingNotificationsFailClosed,
  accessBindingState,
  accessConfigured,
  assertLiveAdminSurface,
  hostNavigationAction,
  isProtectedAdminPath,
  passwordAdminAllowed,
  resolveHostRole,
} from "../../apps/web/src/lib/server/admin-gate.ts";
import { temporaryAdminExpiryApplies } from "../../apps/web/src/lib/server/admin-primary.ts";
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

const PUBLIC_PRODUCTION_ORIGINS = [
  "https://kaiyue-travel.scalingsmb.workers.dev",
  "https://kaiyuemacau.com",
  "https://www.kaiyuemacau.com",
  "https://kaiyue-travel-staging.kai-yue.workers.dev",
] as const;

const liveEnv = { ENVIRONMENT: "production", DEV_ADMIN_BYPASS: "false" } as const;

describe("host roles", () => {
  const env = createTestEnv(liveEnv);

  it("classifies the four named product hosts", () => {
    expect(resolveHostRole(env, new Request("https://kaiyuemacau.com/"))).toBe(
      "production-marketing",
    );
    expect(resolveHostRole(env, new Request("https://www.kaiyuemacau.com/"))).toBe(
      "production-marketing",
    );
    expect(resolveHostRole(env, new Request(`https://${PRODUCTION_ADMIN_HOST}/`))).toBe(
      "production-admin",
    );
    expect(resolveHostRole(env, new Request(`https://${STAGING_MARKETING_HOST}/`))).toBe(
      "staging-marketing",
    );
    expect(resolveHostRole(env, new Request(`https://${STAGING_ADMIN_HOST}/`))).toBe(
      "staging-admin",
    );
  });

  it("keeps official staging workers.dev production-protected and omits the trial host", () => {
    expect(PRODUCTION_MARKETING_HOSTS).toContain("kaiyue-travel-staging.kai-yue.workers.dev");
    expect(PRODUCTION_HOSTS).toEqual([...PRODUCTION_MARKETING_HOSTS]);
    expect(PRODUCTION_HOSTS).not.toContain(ADMIN_TRIAL_HOST);
    expect(PRODUCTION_HOSTS).not.toContain(STAGING_ADMIN_HOST);
    expect(PRODUCTION_HOSTS).not.toContain(STAGING_MARKETING_HOST);
    expect(
      resolveHostRole(env, new Request("https://kaiyue-travel-staging.kai-yue.workers.dev/")),
    ).toBe("production-marketing");
    expect(resolveHostRole(env, new Request(`https://${ADMIN_TRIAL_HOST}/`))).toBe("preview");
  });

  it("does not let ENVIRONMENT=preview open named marketing hosts", () => {
    const preview = createTestEnv({ ENVIRONMENT: "preview", DEV_ADMIN_BYPASS: "false" });
    expect(resolveHostRole(preview, new Request("https://kaiyuemacau.com/login"))).toBe(
      "production-marketing",
    );
    expect(
      resolveHostRole(
        preview,
        new Request("https://kaiyue-travel-staging.kai-yue.workers.dev/admin"),
      ),
    ).toBe("production-marketing");
    expect(resolveHostRole(preview, new Request(`https://${STAGING_MARKETING_HOST}/login`))).toBe(
      "staging-marketing",
    );
  });
});

describe("dedicated admin host root vs marketing host root", () => {
  const env = createTestEnv(liveEnv);
  const marketingRoots = [
    "https://kaiyuemacau.com/",
    "https://www.kaiyuemacau.com/",
    `https://${STAGING_MARKETING_HOST}/`,
  ];

  it("redirects admin-host / and other marketing pages to /login when Access is absent", () => {
    for (const host of [STAGING_ADMIN_HOST, PRODUCTION_ADMIN_HOST]) {
      expect(hostNavigationAction(env, new Request(`https://${host}/`))).toBe("redirect-login");
      expect(hostNavigationAction(env, new Request(`https://${host}`))).toBe("redirect-login");
      expect(hostNavigationAction(env, new Request(`https://${host}/about`))).toBe(
        "redirect-login",
      );
      expect(hostNavigationAction(env, new Request(`https://${host}/pt`))).toBe("redirect-login");
      expect(hostNavigationAction(env, new Request(`https://${host}/special-offers`))).toBe(
        "redirect-login",
      );
      expect(hostNavigationAction(env, new Request(`https://${host}/login`))).toBe("pass");
      expect(hostNavigationAction(env, new Request(`https://${host}/admin`))).toBe("pass");
      expect(hostNavigationAction(env, new Request(`https://${host}/_astro/login.js`))).toBe(
        "pass",
      );
      expect(hostNavigationAction(env, new Request(`https://${host}/images/mark.svg`))).toBe(
        "pass",
      );
    }
    expect(HTML_RUN_WORKER_FIRST).toBe(true);
    expect(INSUFFICIENT_HTML_WORKER_FIRST_PATHS).toEqual([
      "/*",
      "!/_astro/*",
      "!/images/*",
      "!/favicon.ico",
    ]);
  });

  it("marks dedicated-admin HTML uncacheable and host-varied", () => {
    const adminHeaders = new Headers({ "content-type": "text/html" });
    applyHostIsolationHeaders(adminHeaders, { dedicatedAdmin: true });
    expect(adminHeaders.get("cache-control")).toBe(dedicatedAdminCacheHeaders()["cache-control"]);
    expect(adminHeaders.get("vary")).toBe("Host");
    expect(adminHeaders.get("cdn-cache-control")).toBe("no-store");

    const marketingHeaders = new Headers({
      "content-type": "text/html",
      "cache-control": "public, max-age=0, must-revalidate",
    });
    applyHostIsolationHeaders(marketingHeaders, { dedicatedAdmin: false });
    expect(marketingHeaders.get("vary")).toBe("Host");
    expect(marketingHeaders.get("cache-control")).toBe("public, max-age=0, must-revalidate");
  });

  it("fail-closes notifications unless PUBLIC_SITE_URL is an explicit production site", () => {
    expect(PRODUCTION_NOTIFICATION_HOSTS).toEqual(["kaiyuemacau.com", "www.kaiyuemacau.com"]);
    expect(productionNotificationsAllowed({ PUBLIC_SITE_URL: "https://kaiyuemacau.com" })).toBe(
      true,
    );
    expect(productionNotificationsAllowed({ PUBLIC_SITE_URL: "https://www.kaiyuemacau.com" })).toBe(
      true,
    );
    expect(stagingNotificationsFailClosed({ PUBLIC_SITE_URL: "https://kaiyuemacau.com" })).toBe(
      false,
    );

    expect(stagingNotificationsFailClosed({ PUBLIC_SITE_URL: "" })).toBe(true);
    expect(stagingNotificationsFailClosed({ PUBLIC_SITE_URL: "   " })).toBe(true);
    expect(stagingNotificationsFailClosed({})).toBe(true);
    expect(stagingNotificationsFailClosed({ PUBLIC_SITE_URL: "not a url" })).toBe(true);
    expect(stagingNotificationsFailClosed({ PUBLIC_SITE_URL: "http://kaiyuemacau.com" })).toBe(
      true,
    );
    expect(
      stagingNotificationsFailClosed({ PUBLIC_SITE_URL: "https://staging.kaiyuemacau.com" }),
    ).toBe(true);
    expect(
      stagingNotificationsFailClosed({ PUBLIC_SITE_URL: "https://admin-staging.kaiyuemacau.com" }),
    ).toBe(true);
    expect(
      stagingNotificationsFailClosed({
        PUBLIC_SITE_URL: "https://kaiyue-travel-staging.kai-yue.workers.dev",
      }),
    ).toBe(true);
    expect(
      stagingNotificationsFailClosed({
        PUBLIC_SITE_URL: "https://kaiyue-travel.scalingsmb.workers.dev",
      }),
    ).toBe(true);
  });

  it("leaves marketing-host / as the public site and keeps /login 403", () => {
    for (const origin of marketingRoots) {
      expect(hostNavigationAction(env, new Request(origin))).toBe("pass");
      const login = new URL("/login", origin);
      expect(hostNavigationAction(env, new Request(login))).toBe("pass");
      expect(() => assertLiveAdminSurface(env, "/login", new Request(login))).toThrow(
        /Admin access is not configured/,
      );
      expect(() =>
        assertLiveAdminSurface(env, "/admin", new Request(new URL("/admin", origin))),
      ).toThrow(/Admin access is not configured/);
    }
  });

  it("fails closed on admin-host / when Access is partial", () => {
    const partial = createTestEnv({
      ...liveEnv,
      ACCESS_TEAM_DOMAIN: "team.cloudflareaccess.com",
    });
    expect(hostNavigationAction(partial, new Request(`https://${STAGING_ADMIN_HOST}/`))).toBe(
      "forbid",
    );
  });

  it("sends Access-configured admin-host / to /admin rather than marketing HTML", () => {
    const access = createTestEnv({
      ...liveEnv,
      ACCESS_TEAM_DOMAIN: "team.cloudflareaccess.com",
      ACCESS_AUD: "admin-audience",
    });
    expect(hostNavigationAction(access, new Request(`https://${PRODUCTION_ADMIN_HOST}/`))).toBe(
      "redirect-admin",
    );
    expect(hostNavigationAction(access, new Request(`https://${STAGING_ADMIN_HOST}/about`))).toBe(
      "redirect-admin",
    );
  });
});

describe("production admin gate", () => {
  it("forbids every listed admin surface on public production hosts", async () => {
    const env = createTestEnv(liveEnv);
    for (const origin of PUBLIC_PRODUCTION_ORIGINS) {
      expect(resolveHostRole(env, new Request(origin))).toBe("production-marketing");
      for (const pathname of PRODUCTION_PATHS) {
        expect(isProtectedAdminPath(pathname)).toBe(true);
        const request = new Request(`${origin}${pathname}`);
        expect(() => assertLiveAdminSurface(env, pathname, request)).toThrow(
          /Admin access is not configured/,
        );
        expect(passwordAdminAllowed(env, request)).toBe(false);
      }

      for (const pathname of ["/api/v1/admin/bookings", "/api/admin/offers"]) {
        const response = await handleApi(new Request(`${origin}${pathname}`), env);
        expect(response.status, `${origin}${pathname}`).toBe(403);
      }
    }
  });

  it("does not treat DEV_ADMIN_BYPASS as an apex shortcut", () => {
    const env = createTestEnv({ ENVIRONMENT: "production", DEV_ADMIN_BYPASS: "true" });
    expect(() =>
      assertLiveAdminSurface(env, "/login", new Request("https://kaiyuemacau.com/login")),
    ).toThrow(/Admin access is not configured/);
    expect(() =>
      assertLiveAdminSurface(env, "/admin", new Request("https://www.kaiyuemacau.com/admin")),
    ).toThrow(/Admin access is not configured/);
  });
});

describe("staging marketing host", () => {
  const origin = `https://${STAGING_MARKETING_HOST}`;

  it("does not offer staff login on staging.kaiyuemacau.com", async () => {
    const env = createTestEnv(liveEnv);
    expect(resolveHostRole(env, new Request(origin))).toBe("staging-marketing");
    for (const pathname of PRODUCTION_PATHS) {
      const request = new Request(`${origin}${pathname}`);
      expect(() => assertLiveAdminSurface(env, pathname, request)).toThrow(
        /Admin access is not configured/,
      );
      expect(passwordAdminAllowed(env, request)).toBe(false);
    }
    for (const pathname of ["/api/v1/admin/bookings", "/api/admin/offers"]) {
      const response = await handleApi(new Request(`${origin}${pathname}`), env);
      expect(response.status, `${origin}${pathname}`).toBe(403);
    }
  });
});

describe("staging admin host password path", () => {
  const origin = `https://${STAGING_ADMIN_HOST}`;

  it("allows password admin when Access vars are absent", async () => {
    const env = createTestEnv(liveEnv);
    const adminRequest = new Request(`${origin}/admin`);
    const loginRequest = new Request(`${origin}/login`);
    expect(resolveHostRole(env, adminRequest)).toBe("staging-admin");
    expect(accessBindingState(env)).toBe("absent");
    expect(accessConfigured(env)).toBe(false);
    expect(() => assertLiveAdminSurface(env, "/admin", adminRequest)).not.toThrow();
    expect(() => assertLiveAdminSurface(env, "/login", loginRequest)).not.toThrow();
    expect(() =>
      assertLiveAdminSurface(
        env,
        "/api/auth/sign-in/email",
        new Request(`${origin}/api/auth/sign-in/email`),
      ),
    ).not.toThrow();
    expect(passwordAdminAllowed(env, adminRequest)).toBe(true);
    expect(passwordAdminAllowed(env, loginRequest)).toBe(true);
    expect(temporaryAdminExpiryApplies(env, adminRequest)).toBe(false);
    expect(() =>
      assertLiveAdminSurface(env, "/setup-admin", new Request(`${origin}/setup-admin`)),
    ).toThrow(/Operator setup is disabled on this host/);

    const bookings = await handleApi(new Request(`${origin}/api/v1/admin/bookings`), env);
    expect(bookings.status).toBe(401);
  });

  it("fails closed when only ACCESS_TEAM_DOMAIN is set", async () => {
    const env = createTestEnv({
      ...liveEnv,
      ACCESS_TEAM_DOMAIN: "team.cloudflareaccess.com",
    });
    expect(accessBindingState(env)).toBe("partial");
    const login = new Request(`${origin}/login`);
    expect(passwordAdminAllowed(env, login)).toBe(false);
    expect(() => assertLiveAdminSurface(env, "/login", login)).toThrow(
      /Admin access is not configured/,
    );
    expect(() => assertLiveAdminSurface(env, "/admin", new Request(`${origin}/admin`))).toThrow(
      /Admin access is not configured/,
    );
    expect((await handleApi(new Request(`${origin}/api/v1/admin/bookings`), env)).status).toBe(403);
  });

  it("fails closed when only ACCESS_AUD is set", () => {
    const env = createTestEnv({
      ...liveEnv,
      ACCESS_AUD: "admin-audience",
    });
    expect(accessBindingState(env)).toBe("partial");
    const request = new Request(`${origin}/api/auth/sign-in/email`);
    expect(passwordAdminAllowed(env, request)).toBe(false);
    expect(() => assertLiveAdminSurface(env, "/api/auth/sign-in/email", request)).toThrow(
      /Admin access is not configured/,
    );
  });
});

describe("dedicated Access admin hostname", () => {
  const origin = `https://${ACCESS_ADMIN_HOST}`;
  const access = {
    ENVIRONMENT: "production",
    ACCESS_TEAM_DOMAIN: "team.cloudflareaccess.com",
    ACCESS_AUD: "admin-audience",
  };

  it("allows password admin on the dedicated host only when Access vars are absent", () => {
    const env = createTestEnv(liveEnv);
    const adminRequest = new Request(`${origin}/admin/offers`);
    expect(accessBindingState(env)).toBe("absent");
    expect(accessConfigured(env)).toBe(false);
    expect(() => assertLiveAdminSurface(env, "/admin/offers", adminRequest)).not.toThrow();
    expect(() =>
      assertLiveAdminSurface(env, "/login", new Request(`${origin}/login`)),
    ).not.toThrow();
    expect(passwordAdminAllowed(env, adminRequest)).toBe(true);
    expect(() =>
      assertLiveAdminSurface(env, "/setup-admin", new Request(`${origin}/setup-admin`)),
    ).toThrow(/Operator setup is disabled on this host/);
  });

  it("fails closed when only ACCESS_TEAM_DOMAIN is set", () => {
    const env = createTestEnv({
      ENVIRONMENT: "production",
      DEV_ADMIN_BYPASS: "false",
      ACCESS_TEAM_DOMAIN: "team.cloudflareaccess.com",
    });
    expect(accessBindingState(env)).toBe("partial");
    expect(accessConfigured(env)).toBe(false);
    const request = new Request(`${origin}/login`);
    expect(passwordAdminAllowed(env, request)).toBe(false);
    expect(() => assertLiveAdminSurface(env, "/login", request)).toThrow(
      /Admin access is not configured/,
    );
    expect(() => assertLiveAdminSurface(env, "/admin", new Request(`${origin}/admin`))).toThrow(
      /Admin access is not configured/,
    );
  });

  it("fails closed when only ACCESS_AUD is set", () => {
    const env = createTestEnv({
      ENVIRONMENT: "production",
      DEV_ADMIN_BYPASS: "false",
      ACCESS_AUD: "admin-audience",
    });
    expect(accessBindingState(env)).toBe("partial");
    expect(accessConfigured(env)).toBe(false);
    const request = new Request(`${origin}/api/auth/sign-in/email`);
    expect(passwordAdminAllowed(env, request)).toBe(false);
    expect(() => assertLiveAdminSurface(env, "/api/auth/sign-in/email", request)).toThrow(
      /Admin access is not configured/,
    );
  });

  it("requires Access configuration and disables password routes", () => {
    const path = "/admin/offers";
    const request = new Request(origin + path);
    const env = createTestEnv({ ...access, ENVIRONMENT: "development", DEV_ADMIN_BYPASS: "true" });
    expect(accessBindingState(env)).toBe("configured");
    expect(accessConfigured(env)).toBe(true);
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
