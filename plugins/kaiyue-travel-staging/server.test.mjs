import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import {
  isCloudflareBrowserIntegrityBlock,
  stagingResponseError,
} from "../../packages/agent-tools/error.mjs";
import { StagingError } from "./staging-api.mjs";
import { ElicitRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { createServer } from "./server.mjs";
import {
  STAFF_EMAIL_ENV,
  STAFF_PASSWORD_ENV,
  createStagingApi,
  readStaffCredentials,
  STAGING_ORIGIN,
} from "./staging-api.mjs";

const time = "2026-11-18T11:00:00.000Z";
const summary = {
  reference: "KY-ABCDEFGH",
  status: "enquiry",
  serviceType: "airport_transfer",
  pickupAt: time,
  passengerCount: 2,
  updatedAt: time,
  driverId: "driver-1",
  vehicleId: "vehicle-1",
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
      if (path.endsWith("/drivers")) {
        return { items: [{ id: "driver-1", name: "Test Driver", phone: "Private phone" }] };
      }
      if (path.endsWith("/vehicles")) {
        return {
          items: [{ id: "vehicle-1", makeModel: "Test Van", plateNumber: "Private plate" }],
        };
      }
      if (path.endsWith("KY-22222222")) {
        return {
          booking: { ...booking, reference: "KY-22222222", driverId: null, vehicleId: "missing" },
        };
      }
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
    [
      "list_bookings",
      "get_booking",
      "list_inquiries",
      "get_inquiry",
      "list_inventory",
      "edit_booking",
      "change_booking_status",
      "assign_booking",
      "draft_quote",
      "send_quote_email",
    ],
  );
  assert.equal(tools.filter(({ annotations }) => annotations.readOnlyHint).length, 6);
  assert.match(client.getInstructions(), /list_inventory/);
  const page = await client.callTool({
    name: "list_bookings",
    arguments: { status: "enquiry", limit: 1 },
  });
  assert.deepEqual(page.structuredContent, { items: [summary], nextCursor: "dGVzdA==", total: 1 });
  const detail = await client.callTool({
    name: "get_booking",
    arguments: { reference: "ky-abcdefgh" },
  });
  assert.deepEqual(detail.structuredContent, {
    booking: summary,
    assignment: {
      driver: { id: "driver-1", name: "Test Driver" },
      vehicle: { id: "vehicle-1", makeModel: "Test Van" },
    },
  });
  const partial = await client.callTool({
    name: "get_booking",
    arguments: { reference: "KY-22222222" },
  });
  assert.deepEqual(partial.structuredContent.assignment, {
    driver: null,
    vehicle: { id: "missing", makeModel: null },
  });
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
    "/api/v1/admin/drivers",
    "/api/v1/admin/vehicles",
    "/api/v1/admin/bookings/KY-22222222",
    "/api/v1/admin/vehicles",
    "/api/v1/admin/contacts?limit=10&cursor=dGVzdA%3D%3D",
  ]);
  for (const result of [page, detail, inquiries]) {
    assert.doesNotMatch(JSON.stringify(result.content), /synthetic@example|Private/);
  }
});

test("staff credentials prefer environment secrets over keychain", async () => {
  const login = await readStaffCredentials({
    env: {
      [STAFF_EMAIL_ENV]: "vault@example.com",
      [STAFF_PASSWORD_ENV]: "vault-password",
    },
    readKeychain: async () => {
      throw new Error("keychain should not run when env credentials are present");
    },
  });
  assert.deepEqual(login, { email: "vault@example.com", password: "vault-password" });
});

test("missing staff credentials ask for env secrets or a secure form", async () => {
  await assert.rejects(
    readStaffCredentials({
      env: {},
      readKeychain: async () => null,
    }),
    /secure secret field[\s\S]*secure in-chat form[\s\S]*Browser vaults cannot inject/,
  );
});

