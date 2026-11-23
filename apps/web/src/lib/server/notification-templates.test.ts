import { describe, expect, it } from "vitest";
import {
  EMAIL_LOGO_HEIGHT,
  EMAIL_LOGO_WIDTH,
  ENGLISH_REFERENCE_LABEL,
  emailLogoUrl,
  formatBookingReference,
  renderCustomerAck,
  renderCustomerCancelled,
  renderCustomerConfirmed,
  renderQuoteEmail,
  renderStaffMessage,
} from "./notification-templates.ts";

const siteUrl = "https://staging.kaiyuemacau.com";
const logoUrl = emailLogoUrl(siteUrl);
const brand = { logoUrl, siteUrl };
const reference = "KY00042";

describe("booking reference display", () => {
  it("formats KY plus exactly five digits and rejects overflow", () => {
    expect(formatBookingReference(1)).toBe("KY00001");
    expect(formatBookingReference(42)).toBe("KY00042");
    expect(formatBookingReference(10000)).toBe("KY10000");
    expect(formatBookingReference(99999)).toBe("KY99999");
    expect(() => formatBookingReference(100000)).toThrow("invalid_booking_reference_serial");
  });

  it("rejects non-positive serials", () => {
    expect(() => formatBookingReference(0)).toThrow("invalid_booking_reference_serial");
    expect(() => formatBookingReference(1.5)).toThrow("invalid_booking_reference_serial");
  });
});

