const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export function resolveLoginRedirect(location, expectedOrigin) {
  if (!location || !expectedOrigin) {
    return null;
  }
  try {
    const expected = new URL(expectedOrigin);
    const target = new URL(location, expected);
    if (target.origin !== expected.origin) {
      return null;
    }
    if (target.pathname !== "/login") {
      return null;
    }
    return target;
  } catch {
    return null;
  }
}

export function isLoginRedirect(status, location, expectedOrigin) {
  if (!REDIRECT_STATUSES.has(status)) {
    return false;
  }
  return resolveLoginRedirect(location, expectedOrigin) !== null;
}

export function marketingHtmlLeaked(body) {
  return /private chauffeur|greater bay area/i.test(body ?? "");
}

export function evaluateAdminRootSmoke({ status, body, location }, expectedAdminOrigin) {
  if (isLoginRedirect(status, location, expectedAdminOrigin) && !marketingHtmlLeaked(body)) {
    return null;
  }
  return `admin-staging / expected redirect to ${expectedAdminOrigin}/login without marketing HTML, got ${status} ${location ?? ""}`;
}

export function evaluateOfficialStagingSmoke({
  publicHome,
  publicLogin,
  adminLogin,
  adminRoot,
  expectedAdminOrigin,
}) {
  if (!expectedAdminOrigin) {
    return "admin-staging smoke missing expectedAdminOrigin";
  }
  if (publicHome.status !== 200) {
    return `staging marketing home expected 200, got ${publicHome.status}`;
  }
  if (publicLogin.status !== 403) {
    return `staging marketing /login expected 403, got ${publicLogin.status}`;
  }
  if (adminLogin.status !== 200 || !/Admin sign in/i.test(adminLogin.body ?? "")) {
    return `admin-staging /login expected 200 Admin sign in, got ${adminLogin.status}`;
  }
  return evaluateAdminRootSmoke(adminRoot, expectedAdminOrigin);
}
