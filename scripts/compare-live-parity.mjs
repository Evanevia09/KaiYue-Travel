/**
 * Semantic parity of this branch's dist vs live public assets and recovered
 * Nov 5 Worker entry.js module boundaries. Does not deploy.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const distClient = join(root, "apps/web/dist/client");
const distAstro = join(distClient, "_astro");
const distServer = join(root, "apps/web/dist/server");
const outDir = join(root, "artifacts", "parity-nov5");
const cacheDir = join(outDir, "live-cache");
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const HOSTS = [
  { id: "prod", origin: "https://kaiyuemacau.com" },
  { id: "www", origin: "https://www.kaiyuemacau.com" },
  { id: "staging", origin: "https://kaiyue-travel-staging.kai-yue.workers.dev" },
];

const PATHS = [
  "/",
  "/about",
  "/contact",
  "/faq",
  "/privacy",
  "/terms",
  "/corporate",
  "/business/hotels-resorts",
  "/business/travel-agency",
  "/special-offers",
  "/services/airport-transfer",
  "/services/cross-border-rides",
  "/services/local-transfers",
  "/services/local-chauffeur",
  "/services/weddings",
  "/services/city-tours",
  "/services/city-tours/half-day",
  "/services/city-tours/full-day",
  "/services/city-tours/special-offer",
  "/booking/confirmation",
  "/pt",
  "/pt/about",
  "/pt/contact",
  "/pt/corporate",
  "/pt/business/hotels-resorts",
  "/pt/special-offers",
  "/pt/services/airport-transfer",
  "/pt/services/city-tours/half-day",
  "/zh-Hant",
  "/zh-Hant/about",
  "/zh-Hant/contact",
  "/zh-Hant/corporate",
  "/zh-Hant/special-offers",
  "/zh-Hant/services/airport-transfer",
  "/zh-Hant/services/city-tours/half-day",
  "/login",
];

const recovered = {
  production: "/home/ubuntu/.cursor/projects/agent-repos-KaiYue-Travel/uploads/entry_88ea.js",
  staging: "/home/ubuntu/.cursor/projects/agent-repos-KaiYue-Travel/uploads/entry_987b.js",
};

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

function stem(name) {
  return name.replace(/\.[A-Za-z0-9_-]{6,}\.(js|mjs|css)$/, "").replace(/\.(js|mjs|css)$/, "");
}

function extractAstroRefs(html) {
  const refs = new Set();
  for (const match of html.matchAll(/\/_astro\/[A-Za-z0-9_.@-]+\.(?:js|css|mjs)/g)) {
    refs.add(match[0]);
  }
  return [...refs].sort();
}

function extractStrings(source) {
  const found = new Set();
  const re = /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/g;
  for (const match of source.matchAll(re)) {
    const value = match[0].slice(1, -1);
    if (value.length >= 8 && value.length <= 160 && !/^[#./_-]+$/.test(value)) {
      found.add(value);
    }
  }
  return found;
}

function jaccard(a, b) {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const value of a) if (b.has(value)) inter += 1;
  return inter / (a.size + b.size - inter);
}

function uniqueSample(a, b, n = 8) {
  const out = [];
  for (const value of a) {
    if (!b.has(value)) out.push(value);
    if (out.length >= n) break;
  }
  return out;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": UA,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
  });
  const body = Buffer.from(await response.arrayBuffer());
  return {
    status: response.status,
    contentType: response.headers.get("content-type") ?? "",
    body,
    text: body.toString("utf8"),
  };
}

function loadDistAstro() {
  const files = {};
  for (const name of readdirSync(distAstro)) {
    const buf = readFileSync(join(distAstro, name));
    files[name] = { name, stem: stem(name), sha256: sha256(buf), bytes: buf.length, buf };
  }
  return files;
}

function loadServerStems() {
  const chunksDir = join(distServer, "chunks");
  const names = existsSync(chunksDir) ? readdirSync(chunksDir) : [];
  return names.map((name) => serverLogical(name)).sort();
}

function serverLogical(name) {
  const base = name.replace(/\.mjs$/, "");
  const match = base.match(/^(.*)_([A-Za-z0-9-]{8})$/);
  return match ? match[1] : base;
}

function recoveredModules(path) {
  const buf = readFileSync(path);
  const text = buf.toString("utf8");
  const modules = [];
  for (const match of text.matchAll(/^\/\/ apps\/web\/dist\/server\/(?:chunks\/)?(\S+)/gm)) {
    modules.push({ comment: match[1], stem: serverLogical(match[1]) });
  }
  const unique = [...new Set(modules.map((row) => row.stem))].sort();
  const hosts = text.match(/PRODUCTION_HOSTS = (\[[^\]]+\])/);
  const access = text.includes('ACCESS_ADMIN_HOST = "admin.kaiyuemacau.com"');
  const localSurface = text.includes("isLocalAdminSurface");
  const signup = text.includes("emailSignupAllowed");
  const takeover = text.includes("accessTakesOver");
  return {
    sha256: sha256(buf),
    bytes: buf.length,
    moduleStems: unique,
    productionHosts: hosts?.[1] ?? "unparsed",
    accessAdminHost: access,
    hasIsLocalAdminSurface: localSurface,
    hasEmailSignupAllowed: signup,
    hasAccessTakesOver: takeover,
  };
}

function classifyClient(name) {
  const publicIslands = [
    "BaseLayout",
    "BookingEmbedded",
    "BookingSheet",
    "BookingForm",
    "BookingLauncher",
    "ContactForm",
    "client",
    "react",
    "react-dom",
    "jsx-runtime",
    "rolldown-runtime",
    "i18n",
    "store",
    "src",
  ];
  const adminIslands = [
    "api",
    "auth-client",
    "status",
    "LoginForm",
    "SetupForm",
    "AdminLocaleSwitch",
    "SignOutButton",
    "DashboardPanel",
    "BookingsPanel",
    "BookingDetailPanel",
    "CalendarPanel",
    "ContactsPanel",
    "ContactDetailPanel",
    "InventoryPanel",
    "OffersPanel",
    "admin-i18n",
  ];
  const s = stem(name);
  if (adminIslands.some((prefix) => s === prefix || s.startsWith(prefix))) return "admin-only";
  if (
    publicIslands.some(
      (prefix) => s === prefix || s.startsWith(`${prefix}.`) || s.startsWith(prefix),
    )
  )
    return "public";
  return "other";
}

mkdirSync(cacheDir, { recursive: true });

const distFiles = loadDistAstro();
const distBySha = new Map(Object.values(distFiles).map((file) => [file.sha256, file]));
const distByStem = new Map();
for (const file of Object.values(distFiles)) distByStem.set(file.stem, file);

const pages = [];
const liveAssets = new Map();
const hostAssetSets = { prod: new Set(), www: new Set(), staging: new Set() };

for (const host of HOSTS) {
  for (const path of PATHS) {
    const url = `${host.origin}${path === "/" ? "/" : path}`;
    const fetched = await fetchText(url);
    const refs = fetched.contentType.includes("html") ? extractAstroRefs(fetched.text) : [];
    pages.push({
      host: host.id,
      path,
      status: fetched.status,
      bytes: fetched.body.length,
      contentType: fetched.contentType.split(";")[0],
      refs,
    });
    if (fetched.status >= 400) continue;
    for (const ref of refs) {
      hostAssetSets[host.id].add(ref);
      if (liveAssets.has(ref)) continue;
      const assetUrl = `${host.origin}${ref}`;
      const asset = await fetchText(assetUrl);
      const hash = sha256(asset.body);
      liveAssets.set(ref, {
        path: ref,
        sha256: hash,
        bytes: asset.body.length,
        status: asset.status,
        fetchedFrom: host.id,
        text: asset.text,
      });
      writeFileSync(join(cacheDir, ref.replace("/_astro/", "")), asset.body);
    }
  }
}

function extractRelativeImports(text) {
  return [...text.matchAll(/from"\.\/([^"]+)"/g)].map((match) => match[1]);
}

const prodOrigin = HOSTS[0].origin;
const pending = [...liveAssets.keys()].map((ref) => ref.replace("/_astro/", ""));
while (pending.length) {
  const name = pending.pop();
  const live = liveAssets.get(`/_astro/${name}`);
  if (!live?.text) continue;
  for (const dep of extractRelativeImports(live.text)) {
    const ref = `/_astro/${dep}`;
    if (liveAssets.has(ref)) continue;
    const asset = await fetchText(`${prodOrigin}${ref}`);
    liveAssets.set(ref, {
      path: ref,
      sha256: sha256(asset.body),
      bytes: asset.body.length,
      status: asset.status,
      fetchedFrom: "prod-import-graph",
      text: asset.text,
    });
    if (asset.status < 400) {
      writeFileSync(join(cacheDir, dep), asset.body);
      pending.push(dep);
    }
  }
}

for (const file of Object.values(distFiles)) {
  if (classifyClient(file.name) === "admin-only") continue;
  const ref = `/_astro/${file.name}`;
  if (liveAssets.has(ref)) continue;
  const asset = await fetchText(`${prodOrigin}${ref}`);
  liveAssets.set(ref, {
    path: ref,
    sha256: sha256(asset.body),
    bytes: asset.body.length,
    status: asset.status,
    fetchedFrom: "prod-dist-probe",
    text: asset.status < 400 ? asset.text : "",
  });
}

const comparisons = [];
for (const [ref, live] of [...liveAssets.entries()].sort()) {
  const name = ref.replace("/_astro/", "");
  const liveStem = stem(name);
  const exactName = distFiles[name];
  const byHash = distBySha.get(live.sha256);
  const byStem = distByStem.get(liveStem);
  let verdict = "LIVE_ONLY";
  let note = "";
  let stringScore = null;
  let liveOnlyStrings = [];
  let buildOnlyStrings = [];
  if (live.status >= 400) {
    verdict = "ABSENT_ON_LIVE";
    note = `HTTP ${live.status}`;
  } else if (byHash) {
    verdict = byHash.name === name ? "BYTE_AND_NAME_MATCH" : "BYTE_MATCH_RENAMED";
    note = `dist ${byHash.name}`;
  } else if (byStem) {
    const liveStrings = extractStrings(live.text);
    const buildStrings = extractStrings(byStem.buf.toString("utf8"));
    stringScore = Number(jaccard(liveStrings, buildStrings).toFixed(4));
    liveOnlyStrings = uniqueSample(liveStrings, buildStrings);
    buildOnlyStrings = uniqueSample(buildStrings, liveStrings);
    verdict = stringScore >= 0.98 ? "SEMANTIC_NEAR" : "CONTENT_DIFF";
    note = `dist ${byStem.name} sha ${byStem.sha256.slice(0, 12)}…`;
  } else if (exactName) {
    verdict = "NAME_MATCH_CONTENT_DIFF";
    note = `dist sha ${exactName.sha256.slice(0, 12)}…`;
  }
  comparisons.push({
    live: name,
    stem: liveStem,
    class: classifyClient(name),
    liveSha256: live.sha256,
    liveBytes: live.bytes,
    verdict,
    note,
    stringScore,
    liveOnlyStrings,
    buildOnlyStrings,
  });
}

const liveShas = new Set([...liveAssets.values()].map((row) => row.sha256));
const buildOnlyPublic = Object.values(distFiles)
  .filter((file) => classifyClient(file.name) === "public" && !liveShas.has(file.sha256))
  .map((file) => file.name);
const buildAdminOnly = Object.values(distFiles)
  .filter((file) => classifyClient(file.name) === "admin-only")
  .map((file) => file.name);

function setEq(a, b) {
  if (a.size !== b.size) return false;
  for (const value of a) if (!b.has(value)) return false;
  return true;
}

const recoveredProd = recoveredModules(recovered.production);
const recoveredStg = recoveredModules(recovered.staging);
const buildStems = loadServerStems();
const recoveredStems = new Set(recoveredProd.moduleStems);
const buildStemSet = new Set(buildStems);
const serverOnlyBuild = buildStems.filter((name) => !recoveredStems.has(name));
const serverOnlyLive = recoveredProd.moduleStems.filter((name) => !buildStemSet.has(name));
const serverShared = buildStems.filter((name) => recoveredStems.has(name));

const htmlByPath = new Map();
for (const page of pages) {
  if (!htmlByPath.has(page.path)) htmlByPath.set(page.path, {});
  htmlByPath.get(page.path)[page.host] = page;
}

const routeDrift = [];
for (const [path, byHost] of htmlByPath) {
  const prod = new Set(byHost.prod?.refs ?? []);
  const www = new Set(byHost.www?.refs ?? []);
  const staging = new Set(byHost.staging?.refs ?? []);
  const same = setEq(prod, www) && setEq(prod, staging);
  routeDrift.push({
    path,
    statuses: {
      prod: byHost.prod?.status,
      www: byHost.www?.status,
      staging: byHost.staging?.status,
    },
    sameAssetSet: same,
    refs: [...prod],
  });
}

const summary = {
  builtAt: new Date().toISOString(),
  branchSha: process.env.GIT_SHA || "working-tree",
  hostsCompared: HOSTS.map((h) => h.origin),
  pagesFetched: pages.length,
  uniqueLiveAstro: liveAssets.size,
  distAstroCount: Object.keys(distFiles).length,
  homeIslandsSameAcrossHosts:
    setEq(hostAssetSets.prod, hostAssetSets.www) &&
    setEq(hostAssetSets.prod, hostAssetSets.staging),
  client: {
    byteMatches: comparisons.filter((row) => row.verdict.startsWith("BYTE")).length,
    diffs: comparisons.filter(
      (row) => row.verdict === "CONTENT_DIFF" || row.verdict === "NAME_MATCH_CONTENT_DIFF",
    ),
    liveOnly: comparisons.filter((row) => row.verdict === "LIVE_ONLY"),
    semanticNear: comparisons.filter((row) => row.verdict === "SEMANTIC_NEAR"),
    buildOnlyPublic,
    buildAdminOnly,
  },
  server: {
    recoveredProductionSha256: recoveredProd.sha256,
    recoveredStagingSha256: recoveredStg.sha256,
    recoveredHosts: recoveredProd.productionHosts,
    recoveredHasLocalSurface: recoveredProd.hasIsLocalAdminSurface,
    sharedModuleStems: serverShared.length,
    buildOnlyModuleStems: serverOnlyBuild,
    liveOnlyModuleStems: serverOnlyLive,
  },
  routeDrift: routeDrift.filter(
    (row) => !row.sameAssetSet || Object.values(row.statuses).some((s) => s >= 400),
  ),
  comparisons,
  routeInventory: routeDrift,
};

writeFileSync(join(outDir, "manifest.json"), JSON.stringify(summary, null, 2));
process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
