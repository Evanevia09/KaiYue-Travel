import { describe, expect, it, vi } from "vitest";
import {
  claimLifecycleMailSend,
  getBookingByReference,
} from "../../apps/web/src/lib/server/bookings.ts";
import type { OutboundEmail } from "../../apps/web/src/lib/server/env.ts";
import { sendLifecycleCustomerMail } from "../../apps/web/src/lib/server/notifications.ts";
import { handleApi } from "../../apps/web/src/lib/server/router.ts";
import { createTestEnv, futurePickup, setD1BeforeBatch } from "../helpers/memory-d1.ts";

const LOCK = "scalingsmb@gmail.com";
const LEGACY = "KY-ABCDEFGH";

function fakeBinding() {
  const sent: OutboundEmail[] = [];
  const send = vi.fn(async (message: OutboundEmail) => {
    sent.push(message);
    return { messageId: `msg-${sent.length}` };
  });
  return { binding: { send }, sent, send };
}

function lifecycleEnv() {
  const { binding, sent, send } = fakeBinding();
  const env = createTestEnv({
    PUBLIC_SITE_URL: "https://staging.kaiyuemacau.com",
    NOTIFICATIONS_ENABLED: "true",
    NOTIFY_FROM_EMAIL: "bookings@notify.kaiyuemacau.com",
    NOTIFY_FROM_NAME: "Kai Yue Travel",
    NOTIFY_STAFF_TO: LOCK,
    NOTIFY_ALLOWED_RECIPIENTS: LOCK,
    EMAIL: binding,
  });
  return { env, sent, send };
}

function bookingPayload(overrides: Record<string, unknown> = {}) {
  return {
    serviceType: "airport_transfer",
    pickupLocation: "Macau International Airport",
    destination: "Synthetic Hotel",
    pickupAt: futurePickup(),
    passengerCount: 2,
    communicationChannel: "email",
    contactName: "Synthetic Guest",
    phone: "+853 6234 5678",
    email: LOCK,
    message: "Synthetic lifecycle fixture.",
    privacyAccepted: true,
    sourcePage: "/",
    sourceTrigger: "hero-embed",
    sourceMode: "embedded",
    locale: "en",
    ...overrides,
  };
}

async function postBooking(
  env: ReturnType<typeof createTestEnv>,
  overrides: Record<string, unknown> = {},
) {
  const response = await handleApi(
    new Request("http://localhost/api/v1/bookings", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": crypto.randomUUID(),
        origin: "http://localhost:4321",
      },
      body: JSON.stringify(bookingPayload(overrides)),
    }),
    env,
  );
  const body = (await response.json()) as { reference?: string; status?: string };
  return { response, body };
}

async function patchStatus(
  env: ReturnType<typeof createTestEnv>,
  reference: string,
  status: string,
  expectedUpdatedAt: string,
) {
  return handleApi(
    new Request(`http://localhost/api/v1/admin/bookings/${reference}/status`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        origin: "https://staging.kaiyuemacau.com",
      },
      body: JSON.stringify({ status, expectedUpdatedAt }),
    }),
    env,
  );
}

async function getBooking(env: ReturnType<typeof createTestEnv>, reference: string) {
  const response = await handleApi(
    new Request(`http://localhost/api/v1/admin/bookings/${reference}`, {
      headers: { origin: "https://staging.kaiyuemacau.com" },
    }),
    env,
  );
  const body = (await response.json()) as {
    booking?: { reference: string; status: string; updatedAt: string };
  };
  return { response, booking: body.booking };
}

function customerMails(sent: OutboundEmail[]) {
  return sent.filter((message) => !String(message.subject).includes("New booking request"));
}

