import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  deploymentsStatusArgv,
  evaluateActivationReadback,
  versionsDeployArgv,
} from "../../scripts/production-activate.mjs";
import {
  evaluateProductionCandidate,
  versionsViewArgv,
} from "../../scripts/production-candidate-check.mjs";
import { wranglerBin, wranglerCredentialError } from "../../scripts/production-lib.mjs";
import {
  evaluatePendingMigrationSql,
  migrationsApplyArgv,
  migrationsListArgv,
  parseUnappliedMigrations,
} from "../../scripts/production-migrate.mjs";
import { evaluateProductionSmoke } from "../../scripts/production-smoke-lib.mjs";
import { versionsUploadArgv } from "../../scripts/production-upload.mjs";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const overlayPath = join(repoRoot, "deploy/production/wrangler.jsonc");
const constantsPath = join(repoRoot, "deploy/production/constants.json");
const workflowPath = join(repoRoot, ".github/workflows/production.yml");
const stagingWorkflowPath = join(repoRoot, ".github/workflows/official-staging.yml");
const ciWorkflowPath = join(repoRoot, ".github/workflows/ci.yml");
const migrationsDir = join(repoRoot, "migrations");

function parseJsonc(text: string) {
  return JSON.parse(text.replace(/^\s*\/\/.*$/gm, "").replace(/,(\s*[}\]])/g, "$1"));
}

type ProductionConstants = {
  account_id: string;
  worker_name: string;
  d1_name: string;
  d1_id: string;
  r2_bucket: string;
  public_site_url: string;
  admin_site_url: string;
  staging_d1: string;
  staging_worker: string;
  obsolete_d1: string;
  trial_d1: string;
  wrangler_version: string;
  release_branch: string;
  github_environment: string;
  github_environment_required_reviewers: boolean;
  compatibility_date: string;
  html_run_worker_first: boolean;
  github_secret_names: string[];
  forbidden_github_secret_names: string[];
  forbidden_var_names: string[];
  approved_production_mail_senders: string[];
  approved_production_staff_to: string;
  send_email: { name: string; allowed_sender_addresses: string[] };
  vars: Record<string, string>;
};

type RecordedVersion = {
  id: string;
  resources: {
    script_runtime: {
      compatibility_date: string;
      compatibility_flags: string[];
      assets?: { raw_run_worker_first?: boolean | string[] };
    };
    bindings: Array<Record<string, unknown>>;
  };
};

const constants = JSON.parse(readFileSync(constantsPath, "utf8")) as ProductionConstants;
const overlay = parseJsonc(readFileSync(overlayPath, "utf8")) as {
  name: string;
  account_id: string;
  keep_vars: boolean;
  main: string;
  d1_databases: Array<{ database_id: string; database_name: string }>;
  r2_buckets: Array<{ bucket_name: string }>;
  send_email: Array<Record<string, unknown>>;
  vars: Record<string, string>;
  assets: { run_worker_first: boolean | string[] };
};
const workflow = readFileSync(workflowPath, "utf8");
const stagingWorkflow = readFileSync(stagingWorkflowPath, "utf8");
const ciWorkflow = readFileSync(ciWorkflowPath, "utf8");
const CANDIDATE_VERSION_ID = "72e580d0-aeb1-4766-935a-0cb9a27631a4";
const DUMMY_TOKEN = "DUMMY.CF.TOKEN.NOTREAL_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const CREDENTIALED_SCRIPTS = [
  "production-upload.mjs",
  "production-candidate-check.mjs",
  "production-activate.mjs",
  "production-migrate.mjs",
] as const;

function validCandidate(): RecordedVersion {
  return {
    id: CANDIDATE_VERSION_ID,
    resources: {
      script_runtime: {
        compatibility_date: constants.compatibility_date,
        compatibility_flags: ["nodejs_compat"],
        assets: { raw_run_worker_first: true },
      },
      bindings: [
        { type: "d1", name: "DB", id: constants.d1_id, database_name: constants.d1_name },
        { type: "r2_bucket", name: "OFFERS_BUCKET", bucket_name: constants.r2_bucket },
        { type: "assets", name: "ASSETS" },
        { type: "secret_text", name: "BETTER_AUTH_SECRET" },
        { type: "send_email", name: "EMAIL", ...constants.send_email },
        ...Object.entries(constants.vars).map(([name, text]) => ({
          type: "plain_text",
          name,
          text,
        })),
      ],
    },
  };
}

