function isLoginRedirect(status, location) {
  if (status < 300 || status >= 400) {
    return false;
  }
  const target = (location ?? "").split("?")[0].replace(/\/$/, "");
  return target === "/login" || target.endsWith("/login");
}

export function marketingHtmlLeaked(body) {
  return /private chauffeur|greater bay area/i.test(body ?? "");
}

export function evaluateAdminRootSmoke({ status, body, location }) {
  if (isLoginRedirect(status, location) && !marketingHtmlLeaked(body)) {
    return null;
  }
  return `admin-staging / expected redirect to /login without marketing HTML, got ${status} ${location ?? ""}`;
}

export function evaluateOfficialStagingSmoke({ publicHome, publicLogin, adminLogin, adminRoot }) {
  if (publicHome.status !== 200) {
    return `staging marketing home expected 200, got ${publicHome.status}`;
  }
  if (publicLogin.status !== 403) {
    return `staging marketing /login expected 403, got ${publicLogin.status}`;
  }
  if (adminLogin.status !== 200 || !/Admin sign in/i.test(adminLogin.body ?? "")) {
    return `admin-staging /login expected 200 Admin sign in, got ${adminLogin.status}`;
  }
  return evaluateAdminRootSmoke(adminRoot);
}
