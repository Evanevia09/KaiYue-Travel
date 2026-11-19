import { AppError, sha256Hex } from "@kaiyue/contracts";
import { first, run } from "./db.ts";
import type { AppEnv } from "./env.ts";
import {
  assertMcpHost,
  encodeMcpBytes,
  issueMcpAccessToken,
  openMcpTicket,
  readMcpStaffSession,
  sealMcpTicket,
  verifyMcpStaffSession,
  type McpStaffSession,
} from "./mcp-access.ts";
import { mcpOrigin, mcpResource } from "./mcp-oauth-metadata.ts";

const oauthPath = "/api/v1/admin/mcp/oauth/";
const clientLifetime = 90 * 24 * 60 * 60 * 1000;
const grantLifetime = 8 * 60 * 60 * 1000;
const headers = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  Pragma: "no-cache",
};
const verifierShape = /^[A-Za-z0-9._~-]{43,128}$/;
const challengeShape = /^[A-Za-z0-9_-]{43}$/;

class OAuthError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

function validRedirect(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 512 || value.includes("#")) return false;
  try {
    const url = new URL(value);
    if (url.username || url.password) return false;
    return (
      url.protocol === "https:" ||
      (url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
    );
  } catch {
    return false;
  }
}

async function readBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new OAuthError("invalid_request");
  const decoder = new TextDecoder();
  let result = "";
  let size = 0;
  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) return result + decoder.decode();
    size += chunk.value.byteLength;
    if (size > 8192) {
      await reader.cancel();
      throw new OAuthError("invalid_request");
    }
    result += decoder.decode(chunk.value, { stream: true });
  }
}

async function registerClient(request: Request, env: AppEnv) {
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") {
    throw new OAuthError("invalid_client_metadata");
  }
  const input = JSON.parse(await readBody(request)) as Record<string, unknown> | null;
  const redirectUris = input?.redirect_uris;
  if (
    !Array.isArray(redirectUris) ||
    redirectUris.length < 1 ||
    redirectUris.length > 4 ||
    !redirectUris.every(validRedirect) ||
    (input?.token_endpoint_auth_method !== undefined && input.token_endpoint_auth_method !== "none")
  ) {
    throw new OAuthError("invalid_client_metadata");
  }
  const name = typeof input?.client_name === "string" ? input.client_name.trim().slice(0, 100) : "";
  const clientId = await sealMcpTicket(env, "client", {
    name: name || "MCP client",
    redirectUris,
    expires: Date.now() + clientLifetime,
  });
  return Response.json(
    {
      client_id: clientId,
      client_name: name || "MCP client",
      redirect_uris: redirectUris,
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    },
    { status: 201, headers },
  );
}

export async function readMcpAuthorization(request: Request, env: AppEnv) {
  assertMcpHost(request, env);
  const params = new URL(request.url).searchParams;
  const clientId = params.get("client_id") ?? "";
  const redirectUri = params.get("redirect_uri") ?? "";
  const challenge = params.get("code_challenge") ?? "";
  const state = params.get("state") ?? "";
  const client = await openMcpTicket(env, "client", clientId);
  if (
    params.get("response_type") !== "code" ||
    params.get("code_challenge_method") !== "S256" ||
    !challengeShape.test(challenge) ||
    !client.redirectUris.includes(redirectUri) ||
    (params.has("resource") && params.get("resource") !== mcpResource) ||
    state.length > 512
  ) {
    throw new OAuthError("invalid_request");
  }
  return { name: client.name, clientId, redirectUri, challenge, state };
}

export async function authorizeMcpClient(request: Request, env: AppEnv) {
  const details = await readMcpAuthorization(request, env);
  const session = await readMcpStaffSession(request, env);
  const code = encodeMcpBytes(crypto.getRandomValues(new Uint8Array(32)));
  const key = await grantKey(code);
  const expires = Date.now() + 3 * 60 * 1000;
  const ticket = await sealMcpTicket(env, "code", {
    ...session,
    clientId: details.clientId,
    redirectUri: details.redirectUri,
    challenge: details.challenge,
    id: key,
    expires,
  });
  await run(
    env.DB,
    "INSERT INTO idempotency_keys (key_hash,request_hash,response_json,status_code,expires_at,created_at) VALUES (?,? ,?,202,?,?)",
    key,
    key,
    ticket,
    new Date(expires).toISOString(),
    new Date().toISOString(),
  );
  const redirect = new URL(details.redirectUri);
  redirect.searchParams.set("code", code);
  if (details.state) redirect.searchParams.set("state", details.state);
  return new Response(null, { status: 303, headers: { ...headers, Location: redirect.href } });
}

function grantKey(code: string) {
  return sha256Hex("mcp-oauth-grant:" + code);
}