describe("branded notification templates", () => {
  it("uses a white logo-only header, gold divider, and filled two-column table", () => {
    const staff = renderStaffMessage(
      "staging",
      {
        kind: "booking",
        reference,
        summary: "A new chauffeur booking request is waiting for review.",
        details: [
          { label: "Name", value: "<script>x</script>" },
          { label: "Email", value: "" },
          { label: "Pickup", value: "Macau International Airport" },
        ],
      },
      brand,
    );
    expect(staff.subject).toBe("[Staging test] New booking request KY00042");
    expect(staff.html).toContain("background:#ffffff");
    expect(staff.html).toContain("#f3a600");
    expect(staff.html).not.toContain("#008c5e");
    expect(staff.html).toContain(logoUrl);
    expect(staff.html).toContain(`width="${EMAIL_LOGO_WIDTH}"`);
    expect(staff.html).toContain(`height="${EMAIL_LOGO_HEIGHT}"`);
    expect(staff.html).toContain('alt="Kai Yue Travel"');
    expect(staff.html).not.toContain("font-size:18px;font-weight:bold");
    expect(staff.html).toContain("&lt;script&gt;");
    expect(staff.html).not.toContain("<script>x</script>");
    expect(staff.html).not.toContain("Email");
    expect(staff.html).toContain("https://admin-staging.kaiyuemacau.com");
    expect(staff.html).toMatch(/width="44%"/);
    expect(staff.html).toMatch(/white-space:nowrap/);
    expect(staff.html).toContain(ENGLISH_REFERENCE_LABEL);
    expect(staff.text).toMatch(/Reference number\s*: KY00042/);
    expect(staff.text).toMatch(/Pickup\s*: Macau International Airport/);
    expect(staff.text).not.toContain("Email");
    expect(staff.html).not.toContain("IN-KY");
    expect(staff.html).not.toContain("CF-KY");
    expect(staff.html).not.toContain("CL-KY");
    const headerCompany = staff.html.match(/background:#ffffff[\s\S]*?background:#f3a600/)?.[0];
    expect(headerCompany).toBeDefined();
    expect(headerCompany).not.toMatch(/Kai Yue Travel(?!")/);

    const customer = renderCustomerAck(
      "staging",
      {
        kind: "booking",
        reference,
        locale: "zh-Hant",
        name: "Synthetic Guest",
        serviceType: "airport_transfer",
        pickupAt: "2026-12-01T02:30:00.000Z",
        timezone: "Asia/Macau",
        siteUrl,
        details: [{ label: "Destination", value: "Synthetic Hotel, Cotai" }],
      },
      brand,
    );
    expect(customer.subject).toContain("[Staging test]");
    expect(customer.subject).toContain(reference);
    expect(customer.html).toContain('lang="zh-Hant"');
    expect(customer.html).toContain("機場接送");
    expect(customer.html).toContain("Synthetic Hotel, Cotai");
    expect(customer.html).toContain("參考編號");
    expect(customer.text).toContain("此郵件並非預約確認");
    expect(customer.text).not.toContain("SYNTHETIC PREVIEW");

    const quote = renderQuoteEmail(
      "staging",
      { reference: "KY-SYNTH001", currency: "MOP", total: "1280.00" },
      brand,
    );
    expect(quote.subject).toBe("[Staging test] Your Kai Yue Travel quotation | KY-SYNTH001");
    expect(quote.text).toContain("Quoted total: MOP 1280.00");
    expect(quote.html).toContain("MOP 1280.00");
    expect(quote.html).toContain(logoUrl);
    expect(quote.html).not.toContain("#008c5e");
    expect(quote.html).not.toContain("wechat-qr");
  });

  it("keeps Portuguese and English customer acknowledgements and omits empty optional fields", () => {
    const pt = renderCustomerAck("staging", {
      kind: "contact",
      reference: "INQ-SYNTH001",
      locale: "pt",
      name: null,
      timezone: "Asia/Macau",
      siteUrl,
    });
    expect(pt.subject).toContain("Recebemos o seu pedido");
    expect(pt.html).toContain('lang="pt-PT"');
    expect(pt.html).toContain("Número de referência");
    const en = renderCustomerAck("staging", {
      kind: "contact",
      reference: "INQ-SYNTH001",
      locale: "en",
      name: null,
      timezone: "Asia/Macau",
      siteUrl,
    });
    expect(en.text).toContain("We have received your inquiry.");
    expect(en.text).toContain(`${ENGLISH_REFERENCE_LABEL}`);
    expect(en.html).toContain("This is an automated message");
  });

  it("renders distinct confirmation and cancellation mail with one reference number", () => {
    const confirmed = renderCustomerConfirmed(
      "staging",
      {
        locale: "en",
        name: "Synthetic Preview Guest",
        reference,
        siteUrl,
        timezone: "Asia/Macau",
        details: [{ label: "Pickup", value: "Macau International Airport" }],
        syntheticPreview: true,
      },
      brand,
    );
    expect(confirmed.subject).toBe("[Staging test] Your chauffeur booking is confirmed KY00042");
    expect(confirmed.text).toMatch(/Reference number\s*: KY00042/);
    expect(confirmed.text).toContain("SYNTHETIC PREVIEW");
    expect(confirmed.text).not.toContain("not a booking confirmation");
    expect(confirmed.text).not.toContain("Confirmation number");
    expect(confirmed.text).not.toContain("Original enquiry");
    expect(confirmed.text.toLowerCase()).not.toMatch(/refund|payment|cancellation policy/);
    expect(confirmed.html).toContain("https://staging.kaiyuemacau.com");
    expect(confirmed.html.split("KY00042").length - 1).toBeGreaterThanOrEqual(1);

    const cancelled = renderCustomerCancelled(
      "staging",
      {
        locale: "pt",
        name: "Synthetic Preview Guest",
        reference,
        siteUrl,
        timezone: "Asia/Macau",
        details: [{ label: "Email", value: "" }],
      },
      brand,
    );
    expect(cancelled.subject).toContain("[Staging test]");
    expect(cancelled.subject).toContain(reference);
    expect(cancelled.html).toContain('lang="pt-PT"');
    expect(cancelled.text).toContain("Número de referência");
    expect(cancelled.text).toContain(reference);
    expect(cancelled.text).not.toContain("IN-KY");
    expect(cancelled.text).not.toContain("CF-KY");
    expect(cancelled.text).not.toContain("CL-KY");
    expect(cancelled.text).not.toMatch(/reembols|pagamento/i);
    expect(cancelled.html).not.toContain("Email");

    const zh = renderCustomerCancelled(
      "staging",
      {
        locale: "zh-Hant",
        name: null,
        reference,
        siteUrl,
        timezone: "Asia/Macau",
      },
      brand,
    );
    expect(zh.html).toContain('lang="zh-Hant"');
    expect(zh.text).toContain(reference);
    expect(zh.text).toContain("參考編號");
    expect(zh.text).not.toContain("原申請");
  });

  it("nowraps only the reference value and wraps long addresses", () => {
    const longPickup =
      "Macau International Airport Arrivals Hall, North Wing, extra-long landmark description for wrapping";
    const staff = renderStaffMessage("staging", {
      kind: "booking",
      reference,
      summary: "A new chauffeur booking request is waiting for review.",
      details: [
        { label: "Pickup", value: longPickup },
        { label: "Message", value: "Please wait at the extra-long freeform meeting note." },
      ],
    });
    expect(staff.html).toMatch(
      new RegExp(`Reference number[\\s\\S]*?white-space:nowrap;[\\s\\S]*?${reference}`),
    );
    expect(staff.html).toContain("overflow-wrap:anywhere");
    expect(staff.html).toContain(longPickup);
    const pickupCell = staff.html.match(
      new RegExp(`Pickup[\\s\\S]*?${longPickup.slice(0, 24)}`),
    )?.[0];
    expect(pickupCell).toBeDefined();
    expect(pickupCell).not.toContain("white-space:nowrap");
  });

  it("dedupes pickup time in Portuguese and Traditional Chinese customer mail", () => {
    const pickupAt = "2026-12-01T02:30:00.000Z";
    const details = [
      { label: "Pickup time", value: "Dec 1, 2026, 10:30 AM (Asia/Macau)" },
      { label: "Pickup", value: "Macau International Airport" },
    ];
    const pt = renderCustomerAck("staging", {
      kind: "booking",
      reference,
      locale: "pt",
      name: "Synthetic Guest",
      serviceType: "airport_transfer",
      pickupAt,
      timezone: "Asia/Macau",
      siteUrl,
      details,
    });
    expect(pt.text).toContain("Hora de recolha");
    expect(pt.text).not.toMatch(/Pickup time/i);
    expect([...pt.text.matchAll(/Hora de recolha/g)]).toHaveLength(1);

    const zh = renderCustomerConfirmed("staging", {
      locale: "zh-Hant",
      name: "Synthetic Guest",
      reference,
      timezone: "Asia/Macau",
      siteUrl,
      details,
    });
    expect(zh.text).toContain("接載時間");
    expect(zh.text).not.toContain("Pickup time");
    expect([...zh.text.matchAll(/接載時間/g)]).toHaveLength(1);
  });
});
