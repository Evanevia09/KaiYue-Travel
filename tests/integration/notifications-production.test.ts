import { afterEach, describe, expect, it, vi } from "vitest";
import type { OutboundEmail } from "../../apps/web/src/lib/server/env.ts";
import {
  resolveMailPolicy,
  STAGING_TEST_INBOX,
  VERIFIED_PRODUCTION_STAFF_TO,
} from "../../apps/web/src/lib/server/notification-policy.ts";
import {
  sendNotifications,
  type NotificationInput,
} from "../../apps/web/src/lib/server/notifications.ts";
import { handleApi } from "../../apps/web/src/lib/server/router.ts";
import { createTestEnv, futurePickup } from "../helpers/memory-d1.ts";

const STAFF = VERIFIED_PRODUCTION_STAFF_TO;
const GUEST = "guest.ack@example.com";
const LOCK = STAGING_TEST_INBOX;
const FROM = "bookings@notify.kaiyuemacau.com";
const LOGO = "https://kaiyuemacau.com/images/kai-yue-travel-group-logo.png";

function fakeBinding(fail?: (message: OutboundEmail) => Error | undefined) {
  const sent: OutboundEmail[] = [];
  const send = vi.fn(async (message: OutboundEmail) => {
    const error = fail?.(message);
    if (error) throw error;
    sent.push(message);
    return { messageId: `msg-${sent.length}` };
  });
  return { binding: { send }, sent, send };
}

function productionEnv(overrides: Record<string, unknown> = {}) {
  const { binding, sent, send } = fakeBinding();
  const env = createTestEnv({
    ENVIRONMENT: "production",
    DEV_ADMIN_BYPASS: "false",
    PUBLIC_SITE_URL: "https://kaiyuemacau.com",
    NOTIFICATIONS_ENABLED: "true",
    NOTIFY_FROM_EMAIL: FROM,
    NOTIFY_FROM_NAME: "Kai Yue Travel",
    NOTIFY_STAFF_TO: STAFF,
    EMAIL: binding,
    ...overrides,
  });
  return { env, sent, send };
}

