import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const skipInstall = args.has("--skip-install");

const nodeMajor = Number(process.versions.node.split(".")[0] ?? "0");
if (nodeMajor < 20) {
  fail(`Node ${process.versions.node} detected. RunbookOS source bootstrap requires Node 20+.`);
}

if (!existsSync(path.join(repoRoot, "package.json")) || !existsSync(path.join(repoRoot, "pnpm-lock.yaml"))) {
  fail("Run this script from a RunbookOS source checkout with package.json and pnpm-lock.yaml present.");
}

const steps = [
  skipInstall ? undefined : [pnpm, ["install", "--frozen-lockfile"]],
  [pnpm, ["-w", "build"]],
  [pnpm, ["runbook", "install", "check"]],
].filter(Boolean);

console.log("RunbookOS Source Bootstrap");
console.log(`Repo: ${repoRoot}`);
console.log(`Node: ${process.versions.node}`);
console.log(`Mode: ${dryRun ? "dry-run" : "execute"}`);
console.log("Credentials requested: no");
console.log("External actions executed by RunbookOS: no");
console.log("");

for (const [command, commandArgs] of steps) {
  console.log(`$ ${[command, ...commandArgs].join(" ")}`);
  if (!dryRun) run(command, commandArgs);
}

console.log("");
console.log(dryRun ? "Bootstrap dry-run complete." : "RunbookOS source checkout is bootstrapped.");
console.log("Next: pnpm runbook init ./workspaces/my-agency");

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    cwd: repoRoot,
    env: process.env,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    fail(`Command failed: ${[command, ...commandArgs].join(" ")}`);
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