describe("production CI/CD source", () => {
  it("keeps the canonical overlay on production bindings, sender-only mail, and no staging lock", () => {
    expect(overlay.name).toBe("kaiyue-travel");
    expect(overlay.account_id).toBe("33ecc75158a1cdd23ba1a62eb70c5103");
    expect(overlay.keep_vars).toBe(false);
    expect(overlay.d1_databases[0]?.database_id).toBe("06cf879d-8fea-4088-8881-7d382e1b8c11");
    expect(overlay.d1_databases[0]?.database_name).toBe("kaiyue-travel-production");
    expect(overlay.r2_buckets[0]?.bucket_name).toBe("kaiyue-offers-production");
    expect(overlay.assets.run_worker_first).toBe(true);
    expect(overlay.vars.PUBLIC_SITE_URL).toBe("https://kaiyuemacau.com");
    expect(overlay.vars.NOTIFICATIONS_ENABLED).toBe("true");
    expect(overlay.vars.NOTIFY_STAFF_TO).toBe("daniel@kaiyuemacau.com");
    expect(overlay.vars.WHATSAPP_NUMBER).toBe("+85363128081");
    expect(overlay.vars).not.toHaveProperty("NOTIFY_ALLOWED_RECIPIENTS");
    expect(overlay.vars).not.toHaveProperty("MCP_STAGING_DIRECT_WRITES");
    expect(overlay.vars).not.toHaveProperty("STAGING_QUOTE_EMAIL_ENABLED");
    expect(overlay.vars).not.toHaveProperty("ADMIN_EMAILS");
    expect(overlay.send_email[0]).toEqual({
      name: "EMAIL",
      allowed_sender_addresses: ["bookings@notify.kaiyuemacau.com"],
    });
    expect(JSON.stringify(overlay)).not.toContain(constants.staging_d1);
    expect(JSON.stringify(overlay)).not.toContain("scalingsmb@gmail.com");
    expect(constants.vars).toEqual(overlay.vars);
  });

  it("uploads then activates on main only, never wrangler deploy or official-staging", () => {
    expect(workflow).toContain("branches: [main]");
    expect(workflow).toContain("github.ref == 'refs/heads/main'");
    expect(workflow).toContain("github.ref != 'refs/heads/main'");
    expect(workflow).toContain("environment: production");
    expect(workflow).toContain("PUBLIC_SITE_URL: https://kaiyuemacau.com");
    expect(workflow).toContain("production-migrate.mjs");
    expect(workflow).toContain("production-upload.mjs");
    expect(workflow).toContain("production-candidate-check.mjs");
    expect(workflow).toContain("production-activate.mjs");
    expect(workflow).not.toMatch(/\bwrangler deploy\b/);
    expect(workflow).not.toContain("branches: [official-staging]");
    expect(workflow).not.toContain("branches: [staging]");
    expect(workflow).not.toContain("example.invalid");
    expect(workflow).not.toContain("https://staging.kaiyuemacau.com");
    expect(workflow).not.toContain("if: false");
    expect(stagingWorkflow).not.toContain("branches: [main]");
    expect(ciWorkflow).not.toContain("wrangler");
  });

  it("limits CLOUDFLARE_API_TOKEN to migrate, upload, candidate-check, and activate steps", () => {
    expect(workflow).not.toMatch(/^ {4}env:\n(?: {6}.+\n)* {6}CLOUDFLARE_API_TOKEN:/m);
    const steps = workflow.split(/\n {6}- /);
    for (const step of steps) {
      const needsToken = /production-(migrate|upload|candidate-check|activate)\.mjs/.test(step);
      const mustNotToken =
        /pnpm (install|build|lint|typecheck|test)/.test(step) ||
        /production-(guard|smoke)\.mjs/.test(step);
      if (needsToken) {
        expect(step).toContain("CLOUDFLARE_API_TOKEN");
        expect(step).toContain("CLOUDFLARE_ACCOUNT_ID");
      }
      if (mustNotToken) {
        expect(step).not.toContain("CLOUDFLARE_API_TOKEN");
      }
    }
    for (const name of constants.github_secret_names) {
      expect(workflow).toContain(`secrets.${name}`);
    }
    for (const name of constants.forbidden_github_secret_names) {
      expect(workflow).not.toContain(`secrets.${name}`);
    }
  });

  it("builds argv against the production overlay, Worker, and remote D1", () => {
    const uploadArgv = versionsUploadArgv(constants);
    const viewArgv = versionsViewArgv(constants, CANDIDATE_VERSION_ID);
    const deployArgv = versionsDeployArgv(constants, CANDIDATE_VERSION_ID);
    const statusArgv = deploymentsStatusArgv(constants);
    const listArgv = migrationsListArgv(constants);
    const applyArgv = migrationsApplyArgv(constants);
    expect(uploadArgv.slice(0, 3)).toEqual(["versions", "upload", "--strict"]);
    expect(uploadArgv).toContain(overlayPath);
    expect(uploadArgv).toContain("kaiyue-travel");
    expect(viewArgv.slice(0, 3)).toEqual(["versions", "view", CANDIDATE_VERSION_ID]);
    expect(viewArgv).toContain(overlayPath);
    expect(deployArgv.slice(0, 3)).toEqual(["versions", "deploy", `${CANDIDATE_VERSION_ID}@100%`]);
    expect(statusArgv.slice(0, 2)).toEqual(["deployments", "status"]);
    expect(listArgv).toEqual([
      "d1",
      "migrations",
      "list",
      "kaiyue-travel-production",
      "--config",
      overlayPath,
      "--remote",
    ]);
    expect(applyArgv).toEqual([
      "d1",
      "migrations",
      "apply",
      "kaiyue-travel-production",
      "--config",
      overlayPath,
      "--remote",
    ]);
    expect(listArgv).not.toContain("--local");
    expect(applyArgv).not.toContain("--preview");
  });

  it("passes production-guard and official-staging-guard without Cloudflare credentials", () => {
    const productionGuard = spawnSync(
      process.execPath,
      [join(repoRoot, "scripts/production-guard.mjs")],
      { encoding: "utf8", cwd: repoRoot },
    );
    expect(productionGuard.status, productionGuard.stderr).toBe(0);
    expect(productionGuard.stdout).toMatch(/production guard passed/);
    const stagingGuard = spawnSync(
      process.execPath,
      [join(repoRoot, "scripts/official-staging-guard.mjs")],
      { encoding: "utf8", cwd: repoRoot },
    );
    expect(stagingGuard.status, stagingGuard.stderr).toBe(0);
  });
});

