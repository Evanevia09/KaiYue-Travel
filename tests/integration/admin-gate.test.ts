import { describe, expect, it } from "vitest";
import {
  assertLiveAdminSurface,
  isProtectedAdminPath,
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
