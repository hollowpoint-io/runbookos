import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "runbookos-setup-smoke-"));
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const smokeDate = "2026-05-16";

try {
  run(["runbook", "init", workspaceDir]);
  run(
    [
      "runbook",
      "workspace",
      "setup",
      workspaceDir,
      "--user",
      "Ada Lovelace",
      "--role",
      "Agency operator",
      "--agency",
      "Analytical Agency",
      "--timezone",
      "Europe/London",
      "--markets",
      "UK, EU",
      "--verticals",
      "Shopify, SEO, content",
      "--detail",
      "Concise decisions with links to evidence",
      "--communication",
      "Direct and action-oriented",
      "--approval",
      "Ask before external actions",
      "--custom-instructions",
      "Always surface assumptions before recommendations.",
    ],
    { RUNBOOKOS_DATE: smokeDate },
  );

  const menu = runCapture(["runbook", "workspace", "menu", workspaceDir]);
  assertTextIncludes(menu, "RunbookOS Setup Menu");
  assertTextIncludes(menu, "Workspace: Analytical Agency Workspace");
  assertTextIncludes(menu, "Profile: configured");
  assertTextIncludes(menu, "Suggested next: create the first client");
  assertTextIncludes(menu, "pnpm runbook integrations setup gmail");
  assertTextIncludes(menu, "pnpm runbook gmail auth");
  assertTextIncludes(menu, "pnpm runbook credentials checklist");
  assertTextIncludes(menu, "pnpm runbook skills list");
  assertTextIncludes(menu, "pnpm runbook skillsets list");
  assertTextIncludes(menu, "Open the workspace in Claude Code or Codex");
  assertTextIncludes(menu, "Run a safe readiness smoke");

  const setupAliasMenu = runCapture(["runbook", "setup", "menu", workspaceDir]);
  assertTextIncludes(setupAliasMenu, "RunbookOS Setup Menu");

  const credentials = runCapture(["runbook", "credentials", "checklist", workspaceDir]);
  assertTextIncludes(credentials, "RunbookOS Credential Checklist");
  assertTextIncludes(credentials, "Storage rule: keep secret values in local env");
  assertTextIncludes(credentials, "Shopify (shopify)");
  assertTextIncludes(credentials, "Gmail (gmail)");
  assertTextIncludes(credentials, "Google Search Console (gsc)");
  assertTextIncludes(credentials, "Write placeholder file: pnpm runbook credentials checklist <dir> --write-local-env");

  const credentialsWithEnv = runCapture(["runbook", "credentials", "checklist", workspaceDir, "--write-local-env"]);
  assertTextIncludes(credentialsWithEnv, "Local env placeholder updated");
  assertTextIncludes(credentialsWithEnv, "Secret values written by RunbookOS: no");
  assertFileIncludes(path.join(workspaceDir, ".runbookos", "local.env"), [
    "# RunbookOS local credentials",
    "SHOPIFY_ADMIN_TOKEN=",
    "GMAIL_CLIENT_ID=",
    "AHREFS_API_TOKEN=",
    "GOOGLE_REFRESH_TOKEN=",
  ]);
  assertFileIncludes(path.join(workspaceDir, ".gitignore"), [
    ".runbookos/local.*",
    ".claude/settings.local.json",
    ".codex/local.toml",
  ]);

  assertFileIncludes(path.join(workspaceDir, "USER.md"), [
    "- Name: Ada Lovelace",
    "- Role: Agency operator",
    "- Company: Analytical Agency",
    "- Primary markets: UK, EU",
    "- Active verticals: Shopify, SEO, content",
    "- Preferred level of detail: Concise decisions with links to evidence",
    "- Communication style: Direct and action-oriented",
    "- Approval thresholds: Ask before external actions",
  ]);
  assertFileIncludes(path.join(workspaceDir, "RUNBOOK.md"), [
    "## Workspace Setup",
    "Owner: Ada Lovelace",
    "Role: Agency operator",
    "Agency/company: Analytical Agency",
    "Timezone: Europe/London",
    "Active verticals: Shopify, SEO, content",
    "Approval default: Ask before external actions",
    "Custom instruction: Always surface assumptions before recommendations.",
  ]);
  assertFileIncludes(path.join(workspaceDir, "AGENCY.md"), [
    "## Workspace Setup",
    "Agency/company: Analytical Agency",
    "Primary markets: UK, EU",
    "Active verticals: Shopify, SEO, content",
    "Default approval boundary: Ask before external actions",
  ]);
  assertFileIncludes(path.join(workspaceDir, "SOUL.md"), [
    "## Custom Instructions",
    "Always surface assumptions before recommendations.",
  ]);
  assertFileIncludes(path.join(workspaceDir, "ACTIVE_CONTEXT.md"), [
    "## Workspace Setup",
    `Workspace setup updated ${smokeDate} for Analytical Agency.`,
    "Next setup action: create the first real client",
  ]);
  assertFileIncludes(path.join(workspaceDir, "AGENTS.md"), [
    "# Analytical Agency Workspace Agent Instructions",
  ]);

  const config = JSON.parse(fs.readFileSync(path.join(workspaceDir, "runbookos.config.json"), "utf-8"));
  if (config.name !== "Analytical Agency Workspace") {
    throw new Error(`Expected config name to be updated, got ${config.name}`);
  }

  run(["runbook", "verify", workspaceDir]);
  verifyWizard();
  console.log(`setup smoke passed: ${workspaceDir}`);
} finally {
  if (!process.env.RUNBOOKOS_KEEP_SMOKE) {
    fs.rmSync(workspaceDir, { recursive: true, force: true });
  }
}

