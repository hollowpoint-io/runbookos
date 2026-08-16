import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

const output = runCapture(["runbook", "install", "check"]);
const bootstrap = runNode(["scripts/bootstrap-source.mjs", "--dry-run"]);
const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf-8"));

assertTextIncludes(output, "RunbookOS Install Check");
assertTextIncludes(output, "PASS\tnode");
assertTextIncludes(output, "PASS\tpnpm");
assertTextIncludes(output, "PASS\tlockfile\tpnpm-lock.yaml present");
assertTextIncludes(output, "PASS\tworkspace\tpnpm-workspace.yaml present");
assertTextIncludes(output, "PASS\tcli\tpnpm runbook --help works");
assertTextIncludes(output, "Install mode: source checkout");
assertTextIncludes(output, "Global package install ready: no");
assertTextIncludes(output, "External actions executed: no");
assertTextIncludes(bootstrap, "RunbookOS Source Bootstrap");
assertTextIncludes(bootstrap, "$ pnpm install --frozen-lockfile");
assertTextIncludes(bootstrap, "$ pnpm -w build");
assertTextIncludes(bootstrap, "$ pnpm runbook install check");
assertTextIncludes(bootstrap, "Bootstrap dry-run complete.");
if (packageJson.scripts?.["bootstrap:source"] !== "node scripts/bootstrap-source.mjs") {
  throw new Error("package.json should expose bootstrap:source");
}

console.log("install smoke passed");

function runCapture(args) {
  const result = spawnSync(pnpm, args, {
    cwd: repoRoot,
    env: process.env,
    encoding: "utf-8",
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: pnpm ${args.join(" ")}\n${result.stdout ?? ""}${result.stderr ?? ""}`);
  }

  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

function assertTextIncludes(content, expected) {
  if (!content.includes(expected)) {
    throw new Error(`Expected text to include: ${expected}`);
  }
}

function runNode(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: repoRoot,
    env: process.env,
    encoding: "utf-8",
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: node ${args.join(" ")}\n${result.stdout ?? ""}${result.stderr ?? ""}`);
  }

  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}
