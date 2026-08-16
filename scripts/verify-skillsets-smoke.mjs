import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "runbookos-skillsets-smoke-"));

try {
  run(["runbook", "init", workspaceDir]);

  const list = runCapture(["runbook", "skillsets", "list", workspaceDir]);
  assertTextIncludes(list, "id\tskills\ttools\tversion\ttitle");
  assertTextIncludes(list, "agency\t8\tworkspace,memory,ahrefs\t0.1.0\tAgency Operator");
  assertTextIncludes(list, "shopify\t8\tworkspace,memory,shopify,image\t0.1.0\tShopify Operator");

  const verify = runCapture(["runbook", "verify", workspaceDir]);
  assertTextIncludes(verify, "PASS\tskillsets\t2 installed");

  assertFileIncludes(path.join(workspaceDir, "skillsets", "agency", "skillset.json"), [
    "\"id\": \"agency\"",
    "\"seo-research\"",
  ]);
  assertFileIncludes(path.join(workspaceDir, "skillsets", "shopify", "skillset.json"), [
    "\"id\": \"shopify\"",
    "\"image-generation\"",
  ]);

  console.log(`skillsets smoke passed: ${workspaceDir}`);
} finally {
  fs.rmSync(workspaceDir, { recursive: true, force: true });
}

function run(args) {
  const result = spawnSync(pnpm, args, {
    cwd: repoRoot,
    env: { ...process.env, RUNBOOKOS_DATE: "2026-05-16" },
    encoding: "utf-8",
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`Command failed: pnpm ${args.join(" ")}`);
  }
}

function runCapture(args) {
  const result = spawnSync(pnpm, args, {
    cwd: repoRoot,
    env: { ...process.env, RUNBOOKOS_DATE: "2026-05-16" },
    encoding: "utf-8",
  });
  if (result.status !== 0) {
    throw new Error(`Command failed: pnpm ${args.join(" ")}\n${result.stdout ?? ""}${result.stderr ?? ""}`);
  }
  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

function assertTextIncludes(content, expected) {
  if (!content.includes(expected)) {
    throw new Error(`Expected text to include: ${expected}\n\nOutput:\n${content}`);
  }
}

function assertFileIncludes(file, expectedValues) {
  if (!fs.existsSync(file)) throw new Error(`Expected file to exist: ${file}`);
  const content = fs.readFileSync(file, "utf-8");
  for (const expected of expectedValues) {
    if (!content.includes(expected)) {
      throw new Error(`Expected ${file} to include: ${expected}`);
    }
  }
}
