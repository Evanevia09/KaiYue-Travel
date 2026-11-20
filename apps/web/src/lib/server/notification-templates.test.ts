import { describe, expect, it } from "vitest";
import {
  EMAIL_LOGO_HEIGHT,
  EMAIL_LOGO_WIDTH,
  emailLogoUrl,
  renderCustomerAck,
  renderQuoteEmail,
  renderStaffMessage,
} from "./notification-templates.ts";

const logoUrl = emailLogoUrl("https://staging.kaiyuemacau.com");
const brand = { logoUrl };

describe("branded notification templates", () => {
  it("wraps staff, customer, and quote mail in the shared table shell with the public logo", () => {
    const staff = renderStaffMessage(
      "staging",
      {
        kind: "booking",
        reference: "KY-SYNTH001",
        summary: "A new chauffeur booking request is waiting for review.",
        details: [
          { label: "Name", value: "<script>x</script>" },
          { label: "Email", value: "" },
          { label: "Pickup", value: "Macau International Airport" },
        ],
      },
      brand,
    );
    expect(staff.subject).toBe("[Staging test] New booking request KY-SYNTH001");
    expect(staff.html).toContain("#008c5e");
    expect(staff.html).toContain("#f3a600");
    expect(staff.html).toContain(logoUrl);
    expect(staff.html).toContain("Kai Yue Travel");
    expect(staff.html).toContain("&lt;script&gt;");
    expect(staff.html).not.toContain("<script>x</script>");
    expect(staff.html).not.toContain("Email:");
    expect(staff.text).toContain("Pickup: Macau International Airport");
    expect(staff.text).not.toContain("Email:");

    const customer = renderCustomerAck(
      "staging",
      {
        kind: "booking",
        reference: "KY-SYNTH001",
        locale: "zh-Hant",
        name: "Synthetic Guest",
        serviceType: "airport_transfer",
        pickupAt: "2026-12-01T02:30:00.000Z",
        timezone: "Asia/Macau",
        siteUrl: "staging.kaiyuemacau.com",
      },
      brand,
    );
    expect(customer.subject).toContain("[Staging test]");
    expect(customer.html).toContain('lang="zh-Hant"');
    expect(customer.html).toContain("機場接送");
    expect(customer.text).toContain("此郵件並非預約確認");

    const quote = renderQuoteEmail(
      "staging",
      { reference: "KY-SYNTH001", currency: "MOP", total: "1280.00" },
      brand,
    );
    expect(quote.subject).toBe("[Staging test] Your Kai Yue Travel quotation | KY-SYNTH001");
    expect(quote.text).toContain("Quoted total: MOP 1280.00");
    expect(quote.html).toContain("MOP 1280.00");
    expect(quote.html).toContain(logoUrl);
    expect(quote.html).toContain(`width="${EMAIL_LOGO_WIDTH}"`);
    expect(quote.html).toContain(`height="${EMAIL_LOGO_HEIGHT}"`);
    expect(quote.html).not.toContain('width="48"');
    expect(quote.html).not.toContain("wechat-qr");
  });

  it("keeps Portuguese and English customer acknowledgements and omits empty optional fields", () => {
    const pt = renderCustomerAck("staging", {
      kind: "contact",
      reference: "INQ-SYNTH001",
      locale: "pt",
      name: null,
      timezone: "Asia/Macau",
      siteUrl: "staging.kaiyuemacau.com",
    });
    expect(pt.subject).toContain("Recebemos o seu pedido");
    expect(pt.html).toContain('lang="pt-PT"');
    const en = renderCustomerAck("staging", {
      kind: "contact",
      reference: "INQ-SYNTH001",
      locale: "en",
      name: null,
      timezone: "Asia/Macau",
      siteUrl: "staging.kaiyuemacau.com",
    });
    expect(en.text).toContain("We have received your inquiry.");
  });

  it("omits the staging prefix and uses the production logo origin on production site mail", () => {
    const logo = emailLogoUrl("https://kaiyuemacau.com");
    const staff = renderStaffMessage(
      "production",
      {
        kind: "booking",
        reference: "KY-PROD0001",
        summary: "A new chauffeur booking request is waiting for review.",
        details: [{ label: "Name", value: "Guest" }],
      },
      { logoUrl: logo },
    );
    expect(staff.subject).toBe("New booking request KY-PROD0001");
    expect(staff.subject).not.toContain("[Staging test]");
    expect(staff.html).toContain(logo);
    expect(staff.html).not.toContain("staging.kaiyuemacau.com");
    const customer = renderCustomerAck(
      "production",
      {
        kind: "booking",
        reference: "KY-PROD0001",
        locale: "en",
        name: "Guest",
        timezone: "Asia/Macau",
        siteUrl: "kaiyuemacau.com",
      },
      { logoUrl: logo },
    );
    expect(customer.subject).toBe("We received your request KY-PROD0001");
    expect(customer.text).toContain("This is not a booking confirmation.");
    expect(customer.html).toContain("<!doctype html>");
    expect(customer.html).toContain("#008c5e");
  });
});
