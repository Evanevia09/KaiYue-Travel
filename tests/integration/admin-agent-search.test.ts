import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { AppEnv } from "../../apps/web/src/lib/server/env.ts";
import { handleApi } from "../../apps/web/src/lib/server/router.ts";
import { createTestEnv, futurePickup } from "../helpers/memory-d1.ts";

const origin = "http://localhost";

async function post(env: AppEnv, path: string, key: string, body: Record<string, unknown>) {
  const response = await handleApi(
    new Request(`${origin}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": key },
      body: JSON.stringify(body),
    }),
    env,
  );
  expect(response.status).toBe(201);
  return (await response.json()) as { reference: string };
}

async function list(env: AppEnv, path: string) {
  const response = await handleApi(new Request(`${origin}${path}`), env);
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

function booking(contactName: string, email: string, hours: number) {
  return {
    serviceType: "airport_transfer",
    pickupLocation: "Macau International Airport",
    destination: "Grand Lisboa",
    pickupAt: futurePickup(hours),
    passengerCount: 2,
    communicationChannel: "whatsapp",
    contactName,
    phone: "+853 6234 5678",
    email,
    message: "Synthetic agent search fixture.",
    privacyAccepted: true,
    sourcePage: "/",
    sourceTrigger: "hero-embed",
    sourceMode: "embedded",
    locale: "en",
  };
}

function contact(name: string, company: string) {
  return {
    inquiryType: "corporate",
    name,
    phone: "+853 2833 8882",
    company,
    message: "Synthetic agent search fixture inquiry.",
    privacyAccepted: true,
    sourcePage: "/corporate",
    locale: "en",
  };
}

describe("admin list search for agents", () => {
  it("searches bookings by name, email, and reference with literal wildcards", async () => {
    const env = createTestEnv();
    const first = await post(
      env,
      "/api/v1/bookings",
      "agent-search-b1",
      booking("Alex Chan", "alex@example.com", 48),
    );
    await post(
      env,
      "/api/v1/bookings",
      "agent-search-b2",
      booking("Bea Lam", "bea@example.com", 72),
    );

    const byName = await list(env, "/api/v1/admin/bookings?q=alex");
    expect(byName.status).toBe(200);
    expect((byName.body.items as { reference: string }[]).map((item) => item.reference)).toEqual([
      first.reference,
    ]);
    expect(byName.body.total).toBe(1);

    const byEmail = await list(env, "/api/v1/admin/bookings?q=BEA%40EXAMPLE");
    expect((byEmail.body.items as unknown[]).length).toBe(1);

    const byReference = await list(
      env,
      `/api/v1/admin/bookings?q=${encodeURIComponent(first.reference.slice(-4))}`,
    );
    expect((byReference.body.items as { reference: string }[])[0]?.reference).toBe(first.reference);

    const wildcard = await list(env, "/api/v1/admin/bookings?q=%25%25");
    expect((wildcard.body.items as unknown[]).length).toBe(0);
  });

  it("filters by updatedSince and rejects invalid search parameters with 422", async () => {
    const env = createTestEnv();
    await post(
      env,
      "/api/v1/bookings",
      "agent-search-b3",
      booking("Chris Wong", "chris@example.com", 48),
    );
    const future = new Date(Date.now() + 60_000).toISOString();
    const past = new Date(Date.now() - 60_000).toISOString();

    expect(
      ((await list(env, `/api/v1/admin/bookings?updatedSince=${past}`)).body.items as unknown[])
        .length,
    ).toBe(1);
    expect(
      ((await list(env, `/api/v1/admin/bookings?updatedSince=${future}`)).body.items as unknown[])
        .length,
    ).toBe(0);

    for (const path of [
      "/api/v1/admin/bookings?q=a",
      "/api/v1/admin/bookings?updatedSince=2026-11-16",
      "/api/v1/admin/contacts?q=a",
      "/api/v1/admin/contacts?updatedSince=yesterday",
      "/api/v1/admin/contacts?cursor=bogus",
    ]) {
      const result = await list(env, path);
      expect(result.status, path).toBe(422);
      expect((result.body.error as { code: string }).code).toBe("VALIDATION_FAILED");
    }
  });

  it("searches inquiries by company and pages with a stable opaque cursor", async () => {
    const env = createTestEnv();
    await post(env, "/api/v1/contacts", "agent-search-c1", contact("Jamie Ho", "Harbour Hotels"));
    await post(env, "/api/v1/contacts", "agent-search-c2", contact("Kim Ip", "Harbour Hotels"));
    await post(env, "/api/v1/contacts", "agent-search-c3", contact("Lee Au", "Other Group"));

    const byCompany = await list(env, "/api/v1/admin/contacts?q=harbour");
    expect((byCompany.body.items as unknown[]).length).toBe(2);

    const seen = new Set<string>();
    let cursor: string | null = null;
    do {
      const page = await list(
        env,
        `/api/v1/admin/contacts?limit=1${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
      );
      for (const item of page.body.items as { reference: string }[]) {
        expect(seen.has(item.reference)).toBe(false);
        seen.add(item.reference);
      }
      cursor = page.body.nextCursor as string | null;
    } while (cursor);
    expect(seen.size).toBe(3);
  });
});

describe("agent OpenAPI description", () => {
  it("only documents routes the Worker router serves", () => {
    const spec = readFileSync(
      fileURLToPath(new URL("../../docs/api/admin-agent-v1.openapi.yaml", import.meta.url)),
      "utf8",
    );
    const router = readFileSync(
      fileURLToPath(new URL("../../apps/web/src/lib/server/router.ts", import.meta.url)),
      "utf8",
    );
    const paths = [...spec.matchAll(/^ {2}(\/api\/[^:\s]+):$/gm)].map((match) => match[1]!);
    expect(paths.length).toBeGreaterThan(5);
    for (const path of paths) {
      if (path.startsWith("/api/auth/")) continue;
      const routerPath = path.replace(/\{(\w+)\}/g, ":$1");
      expect(router, path).toContain(`"${routerPath}"`);
    }
    expect(spec).toContain("/api/auth/sign-in/email:");
    expect(spec).not.toMatch(/bearer|x-api-key|in: (header|query)\n\s+name: (authorization|api)/i);
    expect(spec).toMatch(/in: cookie\n\s+name: __Secure-better-auth\.session_token/);
  });
});