describe("production additive D1 migrations", () => {
  it("accepts 0011 and refuses destructive or staging-copy SQL", () => {
    const sql = readFileSync(join(migrationsDir, "0011_chauffeur_booking_serial.sql"), "utf8");
    expect(
      evaluatePendingMigrationSql(sql, "0011_chauffeur_booking_serial.sql", constants),
    ).toEqual([]);
    expect(
      evaluatePendingMigrationSql(
        "DROP TABLE chauffeur_booking_serial;",
        "0012_drop.sql",
        constants,
      ).join("\n"),
    ).toMatch(/DROP TABLE/);
    expect(
      evaluatePendingMigrationSql(
        "UPDATE chauffeur_booking_serial SET last_issued = 0;",
        "0012_reset.sql",
        constants,
      ).join("\n"),
    ).toMatch(/UPDATE/);
    expect(
      evaluatePendingMigrationSql("DELETE FROM bookings;", "0012_delete.sql", constants).join("\n"),
    ).toMatch(/DELETE/);
    expect(
      evaluatePendingMigrationSql(
        `INSERT INTO bookings SELECT * FROM staging_bookings; -- ${constants.staging_d1}`,
        "0012_copy.sql",
        constants,
      ).join("\n"),
    ).toMatch(/staging|INSERT \.\.\. SELECT/i);
  });

  it("parses wrangler unapplied migration list output", () => {
    expect(parseUnappliedMigrations("✅ No migrations to apply!")).toEqual([]);
    expect(
      parseUnappliedMigrations(
        "Migrations to be applied:\n┌──────────────────────────────────┐\n│ Name                             │\n├──────────────────────────────────┤\n│ 0011_chauffeur_booking_serial.sql │\n└──────────────────────────────────┘",
      ),
    ).toEqual(["0011_chauffeur_booking_serial.sql"]);
  });
});

