import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { createAdminSessionAuth } from "../../../lib/server/admin-session.ts";
import {
  assertLiveAdminSurface,
  forbiddenResponse,
  passwordAdminAllowed,
} from "../../../lib/server/admin-gate.ts";
import { passwordSignupGate } from "../../../lib/server/admin-signup.ts";
import {
  handlePasswordSignIn,
  isPasswordSignInPath,
} from "../../../lib/server/password-attempt.ts";

export const prerender = false;

export const ALL: APIRoute = async ({ request }) => {
  const pathname = new URL(request.url).pathname;
  try {
    assertLiveAdminSurface(env, pathname, request);
  } catch {
    return forbiddenResponse();
  }
  if (!passwordAdminAllowed(env, request)) {
    return forbiddenResponse();
  }

  const signup = pathname === "/api/auth/sign-up/email";
  if (signup) {
    const gate = await passwordSignupGate(env, request);
    if (!gate.ok) {
      return new Response(gate.message, { status: gate.status });
    }
  }
  if (isPasswordSignInPath(pathname)) {
    return handlePasswordSignIn(request, env);
  }
  const auth = createAdminSessionAuth(env, signup, request);
  return auth.handler(request);
};
