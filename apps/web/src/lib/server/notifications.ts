import type { NotificationState, ServiceType } from "@kaiyue/contracts";
import { businessTimezone, type AppEnv, type OutboundEmail } from "./env.ts";
import { logSafe } from "./http.ts";
import {
  normalizeAddress,
  recipientAllowed,
  resolveMailPolicy,
  type MailPolicy,
} from "./notification-policy.ts";
import {
  renderCustomerAck,
  renderStaffMessage,
  type DetailRow,
  type RenderedEmail,
} from "./notification-templates.ts";

type NotificationKind = "booking" | "contact";

export type NotificationInput = {
  kind: NotificationKind;
  reference: string;
  requestId: string;
  summary: string;
  details?: DetailRow[];
  replyTo?: string;
  customer?: {
    email: string;
    locale: string;
    name: string | null;
    serviceType?: ServiceType;
    pickupAt?: string;
  };
};

type Outcome = "sent" | "failed" | "skipped";
type ActivePolicy = Extract<MailPolicy, { ok: true }>;

export function combineOutcomes(staff: Outcome, customer: Outcome): NotificationState {
  switch (staff) {
    case "sent":
      return customer === "failed" ? "partial" : "sent";
    case "failed":
      return customer === "sent" ? "partial" : "failed";
    case "skipped":
      return customer === "sent" ? "partial" : customer;
    default: {
      const unreachable: never = staff;
      return unreachable;
    }
  }
}

function errorCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") {
    return error.code.slice(0, 64);
  }
  return "send_error";
}

async function deliver(
  policy: ActivePolicy,
  input: NotificationInput,
  audience: "staff" | "customer",
  to: string,
  rendered: RenderedEmail,
  replyTo?: string,
): Promise<Outcome> {
  const log = {
    kind: input.kind,
    reference: input.reference,
    requestId: input.requestId,
    audience,
  };
  if (!recipientAllowed(policy, to)) {
    logSafe("warn", "notification_skipped", { ...log, reason: "recipient_not_allowed" });
    return "skipped";
  }
  const message: OutboundEmail = {
    to,
    from: policy.from,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
    ...(replyTo ? { replyTo } : {}),
  };
  try {
    await policy.binding.send(message);
    logSafe("info", "notification_sent", log);
    return "sent";
  } catch (error) {
    logSafe("error", "notification_failed", { ...log, reason: errorCode(error) });
    return "failed";
  }
}

export async function sendNotifications(
  env: AppEnv,
  input: NotificationInput,
): Promise<NotificationState> {
  const policy = resolveMailPolicy(env);
  if (!policy.ok) {
    logSafe(policy.state === "failed" ? "warn" : "info", `notification_${policy.state}`, {
      kind: input.kind,
      reference: input.reference,
      requestId: input.requestId,
      reason: policy.reason,
    });
    return policy.state;
  }

  const staff = await deliver(
    policy,
    input,
    "staff",
    policy.staffTo,
    renderStaffMessage(policy.site, input),
    normalizeAddress(input.replyTo) ?? undefined,
  );

  const customerEmail = normalizeAddress(input.customer?.email);
  const customer =
    input.customer && customerEmail
      ? await deliver(
          policy,
          input,
          "customer",
          customerEmail,
          renderCustomerAck(policy.site, {
            kind: input.kind,
            reference: input.reference,
            locale: input.customer.locale,
            name: input.customer.name,
            serviceType: input.customer.serviceType,
            pickupAt: input.customer.pickupAt,
            timezone: businessTimezone(env),
            siteUrl: new URL(env.PUBLIC_SITE_URL!).origin.replace(/^https:\/\//, ""),
          }),
        )
      : "skipped";

  return combineOutcomes(staff, customer);
}
