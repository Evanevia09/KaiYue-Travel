export class StagingError extends Error {}

export function isCloudflareBrowserIntegrityBlock(response, bodyText = "") {
  if (response.status !== 403) return false;
  const type = (response.headers.get("content-type") ?? "").toLowerCase();
  if (type.includes("application/json")) return false;
  return /error 1010|browser integrity check|banned your access based on your browser's signature/i.test(
    bodyText,
  );
}

export async function stagingResponseError(response, origin) {
  if (response.status === 409) {
    const result = await response.json().catch(() => null);
    const url = result?.error?.fields?.reviewUrl;
    const prefix = `${origin}/admin/agent-review?ticket=`;
    if (
      typeof url === "string" &&
      url.startsWith(prefix) &&
      /^[\w-]+\.[\w-]+$/.test(url.slice(prefix.length))
    ) {
      return new StagingError(
        `Ask the staff user to approve this action at ${url} and then retry the same tool call.`,
      );
    }
    return new StagingError(`Staging returned HTTP ${response.status}.`);
  }

  const text = await response.text().catch(() => "");
  if (isCloudflareBrowserIntegrityBlock(response, text)) {
    return new StagingError(
      "Cloudflare edge blocked this client (error 1010 / Browser Integrity Check). Stop. Contact the owner. Do not retry the password. Do not impersonate a browser User-Agent.",
    );
  }
  if (response.status === 429) {
    return new StagingError(
      "Too many sign-in attempts. Wait five minutes (Retry-After) before trying again. Do not retry during the lock.",
    );
  }
  if (response.status === 401) {
    return new StagingError(
      "Staff email or password was not accepted. Stop. Three failures lock the account and IP for five minutes.",
    );
  }
  return new StagingError(`Staging returned HTTP ${response.status}.`);
}
