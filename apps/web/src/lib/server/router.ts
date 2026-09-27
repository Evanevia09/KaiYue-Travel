import { AppError, getPublicConfig } from "@kaiyue/contracts";
import {
  addNote,
  adminSummary,
  handleAdminBookingDetail,
  handleAdminBookingsList,
  handleAdminBookingStatus,
  handleAdminContactDetail,
  handleAdminContactsList,
  handleAdminContactStatus,
} from "./admin.ts";
import { requireAdmin, requireSameOrigin } from "./auth.ts";
import { createBooking, getBookingByReference } from "./bookings.ts";
import { createContact } from "./contacts.ts";
import { assignBooking, editBooking } from "./dispatch.ts";
import {
  createDriver,
  createVehicle,
  listDrivers,
  listVehicles,
  updateDriver,
  updateVehicle,
} from "./inventory.ts";
import type { AppEnv } from "./env.ts";
import { noticeHours } from "./env.ts";
import { errorResponse, json, readJson, requestIdFrom } from "./http.ts";

function match(pathname: string, pattern: string): Record<string, string> | null {
  const pathParts = pathname.split("/").filter(Boolean);
  const patternParts = pattern.split("/").filter(Boolean);
  if (pathParts.length !== patternParts.length) {
    return null;
  }
  const params: Record<string, string> = {};
  for (const [index, part] of patternParts.entries()) {
    const value = pathParts[index];
    if (!value) {
      return null;
    }
    if (part.startsWith(":")) {
      params[part.slice(1)] = decodeURIComponent(value);
      continue;
    }
    if (part !== value) {
      return null;
    }
  }
  return params;
}

export async function handleApi(
  request: Request,
  env: AppEnv,
  existingRequestId?: string,
): Promise<Response> {
  const requestId = requestIdFrom(request, existingRequestId);
  const url = new URL(request.url);
  const { pathname } = url;

  try {
    if (request.method === "GET" && pathname === "/api/v1/config/public") {
      return json(
        getPublicConfig({
          timezone: env.BUSINESS_TIMEZONE,
          noticeHours: noticeHours(env),
        }),
        200,
        requestId,
      );
    }

    if (request.method === "POST" && pathname === "/api/v1/bookings") {
      return await createBooking(request, env, requestId);
    }

    if (request.method === "POST" && pathname === "/api/v1/contacts") {
      return await createContact(request, env, requestId);
    }

    if (pathname.startsWith("/api/v1/admin")) {
      requireSameOrigin(request, env);
      const actor = await requireAdmin(request, env);

      if (request.method === "GET" && pathname === "/api/v1/admin/summary") {
        return json(await adminSummary(env), 200, requestId);
      }

      if (request.method === "GET" && pathname === "/api/v1/admin/bookings") {
        return json(await handleAdminBookingsList(request, env), 200, requestId);
      }

      if (pathname === "/api/v1/admin/drivers") {
        if (request.method === "GET")
          return json({ items: await listDrivers(env.DB) }, 200, requestId);
        if (request.method === "POST")
          return json(
            { item: await createDriver(env.DB, await readJson(request), actor.id, requestId) },
            201,
            requestId,
          );
      }
      const driverParams = match(pathname, "/api/v1/admin/drivers/:id");
      if (request.method === "PATCH" && driverParams)
        return json(
          {
            item: await updateDriver(
              env.DB,
              driverParams.id!,
              await readJson(request),
              actor.id,
              requestId,
            ),
          },
          200,
          requestId,
        );

      if (pathname === "/api/v1/admin/vehicles") {
        if (request.method === "GET")
          return json({ items: await listVehicles(env.DB) }, 200, requestId);
        if (request.method === "POST")
          return json(
            { item: await createVehicle(env.DB, await readJson(request), actor.id, requestId) },
            201,
            requestId,
          );
      }
      const vehicleParams = match(pathname, "/api/v1/admin/vehicles/:id");
      if (request.method === "PATCH" && vehicleParams)
        return json(
          {
            item: await updateVehicle(
              env.DB,
              vehicleParams.id!,
              await readJson(request),
              actor.id,
              requestId,
            ),
          },
          200,
          requestId,
        );

      if (request.method === "POST" && pathname === "/api/v1/admin/bookings") {
        return await createBooking(request, env, requestId);
      }

      const bookingDetailParams = match(pathname, "/api/v1/admin/bookings/:reference");
      if (request.method === "GET" && bookingDetailParams) {
        return json(
          await handleAdminBookingDetail(env, bookingDetailParams.reference!),
          200,
          requestId,
        );
      }
      if (request.method === "PATCH" && bookingDetailParams) {
        return json(
          await editBooking(
            env.DB,
            bookingDetailParams.reference!,
            await readJson(request),
            actor.id,
            requestId,
          ),
          200,
          requestId,
        );
      }
      const bookingAssignmentParams = match(
        pathname,
        "/api/v1/admin/bookings/:reference/assignment",
      );
      if (request.method === "PATCH" && bookingAssignmentParams) {
        return json(
          await assignBooking(
            env.DB,
            bookingAssignmentParams.reference!,
            await readJson(request),
            actor.id,
            requestId,
          ),
          200,
          requestId,
        );
      }

      const bookingStatusParams = match(pathname, "/api/v1/admin/bookings/:reference/status");
      if (request.method === "PATCH" && bookingStatusParams) {
        return json(
          await handleAdminBookingStatus(
            request,
            env,
            bookingStatusParams.reference!,
            actor.id,
            requestId,
          ),
          200,
          requestId,
        );
      }

      const bookingNoteParams = match(pathname, "/api/v1/admin/bookings/:reference/notes");
      if (request.method === "POST" && bookingNoteParams) {
        const booking = await getBookingByReference(env.DB, bookingNoteParams.reference!);
        if (!booking) {
          throw new AppError("NOT_FOUND", "Booking not found.");
        }
        const body = (await readJson(request)) as { body?: string };
        return json(
          await addNote(env.DB, "booking", booking.id, body.body ?? "", actor.id),
          201,
          requestId,
        );
      }

      if (request.method === "GET" && pathname === "/api/v1/admin/contacts") {
        return json(await handleAdminContactsList(request, env), 200, requestId);
      }

      const contactDetailParams = match(pathname, "/api/v1/admin/contacts/:id");
      if (request.method === "GET" && contactDetailParams) {
        return json(await handleAdminContactDetail(env, contactDetailParams.id!), 200, requestId);
      }

      const contactStatusParams = match(pathname, "/api/v1/admin/contacts/:id/status");
      if (request.method === "PATCH" && contactStatusParams) {
        return json(
          await handleAdminContactStatus(
            request,
            env,
            contactStatusParams.id!,
            actor.id,
            requestId,
          ),
          200,
          requestId,
        );
      }

      const contactNoteParams = match(pathname, "/api/v1/admin/contacts/:id/notes");
      if (request.method === "POST" && contactNoteParams) {
        const detail = await handleAdminContactDetail(env, contactNoteParams.id!);
        const body = (await readJson(request)) as { body?: string };
        return json(
          await addNote(env.DB, "contact", detail.contact.id, body.body ?? "", actor.id),
          201,
          requestId,
        );
      }

      throw new AppError("NOT_FOUND", "Admin route not found.");
    }

    throw new AppError("NOT_FOUND", "Not found.");
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