const input: NotificationInput = {
  kind: "booking",
  reference: "KY-PROD0001",
  requestId: "req-prod",
  summary: "A new chauffeur booking request is waiting for review.",
  replyTo: GUEST,
  details: [
    { label: "Name", value: "<script>x</script>" },
    { label: "Email", value: GUEST },
  ],
  customer: {
    email: GUEST,
    locale: "en",
    name: "Synthetic Guest",
    serviceType: "airport_transfer",
    pickupAt: "2026-12-01T02:30:00.000Z",
  },
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("mocked production mail policy", () => {
  it("skips when NOTIFICATIONS_ENABLED is false even when EMAIL and staff are present", async () => {
    const { env, send } = productionEnv({ NOTIFICATIONS_ENABLED: "false" });
    await expect(sendNotifications(env, input)).resolves.toBe("skipped");
    expect(send).not.toHaveBeenCalled();
  });

  it("fails closed when production staff is not the verified admin inbox", async () => {
    const { env, send } = productionEnv({ NOTIFY_STAFF_TO: LOCK });
    await expect(sendNotifications(env, input)).resolves.toBe("failed");
    expect(send).not.toHaveBeenCalled();
  });

  it("refuses a production recipient lock so guest acknowledgements stay possible", async () => {
    const { env, send } = productionEnv({
      NOTIFY_ALLOWED_RECIPIENTS: `${STAFF},${GUEST}`,
    });
    await expect(sendNotifications(env, input)).resolves.toBe("failed");
    expect(send).not.toHaveBeenCalled();
  });

  it("does not enable staging-quote on the production site", () => {
    const { env } = productionEnv({ STAGING_QUOTE_EMAIL_ENABLED: "true" });
    const policy = resolveMailPolicy(env, "staging-quote");
    expect(policy.ok).toBe(false);
    if (policy.ok) return;
    expect(policy.reason).toBe("notifications_disabled");
  });
});

describe("mocked production staff and guest delivery", () => {
  it("sends one staff notice to daniel@ and one customer request-received ack to the guest", async () => {
    const { env, sent } = productionEnv();
    await expect(sendNotifications(env, input)).resolves.toBe("sent");
    expect(sent).toHaveLength(2);
    const [staff, customer] = sent;
    expect(staff!.to).toBe(STAFF);
    expect(staff!.from).toEqual({ email: FROM, name: "Kai Yue Travel" });
    expect(staff!.subject).toBe("New booking request KY-PROD0001");
    expect(staff!.subject).not.toContain("[Staging test]");
    expect(staff!.replyTo).toBe(GUEST);
    expect(staff!.html).toContain("&lt;script&gt;");
    expect(staff!.html).not.toContain("<script>x</script>");
    expect(staff!.html).toContain("#008c5e");
    expect(staff!.html).toContain(LOGO);
    expect(staff!.text).toContain("Name: <script>x</script>");
    expect(customer!.to).toBe(GUEST);
    expect(customer!.subject).toBe("We received your request KY-PROD0001");
    expect(customer!.text).toContain("This is not a booking confirmation.");
    expect(customer!.html).toContain("<!doctype html>");
    expect(customer!.replyTo).toBeUndefined();
    expect(customer!.html).not.toContain(STAFF);
  });

  it("sends inquiry staff plus guest ack when the inquiry includes an email", async () => {
    const { env, sent } = productionEnv();
    await expect(
      sendNotifications(env, {
        kind: "contact",
        reference: "INQ-PROD001",
        requestId: "req-inq",
        summary: "A new inquiry is waiting for review.",
        replyTo: GUEST,
        customer: { email: GUEST, locale: "pt", name: "Convidado" },
      }),
    ).resolves.toBe("sent");
    expect(sent.map((message) => message.to)).toEqual([STAFF, GUEST]);
    expect(sent[0]!.subject).toBe("New inquiry INQ-PROD001");
    expect(sent[1]!.html).toContain('lang="pt-PT"');
    expect(sent[1]!.text).toContain("Recebemos a sua mensagem");
  });

  it("renders zh-Hant customer acknowledgements without a staging prefix", async () => {
    const { env, sent } = productionEnv();
    await sendNotifications(env, {
      ...input,
      customer: { ...input.customer!, locale: "zh-Hant" },
    });
    expect(sent[1]!.html).toContain('lang="zh-Hant"');
    expect(sent[1]!.text).toContain("此郵件並非預約確認");
    expect(sent[1]!.subject).not.toContain("[Staging test]");
  });

  it("does not log guest or staff addresses", async () => {
    const lines: string[] = [];
    const capture = (value: unknown) => {
      lines.push(String(value));
    };
    vi.spyOn(console, "log").mockImplementation(capture);
    vi.spyOn(console, "warn").mockImplementation(capture);
    vi.spyOn(console, "error").mockImplementation(capture);
    const { env } = productionEnv();
    await sendNotifications(env, input);
    const dumped = lines.join("\n");
    expect(dumped).toContain("notification_sent");
    expect(dumped).not.toContain(GUEST);
    expect(dumped).not.toContain(STAFF);
  });

  it("reports partial and failed states without throwing", async () => {
    const failing = fakeBinding((message) =>
      String(message.subject).includes("We received")
        ? Object.assign(new Error("quota"), { code: "E_RATE_LIMIT_EXCEEDED" })
        : undefined,
    );
    const { env } = productionEnv({ EMAIL: failing.binding });
    await expect(sendNotifications(env, input)).resolves.toBe("partial");

    const allFail = fakeBinding(() =>
      Object.assign(new Error("x"), { code: "E_SENDER_NOT_VERIFIED" }),
    );
    const second = productionEnv({ EMAIL: allFail.binding });
    await expect(sendNotifications(second.env, input)).resolves.toBe("failed");
  });
});

describe("mocked production persist, isolation, and replay", () => {
  it("persists an email-channel booking first and does not resend on replay", async () => {
    const { env, sent } = productionEnv();
    const pickupAt = futurePickup();
    const request = () =>
      new Request("https://kaiyuemacau.com/api/v1/bookings", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": "prod-mail-replay-0001",
          origin: "https://kaiyuemacau.com",
        },
        body: JSON.stringify({
          serviceType: "airport_transfer",
          pickupLocation: "Macau International Airport",
          destination: "Synthetic Hotel",
          pickupAt,
          passengerCount: 2,
          communicationChannel: "email",
          contactName: "Synthetic Guest",
          phone: "+853 6234 5678",
          email: GUEST,
          message: "Synthetic production test.",
          privacyAccepted: true,
          sourcePage: "/",
          sourceTrigger: "hero-embed",
          sourceMode: "embedded",
          locale: "en",
        }),
      });
    const first = await handleApi(request(), env);
    expect(first.status).toBe(201);
    const { reference } = (await first.json()) as { reference: string };
    const row = await env.DB.prepare("SELECT notification_state FROM bookings WHERE reference = ?")
      .bind(reference)
      .first<{ notification_state: string }>();
    expect(row?.notification_state).toBe("sent");
    expect(sent.map((message) => message.to)).toEqual([STAFF, GUEST]);
    const replay = await handleApi(request(), env);
    expect(replay.status).toBe(201);
    expect(sent).toHaveLength(2);
  });

  it("keeps the inquiry when every send throws", async () => {
    const broken = fakeBinding(() => new Error("network"));
    const { env } = productionEnv({ EMAIL: broken.binding });
    const response = await handleApi(
      new Request("https://kaiyuemacau.com/api/v1/contacts", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": "prod-mail-contact-0001",
          origin: "https://kaiyuemacau.com",
        },
        body: JSON.stringify({
          inquiryType: "general",
          name: "Synthetic Guest",
          phone: "+853 6234 5678",
          email: GUEST,
          message: "Synthetic production inquiry.",
          privacyAccepted: true,
          sourcePage: "/contact",
          locale: "zh-Hant",
        }),
      }),
      env,
    );
    expect(response.status).toBe(201);
    const { reference } = (await response.json()) as { reference: string };
    const row = await env.DB.prepare("SELECT notification_state FROM contacts WHERE reference = ?")
      .bind(reference)
      .first<{ notification_state: string }>();
    expect(row?.notification_state).toBe("failed");
  });

  it("does not email WhatsApp-channel bookings", async () => {
    const { env, sent } = productionEnv();
    const response = await handleApi(
      new Request("https://kaiyuemacau.com/api/v1/bookings", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": "prod-mail-wa-0001",
          origin: "https://kaiyuemacau.com",
        },
        body: JSON.stringify({
          serviceType: "airport_transfer",
          pickupLocation: "Macau International Airport",
          destination: "Synthetic Hotel",
          pickupAt: futurePickup(),
          passengerCount: 2,
          communicationChannel: "whatsapp",
          contactName: "Synthetic Guest",
          phone: "+853 6234 5678",
          privacyAccepted: true,
          sourcePage: "/",
          sourceTrigger: "hero-embed",
          sourceMode: "embedded",
          locale: "en",
        }),
      }),
      env,
    );
    expect(response.status).toBe(201);
    expect(sent).toHaveLength(0);
  });
});
