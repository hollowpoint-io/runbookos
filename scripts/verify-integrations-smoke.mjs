import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "runbookos-integrations-smoke-"));
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

try {
  run(["runbook", "init", workspaceDir]);

  const all = runCapture(["runbook", "integrations", "list", workspaceDir]);
  assertIncludes(all, ["id\tenabled\tstatus\tcategory\tenv\tcommand\tdocs"]);
  assertIncludes(all, ["workspace\tyes\tworking\tcore\t-\t@runbookos/mcp-workspace\tdocs/mcp-contracts.md"]);
  assertIncludes(all, ["memory\tyes\tworking\tcore\t-\t@runbookos/mcp-memory\tdocs/mcp-contracts.md"]);
  assertIncludes(all, ["shopify\tno\tworking\tecommerce\tRUNBOOKOS_SHOPIFY_AUTH_MODE,SHOPIFY_ADMIN_TOKEN,SHOPIFY_SHOP_DOMAIN,SHOPIFY_API_VERSION\t@runbookos/mcp-shopify\tdocs/shopify-auth.md"]);
  assertIncludes(all, ["ahrefs\tno\tworking\tresearch\tRUNBOOKOS_AHREFS_AUTH_MODE,AHREFS_API_TOKEN,RUNBOOKOS_AHREFS_FIXTURE,RUNBOOKOS_AHREFS_MAX_ROWS,RUNBOOKOS_AHREFS_DATE\t@runbookos/mcp-ahrefs\tdocs/integrations/ahrefs.md"]);
  assertIncludes(all, ["gmail\tno\tworking\tcommunications\tGMAIL_CLIENT_ID,GMAIL_CLIENT_SECRET,GMAIL_REFRESH_TOKEN,GMAIL_USER_EMAIL\t@runbookos/mcp-gmail\tdocs/integrations/gmail.md"]);
  assertIncludes(all, ["brightdata\tno\texternal-mcp\tresearch\tAPI_TOKEN\tnpx -y @brightdata/mcp\tdocs/integrations/brightdata.md"]);
  assertIncludes(all, ["context7\tno\texternal-mcp\tcoding\tCONTEXT7_API_KEY\tnpx -y @upstash/context7-mcp@latest\tdocs/integrations/context7.md"]);
  assertIncludes(all, ["firecrawl\tno\trecommended\tresearch\tFIRECRAWL_API_KEY\tnpx -y firecrawl-mcp\tdocs/integrations/firecrawl.md"]);
  assertIncludes(all, ["github\tno\trecommended\tproductivity\tGITHUB_PERSONAL_ACCESS_TOKEN\tdocker run -i --rm -e GITHUB_PERSONAL_ACCESS_TOKEN -e GITHUB_READ_ONLY=1 ghcr.io/github/github-mcp-server\tdocs/integrations/github.md"]);
  assertIncludes(all, ["linear\tno\trecommended\tproductivity\t-\tnpx -y mcp-remote https://mcp.linear.app/mcp\tdocs/integrations/linear.md"]);
  assertIncludes(all, ["notion\tno\trecommended\tknowledge\t-\tnpx -y mcp-remote https://mcp.notion.com/mcp\tdocs/integrations/notion.md"]);
  assertIncludes(all, ["exa\tno\trecommended\tresearch\tEXA_API_KEY\tnpx -y exa-mcp-server\tdocs/integrations/exa.md"]);
  assertIncludes(all, ["perplexity\tno\trecommended\tresearch\tPERPLEXITY_API_KEY\tnpx -y @perplexity-ai/mcp-server\tdocs/integrations/perplexity.md"]);
  assertIncludes(all, ["browser\tno\trecommended\tqa\t-\tnpx -y @playwright/mcp@latest\tdocs/integrations/browser.md"]);
  assertDocsExist(all);

  const enabled = runCapture(["runbook", "integrations", "list", workspaceDir, "--enabled"]);
  assertIncludes(enabled, ["workspace\tyes\tworking", "memory\tyes\tworking"]);
  assertExcludes(enabled, ["approval\tyes"]);
  assertExcludes(enabled, ["shopify\tno", "context7\tno", "brightdata\tno"]);

  const ahrefsSetup = runCapture(["runbook", "integrations", "setup", "ahrefs", workspaceDir, "--mode", "fixture"]);
  assertIncludes(ahrefsSetup, [
    "Ahrefs integration enabled",
    "Mode: fixture",
    "Generated provider adapters with Ahrefs MCP wiring.",
    "Credentials written: no",
    "Fixture mode uses public demo SEO data and consumes no Ahrefs API units.",
  ]);

  const ahrefsDoctor = runCapture(["runbook", "integrations", "doctor", "ahrefs", workspaceDir]);
  assertIncludes(ahrefsDoctor, [
    "PASS\tconfig\tahrefs integration is enabled",
    "PASS\tauth-mode\tfixture",
    "PASS\tcredentials\tcredentials are runtime/env only",
    "PASS\tconfigured\tfixture data available",
    "PASS\tsafety\tread-only; fixture consumes no API units",
    "PASS\tsite_overview",
    "PASS\tkeyword_matching_terms",
    "Credentials persisted by RunbookOS: no",
  ]);

  const enabledAfterAhrefs = runCapture(["runbook", "integrations", "list", workspaceDir, "--enabled"]);
  assertIncludes(enabledAfterAhrefs, ["ahrefs\tyes\tworking\tresearch"]);

  const gmailSetup = runCapture(["runbook", "integrations", "setup", "gmail", workspaceDir], scrubbedEnv());
  assertIncludes(gmailSetup, [
    "Gmail integration enabled",
    "Mode: oauth",
    "Generated provider adapters with Gmail MCP wiring.",
    "Credentials written: no",
    "Sending implemented: no",
  ]);

  const gmailDoctor = runCaptureExpectFailure(["runbook", "integrations", "doctor", "gmail", workspaceDir], scrubbedEnv());
  assertIncludes(gmailDoctor, [
    "PASS\tconfig\tgmail integration is enabled",
    "PASS\tauth-mode\toauth",
    "PASS\tcredentials\tcredentials are runtime/env only",
    "FAIL\tconfigured\tmissing env: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN",
    "PASS\tsafety\tmetadata-only reads; draft creation only; sending is not implemented",
    "Credentials persisted by RunbookOS: no",
  ]);

  const enabledAfterGmail = runCapture(["runbook", "integrations", "list", workspaceDir, "--enabled"]);
  assertIncludes(enabledAfterGmail, ["gmail\tyes\tworking\tcommunications"]);

  const brightdataSetup = runCapture(["runbook", "integrations", "setup", "brightdata", workspaceDir], scrubbedEnv(["API_TOKEN"]));
  assertIncludes(brightdataSetup, [
    "brightdata integration enabled",
    "Status: external-mcp",
    "Command: npx -y @brightdata/mcp",
    "Required env: API_TOKEN",
    "Generated provider adapters with external MCP wiring.",
    "Credentials written: no",
  ]);

  const brightdataMcp = readMcpServer("brightdata");
  assertEqual(brightdataMcp.command, "npx", "brightdata command");
  assertDeepEqual(brightdataMcp.args, ["-y", "@brightdata/mcp"], "brightdata args");
  assertDeepEqual(brightdataMcp.env, { API_TOKEN: "$API_TOKEN" }, "brightdata env");

  const brightdataDoctor = runCapture(["runbook", "integrations", "doctor", "brightdata", workspaceDir], scrubbedEnv(["API_TOKEN"]));
  assertIncludes(brightdataDoctor, [
    "RunbookOS brightdata Integration Doctor",
    "PASS\tconfig\tbrightdata integration is enabled",
    "PASS\tcommand\tnpx -y @brightdata/mcp",
    "WARN\truntime-env\tmissing env: API_TOKEN",
    "PASS\tcredentials\tcredentials are runtime/env only",
    "WARN\tfirst-party-package\texternal/user-supplied MCP path",
    "Provider/model calls made: no",
    "External actions executed: no",
  ]);

  const gscSetup = runCapture([
    "runbook",
    "integrations",
    "setup",
    "gsc",
    workspaceDir,
    "--command",
    "npx",
    "--arg",
    "-y",
    "--arg",
    "example-gsc-mcp",
    "--env",
    "GOOGLE_CLIENT_ID",
    "--env",
    "GOOGLE_REFRESH_TOKEN",
  ], scrubbedEnv(["GOOGLE_CLIENT_ID", "GOOGLE_REFRESH_TOKEN"]));
  assertIncludes(gscSetup, [
    "gsc integration enabled",
    "Status: planned",
    "Command: npx -y example-gsc-mcp",
    "Required env: GOOGLE_CLIENT_ID, GOOGLE_REFRESH_TOKEN",
    "Generated provider adapters with external MCP wiring.",
    "Credentials written: no",
  ]);

  const gscMcp = readMcpServer("gsc");
  assertEqual(gscMcp.command, "npx", "gsc command");
  assertDeepEqual(gscMcp.args, ["-y", "example-gsc-mcp"], "gsc args");
  assertDeepEqual(gscMcp.env, {
    GOOGLE_CLIENT_ID: "$GOOGLE_CLIENT_ID",
    GOOGLE_REFRESH_TOKEN: "$GOOGLE_REFRESH_TOKEN",
  }, "gsc env");

  const gscDoctor = runCapture(["runbook", "integrations", "doctor", "gsc", workspaceDir], scrubbedEnv(["GOOGLE_CLIENT_ID", "GOOGLE_REFRESH_TOKEN"]));
  assertIncludes(gscDoctor, [
    "RunbookOS gsc Integration Doctor",
    "PASS\tconfig\tgsc integration is enabled",
    "PASS\tcommand\tnpx -y example-gsc-mcp",
    "WARN\truntime-env\tmissing env: GOOGLE_CLIENT_ID, GOOGLE_REFRESH_TOKEN",
    "PASS\tcredentials\tcredentials are runtime/env only",
    "WARN\tfirst-party-package\texternal/user-supplied MCP path",
    "Provider/model calls made: no",
    "External actions executed: no",
  ]);

  const enabledAfterExternal = runCapture(["runbook", "integrations", "list", workspaceDir, "--enabled"]);
  assertIncludes(enabledAfterExternal, [
    "brightdata\tyes\texternal-mcp\tresearch",
    "gsc\tyes\tplanned\tanalytics",
  ]);

  console.log(`integrations smoke passed: ${workspaceDir}`);
} finally {
  if (!process.env.RUNBOOKOS_KEEP_SMOKE) {
    fs.rmSync(workspaceDir, { recursive: true, force: true });
  }
}