function verifyWizard() {
  const wizardDir = fs.mkdtempSync(path.join(os.tmpdir(), "runbookos-wizard-smoke-"));
  try {
    run(["runbook", "init", wizardDir]);
    const wizardInput = [
      "Grace Hopper",
      "FDE",
      "Wizard Agency",
      "Europe/London",
      "UK",
      "Shopify, local SEO",
      "Brief but complete",
      "Plain and direct",
      "Ask before publishing",
      "Prioritize product listing and collection content.",
      "Keep implementation notes close to the client dashboard.",
      "wizard-client",
      "Wizard Client",
      "wizard.example",
      "Shopify",
      "yes",
      "",
    ].join("\n");
    const output = runCapture(["runbook", "setup", "wizard", wizardDir], wizardInput);
    assertTextIncludes(output, "RunbookOS Setup Wizard");
    assertTextIncludes(output, "Credentials are never requested or written here.");
    assertTextIncludes(output, "Client created: workspace/clients/wizard-client");
    assertTextIncludes(output, "Shopify integration enabled");
    assertTextIncludes(output, "Gmail integration enabled");
    assertTextIncludes(output, "Gmail browser auth is a separate private step");
    assertTextIncludes(output, "Suggested next: connect Gmail with browser auth");

    assertFileIncludes(path.join(wizardDir, "USER.md"), [
      "- Name: Grace Hopper",
      "- Role: FDE",
      "- Company: Wizard Agency",
      "- Active verticals: Shopify, local SEO",
    ]);
    assertFileIncludes(path.join(wizardDir, "SOUL.md"), [
      "## Custom Instructions",
      "Keep implementation notes close to the client dashboard.",
      "Skill adjustments: Prioritize product listing and collection content.",
    ]);
    assertFileIncludes(path.join(wizardDir, "workspace", "clients", "wizard-client", "README.md"), [
      "# Wizard Client",
      "Website: wizard.example",
      "Platform: Shopify",
    ]);

    const config = JSON.parse(fs.readFileSync(path.join(wizardDir, "runbookos.config.json"), "utf-8"));
    if (!config.mcpServers.shopify?.enabled) {
      throw new Error("Wizard should enable Shopify fixture mode when selected");
    }
    if (!config.mcpServers.gmail?.enabled) {
      throw new Error("Wizard should enable Gmail wiring when selected");
    }
    run(["runbook", "verify", wizardDir]);
  } finally {
    if (!process.env.RUNBOOKOS_KEEP_SMOKE) {
      fs.rmSync(wizardDir, { recursive: true, force: true });
    }
  }
}

function run(args, extraEnv = {}) {
  const result = spawnSync(pnpm, args, {
    cwd: repoRoot,
    env: { ...process.env, ...extraEnv },
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: pnpm ${args.join(" ")}`);
  }
}

function runCapture(args, input) {
  const result = spawnSync(pnpm, args, {
    cwd: repoRoot,
    env: process.env,
    encoding: "utf-8",
    input,
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: pnpm ${args.join(" ")}\n${result.stdout ?? ""}${result.stderr ?? ""}`);
  }

  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

function assertFileIncludes(file, expectedLines) {
  const content = fs.readFileSync(file, "utf-8");
  for (const expected of expectedLines) {
    assertTextIncludes(content, expected);
  }
}

function assertTextIncludes(content, expected) {
  if (!content.includes(expected)) {
    throw new Error(`Expected text to include: ${expected}`);
  }
}
