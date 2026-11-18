import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import guide from "./guide.json" with { type: "json" };
import { BOOKING_STATUSES, BOOKING_TRANSITIONS } from "../contracts/src/status.ts";
import { draftQuote, pricingInput, quoteCurrency, quoteOutput } from "./quotes.mjs";
import { StagingError } from "./error.mjs";

const bookingStatus = z.enum(BOOKING_STATUSES);
const inquiryStatus = z.enum(["new", "replied", "closed"]);
const timestamp = z.iso.datetime({ offset: true });
const bookingReference = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^KY-[A-Z2-9]{8}$/);
const booking = z.object({
  reference: bookingReference,
  status: bookingStatus,
  serviceType: z.enum([
    "airport_transfer",
    "hotel_transfer",
    "point_to_point",
    "hourly_charter",
    "city_tour",
    "sightseeing",
    "corporate",
    "custom",
  ]),
  pickupAt: timestamp,
  passengerCount: z.number().int(),
  updatedAt: timestamp,
  driverId: z.string().nullable(),
  vehicleId: z.string().nullable(),
});
const driver = z.object({ id: z.string(), name: z.string().nullable() });
const vehicle = z.object({ id: z.string(), makeModel: z.string().nullable() });
const assignment = z.object({ driver: driver.nullable(), vehicle: vehicle.nullable() });
const bookingDetail = z.object({
  booking: booking.extend({ returnAt: timestamp.nullable().optional() }),
});
const inquiry = z.object({
  reference: z.string().regex(/^INQ-[A-Z2-9]{8}$/),
  status: inquiryStatus,
  inquiryType: z.enum(["general", "corporate", "partnership", "media"]),
  createdAt: timestamp,
  updatedAt: timestamp,
});
const inquiryReference = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^INQ-[A-Z2-9]{8}$/);
const recordReference = z.union([bookingReference, inquiryReference]);
const driverInventory = driver.extend({ active: z.boolean() });
const vehicleInventory = vehicle.extend({
  active: z.boolean(),
  passengerCapacity: z.number().int(),
});
const inventory = z.object({
  drivers: z.array(driverInventory),
  vehicles: z.array(vehicleInventory),
});
const quoteInput = z.object({
  reference: recordReference,
  currency: quoteCurrency,
  pricing: pricingInput,
});
const revision = { reference: bookingReference, expectedUpdatedAt: timestamp };
const edits = z
  .object({
    pickupLocation: z.string().trim().min(1).max(200).optional(),
    destination: z.string().trim().min(1).max(200).nullable().optional(),
    pickupAt: timestamp.optional(),
    returnAt: timestamp.nullable().optional(),
    passengerCount: z.number().int().min(1).max(14).optional(),
  })
  .refine((value) => Object.keys(value).length > 0);
const editableBooking = booking.extend({
  pickupLocation: z.string(),
  destination: z.string().nullable(),
  returnAt: timestamp.nullable(),
  contactName: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  message: z.string(),
});
function pageOf(record) {
  return z.object({ items: z.array(record), nextCursor: z.string().nullable() });
}

const pageInput = {
  limit: z.number().int().min(1).max(50).optional(),
  cursor: z.string().min(1).max(2048).optional(),
  updatedSince: timestamp.optional(),
};