function run(args) {
  const result = spawnSync(pnpm, args, {
    cwd: repoRoot,
    env: process.env,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: pnpm ${args.join(" ")}`);
  }
}

function runCapture(args, env = process.env) {
  const result = spawnSync(pnpm, args, {
    cwd: repoRoot,
    env,
    encoding: "utf-8",
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: pnpm ${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  }

  return result.stdout;
}

function runCaptureExpectFailure(args, env = process.env) {
  const result = spawnSync(pnpm, args, {
    cwd: repoRoot,
    env,
    encoding: "utf-8",
  });

  if (result.status === 0) {
    throw new Error(`Expected command to fail: pnpm ${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  }

  return `${result.stdout}\n${result.stderr}`;
}

function scrubbedEnv(extraNames = []) {
  const env = { ...process.env };
  for (const name of ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_REFRESH_TOKEN", "GMAIL_USER_EMAIL", ...extraNames]) {
    delete env[name];
  }
  return env;
}

function assertIncludes(content, expectedValues) {
  for (const expected of expectedValues) {
    if (!content.includes(expected)) {
      throw new Error(`Expected output to include: ${expected}\n\nOutput:\n${content}`);
    }
  }
}

function assertExcludes(content, unexpectedValues) {
  for (const unexpected of unexpectedValues) {
    if (content.includes(unexpected)) {
      throw new Error(`Expected output to exclude: ${unexpected}\n\nOutput:\n${content}`);
    }
  }
}

function assertDocsExist(output) {
  const [, ...lines] = output.trim().split("\n");
  for (const line of lines) {
    const fields = line.split("\t");
    const docsPath = fields[6];
    if (!docsPath || docsPath === "-") continue;
    if (!fs.existsSync(path.join(repoRoot, docsPath))) {
      throw new Error(`Expected integration docs path to exist: ${docsPath}`);
    }
  }
}

function readMcpServer(id) {
  const mcpConfig = JSON.parse(fs.readFileSync(path.join(workspaceDir, ".mcp.json"), "utf-8"));
  const server = mcpConfig.mcpServers?.[id];
  if (!server) throw new Error(`Expected .mcp.json to include MCP server: ${id}`);
  return server;
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`Expected ${label} to equal ${expected}, got ${actual}`);
  }
}

function assertDeepEqual(actual, expected, label) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`Expected ${label} to equal ${expectedJson}, got ${actualJson}`);
  }
}