test("staging uses a cookie session, renews one expired read and signs out", async () => {
  const requests = [];
  let signIns = 0;
  const api = createStagingApi({
    getCredentials: async () => ({ email: "synthetic@example.com", password: "fixture" }),
    async fetchRequest(url, options) {
      assert.equal(url.origin, STAGING_ORIGIN);
      assert.equal(options.redirect, "error");
      assert.equal(options.headers.get("User-Agent"), "KaiYue-staging-mcp/1.0");
      assert.notEqual(options.headers.get("User-Agent") ?? "", "");
      assert.doesNotMatch(options.headers.get("User-Agent") ?? "", /Mozilla\//);
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

test("edge 1010, 401, and 429 tell the client to stop instead of retrying", async () => {
  const html1010 = new Response("<!doctype html><title>Error 1010</title>", {
    status: 403,
    headers: { "content-type": "text/html" },
  });
  const htmlBody = await html1010.clone().text();
  assert.equal(isCloudflareBrowserIntegrityBlock(html1010, htmlBody), true);
  const blocked = await stagingResponseError(html1010, STAGING_ORIGIN);
  assert.match(
    blocked.message,
    /error 1010 \/ Browser Integrity Check[\s\S]*Do not retry the password[\s\S]*Do not impersonate a browser/,
  );
  const unauthorized = await stagingResponseError(
    new Response("{}", { status: 401, headers: { "content-type": "application/json" } }),
    STAGING_ORIGIN,
  );
  assert.match(unauthorized.message, /Staff email or password was not accepted[\s\S]*Stop/);
  const locked = await stagingResponseError(
    new Response("{}", { status: 429, headers: { "retry-after": "300" } }),
    STAGING_ORIGIN,
  );
  assert.match(locked.message, /Wait five minutes[\s\S]*Do not retry during the lock/);
  assert.equal(
    isCloudflareBrowserIntegrityBlock(
      new Response(JSON.stringify({ error: { code: "FORBIDDEN" } }), {
        status: 403,
        headers: { "content-type": "application/json" },
      }),
      JSON.stringify({ error: { code: "FORBIDDEN" } }),
    ),
    false,
  );
});

test("password sign-in stops on 1010, 401, and 429 instead of retrying", async () => {
  async function expectSignInStop(status, headers, body, pattern) {
    let signIns = 0;
    const api = createStagingApi({
      getCredentials: async () => ({ email: "synthetic@example.com", password: "fixture" }),
      async fetchRequest(url) {
        assert.equal(url.pathname, "/api/auth/sign-in/email");
        signIns += 1;
        return new Response(body, { status, headers });
      },
    });
    await assert.rejects(api.get("/api/v1/admin/contacts"), pattern);
    assert.equal(signIns, 1);
    await api.close();
  }
  await expectSignInStop(
    403,
    { "content-type": "text/html" },
    "<!doctype html><title>Error 1010</title>",
    /error 1010 \/ Browser Integrity Check[\s\S]*Do not retry the password[\s\S]*Do not impersonate a browser/,
  );
  await expectSignInStop(
    401,
    { "content-type": "application/json" },
    "{}",
    /Staff email or password was not accepted[\s\S]*Stop/,
  );
  await expectSignInStop(
    429,
    { "retry-after": "300" },
    "{}",
    /Wait five minutes[\s\S]*Do not retry during the lock/,
  );
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
  assert.equal(tools.length, 10);
});

test("MCP previews quotes and requires per-action human approval for writes", async (t) => {
  const current = {
    ...booking,
    pickupLocation: "Test pickup",
    destination: "Test destination",
    returnAt: null,
    contactName: "Test Guest",
    phone: "Test phone",
    message: "Test message",
  };
  const mutations = [];
  let quoteApproved = false;
  const api = {
    async get(path) {
      if (path.endsWith("/drivers"))
        return { items: [{ id: "driver-1", name: "Test driver", active: true }] };
      if (path.endsWith("/vehicles"))
        return {
          items: [
            { id: "vehicle-1", makeModel: "Test vehicle", active: true, passengerCapacity: 4 },
          ],
        };
      return { booking: current };
    },
    async patch(path, body) {
      mutations.push({ path, body });
      return { booking: current };
    },
    async post(path, body) {
      if (!quoteApproved) throw new StagingError("Review the quote in the browser.");
      mutations.push({ path, body });
      return { ...body, status: "submitted" };
    },
  };
  const server = createServer(api);
  const client = new Client(
    { name: "approval-test", version: "1.0.0" },
    {
      capabilities: { elicitation: { form: {} } },
    },
  );
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  t.after(async () => {
    await client.close();
    await server.close();
  });
  let approve = false;
  const prompts = [];
  client.setRequestHandler(ElicitRequestSchema, async (request) => {
    prompts.push(request.params.message);
    return approve ? { action: "accept", content: { approve: true } } : { action: "decline" };
  });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  const revision = { reference: booking.reference, expectedUpdatedAt: time };
  const call = (name, args) => client.callTool({ name, arguments: args });
  const quote = {
    reference: booking.reference,
    currency: "MOP",
    pricing: { type: "hourly", rate: "215.05", minutes: 90 },
  };
  const draft = await call("draft_quote", quote);
  assert.equal(draft.structuredContent.total, "322.58");
  assert.match(draft.structuredContent.body, /MOP 322\.58/);
  assert.equal((await call("send_quote_email", quote)).isError, true);
  assert.deepEqual(mutations, []);
  approve = true;
  assert.equal(
    (await call("change_booking_status", { ...revision, status: "assigned" })).isError,
    undefined,
  );
  assert.equal(
    (await call("edit_booking", { ...revision, changes: { passengerCount: 3 } })).isError,
    undefined,
  );
  assert.equal(
    (await call("assign_booking", { ...revision, driverId: "driver-1", vehicleId: "vehicle-1" }))
      .isError,
    undefined,
  );
  quoteApproved = true;
  assert.equal((await call("send_quote_email", quote)).structuredContent.status, "submitted");
  assert.equal(
    (
      await call("edit_booking", {
        ...revision,
        expectedUpdatedAt: "2020-01-01T00:00:00Z",
        changes: { passengerCount: 2 },
      })
    ).isError,
    true,
  );
  assert.deepEqual(
    mutations.map(({ path }) => path.split("/").pop()),
    ["status", booking.reference, "assignment", "email"],
  );
  assert.equal(mutations[1].body.email, current.email);
  assert.equal(mutations[1].body.message, current.message);
  assert.equal(mutations[1].body.passengerCount, 3);
  assert.equal(prompts.length, 3);
});

test("staging direct writes skip elicitation when the server approve callback returns null", async (t) => {
  const current = {
    ...booking,
    pickupLocation: "Test pickup",
    destination: "Test destination",
    returnAt: null,
    contactName: "Test Guest",
    phone: "Test phone",
    message: "Test message",
  };
  const mutations = [];
  const api = {
    async get(path) {
      if (path.endsWith("/drivers"))
        return { items: [{ id: "driver-1", name: "Test driver", active: true }] };
      if (path.endsWith("/vehicles"))
        return {
          items: [
            { id: "vehicle-1", makeModel: "Test vehicle", active: true, passengerCapacity: 4 },
          ],
        };
      return { booking: current };
    },
    async patch(path, body) {
      mutations.push({ path, body });
      return { booking: current };
    },
    async post(path, body) {
      mutations.push({ path, body });
      return { ...body, status: "submitted" };
    },
  };
  const server = createServer(api, { approve: async () => null });
  const client = new Client({ name: "direct-write-test", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  t.after(async () => {
    await client.close();
    await server.close();
  });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  const revision = { reference: booking.reference, expectedUpdatedAt: time };
  const call = (name, args) => client.callTool({ name, arguments: args });
  const quote = {
    reference: booking.reference,
    currency: "MOP",
    pricing: { type: "hourly", rate: "215.05", minutes: 90 },
  };
  assert.equal(
    (await call("change_booking_status", { ...revision, status: "assigned" })).isError,
    undefined,
  );
  assert.equal(
    (await call("edit_booking", { ...revision, changes: { passengerCount: 3 } })).isError,
    undefined,
  );
  assert.equal(
    (await call("assign_booking", { ...revision, driverId: "driver-1", vehicleId: "vehicle-1" }))
      .isError,
    undefined,
  );
  assert.equal((await call("send_quote_email", quote)).structuredContent.status, "submitted");
  assert.equal(
    (
      await call("edit_booking", {
        ...revision,
        expectedUpdatedAt: "2020-01-01T00:00:00Z",
        changes: { passengerCount: 2 },
      })
    ).isError,
    true,
  );
  assert.deepEqual(
    mutations.map(({ path }) => path.split("/").pop()),
    ["status", booking.reference, "assignment", "email"],
  );
});
