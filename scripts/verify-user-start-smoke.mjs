import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "runbookos-user-start-smoke-"));
const node = process.execPath;

try {
  const output = runCapture([
    "scripts/user-start.mjs",
    "--workspace",
    workspaceDir,
    "--yes",
    "--no-install",
    "--no-build",
    "--no-install-check",
    "--no-wizard",
    "--no-smoke",
  ]);

  assertIncludes(output, "RunbookOS User Start");
  assertIncludes(output, "Skipped pnpm install.");
  assertIncludes(output, "Skipped build.");
  assertIncludes(output, "Skipped install check.");
  assertIncludes(output, "RunbookOS Setup Menu");
  assertIncludes(output, "Local env placeholder updated");
  assertIncludes(output, "User start complete.");

  assertExists(path.join(workspaceDir, "runbookos.config.json"));
  assertExists(path.join(workspaceDir, ".runbookos", "local.env"));
  assertFileIncludes(path.join(workspaceDir, ".gitignore"), ".runbookos/local.*");
  assertFileIncludes(path.join(workspaceDir, ".runbookos", "local.env"), "SHOPIFY_ADMIN_TOKEN=");

  console.log(`user start smoke passed: ${workspaceDir}`);
} finally {
  if (!process.env.RUNBOOKOS_KEEP_SMOKE) {
    fs.rmSync(workspaceDir, { recursive: true, force: true });
  }
}

function runCapture(args) {
  const result = spawnSync(node, args, {
    cwd: repoRoot,
    env: process.env,
    encoding: "utf-8",
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (result.status !== 0) {
    throw new Error(`Command failed: node ${args.join(" ")}\n${output}`);
  }
  return output;
}

function assertExists(file) {
  if (!fs.existsSync(file)) throw new Error(`Expected file to exist: ${file}`);
}

function assertFileIncludes(file, expected) {
  assertIncludes(fs.readFileSync(file, "utf-8"), expected);
}

function assertIncludes(content, expected) {
  if (!content.includes(expected)) {
    throw new Error(`Expected content to include: ${expected}\n\nOutput:\n${content}`);
  }
}
