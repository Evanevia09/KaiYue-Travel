import { describe, expect, it } from "vitest";
import { sendNotifications } from "../../apps/web/src/lib/server/notifications.ts";
import { createTestEnv } from "../helpers/memory-d1.ts";

const input = {
  kind: "booking" as const,
  reference: "KY-TEST-1",
  requestId: "req-test",
  summary: "test only",
};

describe("staging notification fail-closed", () => {
  it("skips even when a Resend key is present because PUBLIC_SITE_URL is staging", async () => {
    const env = createTestEnv({
      ENVIRONMENT: "production",
      PUBLIC_SITE_URL: "https://staging.kaiyuemacau.com",
      RESEND_API_KEY: "re_test_not_a_live_key",
      RESEND_FROM: "Kai Yue Travel <notifications@example.invalid>",
      RESEND_STAFF_TO: "ops@example.invalid",
    });
    await expect(sendNotifications(env, input)).resolves.toBe("skipped");
  });

  it("does not treat ENVIRONMENT=production as permission to send from staging", async () => {
    const env = createTestEnv({
      ENVIRONMENT: "production",
      PUBLIC_SITE_URL: "https://admin-staging.kaiyuemacau.com/login",
      RESEND_API_KEY: "re_test_not_a_live_key",
    });
    await expect(sendNotifications(env, input)).resolves.toBe("skipped");
  });

  it("still skips production-shaped env when the Resend key is absent", async () => {
    const env = createTestEnv({
      ENVIRONMENT: "production",
      PUBLIC_SITE_URL: "https://kaiyuemacau.com",
      RESEND_API_KEY: undefined,
    });
    await expect(sendNotifications(env, input)).resolves.toBe("skipped");
  });
});
