#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const options = parseArgs(process.argv.slice(2));

const prompts = process.stdin.isTTY && !options.yes
  ? createInterface({ input: process.stdin, output: process.stdout })
  : null;

try {
  console.log("RunbookOS User Start");
  console.log("");
  console.log("This helper can install, build, create a workspace, run setup, and write local credential placeholders.");
  console.log("It never asks for secret values and never writes real credentials.");
  console.log("");

  ensurePnpm();

  const workspaceInput = options.workspace ?? await ask("Workspace directory", "./my-runbook-workspace");
  const workspaceDir = path.resolve(repoRoot, workspaceInput);
  const hasNodeModules = fs.existsSync(path.join(repoRoot, "node_modules"));

  if (!options.noInstall && await confirm("Run pnpm install?", !hasNodeModules)) {
    run(["install"]);
  } else {
    console.log("Skipped pnpm install.");
  }

  if (!options.noBuild && await confirm("Build packages now?", true)) {
    run(["-w", "build"]);
  } else {
    console.log("Skipped build.");
  }

  if (!options.noInstallCheck && await confirm("Run install check?", true)) {
    run(["runbook", "install", "check"]);
  } else {
    console.log("Skipped install check.");
  }

  if (fs.existsSync(path.join(workspaceDir, "runbookos.config.json"))) {
    console.log(`Workspace already exists: ${formatPath(workspaceDir)}`);
  } else {
    run(["runbook", "init", workspaceDir]);
  }

  if (!options.noWizard && await confirm("Run the interactive setup wizard?", true)) {
    run(["runbook", "setup", "wizard", workspaceDir]);
  } else {
    console.log("Skipped setup wizard.");
  }

  if (!options.noCredentials && await confirm("Write ignored local credential placeholder file?", true)) {
    run(["runbook", "credentials", "checklist", workspaceDir, "--write-local-env"]);
  } else {
    console.log("Skipped credential placeholder file.");
  }

  run(["runbook", "workspace", "menu", workspaceDir]);

  if (!options.noSmoke && await confirm("Run safe fixture smoke test now?", false)) {
    run(["runbook", "smoke", workspaceDir]);
  }

  console.log("");
  console.log("Next local credential step, when you are ready:");
  console.log(`  edit ${formatPath(path.join(workspaceDir, ".runbookos", "local.env"))}`);
  console.log(`  set -a; source ${formatPath(path.join(workspaceDir, ".runbookos", "local.env"))}; set +a`);
  console.log("");
  console.log("Open Claude or Codex in this workspace:");
  console.log(`  cd ${formatPath(workspaceDir)}`);
  console.log("");
  console.log("User start complete.");
} finally {
  prompts?.close();
}

function parseArgs(args) {
  const parsed = {
    workspace: undefined,
    yes: false,
    noInstall: false,
    noBuild: false,
    noInstallCheck: false,
    noWizard: false,
    noCredentials: false,
    noSmoke: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--workspace") {
      parsed.workspace = args[++index];
    } else if (arg.startsWith("--workspace=")) {
      parsed.workspace = arg.slice("--workspace=".length);
    } else if (arg === "--yes" || arg === "-y") {
      parsed.yes = true;
    } else if (arg === "--no-install") {
      parsed.noInstall = true;
    } else if (arg === "--no-build") {
      parsed.noBuild = true;
    } else if (arg === "--no-install-check") {
      parsed.noInstallCheck = true;
    } else if (arg === "--no-wizard") {
      parsed.noWizard = true;
    } else if (arg === "--no-credentials") {
      parsed.noCredentials = true;
    } else if (arg === "--no-smoke") {
      parsed.noSmoke = true;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return parsed;
}

async function ask(question, fallback) {
  if (!prompts) return fallback;
  const answer = await prompts.question(`${question} [${fallback}]: `);
  return answer.trim() || fallback;
}

async function confirm(question, fallback) {
  if (options.yes || !prompts) return fallback;
  const hint = fallback ? "Y/n" : "y/N";
  const answer = (await prompts.question(`${question} [${hint}]: `)).trim().toLowerCase();
  if (!answer) return fallback;
  return ["y", "yes", "true", "1"].includes(answer);
}

function run(args) {
  console.log("");
  console.log(`$ pnpm ${args.join(" ")}`);
  const result = spawnSync(pnpm, args, {
    cwd: repoRoot,
    env: process.env,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`Command failed: pnpm ${args.join(" ")}`);
  }
}

function ensurePnpm() {
  const result = spawnSync(pnpm, ["--version"], {
    cwd: repoRoot,
    encoding: "utf-8",
  });
  if (result.status !== 0) {
    throw new Error("pnpm is required. Install it with Corepack or your package manager, then rerun this helper.");
  }
}

function formatPath(file) {
  return path.relative(process.cwd(), file) || ".";
}

function printHelp() {
  console.log(`RunbookOS User Start

Usage:
  pnpm user:start [--workspace <dir>] [--yes]

Options:
  --workspace <dir>     Workspace to create or reuse. Default: ./my-runbook-workspace
  --yes, -y             Accept non-interactive defaults
  --no-install          Skip pnpm install
  --no-build            Skip pnpm -w build
  --no-install-check    Skip runbook install check
  --no-wizard           Skip setup wizard
  --no-credentials      Skip local credential placeholder file
  --no-smoke            Skip safe smoke prompt
`);
}
