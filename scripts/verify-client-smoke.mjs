import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "runbookos-client-smoke-"));
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const smokeDate = "2026-05-15";

try {
  run(["runbook", "init", workspaceDir]);
  run(
    [
      "runbook",
      "client",
      "create",
      "Acme Outdoors",
      workspaceDir,
      "--name",
      "Acme Outdoors",
      "--website",
      "acme.example",
      "--platform",
      "Shopify",
    ],
    { RUNBOOKOS_DATE: smokeDate },
  );

  const clientDir = path.join(workspaceDir, "workspace", "clients", "acme-outdoors");
  const dashboardPath = path.join(clientDir, "README.md");
  const activeContextPath = path.join(workspaceDir, "ACTIVE_CONTEXT.md");

  assertFileIncludes(dashboardPath, [
    "# Acme Outdoors",
    "> Client workspace for Acme Outdoors.",
    "Website: acme.example",
    "Platform: Shopify",
    `_Updated: ${smokeDate}_`,
    "Confirm client context, active workstreams, credential pointers, and first useful agent task.",
    "1. Fill in brand and credential pointer context.",
    "2. Choose the first skill-backed task to run.",
    "Credentials: `context/credentials.md`",
  ]);
  assertFileIncludes(activeContextPath, [
    "### Acme Outdoors - `workspace/clients/acme-outdoors/README.md`",
    `Status: Created ${smokeDate}. Context needs review.`,
    "Next action: Fill in the client dashboard, brand context, credential pointers, and first skill-backed task.",
  ]);

  runExpectFailure(
    ["runbook", "client", "create", "acme-outdoors", workspaceDir],
    "Client already exists: workspace/clients/acme-outdoors",
  );
  run(["runbook", "verify", workspaceDir]);
  console.log(`client smoke passed: ${workspaceDir}`);
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
  if (!output.includes(expectedText)) {
    throw new Error(`Expected failed command output to include ${expectedText}, got: ${output}`);
  }
}

function assertFileIncludes(file, expectedLines) {
  const content = fs.readFileSync(file, "utf-8");
  for (const expected of expectedLines) {
    if (!content.includes(expected)) {
      throw new Error(`Expected ${file} to include: ${expected}`);
    }
  }
}