describe("durable KY##### chauffeur references", () => {
  it("allocates sequential KY##### refs, never wraps, and looks up both serial and legacy values", async () => {
    const { env, sent } = lifecycleEnv();
    const first = await postBooking(env);
    expect(first.response.status).toBe(201);
    expect(first.body.reference).toBe("KY00001");
    const stored = await env.DB.prepare(
      "SELECT lifecycle_serial, reference FROM bookings WHERE reference = ?",
    )
      .bind("KY00001")
      .first<{ lifecycle_serial: number; reference: string }>();
    expect(stored).toEqual({ lifecycle_serial: 1, reference: "KY00001" });

    const second = await postBooking(env);
    expect(second.body.reference).toBe("KY00002");

    await env.DB.prepare(
      "UPDATE chauffeur_booking_serial SET last_issued = 99999 WHERE id = 1",
    ).run();
    const overflow = await postBooking(env);
    expect(overflow.response.status).toBe(503);
    expect(overflow.body.reference).toBeUndefined();
    const exhausted = await env.DB.prepare(
      "SELECT last_issued FROM chauffeur_booking_serial WHERE id = 1",
    ).first<{ last_issued: number }>();
    expect(exhausted?.last_issued).toBe(99999);

    const listed = await handleApi(
      new Request("http://localhost/api/v1/admin/bookings?q=KY00001", {
        headers: { origin: "https://staging.kaiyuemacau.com" },
      }),
      env,
    );
    expect(listed.status).toBe(200);
    const listBody = (await listed.json()) as { items: Array<{ reference: string }> };
    expect(listBody.items.some((item) => item.reference === "KY00001")).toBe(true);

    const now = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO bookings (
        id, reference, lifecycle_serial, status, service_type, pickup_location, destination, pickup_at,
        passenger_count, communication_channel, contact_name, phone, phone_display, email, message,
        source_page, source_trigger, source_mode, locale, notification_state, created_at, updated_at
      ) VALUES (?, ?, NULL, 'enquiry', 'airport_transfer', 'Macau International Airport', 'Legacy Hotel', ?, 2,
        'email', 'Legacy Guest', '+853 6234 5678', '+853 6234 5678', ?, '', '/', 'hero-embed', 'embedded', 'en',
        'skipped', ?, ?)`,
    )
      .bind(crypto.randomUUID(), LEGACY, futurePickup(), LOCK, now, now)
      .run();
    const legacy = await getBooking(env, LEGACY);
    expect(legacy.response.status).toBe(200);
    expect(legacy.booking?.reference).toBe(LEGACY);
    expect(sent.filter((message) => String(message.subject).includes("KY00001"))).toHaveLength(2);
  });

  it("sends confirm then cancel mail on the same KY##### and skips WhatsApp and denied", async () => {
    const { env, sent } = lifecycleEnv();
    const created = await postBooking(env);
    const reference = created.body.reference!;
    expect(reference).toBe("KY00001");
    expect(sent).toHaveLength(2);

    const enquiry = await getBooking(env, reference);
    expect((await patchStatus(env, reference, "approved", enquiry.booking!.updatedAt)).status).toBe(
      200,
    );
    expect(customerMails(sent)).toHaveLength(1);

    const approved = await getBooking(env, reference);
    const confirmed = await patchStatus(env, reference, "confirmed", approved.booking!.updatedAt);
    expect(confirmed.status).toBe(200);
    expect(customerMails(sent)).toHaveLength(2);
    const confirmMail = customerMails(sent).at(-1)!;
    expect(confirmMail.to).toBe(LOCK);
    expect(confirmMail.subject).toBe("[Staging test] Your chauffeur booking is confirmed KY00001");
    expect(confirmMail.text).toMatch(/Reference number\s*: KY00001/);
    expect(confirmMail.text).not.toMatch(/not a booking confirmation/i);
    expect(confirmMail.text).not.toMatch(/IN-|CF-|CL-/);
    const confirmState = await env.DB.prepare(
      "SELECT confirm_mail_state FROM bookings WHERE reference = ?",
    )
      .bind(reference)
      .first<{ confirm_mail_state: string }>();
    expect(confirmState?.confirm_mail_state).toBe("sent");

    const afterConfirm = await getBooking(env, reference);
    expect(afterConfirm.booking?.status).toBe("confirmed");
    const cancelled = await patchStatus(
      env,
      reference,
      "cancelled",
      afterConfirm.booking!.updatedAt,
    );
    expect(cancelled.status).toBe(200);
    expect(customerMails(sent)).toHaveLength(3);
    const cancelMail = customerMails(sent).at(-1)!;
    expect(cancelMail.subject).toBe(
      "[Staging test] Your chauffeur booking has been cancelled KY00001",
    );
    expect(cancelMail.text).toMatch(/Reference number\s*: KY00001/);
    expect(cancelMail.text).not.toMatch(/refund|payment|IN-|CF-|CL-/i);
    const cancelState = await env.DB.prepare(
      "SELECT cancel_mail_state, reference FROM bookings WHERE reference = ?",
    )
      .bind(reference)
      .first<{ cancel_mail_state: string; reference: string }>();
    expect(cancelState).toEqual({ cancel_mail_state: "sent", reference: "KY00001" });

    const replay = await sendLifecycleCustomerMail(env, {
      kind: "cancelled",
      reference,
      requestId: "req-already-sent",
      communicationChannel: "email",
      locale: "en",
      name: "Synthetic Guest",
      email: LOCK,
      alreadySent: true,
    });
    expect(replay).toBe("skipped");
    expect(customerMails(sent)).toHaveLength(3);
  });

  it("does not mail on WhatsApp, denied, or missing guest email, and quotes legacy KY- refs unchanged", async () => {
    const { env, sent } = lifecycleEnv();
    const whatsapp = await postBooking(env, {
      communicationChannel: "whatsapp",
      email: undefined,
      contactName: "WhatsApp Guest",
    });
    expect(whatsapp.body.reference).toBe("KY00001");
    expect(sent).toHaveLength(0);
    const whatsappRow = await getBooking(env, "KY00001");
    expect(
      (await patchStatus(env, "KY00001", "approved", whatsappRow.booking!.updatedAt)).status,
    ).toBe(200);
    const approvedWhatsapp = await getBooking(env, "KY00001");
    expect(
      (await patchStatus(env, "KY00001", "confirmed", approvedWhatsapp.booking!.updatedAt)).status,
    ).toBe(200);
    expect(sent).toHaveLength(0);
    const whatsappMail = await env.DB.prepare(
      "SELECT confirm_mail_state FROM bookings WHERE reference = ?",
    )
      .bind("KY00001")
      .first<{ confirm_mail_state: string }>();
    expect(whatsappMail?.confirm_mail_state).toBe("skipped");

    const denied = await postBooking(env);
    expect(denied.body.reference).toBe("KY00002");
    const createCount = sent.length;
    const deniedRow = await getBooking(env, "KY00002");
    expect((await patchStatus(env, "KY00002", "denied", deniedRow.booking!.updatedAt)).status).toBe(
      200,
    );
    expect(sent).toHaveLength(createCount);
    const deniedMail = await env.DB.prepare(
      "SELECT cancel_mail_state FROM bookings WHERE reference = ?",
    )
      .bind("KY00002")
      .first<{ cancel_mail_state: string | null }>();
    expect(deniedMail?.cancel_mail_state ?? null).toBeNull();

    const now = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO bookings (
        id, reference, lifecycle_serial, status, service_type, pickup_location, destination, pickup_at,
        passenger_count, communication_channel, contact_name, phone, phone_display, email, message,
        source_page, source_trigger, source_mode, locale, notification_state, created_at, updated_at
      ) VALUES (?, ?, NULL, 'enquiry', 'airport_transfer', 'Macau International Airport', 'Legacy Hotel', ?, 2,
        'email', 'Legacy Guest', '+853 6234 5678', '+853 6234 5678', ?, '', '/', 'hero-embed', 'embedded', 'en',
        'skipped', ?, ?)`,
    )
      .bind(crypto.randomUUID(), LEGACY, futurePickup(), LOCK, now, now)
      .run();
    const legacy = await getBooking(env, LEGACY);
    expect((await patchStatus(env, LEGACY, "cancelled", legacy.booking!.updatedAt)).status).toBe(
      200,
    );
    const legacyMail = customerMails(sent).at(-1)!;
    expect(legacyMail.subject).toContain(LEGACY);
    expect(legacyMail.text).toMatch(new RegExp(`Reference number\\s*: ${LEGACY}`));
    const legacyStored = await env.DB.prepare(
      "SELECT reference, lifecycle_serial FROM bookings WHERE reference = ?",
    )
      .bind(LEGACY)
      .first<{ reference: string; lifecycle_serial: number | null }>();
    expect(legacyStored).toEqual({ reference: LEGACY, lifecycle_serial: null });
  });

  it("issues KY99999 then refuses further allocation without wrapping", async () => {
    const { env } = lifecycleEnv();
    await env.DB.prepare(
      "UPDATE chauffeur_booking_serial SET last_issued = 99998 WHERE id = 1",
    ).run();
    const last = await postBooking(env);
    expect(last.response.status).toBe(201);
    expect(last.body.reference).toBe("KY99999");
    const [a, b] = await Promise.all([postBooking(env), postBooking(env)]);
    expect([a.response.status, b.response.status].sort()).toEqual([503, 503]);
    const counter = await env.DB.prepare(
      "SELECT last_issued FROM chauffeur_booking_serial WHERE id = 1",
    ).first<{ last_issued: number }>();
    expect(counter?.last_issued).toBe(99999);
    const count = await env.DB.prepare("SELECT COUNT(*) AS n FROM bookings").first<{ n: number }>();
    expect(Number(count?.n)).toBe(1);
  });
});

