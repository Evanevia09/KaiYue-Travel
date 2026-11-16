import { fail, loadConstants } from "./official-staging-lib.mjs";

const constants = loadConstants();

async function get(url) {
  const response = await fetch(url, { redirect: "manual" });
  const body = await response.text();
  return { status: response.status, body, location: response.headers.get("location") ?? "" };
}

const publicHome = await get(constants.public_site_url);
if (publicHome.status !== 200) {
  fail(`staging marketing home expected 200, got ${publicHome.status}`);
}

const publicLogin = await get(`${constants.public_site_url.replace(/\/$/, "")}/login`);
if (publicLogin.status !== 403) {
  fail(`staging marketing /login expected 403, got ${publicLogin.status}`);
}

const adminLogin = await get(constants.admin_login_url);
if (adminLogin.status !== 200 || !/Admin sign in/i.test(adminLogin.body)) {
  fail(`admin-staging /login expected 200 Admin sign in, got ${adminLogin.status}`);
}

console.log(
  "official-staging smoke passed (admin-staging / is not asserted; cached marketing remains a known separate issue)",
);
