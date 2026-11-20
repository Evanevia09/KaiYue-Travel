import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  emailLogoUrl,
  renderCustomerAck,
  renderStaffMessage,
} from "../apps/web/src/lib/server/notification-templates.ts";

const previewToken = "KY-PRODMAIL01";
const pickupAt = "2026-12-15T02:30:00.000Z";
const logoUrl = emailLogoUrl("https://kaiyuemacau.com");
const brand = { logoUrl };
const staffTo = "daniel@kaiyuemacau.com";
const guestEmail = "guest.ack@example.com";
const from = { email: "bookings@notify.kaiyuemacau.com", name: "Kai Yue Travel" };

const staff = renderStaffMessage(
  "production",
  {
    kind: "booking",
    reference: previewToken,
    summary: "A new chauffeur booking request is waiting for review.",
    details: [
      { label: "Name", value: "Production Test Guest" },
      { label: "Email", value: guestEmail },
      { label: "Phone", value: "+853 6234 5678" },
      { label: "Pickup", value: "Macau International Airport" },
      { label: "Destination", value: "Synthetic Test Hotel" },
      { label: "Pickup time", value: "15 Dec 2026, 10:30 (Asia/Macau)" },
      { label: "Passengers", value: "1" },
      { label: "Message", value: "Synthetic production ack+staff preview. Not a real booking." },
    ],
  },
  brand,
);

const customer = renderCustomerAck(
  "production",
  {
    kind: "booking",
    reference: previewToken,
    locale: "en",
    name: "Production Test Guest",
    serviceType: "airport_transfer",
    pickupAt,
    timezone: "Asia/Macau",
    siteUrl: "kaiyuemacau.com",
  },
  brand,
);

const payload = {
  status: "PREVIEW_NOT_SUBMITTED",
  note: "Reference KY-PRODMAIL01 is a preview token only. Live POST allocates KY-[A-Z2-9]{8}. Do not invent a D1 row. This writer does not POST or send.",
  site: "production",
  endpoint: "POST https://kaiyuemacau.com/api/v1/bookings",
  headers: {
    "content-type": "application/json",
    origin: "https://kaiyuemacau.com",
    "idempotency-key": "prod-ack-admin-20261120-001",
  },
  payload: {
    serviceType: "airport_transfer",
    pickupLocation: "Macau International Airport",
    destination: "Synthetic Test Hotel",
    pickupAt,
    passengerCount: 1,
    communicationChannel: "email",
    contactName: "Production Test Guest",
    phone: "+853 6234 5678",
    email: guestEmail,
    message: "Synthetic production ack+staff preview. Not a real booking.",
    privacyAccepted: true,
    sourcePage: "/",
    sourceTrigger: "hero-embed",
    sourceMode: "embedded",
    locale: "en",
  },
  messages: [
    {
      audience: "staff",
      to: staffTo,
      from,
      replyTo: guestEmail,
      subject: staff.subject,
      text: staff.text,
      html: staff.html,
    },
    {
      audience: "customer-ack",
      to: guestEmail,
      from,
      replyTo: null,
      subject: customer.subject,
      text: customer.text,
      html: customer.html,
    },
  ],
};

const dir = join("docs/records/2026-11-20-production-mail-candidate");
const artifacts = "/opt/cursor/artifacts/kaiyue-production-mail-candidate-20261120";
mkdirSync(dir, { recursive: true });
mkdirSync(artifacts, { recursive: true });
const files: Record<string, string> = {
  "preview-messages.json": `${JSON.stringify(payload, null, 2)}\n`,
  "staff.html": `${staff.html}\n`,
  "staff.txt": `${staff.text}\n`,
  "customer-ack.html": `${customer.html}\n`,
  "customer-ack.txt": `${customer.text}\n`,
};
for (const [name, contents] of Object.entries(files)) {
  writeFileSync(join(dir, name), contents);
  writeFileSync(join(artifacts, name), contents);
}
process.stdout.write(`wrote ${dir} subjects=${staff.subject} | ${customer.subject}\n`);
