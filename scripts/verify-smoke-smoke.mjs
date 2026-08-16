import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "runbookos-smoke-smoke-"));
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const smokeDate = "2026-05-16";

try {
  run(["runbook", "init", workspaceDir]);

  const missingClient = runExpectFailure(["runbook", "smoke", workspaceDir], "no client found");
  assertTextIncludes(missingClient, "RunbookOS Smoke Summary");
  assertTextIncludes(missingClient, "Result: failed");

  run(
    [
      "runbook",
      "workspace",
      "setup",
      workspaceDir,
      "--user",
      "Smoke User",
      "--role",
      "Agency operator",
      "--agency",
      "Smoke Agency",
      "--timezone",
      "Europe/London",
    ],
    { RUNBOOKOS_DATE: smokeDate },
  );
  run(
    [
      "runbook",
      "client",
      "create",
      "smoke-client",
      workspaceDir,
      "--name",
      "Smoke Client",
      "--website",
      "smoke.example",
      "--platform",
      "Shopify",
    ],
    { RUNBOOKOS_DATE: smokeDate },
  );
  run(["runbook", "integrations", "setup", "shopify", workspaceDir, "--mode", "fixture"]);

  const output = runCapture(["runbook", "smoke", workspaceDir], { RUNBOOKOS_DATE: smokeDate });
  assertTextIncludes(output, "RunbookOS Smoke Summary");
  assertTextIncludes(output, "PASS\tclient\t1 client folder(s) available");
  assertTextIncludes(output, "PASS\tcore-mcp\tworkspace and memory enabled");
  assertTextIncludes(output, "PASS\tstarter-integration\tshopify enabled");
  assertTextIncludes(output, "PASS\tagent-skills");
  assertTextIncludes(output, "External actions executed: no");
  assertTextIncludes(output, "Credentials required: no");
  assertTextIncludes(output, "Agent runtime invoked: no");
  assertTextIncludes(output, "Result: ready");

  console.log(`smoke command smoke passed: ${workspaceDir}`);
} finally {
  if (!process.env.RUNBOOKOS_KEEP_SMOKE) {
    fs.rmSync(workspaceDir, { recursive: true, force: true });
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

function runCapture(args, extraEnv = {}) {
  const result = spawnSync(pnpm, args, {
    cwd: repoRoot,
    env: { ...process.env, ...extraEnv },
    encoding: "utf-8",
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: pnpm ${args.join(" ")}\n${result.stdout ?? ""}${result.stderr ?? ""}`);
  }

  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

function runExpectFailure(args, expectedText) {
  const result = spawnSync(pnpm, args, {
    cwd: repoRoot,
    env: process.env,
    encoding: "utf-8",
  });

  if (result.status === 0) {
    throw new Error(`Expected command to fail: pnpm ${args.join(" ")}`);
  }

  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  assertTextIncludes(output, expectedText);
  return output;
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