async function issuePair(
  env: AppEnv,
  session: McpStaffSession,
  clientId: string,
  grant: string,
  expires: number,
) {
  const [access, refresh] = await Promise.all([
    issueMcpAccessToken(env, session, grant),
    sealMcpTicket(env, "refresh", {
      cookie: session.cookie,
      actor: session.actor,
      clientId,
      grant,
      expires,
    }),
  ]);
  return { access_token: access, refresh_token: refresh, token_type: "Bearer", expires_in: 1800 };
}

async function exchangeCode(env: AppEnv, clientId: string, params: URLSearchParams) {
  const code = params.get("code") ?? "";
  const verifier = params.get("code_verifier") ?? "";
  if (!challengeShape.test(code) || !verifierShape.test(verifier))
    throw new OAuthError("invalid_grant");
  const key = await grantKey(code);
  const now = new Date().toISOString();
  const row = await first<{ response_json: string }>(
    env.DB,
    "SELECT response_json FROM idempotency_keys WHERE key_hash=? AND status_code=202 AND expires_at>?",
    key,
    now,
  );
  if (!row) throw new OAuthError("invalid_grant");
  const saved = await openMcpTicket(env, "code", row.response_json);
  const challenge = encodeMcpBytes(
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))),
  );
  if (
    saved.id !== key ||
    saved.clientId !== clientId ||
    saved.redirectUri !== params.get("redirect_uri") ||
    saved.challenge !== challenge
  )
    throw new OAuthError("invalid_grant");

  await verifyMcpStaffSession(env, saved);
  const expires = Date.now() + grantLifetime;
  const pair = await issuePair(env, saved, clientId, key, expires);
  const updated = await first(
    env.DB,
    "UPDATE idempotency_keys SET status_code=200,request_hash=?,response_json='{}',expires_at=? WHERE key_hash=? AND status_code=202 AND expires_at>? RETURNING key_hash",
    await sha256Hex(pair.refresh_token),
    new Date(expires).toISOString(),
    key,
    new Date().toISOString(),
  );
  if (!updated) throw new OAuthError("invalid_grant");
  return pair;
}

async function refreshGrant(env: AppEnv, clientId: string, params: URLSearchParams) {
  const token = params.get("refresh_token") ?? "";
  const saved = await openMcpTicket(env, "refresh", token);
  if (saved.clientId !== clientId) throw new OAuthError("invalid_grant");
  await verifyMcpStaffSession(env, saved);
  const pair = await issuePair(env, saved, clientId, saved.grant, saved.expires);
  const previousHash = await sha256Hex(token);
  const now = new Date().toISOString();
  const updated = await first(
    env.DB,
    "UPDATE idempotency_keys SET request_hash=? WHERE key_hash=? AND status_code=200 AND request_hash=? AND expires_at>? RETURNING key_hash",
    await sha256Hex(pair.refresh_token),
    saved.grant,
    previousHash,
    now,
  );
  if (!updated) {
    // A previously issued token was replayed. Revoke the entire connection.
    await run(
      env.DB,
      "UPDATE idempotency_keys SET status_code=409 WHERE key_hash=? AND status_code=200",
      saved.grant,
    );
    throw new OAuthError("invalid_grant");
  }
  return pair;
}

export async function handleMcpOAuthApi(request: Request, env: AppEnv): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  if (path !== oauthPath + "register" && path !== oauthPath + "token") return null;
  try {
    assertMcpHost(request, env);
    if (request.method !== "POST")
      return new Response(null, { status: 405, headers: { ...headers, Allow: "POST" } });
    const source = request.headers.get("Origin");
    if (source && source !== mcpOrigin) throw new OAuthError("invalid_request");
    if (path.endsWith("/register")) return await registerClient(request, env);
    if (
      request.headers.get("content-type")?.split(";")[0] !== "application/x-www-form-urlencoded"
    ) {
      throw new OAuthError("invalid_request");
    }
    const params = new URLSearchParams(await readBody(request));
    const clientId = params.get("client_id") ?? "";
    try {
      await openMcpTicket(env, "client", clientId);
    } catch {
      throw new OAuthError("invalid_client");
    }
    if (params.has("resource") && params.get("resource") !== mcpResource)
      throw new OAuthError("invalid_target");
    const grant = params.get("grant_type");
    const pair =
      grant === "authorization_code"
        ? await exchangeCode(env, clientId, params)
        : grant === "refresh_token"
          ? await refreshGrant(env, clientId, params)
          : null;
    if (!pair) throw new OAuthError("unsupported_grant_type");
    return Response.json(pair, { headers });
  } catch (error) {
    const status =
      error instanceof AppError && error.status === 404
        ? 404
        : error instanceof OAuthError && error.code === "invalid_client"
          ? 401
          : 400;
    return Response.json(
      {
        error:
          error instanceof OAuthError
            ? error.code
            : error instanceof AppError
              ? "invalid_grant"
              : "invalid_request",
      },
      { status, headers },
    );
  }
}