describe("production uploaded-version candidate gate", () => {
  it("accepts the production bindings and sender-only EMAIL", () => {
    expect(evaluateProductionCandidate(validCandidate(), constants, CANDIDATE_VERSION_ID)).toEqual(
      [],
    );
  });

  it("rejects staging D1, a destination lock, and MCP activation", () => {
    const stagingDb = validCandidate();
    const db = stagingDb.resources.bindings.find((row) => row.name === "DB");
    if (!db) {
      throw new Error("fixture missing DB");
    }
    db.id = constants.staging_d1;
    expect(
      evaluateProductionCandidate(stagingDb, constants, CANDIDATE_VERSION_ID).join("\n"),
    ).toMatch(/043cd0ff|forbidden D1|d1 id/);

    const locked = validCandidate();
    const mail = locked.resources.bindings.find((row) => row.type === "send_email");
    if (!mail) {
      throw new Error("fixture missing EMAIL");
    }
    mail.allowed_destination_addresses = ["scalingsmb@gmail.com"];
    expect(evaluateProductionCandidate(locked, constants, CANDIDATE_VERSION_ID).join("\n")).toMatch(
      /destination lock/,
    );

    const mcp = validCandidate();
    mcp.resources.bindings.push({
      type: "plain_text",
      name: "MCP_STAGING_DIRECT_WRITES",
      text: "true",
    });
    expect(evaluateProductionCandidate(mcp, constants, CANDIDATE_VERSION_ID).join("\n")).toMatch(
      /MCP_STAGING_DIRECT_WRITES/,
    );
  });
});

describe("production activation readback", () => {
  it("records a single 100% version and rejects split traffic", () => {
    expect(
      evaluateActivationReadback(
        {
          id: "28f8b40b-0ffa-45aa-ba82-601f9e429e0f",
          versions: [{ version_id: CANDIDATE_VERSION_ID, percentage: 100 }],
        },
        CANDIDATE_VERSION_ID,
      ),
    ).toEqual([]);
    expect(
      evaluateActivationReadback(
        {
          id: "28f8b40b-0ffa-45aa-ba82-601f9e429e0f",
          versions: [
            { version_id: CANDIDATE_VERSION_ID, percentage: 50 },
            { version_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", percentage: 50 },
          ],
        },
        CANDIDATE_VERSION_ID,
      ).join("\n"),
    ).toMatch(/100%/);
  });
});

describe("production fail-closed Cloudflare credential format gate", () => {
  it("refuses malformed env in production token-bearing scripts without starting Wrangler", () => {
    const env = { ...process.env };
    delete env.CLOUDFLARE_API_TOKEN;
    delete env.CLOUDFLARE_ACCOUNT_ID;
    env.CLOUDFLARE_API_TOKEN = `${DUMMY_TOKEN.slice(0, 20)}\n    ${DUMMY_TOKEN.slice(20)}`;
    env.CLOUDFLARE_ACCOUNT_ID = constants.account_id;
    env.WORKER_VERSION_ID = CANDIDATE_VERSION_ID;
    env.CLOUDFLARE_API_BASE_URL = "http://127.0.0.1:9";
    for (const script of CREDENTIALED_SCRIPTS) {
      const result = spawnSync(process.execPath, [join(repoRoot, "scripts", script)], {
        encoding: "utf8",
        cwd: repoRoot,
        env,
        timeout: 15000,
      });
      const output = `${result.stdout}\n${result.stderr}`;
      expect(result.status, output).toBe(1);
      expect(output).toMatch(/CLOUDFLARE_API_TOKEN is not a usable HTTP credential/);
      expect(output).toMatch(/refusing to call Wrangler/);
      expect(output).not.toContain(DUMMY_TOKEN);
      expect(output).not.toMatch(/wrangler 4\.132\.0/);
    }
    expect(
      wranglerCredentialError({ CLOUDFLARE_API_TOKEN: DUMMY_TOKEN }, constants.account_id),
    ).toMatch(/CLOUDFLARE_ACCOUNT_ID is missing/);
    expect(existsSync(wranglerBin())).toBe(true);
  });
});

describe("production HTTP smoke contract", () => {
  const expectedAdminOrigin = "https://admin.kaiyuemacau.com";
  const passing = {
    publicHome: { status: 200, body: "marketing", location: "" },
    publicLogin: { status: 403, body: "FORBIDDEN", location: "" },
    adminLogin: { status: 200, body: "Admin sign in", location: "" },
    adminRoot: { status: 302, body: "", location: "/login" },
    expectedAdminOrigin,
  };

  it("passes when marketing is 200, public /login is 403, and admin / redirects to /login", () => {
    expect(evaluateProductionSmoke(passing)).toBeNull();
  });

  it("fails when admin / is cached marketing HTML", () => {
    expect(
      evaluateProductionSmoke({
        ...passing,
        adminRoot: {
          status: 200,
          body: "Private chauffeur across the Greater Bay Area",
          location: "",
        },
      }),
    ).toMatch(/marketing HTML/);
  });
});