export function createServer(api, { approve, version = "0.3.0" } = {}) {
  const server = new McpServer(
    { name: "kaiyue-travel-staging", version },
    { instructions: guide.instructions.join("\n") },
  );

  function register(name, description, inputSchema, outputSchema, read, write = false) {
    server.registerTool(
      name,
      {
        description,
        inputSchema,
        outputSchema,
        annotations: { readOnlyHint: !write, destructiveHint: write, openWorldHint: true },
      },
      async (input, extra) => {
        try {
          const result = outputSchema.parse(await read(input, extra));
          return {
            structuredContent: result,
            content: [{ type: "text", text: JSON.stringify(result) }],
          };
        } catch (error) {
          const message =
            error instanceof StagingError
              ? error.message
              : "Could not complete the request. Refresh the record before retrying a write.";
          return { isError: true, content: [{ type: "text", text: message }] };
        }
      },
    );
  }

  function bookingPath(reference) {
    return `/api/v1/admin/bookings/${reference}`;
  }

  function inquiryPath(reference) {
    return `/api/v1/admin/contacts/${reference}`;
  }

  async function requireApproval(message, action, extra) {
    if (approve) {
      const review = await approve(message, action);
      if (review)
        throw new StagingError(
          `Ask the signed-in staff user to review this action: ${review} . After approval, retry the same tool call.`,
        );
      return;
    }
    if (!server.server.getClientCapabilities()?.elicitation?.form) {
      throw new StagingError(
        "Connect from an MCP client with a human confirmation form to use this action.",
      );
    }
    const result = await server.server.elicitInput(
      {
        mode: "form",
        message,
        requestedSchema: {
          type: "object",
          properties: { approve: { type: "boolean", title: "Approve this staging action" } },
          required: ["approve"],
        },
      },
      { relatedRequestId: extra.requestId, signal: extra.signal, timeout: 60_000 },
    );
    if (result.action !== "accept" || result.content?.approve !== true || extra.signal.aborted) {
      throw new StagingError("The staging action needs explicit approval.");
    }
  }

  async function currentBooking(reference, expectedUpdatedAt) {
    const result = await api.get(bookingPath(reference));
    if (bookingDetail.parse(result).booking.updatedAt !== expectedUpdatedAt) {
      throw new StagingError("This booking changed. Read it again before making the change.");
    }
    return result;
  }

  function listPath(resource, filters) {
    const query = new URLSearchParams({ limit: "10" });
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined) query.set(key, String(value));
    }
    return `/api/v1/admin/${resource}?${query}`;
  }

  async function readAssignedItem(path, schema, fallback) {
    if (fallback.id === null) return null;
    const { items } = z.object({ items: z.array(schema) }).parse(await api.get(path));
    return items.find(({ id }) => id === fallback.id) ?? fallback;
  }

  async function readBooking({ reference }) {
    const detail = bookingDetail.parse(await api.get(`/api/v1/admin/bookings/${reference}`));
    const [assignedDriver, assignedVehicle] = await Promise.all([
      readAssignedItem("/api/v1/admin/drivers", driver, {
        id: detail.booking.driverId,
        name: null,
      }),
      readAssignedItem("/api/v1/admin/vehicles", vehicle, {
        id: detail.booking.vehicleId,
        makeModel: null,
      }),
    ]);
    return { ...detail, assignment: { driver: assignedDriver, vehicle: assignedVehicle } };
  }

  register(
    "list_bookings",
    "List staging booking summaries with driver and vehicle IDs. Use status enquiry for incoming requests and follow nextCursor for more results.",
    {
      ...pageInput,
      status: bookingStatus.optional(),
      from: timestamp.optional(),
      to: timestamp.optional(),
    },
    pageOf(booking).extend({ total: z.number().int() }),
    (filters) => api.get(listPath("bookings", filters)),
  );
  register(
    "get_booking",
    "Read a staging booking's status, schedule, assigned driver, and assigned vehicle by booking reference.",
    { reference: bookingReference },
    bookingDetail.extend({ assignment }),
    readBooking,
  );
  register(
    "list_inquiries",
    "List staging inquiry references and statuses. Follow nextCursor for more results.",
    { ...pageInput, status: inquiryStatus.optional() },
    pageOf(inquiry),
    (filters) => api.get(listPath("contacts", filters)),
  );
  register(
    "get_inquiry",
    "Read a staging general inquiry by its INQ reference.",
    { reference: inquiryReference },
    z.object({ contact: inquiry }),
    ({ reference }) => api.get(inquiryPath(reference)),
  );

  async function readInventory() {
    const [drivers, vehicles] = await Promise.all([
      api.get("/api/v1/admin/drivers"),
      api.get("/api/v1/admin/vehicles"),
    ]);
    return inventory.parse({ drivers: drivers.items, vehicles: vehicles.items });
  }

  register(
    "list_inventory",
    "List staging drivers and vehicles with names, active status, and passenger capacities. Active inventory does not establish schedule availability.",
    {},
    inventory,
    () => readInventory(),
  );

  register(
    "edit_booking",
    "Edit pickup, destination, return time, or passenger count. Requires the latest updatedAt and human approval.",
    {
      ...revision,
      changes: edits,
    },
    bookingDetail,
    async ({ reference, expectedUpdatedAt, changes }, extra) => {
      await currentBooking(reference, expectedUpdatedAt);
      await requireApproval(
        `Apply these itinerary changes to staging booking ${reference}?\n${JSON.stringify(changes)}`,
        ["edit", reference, expectedUpdatedAt, changes],
        extra,
      );
      const latest = await currentBooking(reference, expectedUpdatedAt);
      const details = editableBooking.parse(latest.booking);
      return api.patch(bookingPath(reference), { ...details, ...changes, expectedUpdatedAt });
    },
    true,
  );

  register(
    "change_booking_status",
    "Change a staging booking to approved, confirmed, denied, assigned, completed, or cancelled when the current status allows it. Requires human approval.",
    {
      ...revision,
      status: z.enum(["approved", "confirmed", "denied", "assigned", "completed", "cancelled"]),
    },
    bookingDetail,
    async ({ reference, expectedUpdatedAt, status }, extra) => {
      const { booking: record } = bookingDetail.parse(
        await currentBooking(reference, expectedUpdatedAt),
      );
      if (!BOOKING_TRANSITIONS[record.status].includes(status))
        throw new StagingError("That status transition is unavailable.");
      await requireApproval(
        `Change staging booking ${reference} from ${record.status} to ${status}?`,
        ["status", reference, expectedUpdatedAt, status],
        extra,
      );
      await currentBooking(reference, expectedUpdatedAt);
      return api.patch(`${bookingPath(reference)}/status`, { status, expectedUpdatedAt });
    },
    true,
  );

  register(
    "assign_booking",
    "Assign an inventory driver and vehicle to a staging booking. Both must be active and the vehicle must fit the passenger count. Requires human approval.",
    {
      ...revision,
      driverId: z.string().min(1).max(100),
      vehicleId: z.string().min(1).max(100),
    },
    bookingDetail,
    async ({ reference, expectedUpdatedAt, driverId, vehicleId }, extra) => {
      const { booking: record } = bookingDetail.parse(
        await currentBooking(reference, expectedUpdatedAt),
      );
      const resources = await readInventory();
      const selectedDriver = resources.drivers.find((item) => item.id === driverId && item.active);
      const selectedVehicle = resources.vehicles.find(
        (item) => item.id === vehicleId && item.active,
      );
      if (
        !selectedDriver ||
        !selectedVehicle ||
        selectedVehicle.passengerCapacity < record.passengerCount
      ) {
        throw new StagingError("Choose an active driver and an active vehicle with enough seats.");
      }
      await requireApproval(
        `Assign ${selectedDriver.name} and ${selectedVehicle.makeModel} to staging booking ${reference}?`,
        ["assign", reference, expectedUpdatedAt, driverId, vehicleId],
        extra,
      );
      return api.patch(`${bookingPath(reference)}/assignment`, {
        driverId,
        vehicleId,
        expectedUpdatedAt,
      });
    },
    true,
  );

  register(
    "draft_quote",
    "Draft a quotation email for a booking or inquiry using a specified fixed amount or an hourly rate and billable minutes. Uses staff-supplied prices.",
    quoteInput,
    quoteOutput,
    async (input) => {
      await api.get(
        input.reference.startsWith("KY-")
          ? bookingPath(input.reference)
          : inquiryPath(input.reference),
      );
      return draftQuote(input);
    },
  );
  register(
    "send_quote_email",
    "Send a reviewed quotation for a staging booking or inquiry to the approved test inbox. Requires human approval of the exact draft.",
    quoteInput,
    quoteOutput
      .pick({ reference: true, currency: true, total: true })
      .extend({ status: z.literal("submitted") }),
    async (input) => {
      const isBooking = input.reference.startsWith("KY-");
      const record = await api.get(
        isBooking ? bookingPath(input.reference) : inquiryPath(input.reference),
      );
      const expectedUpdatedAt = isBooking
        ? bookingDetail.parse(record).booking.updatedAt
        : z.object({ contact: inquiry }).parse(record).contact.updatedAt;
      const { reference, total, currency } = draftQuote(input);
      return api.post("/api/v1/admin/quotes/email", {
        reference,
        total,
        currency,
        expectedUpdatedAt,
      });
    },
    true,
  );

  return server;
}
