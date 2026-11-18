export class StagingError extends Error {}

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
  } else {
    await response.body?.cancel();
  }
  return new StagingError(`Staging returned HTTP ${response.status}.`);
}
