import { fail, loadConstants } from "./production-lib.mjs";
import { evaluateProductionSmoke } from "./production-smoke-lib.mjs";

const constants = loadConstants();

async function get(url) {
  const response = await fetch(url, { redirect: "manual" });
  const body = await response.text();
  return { status: response.status, body, location: response.headers.get("location") ?? "" };
}

const publicSite = constants.public_site_url.replace(/\/$/, "");
const adminSite = (
  constants.admin_site_url ?? new URL(".", constants.admin_login_url).origin
).replace(/\/$/, "");

const result = evaluateProductionSmoke({
  publicHome: await get(publicSite),
  publicLogin: await get(`${publicSite}/login`),
  adminLogin: await get(constants.admin_login_url),
  adminRoot: await get(`${adminSite}/`),
  expectedAdminOrigin: adminSite,
});

if (result) {
  fail(result);
}

console.log("production smoke passed (admin.kaiyuemacau.com / redirects to /login)");