async function retryLifecycleMail(
  env: ReturnType<typeof createTestEnv>,
  reference: string,
  kind: "confirmed" | "cancelled",
) {
  return handleApi(
    new Request(`http://localhost/api/v1/admin/bookings/${reference}/lifecycle-mail`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://staging.kaiyuemacau.com",
      },
      body: JSON.stringify({ kind }),
    }),
    env,
  );
}

describe("lifecycle mail recovery", () => {
  it("keeps confirmed status when send fails and retries without a second transition", async () => {
    const { env, sent, send } = lifecycleEnv();
    const created = await postBooking(env);
    const reference = created.body.reference!;
    const enquiry = await getBooking(env, reference);
    expect((await patchStatus(env, reference, "approved", enquiry.booking!.updatedAt)).status).toBe(
      200,
    );
    send.mockImplementationOnce(async () => {
      throw new Error("smtp_down");
    });
    const approved = await getBooking(env, reference);
    const confirmed = await patchStatus(env, reference, "confirmed", approved.booking!.updatedAt);
    expect(confirmed.status).toBe(200);
    const afterFail = await getBooking(env, reference);
    expect(afterFail.booking?.status).toBe("confirmed");
    const failedState = await env.DB.prepare(
      "SELECT confirm_mail_state FROM bookings WHERE reference = ?",
    )
      .bind(reference)
      .first<{ confirm_mail_state: string }>();
    expect(failedState?.confirm_mail_state).toBe("failed");
    expect(customerMails(sent)).toHaveLength(1);

    const replayStatus = await patchStatus(
      env,
      reference,
      "confirmed",
      afterFail.booking!.updatedAt,
    );
    expect(replayStatus.status).toBe(409);
    expect(customerMails(sent)).toHaveLength(1);

    const retried = await retryLifecycleMail(env, reference, "confirmed");
    expect(retried.status).toBe(200);
    const retriedBody = (await retried.json()) as { mailState?: string };
    expect(retriedBody.mailState).toBe("sent");
    expect(customerMails(sent)).toHaveLength(2);
    const sentState = await env.DB.prepare(
      "SELECT confirm_mail_state FROM bookings WHERE reference = ?",
    )
      .bind(reference)
      .first<{ confirm_mail_state: string }>();
    expect(sentState?.confirm_mail_state).toBe("sent");

    const secondRetry = await retryLifecycleMail(env, reference, "confirmed");
    expect(secondRetry.status).toBe(200);
    expect(customerMails(sent)).toHaveLength(2);
  });

  it("refuses to resend while delivery is pending and skips WhatsApp", async () => {
    const { env, sent } = lifecycleEnv();
    const created = await postBooking(env);
    const reference = created.body.reference!;
    const enquiry = await getBooking(env, reference);
    expect((await patchStatus(env, reference, "approved", enquiry.booking!.updatedAt)).status).toBe(
      200,
    );
    const approved = await getBooking(env, reference);
    expect(
      (await patchStatus(env, reference, "confirmed", approved.booking!.updatedAt)).status,
    ).toBe(200);
    await env.DB.prepare("UPDATE bookings SET confirm_mail_state = 'pending' WHERE reference = ?")
      .bind(reference)
      .run();
    const pending = await retryLifecycleMail(env, reference, "confirmed");
    expect(pending.status).toBe(409);
    const pendingBody = (await pending.json()) as { error?: { code?: string } };
    expect(pendingBody.error?.code).toBe("CONFLICT");
    expect(customerMails(sent)).toHaveLength(2);

    const whatsapp = await postBooking(env, {
      communicationChannel: "whatsapp",
      email: undefined,
      contactName: "WhatsApp Guest",
    });
    const waRef = whatsapp.body.reference!;
    const waEnquiry = await getBooking(env, waRef);
    expect((await patchStatus(env, waRef, "approved", waEnquiry.booking!.updatedAt)).status).toBe(
      200,
    );
    const waApproved = await getBooking(env, waRef);
    expect((await patchStatus(env, waRef, "confirmed", waApproved.booking!.updatedAt)).status).toBe(
      200,
    );
    const waRetry = await retryLifecycleMail(env, waRef, "confirmed");
    expect(waRetry.status).toBe(409);
  });

  it("does not send a stale confirmation when cancel wins between read and claim", async () => {
    const { env, sent, send } = lifecycleEnv();
    const created = await postBooking(env);
    const reference = created.body.reference!;
    const enquiry = await getBooking(env, reference);
    expect((await patchStatus(env, reference, "approved", enquiry.booking!.updatedAt)).status).toBe(
      200,
    );
    send.mockImplementationOnce(async () => {
      throw new Error("smtp_down");
    });
    const approved = await getBooking(env, reference);
    expect(
      (await patchStatus(env, reference, "confirmed", approved.booking!.updatedAt)).status,
    ).toBe(200);
    const failedRow = await getBookingByReference(env.DB, reference);
    expect(failedRow?.confirm_mail_state).toBe("failed");
    expect(failedRow?.decision_status ?? failedRow?.status).toBe("confirmed");
    const beforeRetry = customerMails(sent).length;

    const afterFail = await getBooking(env, reference);
    expect(
      (await patchStatus(env, reference, "cancelled", afterFail.booking!.updatedAt)).status,
    ).toBe(200);
    expect(customerMails(sent).length).toBe(beforeRetry + 1);

    expect(await claimLifecycleMailSend(env.DB, failedRow!, "confirmed")).toBe("stale");
    expect(customerMails(sent).length).toBe(beforeRetry + 1);
    const confirmState = await env.DB.prepare(
      "SELECT confirm_mail_state FROM bookings WHERE reference = ?",
    )
      .bind(reference)
      .first<{ confirm_mail_state: string | null }>();
    expect(confirmState?.confirm_mail_state).toBe("failed");

    const retried = await retryLifecycleMail(env, reference, "confirmed");
    expect(retried.status).toBe(409);
    const retriedBody = (await retried.json()) as { error?: { code?: string; message?: string } };
    expect(retriedBody.error?.code).toBe("INVALID_TRANSITION");
    expect(customerMails(sent).length).toBe(beforeRetry + 1);

    const { env: raceEnv, sent: raceSent, send: raceSend } = lifecycleEnv();
    const raced = await postBooking(raceEnv);
    const raceRef = raced.body.reference!;
    const raceEnquiry = await getBooking(raceEnv, raceRef);
    expect(
      (await patchStatus(raceEnv, raceRef, "approved", raceEnquiry.booking!.updatedAt)).status,
    ).toBe(200);
    raceSend.mockImplementationOnce(async () => {
      throw new Error("smtp_down");
    });
    const raceApproved = await getBooking(raceEnv, raceRef);
    expect(
      (await patchStatus(raceEnv, raceRef, "confirmed", raceApproved.booking!.updatedAt)).status,
    ).toBe(200);
    const raceBefore = customerMails(raceSent).length;
    setD1BeforeBatch(raceEnv.DB, (sqlite) => {
      const row = sqlite
        .prepare("SELECT id, updated_at FROM bookings WHERE reference = ?")
        .get(raceRef) as { id: string; updated_at: string };
      const next = new Date(Math.max(Date.now(), Date.parse(row.updated_at) + 1)).toISOString();
      sqlite
        .prepare("UPDATE bookings SET status = 'cancelled', updated_at = ? WHERE id = ?")
        .run(next, row.id);
      sqlite
        .prepare(
          `INSERT INTO audit_events (id, entity_type, entity_id, event_type, actor_id, from_value, to_value, request_id, created_at)
           VALUES (?, 'booking', ?, 'status_change', 'dev-admin', 'confirmed', 'cancelled', 'injected-retry-cancel', ?)`,
        )
        .run(crypto.randomUUID(), row.id, next);
    });
    const racedRetry = await retryLifecycleMail(raceEnv, raceRef, "confirmed");
    setD1BeforeBatch(raceEnv.DB, null);
    expect(racedRetry.status).toBe(409);
    const racedBody = (await racedRetry.json()) as { error?: { code?: string; message?: string } };
    expect(racedBody.error?.code).toBe("CONFLICT");
    expect(racedBody.error?.message).toMatch(/changed/i);
    expect(customerMails(raceSent).length).toBe(raceBefore);
  });

  it("lets only one concurrent retry claim the send", async () => {
    const { env, sent, send } = lifecycleEnv();
    const created = await postBooking(env);
    const reference = created.body.reference!;
    const enquiry = await getBooking(env, reference);
    expect((await patchStatus(env, reference, "approved", enquiry.booking!.updatedAt)).status).toBe(
      200,
    );
    send.mockImplementationOnce(async () => {
      throw new Error("smtp_down");
    });
    const approved = await getBooking(env, reference);
    expect(
      (await patchStatus(env, reference, "confirmed", approved.booking!.updatedAt)).status,
    ).toBe(200);
    const beforeRetry = customerMails(sent).length;

    const [first, second] = await Promise.all([
      retryLifecycleMail(env, reference, "confirmed"),
      retryLifecycleMail(env, reference, "confirmed"),
    ]);
    const statuses = [first.status, second.status].sort();
    expect(statuses[0]).toBe(200);
    expect([200, 409]).toContain(statuses[1]);
    expect(customerMails(sent).length).toBe(beforeRetry + 1);
    const sentState = await env.DB.prepare(
      "SELECT confirm_mail_state FROM bookings WHERE reference = ?",
    )
      .bind(reference)
      .first<{ confirm_mail_state: string }>();
    expect(sentState?.confirm_mail_state).toBe("sent");
    const audits = await env.DB.prepare(
      "SELECT actor_id, from_value, to_value FROM audit_events WHERE entity_id = (SELECT id FROM bookings WHERE reference = ?) AND event_type = 'lifecycle_mail' ORDER BY created_at, rowid",
    )
      .bind(reference)
      .all<{ actor_id: string; from_value: string; to_value: string }>();
    expect(audits.results.some((event) => event.to_value === "pending")).toBe(true);
    expect(audits.results.some((event) => event.to_value === "sent")).toBe(true);
    expect(audits.results.every((event) => event.actor_id === "dev-admin")).toBe(true);
    expect(audits.results.every((event) => event.from_value === "confirmed")).toBe(true);
  });

  it("does not send confirmation when cancel lands between status commit and the mail claim", async () => {
    const { env, sent } = lifecycleEnv();
    const created = await postBooking(env);
    const reference = created.body.reference!;
    const enquiry = await getBooking(env, reference);
    expect((await patchStatus(env, reference, "approved", enquiry.booking!.updatedAt)).status).toBe(
      200,
    );
    const approved = await getBooking(env, reference);
    const beforeConfirm = customerMails(sent).length;
    let batches = 0;
    setD1BeforeBatch(env.DB, (sqlite) => {
      batches += 1;
      if (batches !== 2) return;
      const row = sqlite
        .prepare("SELECT id, updated_at FROM bookings WHERE reference = ?")
        .get(reference) as { id: string; updated_at: string };
      const next = new Date(Math.max(Date.now(), Date.parse(row.updated_at) + 1)).toISOString();
      sqlite
        .prepare("UPDATE bookings SET status = 'cancelled', updated_at = ? WHERE id = ?")
        .run(next, row.id);
      sqlite
        .prepare(
          `INSERT INTO audit_events (id, entity_type, entity_id, event_type, actor_id, from_value, to_value, request_id, created_at)
           VALUES (?, 'booking', ?, 'status_change', 'dev-admin', 'confirmed', 'cancelled', 'injected-cancel', ?)`,
        )
        .run(crypto.randomUUID(), row.id, next);
    });
    const confirmed = await patchStatus(env, reference, "confirmed", approved.booking!.updatedAt);
    setD1BeforeBatch(env.DB, null);
    expect(confirmed.status).toBe(200);
    expect(customerMails(sent).length).toBe(beforeConfirm);
    const stored = await env.DB.prepare(
      "SELECT confirm_mail_state FROM bookings WHERE reference = ?",
    )
      .bind(reference)
      .first<{ confirm_mail_state: string | null }>();
    expect(stored?.confirm_mail_state ?? null).toBeNull();
  });

  it("refuses lifecycle-mail retry from a foreign origin and without admin auth", async () => {
    const { env, send } = lifecycleEnv();
    const created = await postBooking(env);
    const reference = created.body.reference!;
    const enquiry = await getBooking(env, reference);
    expect((await patchStatus(env, reference, "approved", enquiry.booking!.updatedAt)).status).toBe(
      200,
    );
    send.mockImplementationOnce(async () => {
      throw new Error("smtp_down");
    });
    const approved = await getBooking(env, reference);
    expect(
      (await patchStatus(env, reference, "confirmed", approved.booking!.updatedAt)).status,
    ).toBe(200);

    const foreignOrigin = await handleApi(
      new Request(`http://localhost/api/v1/admin/bookings/${reference}/lifecycle-mail`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://evil.example",
        },
        body: JSON.stringify({ kind: "confirmed" }),
      }),
      env,
    );
    expect(foreignOrigin.status).toBe(403);

    const locked = { ...env, DEV_ADMIN_BYPASS: "false" };
    const unauthenticated = await retryLifecycleMail(locked, reference, "confirmed");
    expect(unauthenticated.status).toBe(401);
  });
});
