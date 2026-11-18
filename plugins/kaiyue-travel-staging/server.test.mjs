import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "./server.mjs";
import { createStagingApi, STAGING_ORIGIN } from "./staging-api.mjs";

const time = "2026-11-18T11:00:00.000Z";
const summary = {
  reference: "KY-ABCDEFGH",
  status: "enquiry",
  serviceType: "airport_transfer",
  pickupAt: time,
  passengerCount: 2,
  updatedAt: time,
};
const booking = { ...summary, email: "synthetic@example.com", pickupLocation: "Private address" };
const inquiry = {
  reference: "INQ-ABCDEFGH",
  status: "new",
  inquiryType: "general",
  createdAt: time,
  updatedAt: time,
  message: "Private message",
};
const { message: _message, ...inquirySummary } = inquiry;

test("MCP exposes only read tools and projects the staging responses", async (t) => {
  const paths = [];
  const server = createServer({
    async get(path) {
      paths.push(path);
      if (path.includes("/contacts")) return { items: [inquiry], nextCursor: null };
      if (path.endsWith(booking.reference)) return { booking, notes: [{ body: "Private note" }] };
      return { items: [booking], nextCursor: "dGVzdA==", total: 1 };
    },
  });
  const client = new Client({ name: "test", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  t.after(async () => {
    await client.close();
    await server.close();
  });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  const { tools } = await client.listTools();
  assert.deepEqual(
    tools.map(({ name }) => name),
    ["list_bookings", "get_booking", "list_inquiries"],
  );
  assert.ok(tools.every(({ annotations }) => annotations.readOnlyHint));
  const page = await client.callTool({
    name: "list_bookings",
    arguments: { status: "enquiry", limit: 1 },
  });
  assert.deepEqual(page.structuredContent, { items: [summary], nextCursor: "dGVzdA==", total: 1 });
  const detail = await client.callTool({
    name: "get_booking",
    arguments: { reference: "ky-abcdefgh" },
  });
  assert.deepEqual(detail.structuredContent, { booking: summary });
  const inquiries = await client.callTool({
    name: "list_inquiries",
    arguments: { cursor: page.structuredContent.nextCursor },
  });
  assert.deepEqual(inquiries.structuredContent, { items: [inquirySummary], nextCursor: null });
  const invalid = await client.callTool({ name: "list_bookings", arguments: { limit: 51 } });
  assert.equal(invalid.isError, true);
  assert.deepEqual(paths, [
    "/api/v1/admin/bookings?limit=1&status=enquiry",
    "/api/v1/admin/bookings/KY-ABCDEFGH",
    "/api/v1/admin/contacts?limit=10&cursor=dGVzdA%3D%3D",
  ]);
  for (const result of [page, detail, inquiries]) {
    assert.doesNotMatch(JSON.stringify(result.content), /synthetic@example|Private/);
  }
});

test("staging uses a cookie session, renews one expired read and signs out", async () => {
  const requests = [];
  let signIns = 0;
  const api = createStagingApi({
    getCredentials: async () => ({ email: "synthetic@example.com", password: "fixture" }),
    async fetchRequest(url, options) {
      assert.equal(url.origin, STAGING_ORIGIN);
      assert.equal(options.redirect, "error");
      requests.push([options.method, url.pathname]);
      if (options.method === "POST") assert.equal(options.headers.get("Origin"), STAGING_ORIGIN);
      if (url.pathname.endsWith("/sign-in/email")) {
        assert.deepEqual(JSON.parse(options.body), {
          email: "synthetic@example.com",
          password: "fixture",
        });
        signIns++;
        return new Response("{}", {
          headers: {
            "Set-Cookie": `__Secure-better-auth.session_token=fixture-${signIns}; Secure; HttpOnly; Path=/`,
          },
        });
      }
      const cookie = options.headers.get("Cookie");
      assert.ok(cookie?.includes(`fixture-${signIns}`));
      if (url.pathname.endsWith("/sign-out")) return new Response("{}");
      if (signIns === 1) return new Response("{}", { status: 401 });
      return Response.json({ items: [], nextCursor: null });
    },
  });
  assert.deepEqual(await api.get("/api/v1/admin/contacts"), { items: [], nextCursor: null });
  await assert.rejects(
    api.get("https://other.example/api/v1/admin/contacts"),
    /Unexpected staging request origin/,
  );
  await api.close();
  assert.deepEqual(requests, [
    ["POST", "/api/auth/sign-in/email"],
    ["GET", "/api/v1/admin/contacts"],
    ["POST", "/api/auth/sign-in/email"],
    ["GET", "/api/v1/admin/contacts"],
    ["POST", "/api/auth/sign-out"],
  ]);
});

test("built plugin launches through the declared stdio command", async (t) => {
  const root = new URL(".", import.meta.url).pathname;
  const manifest = await import("./mcp.json", { with: { type: "json" } });
  const { command, args } = manifest.default.mcpServers["kaiyue-travel-staging"];
  const client = new Client({ name: "stdio-test", version: "1.0.0" });
  t.after(() => client.close());
  await client.connect(
    new StdioClientTransport({
      command,
      args: args.map((arg) => arg.replace("${PLUGIN_ROOT}/", root)),
      cwd: root,
    }),
  );
  const { tools } = await client.listTools();
  assert.equal(tools.length, 3);
});
