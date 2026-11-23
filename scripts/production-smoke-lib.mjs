import { isLoginRedirect, marketingHtmlLeaked } from "./official-staging-smoke-lib.mjs";

export function evaluateProductionSmoke({
  publicHome,
  publicLogin,
  adminLogin,
  adminRoot,
  expectedAdminOrigin,
}) {
  if (!expectedAdminOrigin) {
    return "production smoke missing expectedAdminOrigin";
  }
  if (publicHome.status !== 200) {
    return `production marketing home expected 200, got ${publicHome.status}`;
  }
  if (publicLogin.status !== 403) {
    return `production marketing /login expected 403, got ${publicLogin.status}`;
  }
  if (adminLogin.status !== 200 || !/Admin sign in/i.test(adminLogin.body ?? "")) {
    return `admin.kaiyuemacau.com /login expected 200 Admin sign in, got ${adminLogin.status}`;
  }
  if (
    isLoginRedirect(adminRoot.status, adminRoot.location, expectedAdminOrigin) &&
    !marketingHtmlLeaked(adminRoot.body)
  ) {
    return null;
  }
  return `admin.kaiyuemacau.com / expected redirect to ${expectedAdminOrigin}/login without marketing HTML, got ${adminRoot.status} ${adminRoot.location ?? ""}`;
}
