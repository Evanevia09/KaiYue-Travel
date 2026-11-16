import {
  applyHostIsolationHeaders,
  dedicatedAdminPathAction,
  forbiddenResponse,
  isDedicatedAdminHostname,
  requestHost,
} from "./admin-gate.ts";
import type { AppEnv } from "./env.ts";

type WorkerEnv = Pick<AppEnv, "ENVIRONMENT" | "ENV" | "ACCESS_TEAM_DOMAIN" | "ACCESS_AUD">;

export type WorkerFetch = (
  request: Request,
  env: unknown,
  ctx: unknown,
) => Response | Promise<Response>;

function withDedicatedAdminHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  applyHostIsolationHeaders(headers, {
    dedicatedAdmin: true,
    contentType: headers.get("content-type"),
  });
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function dedicatedAdminRedirect(pathname: string): Response {
  const headers = new Headers({ location: pathname });
  applyHostIsolationHeaders(headers, {
    dedicatedAdmin: true,
    contentType: "text/html",
  });
  return new Response(null, { status: 302, headers });
}

/**
 * Runs on the Wrangler fetch entry, before `@astrojs/cloudflare` can
 * `ASSETS.fetch` prerendered `index.html`. Boolean `run_worker_first` only
 * enters this Worker; it does not reorder the adapter.
 */
export function maybeDedicatedAdminEntryResponse(
  request: Request,
  env: WorkerEnv,
): Response | null {
  if (!isDedicatedAdminHostname(requestHost(request))) {
    return null;
  }
  const action = dedicatedAdminPathAction(env, new URL(request.url).pathname);
  switch (action) {
    case "pass":
      return null;
    case "redirect-login":
      return dedicatedAdminRedirect("/login");
    case "redirect-admin":
      return dedicatedAdminRedirect("/admin");
    case "forbid":
      return withDedicatedAdminHeaders(forbiddenResponse());
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

export function createWorkerFetch(astroFetch: WorkerFetch): WorkerFetch {
  return (request, env, ctx) => {
    const gated = maybeDedicatedAdminEntryResponse(request, env as WorkerEnv);
    if (gated) {
      return gated;
    }
    return astroFetch(request, env, ctx);
  };
}
