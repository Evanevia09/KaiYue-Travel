import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { CookieJar } from "tough-cookie";
import { StagingError, stagingResponseError } from "../../packages/agent-tools/error.mjs";

export const STAGING_ORIGIN = "https://admin-staging.kaiyuemacau.com";
export const STAFF_EMAIL_ENV = "KAIYUE_STAGING_STAFF_EMAIL";
export const STAFF_PASSWORD_ENV = "KAIYUE_STAGING_STAFF_PASSWORD";
export { StagingError };

const missingCredentialsMessage =
  "Use a saved vault login or collect the staging staff email and password in a secure in-chat form. Do not visit the admin sign-in page.";

function credentialsFromValues(email, password) {
  if (typeof email === "string" && email && typeof password === "string" && password) {
    return { email, password };
  }
  return null;
}

export function credentialsFromEnv(env = process.env) {
  return credentialsFromValues(env[STAFF_EMAIL_ENV], env[STAFF_PASSWORD_ENV]);
}

async function readKeychainCredentials() {
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
  return credentialsFromValues(email, password);
}

export async function readStaffCredentials({
  env = process.env,
  readKeychain = readKeychainCredentials,
} = {}) {
  const fromEnv = credentialsFromEnv(env);
  if (fromEnv) return fromEnv;
  try {
    const fromKeychain = await readKeychain();
    if (fromKeychain) return fromKeychain;
  } catch {
    // Keychain command output and parsing errors can contain credentials.
  }
  throw new StagingError(missingCredentialsMessage);
}

export function createStagingApi({
  fetchRequest = fetch,
  getCredentials = readStaffCredentials,
} = {}) {
  let session;
  let signingIn;

  async function request(path, { jar, method = "GET", body } = {}) {
    const url = new URL(path, STAGING_ORIGIN);
    if (url.origin !== STAGING_ORIGIN) throw new StagingError("Unexpected staging request origin.");
    const headers = new Headers({ Accept: "application/json" });
    if (method !== "GET") headers.set("Origin", STAGING_ORIGIN);
    if (body !== undefined) headers.set("Content-Type", "application/json");
    const cookie = await jar.getCookieString(url.href);
    if (cookie) headers.set("Cookie", cookie);

    const response = await fetchRequest(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    if (response.ok) {
      for (const value of response.headers.getSetCookie()) {
        await jar.setCookie(value, url.href, { ignoreError: true });
      }
    }
    return response;
  }

  async function openSession() {
    const jar = new CookieJar();
    const response = await request("/api/auth/sign-in/email", {
      jar,
      method: "POST",
      body: await getCredentials(),
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

  async function authenticatedRequest(path, method, body) {
    let jar = await getSession();
    let response = await request(path, { jar, method, body });
    if (response.status === 401) {
      await response.body?.cancel();
      if (session === jar) session = undefined;
      jar = await getSession();
      response = await request(path, { jar, method, body });
      if (response.status === 401 && session === jar) session = undefined;
    }
    if (!response.ok) {
      throw await stagingResponseError(response, STAGING_ORIGIN);
    }
    return response.json();
  }

  return {
    get(path) {
      return authenticatedRequest(path, "GET");
    },
    patch(path, body) {
      return authenticatedRequest(path, "PATCH", body);
    },
    post(path, body) {
      return authenticatedRequest(path, "POST", body);
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
