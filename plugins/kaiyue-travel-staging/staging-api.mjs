import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { CookieJar } from "tough-cookie";

export const STAGING_ORIGIN = "https://admin-staging.kaiyuemacau.com";

export class StagingError extends Error {}

async function readCredentials() {
  try {
    const { stdout } = await promisify(execFile)(
      "/usr/bin/security",
      [
        "find-generic-password",
        "-s",
        "Kai Yue Travel Staging Plugin",
        "-a",
        "kaiyue-staging-agent",
        "-w",
      ],
      { timeout: 10_000, maxBuffer: 8192 },
    );
    const { email, password } = JSON.parse(stdout);
    if (typeof email === "string" && email && typeof password === "string" && password) {
      return { email, password };
    }
  } catch {
    // Keychain command output and parsing errors can contain credentials.
  }
  throw new StagingError("Set up the dedicated staging staff account in macOS Keychain first.");
}

export function createStagingApi({ fetchRequest = fetch, getCredentials = readCredentials } = {}) {
  let session;
  let signingIn;

  async function request(path, { jar, method = "GET", credentials } = {}) {
    const url = new URL(path, STAGING_ORIGIN);
    if (url.origin !== STAGING_ORIGIN) throw new StagingError("Unexpected staging request origin.");
    const headers = new Headers({ Accept: "application/json" });
    if (method === "POST") headers.set("Origin", STAGING_ORIGIN);
    if (credentials) headers.set("Content-Type", "application/json");
    const cookie = await jar.getCookieString(url.href);
    if (cookie) headers.set("Cookie", cookie);

    const response = await fetchRequest(url, {
      method,
      headers,
      body: credentials ? JSON.stringify(credentials) : undefined,
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    if (response.ok) {
      for (const value of response.headers.getSetCookie()) {
        await jar.setCookie(value, url.href, { ignoreError: true });
      }
    } else {
      await response.body?.cancel();
    }
    return response;
  }

  async function openSession() {
    const jar = new CookieJar();
    const response = await request("/api/auth/sign-in/email", {
      jar,
      method: "POST",
      credentials: await getCredentials(),
    });
    await response.body?.cancel();
    const cookies = await jar.getCookies(STAGING_ORIGIN + "/api/v1/admin/bookings");
    if (!response.ok || !cookies.some(({ key }) => key === "__Secure-better-auth.session_token")) {
      throw new StagingError(`Staging staff sign-in failed (HTTP ${response.status}).`);
    }
    session = jar;
    return jar;
  }

  function getSession() {
    if (session) return Promise.resolve(session);
    signingIn ??= openSession().finally(() => {
      signingIn = undefined;
    });
    return signingIn;
  }

  return {
    async get(path) {
      let jar = await getSession();
      let response = await request(path, { jar });
      if (response.status === 401) {
        if (session === jar) session = undefined;
        jar = await getSession();
        response = await request(path, { jar });
        if (response.status === 401 && session === jar) session = undefined;
      }
      if (!response.ok) {
        throw new StagingError(`Staging returned HTTP ${response.status}.`);
      }
      return response.json();
    },
    async close() {
      if (signingIn) await signingIn.catch(() => {});
      const jar = session;
      session = undefined;
      if (jar) {
        const response = await request("/api/auth/sign-out", { jar, method: "POST" });
        await response.body?.cancel();
      }
    },
  };
}
