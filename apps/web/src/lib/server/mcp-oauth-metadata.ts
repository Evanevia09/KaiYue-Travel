import { STAGING_ADMIN_HOST } from "./admin-gate.ts";

export const mcpOrigin = `https://${STAGING_ADMIN_HOST}`;
export const mcpResource = `${mcpOrigin}/api/v1/admin/mcp`;
export const mcpAuthorizePath = "/admin/agent-authorize";
const oauthApi = "/api/v1/admin/mcp/oauth";
const resourceMetadataPath = "/.well-known/oauth-protected-resource/api/v1/admin/mcp";
const serverMetadataPath = "/.well-known/oauth-authorization-server";
export const mcpChallenge = `Bearer realm="Kai Yue Travel Staging", resource_metadata="${mcpOrigin}${resourceMetadataPath}"`;

export function mcpOauthMetadata(request: Request, publicSiteUrl: string | undefined) {
  const url = new URL(request.url);
  if (url.pathname !== resourceMetadataPath && url.pathname !== serverMetadataPath) return null;
  if (url.origin !== mcpOrigin || publicSiteUrl !== "https://staging.kaiyuemacau.com") return null;
  if (request.method !== "GET")
    return new Response(null, { status: 405, headers: { Allow: "GET" } });
  const data =
    url.pathname === resourceMetadataPath
      ? {
          resource: mcpResource,
          authorization_servers: [mcpOrigin],
          bearer_methods_supported: ["header"],
        }
      : {
          issuer: mcpOrigin,
          authorization_endpoint: mcpOrigin + mcpAuthorizePath,
          token_endpoint: mcpOrigin + oauthApi + "/token",
          registration_endpoint: mcpOrigin + oauthApi + "/register",
          response_types_supported: ["code"],
          grant_types_supported: ["authorization_code", "refresh_token"],
          token_endpoint_auth_methods_supported: ["none"],
          code_challenge_methods_supported: ["S256"],
        };
  return Response.json(data, { headers: { "Cache-Control": "no-store" } });
}

export function mcpLoginReturn(value: string | null) {
  if (!value || value.length > 6000 || !value.startsWith(mcpAuthorizePath + "?")) return undefined;
  const url = new URL(value, mcpOrigin);
  return url.pathname === mcpAuthorizePath && !url.hash ? url.pathname + url.search : undefined;
}
