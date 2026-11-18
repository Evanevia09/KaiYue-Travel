import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { StagingError } from "./staging-api.mjs";

const bookingStatus = z.enum(["enquiry", "assigned", "completed", "cancelled"]);
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
});
const inquiry = z.object({
  reference: z.string().regex(/^INQ-[A-Z2-9]{8}$/),
  status: inquiryStatus,
  inquiryType: z.enum(["general", "corporate", "partnership", "media"]),
  createdAt: timestamp,
  updatedAt: timestamp,
});

function pageOf(record) {
  return z.object({ items: z.array(record), nextCursor: z.string().nullable() });
}

const pageInput = {
  limit: z.number().int().min(1).max(50).optional(),
  cursor: z.string().min(1).max(2048).optional(),
  updatedSince: timestamp.optional(),
};

export function createServer(api) {
  const server = new McpServer(
    { name: "kaiyue-travel-staging", version: "0.1.0" },
    {
      instructions:
        "These tools read Kai Yue Travel staging data. Booking status is for staff workflow. Guest confirmation requires a human decision.",
    },
  );

  function register(name, description, inputSchema, outputSchema, getPath) {
    server.registerTool(
      name,
      {
        description,
        inputSchema,
        outputSchema,
        annotations: { readOnlyHint: true, openWorldHint: true },
      },
      async (input) => {
        try {
          const result = outputSchema.parse(await api.get(getPath(input)));
          return {
            structuredContent: result,
            content: [{ type: "text", text: JSON.stringify(result) }],
          };
        } catch (error) {
          const message =
            error instanceof StagingError
              ? error.message
              : "Could not read a valid response from Kai Yue staging.";
          return { isError: true, content: [{ type: "text", text: message }] };
        }
      },
    );
  }

  function listPath(resource, filters) {
    const query = new URLSearchParams({ limit: "10" });
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined) query.set(key, String(value));
    }
    return `/api/v1/admin/${resource}?${query}`;
  }

  register(
    "list_bookings",
    "List staging booking summaries. Filter by status or date and follow nextCursor for more results.",
    {
      ...pageInput,
      status: bookingStatus.optional(),
      from: timestamp.optional(),
      to: timestamp.optional(),
    },
    pageOf(booking).extend({ total: z.number().int() }),
    (filters) => listPath("bookings", filters),
  );
  register(
    "get_booking",
    "Read the status and schedule of a staging booking by its booking reference.",
    { reference: bookingReference },
    z.object({ booking }),
    ({ reference }) => `/api/v1/admin/bookings/${reference}`,
  );
  register(
    "list_inquiries",
    "List staging inquiry references and statuses. Follow nextCursor for more results.",
    { ...pageInput, status: inquiryStatus.optional() },
    pageOf(inquiry),
    (filters) => listPath("contacts", filters),
  );

  return server;
}
