import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { handleMcp, stagingResponseError } from "@kaiyue/agent-tools/http";
import { authenticateMcp, consumeMcpApproval } from "../../../../lib/server/mcp-access.ts";
import { handleApi } from "../../../../lib/server/router.ts";
import { errorResponse, requestIdFrom } from "../../../../lib/server/http.ts";
import { mcpChallenge } from "../../../../lib/server/mcp-oauth-metadata.ts";
import { AppError } from "@kaiyue/contracts";

export const prerender = false;

export const ALL: APIRoute = async ({ request }) => {
  const requestId = requestIdFrom(request);
  try {
    const sourceOrigin = request.headers.get("origin");
    const origin = new URL(request.url).origin;
    if (sourceOrigin && sourceOrigin !== origin) {
      throw new AppError("FORBIDDEN", "Cross-origin MCP requests are unavailable.");
    }
    const session = await authenticateMcp(request, env);
    if (request.method !== "POST") {
      return new Response(null, {
        status: 405,
        headers: { Allow: "POST", "Cache-Control": "no-store" },
      });
    }
    async function call(path: string, method = "GET", body?: unknown) {
      const target = new URL(path, origin);
      if (target.origin !== origin || !target.pathname.startsWith("/api/v1/admin/")) {
        throw new AppError("FORBIDDEN", "This staging action is unavailable.");
      }
      const response = await handleApi(
        new Request(target, {
          method,
          headers: { cookie: session.cookie, origin, "Content-Type": "application/json" },
          body: body === undefined ? undefined : JSON.stringify(body),
        }),
        env,
        requestId,
      );
      if (!response.ok) {
        throw await stagingResponseError(response, origin);
      }
      return response.json();
    }
    const response = await handleMcp(
      request,
      {
        get: (path: string) => call(path),
        patch: (path: string, body: unknown) => call(path, "PATCH", body),
        post: (path: string, body: unknown) => call(path, "POST", body),
      },
      {
        async approve(message: string, action: unknown) {
          const review = await consumeMcpApproval(env, session.actor, action, message);
          if (review) return review;
          return null;
        },
      },
    );
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "no-store");
    return new Response(response.body, { status: response.status, headers });
  } catch (error) {
    const response = errorResponse(error, requestId);
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "no-store");
    if (response.status === 401) {
      const error = request.headers.has("authorization") ? ', error="invalid_token"' : "";
      headers.set("WWW-Authenticate", mcpChallenge + error);
    }
    return new Response(response.body, { status: response.status, headers });
  }
};
